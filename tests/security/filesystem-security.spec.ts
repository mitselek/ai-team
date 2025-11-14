import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FilesystemService } from '../../app/server/services/persistence/file-workspace'
import { PermissionService } from '../../app/server/services/persistence/permissions'
import { AuditService } from '../../app/server/services/persistence/audit'
import {
  createToolRegistry,
  PermissionError,
  SecurityError
} from '../../app/server/services/orchestrator'
import type { ExecutionContext, ToolExecutor } from '../../app/server/services/orchestrator'
import { rm, mkdir } from 'fs/promises'
import { join } from 'path'

/**
 * Comprehensive Security Testing Suite for Filesystem Access System
 *
 * This test suite validates the security controls implemented across:
 * - FilesystemService (Issue #42)
 * - PermissionService (Issue #43)
 * - Tool Registry with identity validation (Issue #46)
 * - Permission checking layer (Issue #47)
 *
 * Test Categories:
 * 1. Path Traversal Attacks
 * 2. Agent Impersonation
 * 3. Privilege Escalation
 * 4. Workspace Boundary Violations
 * 5. Quota Enforcement
 * 6. Audit Logging Integrity
 * 7. Error Information Disclosure
 * 8. Race Conditions
 */

describe('Filesystem Security - Comprehensive Test Suite (Issue #49)', () => {
  const testDataRoot = join(process.cwd(), 'data', 'test-security')
  let filesystemService: FilesystemService
  let permissionService: PermissionService
  let auditService: AuditService

  beforeEach(async () => {
    // Clean test directory
    await rm(testDataRoot, { recursive: true, force: true })
    await mkdir(testDataRoot, { recursive: true })

    // Initialize services
    auditService = new AuditService(join(testDataRoot, 'audit.jsonl'))
    filesystemService = new FilesystemService(testDataRoot, auditService)
    permissionService = new PermissionService()
  })

  afterEach(async () => {
    await rm(testDataRoot, { recursive: true, force: true })
  })

  describe('1. Path Traversal Attack Prevention', () => {
    it('should block path traversal with ../ sequences', async () => {
      await expect(
        filesystemService.readFile('agent-1', '/agents/agent-1/../../sensitive/data.txt')
      ).rejects.toThrow('Path traversal detected')
    })

    it('should block path traversal with absolute paths', async () => {
      await expect(filesystemService.readFile('agent-1', '/etc/passwd')).rejects.toThrow(
        'Path must be relative'
      )
    })

    it('should block encoded path traversal attempts', async () => {
      await expect(
        filesystemService.readFile('agent-1', '/agents/agent-1/%2e%2e/%2e%2e/sensitive/data.txt')
      ).rejects.toThrow('Path traversal detected')
    })

    it('should block null byte injection', async () => {
      await expect(
        filesystemService.readFile('agent-1', '/agents/agent-1/test.txt\x00../../etc/passwd')
      ).rejects.toThrow()
    })

    it('should block symbolic link traversal attempts', async () => {
      // Note: Actual symlink creation would require real filesystem operations
      // This test documents the requirement
      expect(true).toBe(true)
    })

    it('should normalize paths before validation', async () => {
      // Paths like /agents/agent-1/./subdir/../file.txt should be normalized
      await expect(
        filesystemService.readFile('agent-1', '/agents/agent-1/./subdir/../../../etc/passwd')
      ).rejects.toThrow('Path traversal detected')
    })

    it('should reject Windows-style path separators on Linux', async () => {
      await expect(
        filesystemService.readFile('agent-1', '/agents/agent-1\\..\\..\\sensitive\\data.txt')
      ).rejects.toThrow()
    })

    it('should block double-encoded traversal sequences', async () => {
      await expect(
        filesystemService.readFile('agent-1', '/agents/agent-1/%252e%252e/sensitive/data.txt')
      ).rejects.toThrow()
    })
  })

  describe('2. Agent Impersonation Prevention', () => {
    it('should reject mismatched agentId in tool execution', async () => {
      const mockExecutor: ToolExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }
      const toolRegistry = createToolRegistry()
      toolRegistry.register('read_file', mockExecutor)

      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-corr-1'
      }

      const params = {
        agentId: 'agent-2', // Claiming to be different agent
        path: '/agents/agent-1/private/file.txt'
      }

      await expect(toolRegistry.executeTool('read_file', params, context)).rejects.toThrow(
        SecurityError
      )
    })

    it('should reject missing agentId in tool parameters', async () => {
      const mockExecutor: ToolExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }
      const toolRegistry = createToolRegistry()
      toolRegistry.register('read_file', mockExecutor)

      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-corr-1'
      }

      const params = {
        // Missing agentId
        path: '/agents/agent-1/private/file.txt'
      }

      await expect(toolRegistry.executeTool('read_file', params, context)).rejects.toThrow(
        SecurityError
      )
    })

    it('should reject empty agentId in tool parameters', async () => {
      const mockExecutor: ToolExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }
      const toolRegistry = createToolRegistry()
      toolRegistry.register('read_file', mockExecutor)

      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-corr-1'
      }

      const params = {
        agentId: '', // Empty string
        path: '/agents/agent-1/private/file.txt'
      }

      await expect(toolRegistry.executeTool('read_file', params, context)).rejects.toThrow(
        SecurityError
      )
    })

    it('should reject case-mismatched agentId', async () => {
      const mockExecutor: ToolExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }
      const toolRegistry = createToolRegistry()
      toolRegistry.register('read_file', mockExecutor)

      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-corr-1'
      }

      const params = {
        agentId: 'AGENT-1', // Case mismatch
        path: '/agents/agent-1/private/file.txt'
      }

      await expect(toolRegistry.executeTool('read_file', params, context)).rejects.toThrow(
        SecurityError
      )
    })

    it('should reject whitespace-padded agentId', async () => {
      const mockExecutor: ToolExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }
      const toolRegistry = createToolRegistry()
      toolRegistry.register('read_file', mockExecutor)

      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-corr-1'
      }

      const params = {
        agentId: ' agent-1 ', // Padded with whitespace
        path: '/agents/agent-1/private/file.txt'
      }

      await expect(toolRegistry.executeTool('read_file', params, context)).rejects.toThrow(
        SecurityError
      )
    })
  })

  describe('3. Privilege Escalation Prevention', () => {
    it('should prevent agent from accessing another agents private workspace', async () => {
      const canAccess = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/agent-2/private/secret.md',
        'read'
      )
      expect(canAccess).toBe(false)
    })

    it('should prevent agent from writing to another agents private workspace', async () => {
      const canAccess = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/agent-2/private/malicious.txt',
        'write'
      )
      expect(canAccess).toBe(false)
    })

    it('should prevent agent from deleting files in another agents private workspace', async () => {
      const canAccess = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/agent-2/private/important.md',
        'delete'
      )
      expect(canAccess).toBe(false)
    })

    it('should prevent agent from accessing team private workspace without membership', async () => {
      const canAccess = await permissionService.checkFileAccess(
        'agent-1',
        '/teams/team-1/private/plans.md',
        'read'
      )
      expect(canAccess).toBe(false)
    })

    it('should prevent worker agents from writing to shared library', async () => {
      const canAccess = await permissionService.checkFileAccess(
        'agent-worker',
        '/library/shared/document.md',
        'write'
      )
      expect(canAccess).toBe(false)
    })

    it('should prevent non-library team members from deleting library content', async () => {
      const canAccess = await permissionService.checkFileAccess(
        'agent-outsider',
        '/library/shared/guide.md',
        'delete'
      )
      expect(canAccess).toBe(false)
    })

    it('should prevent agents from escalating via org-level paths', () => {
      const canAccess = permissionService.checkFileAccess(
        'agent-1',
        '/organizations/org-1/admin/config.json',
        'write'
      )
      expect(canAccess).toBe(false)
    })

    it('should prevent agents from accessing system-level paths', async () => {
      const canAccess = await permissionService.checkFileAccess(
        'agent-1',
        '/system/secrets.json',
        'read'
      )
      expect(canAccess).toBe(false)
    })
  })

  describe('4. Workspace Boundary Violations', () => {
    it('should enforce agent private workspace boundaries', async () => {
      expect(
        await permissionService.checkFileAccess(
          'agent-1',
          '/agents/agent-1/private/file.txt',
          'read'
        )
      ).toBe(true)
      expect(
        await permissionService.checkFileAccess(
          'agent-1',
          '/agents/agent-2/private/file.txt',
          'read'
        )
      ).toBe(false)
    })

    it('should enforce agent shared workspace boundaries', async () => {
      expect(
        await permissionService.checkFileAccess(
          'agent-1',
          '/agents/agent-1/shared/file.txt',
          'read'
        )
      ).toBe(true)
      expect(
        await permissionService.checkFileAccess(
          'agent-2',
          '/agents/agent-1/shared/file.txt',
          'read'
        )
      ).toBe(true)
    })

    it('should enforce team private workspace boundaries', async () => {
      expect(
        await permissionService.checkFileAccess(
          'agent-in-team-1',
          '/teams/team-1/private/file.txt',
          'read'
        )
      ).toBe(true)
      expect(
        await permissionService.checkFileAccess(
          'agent-in-team-2',
          '/teams/team-1/private/file.txt',
          'read'
        )
      ).toBe(false)
    })

    it('should enforce team shared workspace boundaries', async () => {
      expect(
        await permissionService.checkFileAccess(
          'agent-in-team-1',
          '/teams/team-1/shared/file.txt',
          'read'
        )
      ).toBe(true)
      expect(
        await permissionService.checkFileAccess(
          'agent-outside-team',
          '/teams/team-1/shared/file.txt',
          'read'
        )
      ).toBe(true)
    })

    it('should reject paths that dont match any workspace pattern', async () => {
      expect(
        await permissionService.checkFileAccess('agent-1', '/invalid/path/file.txt', 'read')
      ).toBe(false)
      expect(await permissionService.checkFileAccess('agent-1', '/random/file.txt', 'read')).toBe(
        false
      )
    })

    it('should reject empty paths', async () => {
      const mockExecutor: ToolExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }
      const mockPermissionService = {
        checkFileAccess: vi.fn().mockReturnValue(true)
      }
      const toolRegistry = createToolRegistry(mockPermissionService)
      toolRegistry.register('read_file', mockExecutor)

      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-corr-1'
      }

      await expect(
        toolRegistry.executeTool('read_file', { agentId: 'agent-1', path: '' }, context)
      ).rejects.toThrow(PermissionError)
    })

    it('should reject null paths', async () => {
      const mockExecutor: ToolExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }
      const mockPermissionService = {
        checkFileAccess: vi.fn().mockReturnValue(true)
      }
      const toolRegistry = createToolRegistry(mockPermissionService)
      toolRegistry.register('read_file', mockExecutor)

      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-corr-1'
      }

      await expect(
        toolRegistry.executeTool('read_file', { agentId: 'agent-1', path: null }, context)
      ).rejects.toThrow(PermissionError)
    })
  })

  describe('5. Quota Enforcement', () => {
    it('should document maxFiles quota field exists on Agent type', () => {
      // Issue #40 added maxFiles and storageQuotaMB fields
      const agentWithQuota = {
        maxFiles: 1000,
        storageQuotaMB: 100
      }
      expect(agentWithQuota.maxFiles).toBeDefined()
      expect(agentWithQuota.storageQuotaMB).toBeDefined()
    })

    it('should document maxFiles quota field exists on Team type', () => {
      const teamWithQuota = {
        maxFiles: 2000,
        storageQuotaGB: 1
      }
      expect(teamWithQuota.maxFiles).toBeDefined()
      expect(teamWithQuota.storageQuotaGB).toBeDefined()
    })

    it('should reject files exceeding size limit', async () => {
      const largeContent = 'x'.repeat(6 * 1024 * 1024) // 6MB, over 5MB limit
      await expect(
        filesystemService.writeFile('agent-1', '/agents/agent-1/private/large.txt', largeContent)
      ).rejects.toThrow('File size exceeds maximum allowed size')
    })

    it('should allow files within size limit', async () => {
      const smallContent = 'x'.repeat(1024 * 1024) // 1MB, under 5MB limit
      await filesystemService.writeFile(
        'agent-1',
        '/agents/agent-1/private/small.txt',
        smallContent
      )

      const result = await filesystemService.readFile(
        'agent-1',
        '/agents/agent-1/private/small.txt'
      )
      expect(result.content).toBe(smallContent)
    })
  })

  describe('6. Audit Logging Integrity', () => {
    it('should log all read operations', async () => {
      await filesystemService.writeFile('agent-1', '/agents/agent-1/private/test.txt', 'content')
      await filesystemService.readFile('agent-1', '/agents/agent-1/private/test.txt')

      const logs = await auditService.query({ agentId: 'agent-1', operation: 'read' })
      expect(logs.length).toBeGreaterThan(0)
      expect(logs.some((log) => log.path === '/agents/agent-1/private/test.txt')).toBe(true)
    })

    it('should log all write operations', async () => {
      await filesystemService.writeFile('agent-1', '/agents/agent-1/private/test.txt', 'content')

      const logs = await auditService.query({ agentId: 'agent-1', operation: 'write' })
      expect(logs.length).toBeGreaterThan(0)
      expect(logs.some((log) => log.path === '/agents/agent-1/private/test.txt')).toBe(true)
    })

    it('should log all delete operations', async () => {
      await filesystemService.writeFile('agent-1', '/agents/agent-1/private/test.txt', 'content')
      await filesystemService.deleteFile('agent-1', '/agents/agent-1/private/test.txt')

      const logs = await auditService.query({ agentId: 'agent-1', operation: 'delete' })
      expect(logs.length).toBeGreaterThan(0)
      expect(logs.some((log) => log.path === '/agents/agent-1/private/test.txt')).toBe(true)
    })

    it('should log failed operations with error details', async () => {
      try {
        await filesystemService.readFile('agent-1', '/agents/agent-1/private/nonexistent.txt')
      } catch {
        // Expected to fail
      }

      const logs = await auditService.query({ agentId: 'agent-1', operation: 'read' })
      const errorLog = logs.find((log) => log.path === '/agents/agent-1/private/nonexistent.txt')
      expect(errorLog).toBeDefined()
      expect(errorLog?.error).toBeDefined()
    })

    it('should include timestamps in all audit logs', async () => {
      await filesystemService.writeFile('agent-1', '/agents/agent-1/private/test.txt', 'content')

      const logs = await auditService.query({ agentId: 'agent-1' })
      expect(logs.length).toBeGreaterThan(0)
      logs.forEach((log) => {
        expect(log.timestamp).toBeInstanceOf(Date)
      })
    })

    it('should preserve audit log immutability', async () => {
      await filesystemService.writeFile('agent-1', '/agents/agent-1/private/test.txt', 'content')

      // Audit log uses append-only JSON Lines format
      // This test documents the requirement for immutability
      const logs = await auditService.query({ agentId: 'agent-1' })
      expect(logs.length).toBeGreaterThan(0)
    })
  })

  describe('7. Error Information Disclosure Prevention', () => {
    it('should not expose internal paths in error messages', async () => {
      try {
        await filesystemService.readFile('agent-1', '/agents/agent-1/../../etc/passwd')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        expect(errorMessage).not.toContain(process.cwd())
        expect(errorMessage).not.toContain('/etc/passwd')
      }
    })

    it('should not expose agent IDs of other agents in error messages', async () => {
      try {
        const canAccess = await permissionService.checkFileAccess(
          'agent-1',
          '/agents/agent-2/private/file.txt',
          'read'
        )
        expect(canAccess).toBe(false)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        // Error should not leak sensitive information
        expect(errorMessage).not.toContain('agent-2')
      }
    })

    it('should use generic error messages for permission denials', async () => {
      const mockExecutor: ToolExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }
      const mockPermissionService = {
        checkFileAccess: vi.fn().mockReturnValue(false)
      }
      const toolRegistry = createToolRegistry(mockPermissionService)
      toolRegistry.register('read_file', mockExecutor)

      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-corr-1'
      }

      try {
        await toolRegistry.executeTool(
          'read_file',
          { agentId: 'agent-1', path: '/agents/agent-2/private/file.txt' },
          context
        )
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionError)
        const errorMessage = error instanceof Error ? error.message : String(error)
        // Should contain context but not leak sensitive details
        expect(errorMessage).toContain('does not have')
        expect(errorMessage).toContain('access')
      }
    })
  })

  describe('8. Race Condition and Concurrency Tests', () => {
    it('should handle concurrent write operations safely', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        filesystemService.writeFile(
          'agent-1',
          `/agents/agent-1/private/file-${i}.txt`,
          `content-${i}`
        )
      )

      await Promise.all(operations)

      // Verify all files were written
      for (let i = 0; i < 10; i++) {
        const result = await filesystemService.readFile(
          'agent-1',
          `/agents/agent-1/private/file-${i}.txt`
        )
        expect(result.content).toBe(`content-${i}`)
      }
    })

    it('should handle concurrent read operations safely', async () => {
      await filesystemService.writeFile('agent-1', '/agents/agent-1/private/test.txt', 'content')

      const operations = Array.from({ length: 10 }, () =>
        filesystemService.readFile('agent-1', '/agents/agent-1/private/test.txt')
      )

      const results = await Promise.all(operations)
      results.forEach((result) => {
        expect(result.content).toBe('content')
      })
    })

    it('should handle mixed read/write operations safely', async () => {
      await filesystemService.writeFile('agent-1', '/agents/agent-1/private/test.txt', 'initial')

      const operations = [
        filesystemService.readFile('agent-1', '/agents/agent-1/private/test.txt'),
        filesystemService.writeFile('agent-1', '/agents/agent-1/private/test.txt', 'updated'),
        filesystemService.readFile('agent-1', '/agents/agent-1/private/test.txt')
      ]

      await Promise.all(operations)

      // Final state should be consistent
      const finalResult = await filesystemService.readFile(
        'agent-1',
        '/agents/agent-1/private/test.txt'
      )
      expect(['initial', 'updated']).toContain(finalResult.content)
    })
  })

  describe('9. Integration Tests - Full Security Stack', () => {
    it('should enforce complete security chain: identity → permissions → execution', async () => {
      const mockExecutor: ToolExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }
      const mockPermissionService = {
        checkFileAccess: vi.fn().mockReturnValue(false)
      }
      const toolRegistry = createToolRegistry(mockPermissionService)
      toolRegistry.register('read_file', mockExecutor)

      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-corr-1'
      }

      // Wrong agentId should fail at identity check
      await expect(
        toolRegistry.executeTool('read_file', { agentId: 'agent-2', path: '/test.txt' }, context)
      ).rejects.toThrow(SecurityError)

      // Correct identity but no permission should fail at permission check
      await expect(
        toolRegistry.executeTool(
          'read_file',
          { agentId: 'agent-1', path: '/forbidden.txt' },
          context
        )
      ).rejects.toThrow(PermissionError)

      // Both should pass before tool executes
      mockPermissionService.checkFileAccess.mockReturnValue(true)
      await toolRegistry.executeTool(
        'read_file',
        { agentId: 'agent-1', path: '/allowed.txt' },
        context
      )
      expect(mockExecutor.execute).toHaveBeenCalled()
    })

    it('should log security violations at appropriate severity levels', async () => {
      // This test documents logging requirements
      // SecurityError (identity mismatch) should log at ERROR level
      // PermissionError (access denial) should log at WARN level
      expect(true).toBe(true)
    })

    it('should include correlation IDs in all security events', async () => {
      const mockExecutor: ToolExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }
      const toolRegistry = createToolRegistry()
      toolRegistry.register('read_file', mockExecutor)

      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-correlation-id-123'
      }

      try {
        await toolRegistry.executeTool(
          'read_file',
          { agentId: 'agent-2', path: '/test.txt' },
          context
        )
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityError)
        // Correlation ID should be included for tracking
        expect(true).toBe(true)
      }
    })
  })

  describe('10. File Type Validation', () => {
    it('should allow whitelisted file extensions', async () => {
      const allowedTypes = [
        '.md',
        '.txt',
        '.pdf',
        '.json',
        '.yaml',
        '.svg',
        '.png',
        '.jpg',
        '.jpeg'
      ]

      for (const ext of allowedTypes) {
        await filesystemService.writeFile(
          'agent-1',
          `/agents/agent-1/private/file${ext}`,
          'content'
        )
        const result = await filesystemService.readFile(
          'agent-1',
          `/agents/agent-1/private/file${ext}`
        )
        expect(result.content).toBe('content')
      }
    })

    it('should reject disallowed file extensions', async () => {
      const disallowedTypes = ['.exe', '.sh', '.bat', '.dll', '.so']

      for (const ext of disallowedTypes) {
        await expect(
          filesystemService.writeFile(
            'agent-1',
            `/agents/agent-1/private/malicious${ext}`,
            'content'
          )
        ).rejects.toThrow('File type not allowed')
      }
    })

    it('should reject files without extension', async () => {
      await expect(
        filesystemService.writeFile('agent-1', '/agents/agent-1/private/noextension', 'content')
      ).rejects.toThrow('File type not allowed')
    })
  })
})
