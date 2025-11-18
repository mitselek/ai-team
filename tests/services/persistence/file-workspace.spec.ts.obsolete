import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdir, rm, writeFile as fsWriteFile, readFile as fsReadFile } from 'fs/promises'
import { join } from 'path'
import { FilesystemService } from '../../../app/server/services/persistence/file-workspace'
import { AuditService } from '../../../app/server/services/persistence/audit'
import type { Agent, Team } from '@@/types'

describe('FilesystemService - Issue #42', () => {
  const TEST_BASE_PATH = join(process.cwd(), '.test-workspace')
  const TEST_AUDIT_DIR = join(process.cwd(), '.test-workspace-audit')
  const TEST_ORG_ID = 'org-test-123'
  let filesystemService: FilesystemService
  let auditService: AuditService

  // Mock agents and teams for permission checks
  const mockAgents: Agent[] = [
    {
      id: 'agent-1',
      name: 'Agent 1',
      organizationId: TEST_ORG_ID,
      teamId: 'team-1',
      role: 'worker',
      seniorId: null,
      systemPrompt: '',
      status: 'active',
      tokenAllocation: 1000,
      tokenUsed: 0,
      createdAt: new Date(),
      lastActiveAt: new Date()
    },
    {
      id: 'agent-2',
      name: 'Agent 2',
      organizationId: TEST_ORG_ID,
      teamId: 'team-2',
      role: 'worker',
      seniorId: null,
      systemPrompt: '',
      status: 'active',
      tokenAllocation: 1000,
      tokenUsed: 0,
      createdAt: new Date(),
      lastActiveAt: new Date()
    }
  ]

  const mockTeams: Team[] = [
    {
      id: 'team-1',
      name: 'Team 1',
      organizationId: TEST_ORG_ID,
      leaderId: 'agent-1',
      type: 'custom',
      tokenAllocation: 10000
    },
    {
      id: 'team-2',
      name: 'Team 2',
      organizationId: TEST_ORG_ID,
      leaderId: 'agent-2',
      type: 'custom',
      tokenAllocation: 10000
    }
  ]

  beforeEach(async () => {
    await mkdir(TEST_BASE_PATH, { recursive: true })
    await mkdir(TEST_AUDIT_DIR, { recursive: true })
    auditService = new AuditService(TEST_AUDIT_DIR)
    filesystemService = new FilesystemService(TEST_BASE_PATH, auditService)

    // Inject test data for permission checks
    filesystemService.setAgentsAndTeams(mockAgents, mockTeams)
  })

  afterEach(async () => {
    await rm(TEST_BASE_PATH, { recursive: true, force: true })
    await rm(TEST_AUDIT_DIR, { recursive: true, force: true })
  })

  describe('readFile()', () => {
    it('should read file content and metadata', async () => {
      const testPath = '/workspaces/agent-1/private/test.md'
      const fullPath = join(TEST_BASE_PATH, testPath)
      await mkdir(join(TEST_BASE_PATH, '/workspaces/agent-1/private'), { recursive: true })
      await fsWriteFile(fullPath, 'Hello World', 'utf-8')

      const result = await filesystemService.readFile('agent-1', testPath, TEST_ORG_ID)

      expect(result.content).toBe('Hello World')
      expect(result.metadata).toMatchObject({
        size: 11,
        modified: expect.any(Date)
      })
    })

    it('should reject files with invalid extensions', async () => {
      const testPath = '/workspaces/agent-1/private/test.exe'

      await expect(filesystemService.readFile('agent-1', testPath, TEST_ORG_ID)).rejects.toThrow(
        'File type not allowed'
      )
    })

    it('should log read operations to audit service', async () => {
      const testPath = '/workspaces/agent-1/private/test.md'
      const fullPath = join(TEST_BASE_PATH, testPath)
      await mkdir(join(TEST_BASE_PATH, '/workspaces/agent-1/private'), { recursive: true })
      await fsWriteFile(fullPath, 'Test content', 'utf-8')

      await filesystemService.readFile('agent-1', testPath, TEST_ORG_ID)

      const logs = await auditService.query({ agentId: 'agent-1' })
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        agentId: 'agent-1',
        operation: 'read',
        path: testPath
      })
    })

    it('should handle non-existent files', async () => {
      await expect(
        filesystemService.readFile('agent-1', '/workspaces/agent-1/private/missing.md', TEST_ORG_ID)
      ).rejects.toThrow()
    })
  })

  describe('writeFile()', () => {
    it('should write file content and create directories', async () => {
      const testPath = '/workspaces/agent-1/private/new-file.md'
      const content = 'New file content'

      const result = await filesystemService.writeFile('agent-1', testPath, content, TEST_ORG_ID)

      expect(result.success).toBe(true)
      const fullPath = join(TEST_BASE_PATH, testPath)
      const written = await fsReadFile(fullPath, 'utf-8')
      expect(written).toBe(content)
    })

    it('should reject files with invalid extensions', async () => {
      await expect(
        filesystemService.writeFile(
          'agent-1',
          '/workspaces/agent-1/private/test.sh',
          'echo hi',
          TEST_ORG_ID
        )
      ).rejects.toThrow('File type not allowed')
    })

    it('should reject files exceeding 5MB limit', async () => {
      const largecontent = 'x'.repeat(6 * 1024 * 1024) // 6MB

      await expect(
        filesystemService.writeFile(
          'agent-1',
          '/workspaces/agent-1/private/large.txt',
          largecontent,
          TEST_ORG_ID
        )
      ).rejects.toThrow('File size exceeds maximum allowed size')
    })

    it('should log write operations to audit service', async () => {
      await filesystemService.writeFile(
        'agent-1',
        '/workspaces/agent-1/private/test.md',
        'content',
        TEST_ORG_ID
      )

      const logs = await auditService.query({ agentId: 'agent-1' })
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        agentId: 'agent-1',
        operation: 'create',
        path: '/workspaces/agent-1/private/test.md',
        size: 7
      })
    })

    it('should update existing files', async () => {
      const testPath = '/workspaces/agent-1/private/update.md'
      await filesystemService.writeFile('agent-1', testPath, 'v1', TEST_ORG_ID)
      await filesystemService.writeFile('agent-1', testPath, 'v2', TEST_ORG_ID)

      const fullPath = join(TEST_BASE_PATH, testPath)
      const content = await fsReadFile(fullPath, 'utf-8')
      expect(content).toBe('v2')
    })

    it('should accept all whitelisted extensions', async () => {
      const extensions = ['.md', '.txt', '.pdf', '.json', '.yaml', '.svg', '.png', '.jpg', '.jpeg']

      for (const ext of extensions) {
        const path = `/workspaces/agent-1/private/file${ext}`
        await expect(
          filesystemService.writeFile('agent-1', path, 'test', TEST_ORG_ID)
        ).resolves.toMatchObject({
          success: true
        })
      }
    })
  })

  describe('deleteFile()', () => {
    it('should delete existing file', async () => {
      const testPath = '/workspaces/agent-1/private/delete-me.md'
      await filesystemService.writeFile('agent-1', testPath, 'goodbye', TEST_ORG_ID)

      const result = await filesystemService.deleteFile('agent-1', testPath, TEST_ORG_ID)

      expect(result.success).toBe(true)
      const fullPath = join(TEST_BASE_PATH, testPath)
      await expect(fsReadFile(fullPath, 'utf-8')).rejects.toThrow()
    })

    it('should reject deleting files with invalid extensions', async () => {
      await expect(
        filesystemService.deleteFile('agent-1', '/workspaces/agent-1/private/test.exe', TEST_ORG_ID)
      ).rejects.toThrow('File type not allowed')
    })

    it('should log delete operations to audit service', async () => {
      const testPath = '/workspaces/agent-1/private/test.md'
      await filesystemService.writeFile('agent-1', testPath, 'content', TEST_ORG_ID)
      await filesystemService.deleteFile('agent-1', testPath, TEST_ORG_ID)

      const logs = await auditService.query({ operation: 'delete' })
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        agentId: 'agent-1',
        operation: 'delete',
        path: testPath
      })
    })

    it('should handle deleting non-existent files gracefully', async () => {
      await expect(
        filesystemService.deleteFile(
          'agent-1',
          '/workspaces/agent-1/private/missing.md',
          TEST_ORG_ID
        )
      ).rejects.toThrow()
    })
  })

  describe('listFiles()', () => {
    beforeEach(async () => {
      // Create test file structure
      await filesystemService.writeFile(
        'agent-1',
        '/workspaces/agent-1/private/file1.md',
        'a',
        TEST_ORG_ID
      )
      await filesystemService.writeFile(
        'agent-1',
        '/workspaces/agent-1/private/file2.txt',
        'b',
        TEST_ORG_ID
      )
      await filesystemService.writeFile(
        'agent-1',
        '/workspaces/agent-1/private/subdir/file3.md',
        'c',
        TEST_ORG_ID
      )
    })

    it('should list all files in directory', async () => {
      const files = await filesystemService.listFiles('agent-1', '/workspaces/agent-1/private')

      expect(files.length).toBeGreaterThanOrEqual(2)
      expect(files.some((f) => f.path.endsWith('file1.md'))).toBe(true)
      expect(files.some((f) => f.path.endsWith('file2.txt'))).toBe(true)
    })

    it('should return file metadata', async () => {
      const files = await filesystemService.listFiles('agent-1', '/workspaces/agent-1/private')

      files.forEach((file) => {
        expect(file).toMatchObject({
          path: expect.any(String),
          isDirectory: expect.any(Boolean),
          size: expect.any(Number),
          modified: expect.any(Date)
        })
      })
    })

    it('should handle empty directories', async () => {
      const emptyPath = join(TEST_BASE_PATH, '/workspaces/agent-1/empty')
      await mkdir(emptyPath, { recursive: true })

      const files = await filesystemService.listFiles('agent-1', '/workspaces/agent-1/empty')

      expect(files).toEqual([])
    })

    it('should include subdirectories', async () => {
      const files = await filesystemService.listFiles('agent-1', '/workspaces/agent-1/private')

      const subdirs = files.filter((f) => f.isDirectory)
      expect(subdirs.some((d) => d.path.includes('subdir'))).toBe(true)
    })
  })

  describe('getFileInfo()', () => {
    it('should return file metadata', async () => {
      const testPath = '/workspaces/agent-1/private/info.md'
      await filesystemService.writeFile('agent-1', testPath, 'test content', TEST_ORG_ID)

      const info = await filesystemService.getFileInfo('agent-1', testPath)

      expect(info).toMatchObject({
        size: 12,
        created: expect.any(Date),
        modified: expect.any(Date)
      })
    })

    it('should reject files with invalid extensions', async () => {
      await expect(
        filesystemService.getFileInfo('agent-1', '/workspaces/agent-1/private/test.bin')
      ).rejects.toThrow('File type not allowed')
    })

    it('should handle non-existent files', async () => {
      await expect(
        filesystemService.getFileInfo('agent-1', '/workspaces/agent-1/private/missing.md')
      ).rejects.toThrow()
    })
  })

  describe('Path traversal prevention', () => {
    it('should reject paths with ../ sequences', async () => {
      await expect(
        filesystemService.readFile(
          'agent-1',
          '/workspaces/agent-1/../agent-2/private/file.md',
          TEST_ORG_ID
        )
      ).rejects.toThrow()
    })

    it('should reject absolute path escapes', async () => {
      await expect(
        filesystemService.writeFile('agent-1', '/etc/passwd', 'hacked', TEST_ORG_ID)
      ).rejects.toThrow()
    })

    it('should normalize paths safely', async () => {
      // Valid path with redundant separators
      const testPath = '/workspaces/agent-1/private//test.md'
      await filesystemService.writeFile('agent-1', testPath, 'safe', TEST_ORG_ID)

      // Should have been normalized
      const result = await filesystemService.readFile(
        'agent-1',
        '/workspaces/agent-1/private/test.md',
        TEST_ORG_ID
      )
      expect(result.content).toBe('safe')
    })
  })

  describe('Extension whitelist', () => {
    it('should allow whitelisted extensions', async () => {
      const allowed = ['.md', '.txt', '.pdf', '.json', '.yaml', '.svg', '.png', '.jpg', '.jpeg']

      for (const ext of allowed) {
        await expect(
          filesystemService.writeFile(
            'agent-1',
            `/workspaces/agent-1/private/file${ext}`,
            'ok',
            TEST_ORG_ID
          )
        ).resolves.toMatchObject({ success: true })
      }
    })

    it('should reject non-whitelisted extensions', async () => {
      const blocked = ['.exe', '.sh', '.bat', '.js', '.ts', '.py', '.rb', '.php']

      for (const ext of blocked) {
        await expect(
          filesystemService.writeFile(
            'agent-1',
            `/workspaces/agent-1/private/file${ext}`,
            'bad',
            TEST_ORG_ID
          )
        ).rejects.toThrow('not allowed')
      }
    })

    it('should be case-insensitive', async () => {
      await expect(
        filesystemService.writeFile(
          'agent-1',
          '/workspaces/agent-1/private/file.MD',
          'ok',
          TEST_ORG_ID
        )
      ).resolves.toMatchObject({ success: true })

      await expect(
        filesystemService.writeFile(
          'agent-1',
          '/workspaces/agent-1/private/file.EXE',
          'bad',
          TEST_ORG_ID
        )
      ).rejects.toThrow('not allowed')
    })
  })

  describe('File size limits', () => {
    it('should accept files under 5MB', async () => {
      const content4MB = 'x'.repeat(4 * 1024 * 1024)

      await expect(
        filesystemService.writeFile(
          'agent-1',
          '/workspaces/agent-1/private/large.md',
          content4MB,
          TEST_ORG_ID
        )
      ).resolves.toMatchObject({ success: true })
    })

    it('should reject files over 5MB', async () => {
      const content6MB = 'x'.repeat(6 * 1024 * 1024)

      await expect(
        filesystemService.writeFile(
          'agent-1',
          '/workspaces/agent-1/private/toolarge.md',
          content6MB,
          TEST_ORG_ID
        )
      ).rejects.toThrow('File size exceeds maximum allowed size')
    })

    it('should allow exactly 5MB', async () => {
      const content5MB = 'x'.repeat(5 * 1024 * 1024)

      await expect(
        filesystemService.writeFile(
          'agent-1',
          '/workspaces/agent-1/private/exactly5.md',
          content5MB,
          TEST_ORG_ID
        )
      ).resolves.toMatchObject({ success: true })
    })
  })

  describe('Audit logging integration', () => {
    it('should log all CRUD operations', async () => {
      const testPath = '/workspaces/agent-1/private/audit-test.md'

      await filesystemService.writeFile('agent-1', testPath, 'v1', TEST_ORG_ID)
      await filesystemService.readFile('agent-1', testPath, TEST_ORG_ID)
      await filesystemService.getFileInfo('agent-1', testPath)
      await filesystemService.deleteFile('agent-1', testPath, TEST_ORG_ID)

      const logs = await auditService.query({ agentId: 'agent-1' })
      expect(logs.length).toBeGreaterThanOrEqual(3) // create, read, delete (getFileInfo may not log)

      const operations = logs.map((l) => l.operation)
      expect(operations).toContain('create')
      expect(operations).toContain('read')
      expect(operations).toContain('delete')
    })

    it('should include file size in write logs', async () => {
      await filesystemService.writeFile(
        'agent-1',
        '/workspaces/agent-1/private/sized.md',
        'content',
        TEST_ORG_ID
      )

      const logs = await auditService.query({ operation: 'create' })
      expect(logs[logs.length - 1]).toMatchObject({
        size: 7,
        path: '/workspaces/agent-1/private/sized.md'
      })
    })

    it('should log failed operations', async () => {
      const logSpy = vi.spyOn(auditService, 'log')

      try {
        await filesystemService.readFile(
          'agent-1',
          '/workspaces/agent-1/private/missing.md',
          TEST_ORG_ID
        )
      } catch {
        // Expected to fail
      }

      // Should have attempted to log the operation
      expect(logSpy).toHaveBeenCalled()
    })
  })
})
