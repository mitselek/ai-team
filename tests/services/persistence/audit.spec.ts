import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, rm, readFile } from 'fs/promises'
import { join } from 'path'
import { AuditService } from '../../../app/server/services/persistence/audit'

describe('AuditService - Issue #41', () => {
  const TEST_LOG_DIR = join(process.cwd(), '.test-audit-logs')
  let auditService: AuditService

  beforeEach(async () => {
    await mkdir(TEST_LOG_DIR, { recursive: true })
    auditService = new AuditService(TEST_LOG_DIR)
  })

  afterEach(async () => {
    await rm(TEST_LOG_DIR, { recursive: true, force: true })
  })

  describe('log()', () => {
    it('should append audit entry to JSON Lines file', async () => {
      await auditService.log({
        timestamp: new Date('2025-01-01T12:00:00Z'),
        agentId: 'agent-1',
        operation: 'create',
        path: '/agents/agent-1/private/test.md',
        size: 1024
      })

      const logPath = join(TEST_LOG_DIR, 'audit.log')
      const content = await readFile(logPath, 'utf-8')
      const lines = content.trim().split('\n')

      expect(lines).toHaveLength(1)
      const entry = JSON.parse(lines[0])
      expect(entry).toMatchObject({
        agentId: 'agent-1',
        operation: 'create',
        path: '/agents/agent-1/private/test.md',
        size: 1024,
        success: true
      })
    })

    it('should handle entries without size field', async () => {
      await auditService.log({
        timestamp: new Date('2025-01-01T12:00:00Z'),
        agentId: 'agent-1',
        operation: 'read',
        path: '/agents/agent-1/shared/doc.md'
      })

      const logPath = join(TEST_LOG_DIR, 'audit.log')
      const content = await readFile(logPath, 'utf-8')
      const entry = JSON.parse(content.trim())

      expect(entry.size).toBeUndefined()
      expect(entry.success).toBe(true)
    })

    it('should handle entries with error field', async () => {
      await auditService.log({
        timestamp: new Date('2025-01-01T12:00:00Z'),
        agentId: 'agent-1',
        operation: 'write',
        path: '/agents/agent-1/private/test.md',
        error: 'Permission denied'
      })

      const logPath = join(TEST_LOG_DIR, 'audit.log')
      const content = await readFile(logPath, 'utf-8')
      const entry = JSON.parse(content.trim())

      expect(entry.error).toBe('Permission denied')
      expect(entry.success).toBe(true)
    })

    it('should append multiple entries to same file', async () => {
      await auditService.log({
        timestamp: new Date('2025-01-01T12:00:00Z'),
        agentId: 'agent-1',
        operation: 'create',
        path: '/agents/agent-1/private/file1.md'
      })

      await auditService.log({
        timestamp: new Date('2025-01-01T12:01:00Z'),
        agentId: 'agent-2',
        operation: 'read',
        path: '/agents/agent-2/shared/file2.md'
      })

      await auditService.log({
        timestamp: new Date('2025-01-01T12:02:00Z'),
        agentId: 'agent-1',
        operation: 'delete',
        path: '/agents/agent-1/private/file1.md'
      })

      const logPath = join(TEST_LOG_DIR, 'audit.log')
      const content = await readFile(logPath, 'utf-8')
      const lines = content.trim().split('\n')

      expect(lines).toHaveLength(3)
      expect(JSON.parse(lines[0]).operation).toBe('create')
      expect(JSON.parse(lines[1]).operation).toBe('read')
      expect(JSON.parse(lines[2]).operation).toBe('delete')
    })

    it('should handle all operation types', async () => {
      const operations = ['create', 'update', 'delete', 'read'] as const

      for (const operation of operations) {
        await auditService.log({
          timestamp: new Date(),
          agentId: 'agent-1',
          operation,
          path: '/test/path.md'
        })
      }

      const logPath = join(TEST_LOG_DIR, 'audit.log')
      const content = await readFile(logPath, 'utf-8')
      const lines = content.trim().split('\n')

      expect(lines).toHaveLength(4)
      operations.forEach((op, i) => {
        expect(JSON.parse(lines[i]).operation).toBe(op)
      })
    })

    it('should be thread-safe with concurrent writes', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(
          auditService.log({
            timestamp: new Date(),
            agentId: `agent-${i}`,
            operation: 'create',
            path: `/test/file${i}.md`
          })
        )
      }

      await Promise.all(promises)

      const logPath = join(TEST_LOG_DIR, 'audit.log')
      const content = await readFile(logPath, 'utf-8')
      const lines = content.trim().split('\n')

      expect(lines).toHaveLength(10)
      // Verify all entries are valid JSON
      lines.forEach((line) => {
        expect(() => JSON.parse(line)).not.toThrow()
      })
    })
  })

  describe('queryLogs()', () => {
    beforeEach(async () => {
      // Seed test data
      await auditService.log({
        timestamp: new Date('2025-01-01T10:00:00Z'),
        agentId: 'agent-1',
        operation: 'create',
        path: '/agents/agent-1/private/file1.md',
        size: 100
      })

      await auditService.log({
        timestamp: new Date('2025-01-01T11:00:00Z'),
        agentId: 'agent-2',
        operation: 'read',
        path: '/agents/agent-2/shared/file2.md'
      })

      await auditService.log({
        timestamp: new Date('2025-01-01T12:00:00Z'),
        agentId: 'agent-1',
        operation: 'update',
        path: '/agents/agent-1/private/file1.md',
        size: 200
      })

      await auditService.log({
        timestamp: new Date('2025-01-01T13:00:00Z'),
        agentId: 'agent-3',
        operation: 'delete',
        path: '/teams/team-1/shared/doc.md'
      })

      await auditService.log({
        timestamp: new Date('2025-01-02T10:00:00Z'),
        agentId: 'agent-1',
        operation: 'read',
        path: '/agents/agent-1/shared/file3.md'
      })
    })

    it('should return all logs when no filters provided', async () => {
      const logs = await auditService.queryLogs({})

      expect(logs).toHaveLength(5)
    })

    it('should filter by agentId', async () => {
      const logs = await auditService.queryLogs({ agentId: 'agent-1' })

      expect(logs).toHaveLength(3)
      logs.forEach((log) => {
        expect(log.agentId).toBe('agent-1')
      })
    })

    it('should filter by operation', async () => {
      const logs = await auditService.queryLogs({ operation: 'read' })

      expect(logs).toHaveLength(2)
      logs.forEach((log) => {
        expect(log.operation).toBe('read')
      })
    })

    it('should filter by path', async () => {
      const logs = await auditService.queryLogs({ path: '/agents/agent-1/private/file1.md' })

      expect(logs).toHaveLength(2)
      logs.forEach((log) => {
        expect(log.path).toBe('/agents/agent-1/private/file1.md')
      })
    })

    it('should filter by startDate', async () => {
      const logs = await auditService.queryLogs({
        startDate: new Date('2025-01-01T12:00:00Z')
      })

      expect(logs).toHaveLength(3)
      const startDate = new Date('2025-01-01T12:00:00Z')
      logs.forEach((log) => {
        expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
      })
    })

    it('should filter by endDate', async () => {
      const logs = await auditService.queryLogs({
        endDate: new Date('2025-01-01T12:00:00Z')
      })

      expect(logs).toHaveLength(3)
      const endDate = new Date('2025-01-01T12:00:00Z')
      logs.forEach((log) => {
        expect(log.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime())
      })
    })

    it('should filter by date range', async () => {
      const logs = await auditService.queryLogs({
        startDate: new Date('2025-01-01T11:00:00Z'),
        endDate: new Date('2025-01-01T13:00:00Z')
      })

      expect(logs).toHaveLength(3)
      const startDate = new Date('2025-01-01T11:00:00Z')
      const endDate = new Date('2025-01-01T13:00:00Z')
      logs.forEach((log) => {
        expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime())
        expect(log.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime())
      })
    })

    it('should combine multiple filters', async () => {
      const logs = await auditService.queryLogs({
        agentId: 'agent-1',
        operation: 'update'
      })

      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        agentId: 'agent-1',
        operation: 'update',
        path: '/agents/agent-1/private/file1.md'
      })
    })

    it('should return empty array when no matches', async () => {
      const logs = await auditService.queryLogs({ agentId: 'nonexistent' })

      expect(logs).toHaveLength(0)
    })

    it('should parse timestamp as Date objects', async () => {
      const logs = await auditService.queryLogs({ agentId: 'agent-1' })

      expect(logs[0].timestamp).toBeInstanceOf(Date)
    })

    it('should return entries in chronological order', async () => {
      const logs = await auditService.queryLogs({})

      for (let i = 1; i < logs.length; i++) {
        expect(logs[i].timestamp.getTime()).toBeGreaterThanOrEqual(logs[i - 1].timestamp.getTime())
      }
    })
  })

  describe('Edge cases', () => {
    it('should handle empty log file', async () => {
      const logs = await auditService.queryLogs({})

      expect(logs).toEqual([])
    })

    it('should create log file on first write', async () => {
      await auditService.log({
        timestamp: new Date(),
        agentId: 'agent-1',
        operation: 'create',
        path: '/test/file.md'
      })

      const logs = await auditService.queryLogs({})
      expect(logs).toHaveLength(1)
    })
  })
})
