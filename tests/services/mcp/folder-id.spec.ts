import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FolderScope, FolderInfo, FileListResult, FileEntry } from '@@/types'
import type { FilesystemService } from '../../../app/server/services/persistence/file-workspace'

// Mock the logger to avoid stream.write errors
vi.mock('../../../server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  }),
  newCorrelationId: () => 'test-correlation-id'
}))

describe('FolderId Strategy - Type Definitions', () => {
  describe('FolderScope type', () => {
    it('should accept all 5 valid scope values', () => {
      const scopes: FolderScope[] = [
        'my_private',
        'my_shared',
        'team_private',
        'team_shared',
        'org_shared'
      ]

      // TypeScript compilation validates this
      expect(scopes.length).toBe(5)
    })
  })

  describe('FolderInfo interface', () => {
    it('should have all required fields', () => {
      const folderInfo: FolderInfo = {
        folderId: 'test-uuid',
        folderName: 'Test Folder',
        folderType: 'my_private',
        path: '/workspaces/agent-test/private/',
        fileCount: 5
      }

      expect(folderInfo.folderId).toBe('test-uuid')
      expect(folderInfo.folderName).toBe('Test Folder')
      expect(folderInfo.folderType).toBe('my_private')
      expect(folderInfo.path).toBe('/workspaces/agent-test/private/')
      expect(folderInfo.fileCount).toBe(5)
    })
  })

  describe('FileEntry interface', () => {
    it('should have all required fields', () => {
      const fileEntry: FileEntry = {
        filename: 'test.md',
        size: 1024,
        modified: '2025-11-16T10:30:00Z',
        mimeType: 'text/markdown'
      }

      expect(fileEntry.filename).toBe('test.md')
      expect(fileEntry.size).toBe(1024)
      expect(fileEntry.modified).toBe('2025-11-16T10:30:00Z')
      expect(fileEntry.mimeType).toBe('text/markdown')
    })

    it('should allow optional mimeType', () => {
      const fileEntry: FileEntry = {
        filename: 'unknown.dat',
        size: 512,
        modified: '2025-11-16T10:30:00Z'
      }

      expect(fileEntry.mimeType).toBeUndefined()
    })
  })

  describe('FileListResult interface', () => {
    it('should extend FolderInfo with files array', () => {
      const fileListResult: FileListResult = {
        folderId: 'test-uuid',
        folderName: 'Test Folder',
        folderType: 'my_shared',
        path: '/workspaces/agent-test/shared/',
        fileCount: 2,
        files: [
          {
            filename: 'file1.md',
            size: 1024,
            modified: '2025-11-16T10:30:00Z',
            mimeType: 'text/markdown'
          },
          {
            filename: 'file2.txt',
            size: 512,
            modified: '2025-11-16T11:00:00Z',
            mimeType: 'text/plain'
          }
        ]
      }

      expect(fileListResult.folderId).toBeDefined()
      expect(fileListResult.files).toHaveLength(2)
      expect(fileListResult.files[0].filename).toBe('file1.md')
    })
  })
})

describe('FolderId Strategy - Generation and Resolution', () => {
  // Import the file-server for testing
  let MCPFileServer: typeof import('../../../app/server/services/mcp/file-server').MCPFileServer
  let fileServer: InstanceType<typeof MCPFileServer>

  beforeEach(async () => {
    // Dynamic import to avoid circular dependency issues
    const module = await import('../../../app/server/services/mcp/file-server')
    MCPFileServer = module.MCPFileServer

    // Mock filesystem service (partial mock is sufficient for these tests)
    const mockFilesystemService = {} as FilesystemService

    fileServer = new MCPFileServer(mockFilesystemService)
  })

  describe('generateFolderId', () => {
    it('should generate a valid UUID v4', () => {
      const folderId = fileServer.generateFolderId('/test/path')

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(folderId).toMatch(uuidRegex)
    })

    it('should generate unique IDs on each call', () => {
      const id1 = fileServer.generateFolderId('/test/path1')
      const id2 = fileServer.generateFolderId('/test/path2')
      const id3 = fileServer.generateFolderId('/test/path3')

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it('should not have collisions in 100 generations', () => {
      const ids = new Set<string>()

      for (let i = 0; i < 100; i++) {
        const id = fileServer.generateFolderId(`/test/path${i}`)
        ids.add(id)
      }

      expect(ids.size).toBe(100)
    })
  })

  describe('resolveFolderId', () => {
    it('should return path for valid cached folderId', () => {
      const path = '/workspaces/agent-test/private/'
      const folderId = fileServer.generateFolderId(path)

      const resolvedPath = fileServer.resolveFolderId(folderId)
      expect(resolvedPath).toBe(path)
    })

    it('should throw error for invalid folderId', () => {
      expect(() => {
        fileServer.resolveFolderId('invalid-uuid-12345')
      }).toThrow()
    })

    it('should throw error with actionable message for invalid folderId', () => {
      expect(() => {
        fileServer.resolveFolderId('nonexistent-id')
      }).toThrow(/not found/i)
    })
  })

  describe('FolderId TTL and expiration', () => {
    it('should expire folderIds after 30 minutes', () => {
      vi.useFakeTimers()

      const path = '/workspaces/agent-test/private/'
      const folderId = fileServer.generateFolderId(path)

      // Verify it works immediately
      expect(fileServer.resolveFolderId(folderId)).toBe(path)

      // Advance time by 29 minutes (should still work)
      vi.advanceTimersByTime(29 * 60 * 1000)
      expect(fileServer.resolveFolderId(folderId)).toBe(path)

      // Advance time by 2 more minutes (total 31 minutes - should expire)
      vi.advanceTimersByTime(2 * 60 * 1000)
      expect(() => {
        fileServer.resolveFolderId(folderId)
      }).toThrow()

      vi.useRealTimers()
    })

    it('should provide clear error message for expired folderId', () => {
      vi.useFakeTimers()

      const path = '/workspaces/agent-test/private/'
      const folderId = fileServer.generateFolderId(path)

      // Advance time past expiration
      vi.advanceTimersByTime(31 * 60 * 1000)

      expect(() => {
        fileServer.resolveFolderId(folderId)
      }).toThrow(/expired/i)

      expect(() => {
        fileServer.resolveFolderId(folderId)
      }).toThrow(/list_folders/i)

      vi.useRealTimers()
    })

    it('should clean up expired entries from cache', () => {
      vi.useFakeTimers()

      // Generate multiple folderIds
      const path1 = '/workspaces/agent-1/private/'
      const path2 = '/workspaces/agent-2/private/'
      const folderId1 = fileServer.generateFolderId(path1)
      const folderId2 = fileServer.generateFolderId(path2)

      // Verify both work
      expect(fileServer.resolveFolderId(folderId1)).toBe(path1)
      expect(fileServer.resolveFolderId(folderId2)).toBe(path2)

      // Advance time past expiration
      vi.advanceTimersByTime(31 * 60 * 1000)

      // Trigger cleanup (implementation should have a cleanup method)
      if (fileServer.cleanupExpiredFolderIds) {
        fileServer.cleanupExpiredFolderIds()
      }

      // Both should be expired now
      expect(() => fileServer.resolveFolderId(folderId1)).toThrow()
      expect(() => fileServer.resolveFolderId(folderId2)).toThrow()

      vi.useRealTimers()
    })
  })

  describe('Error message quality', () => {
    it('should suggest calling list_folders() on expired folderId', () => {
      vi.useFakeTimers()

      const path = '/workspaces/agent-test/private/'
      const folderId = fileServer.generateFolderId(path)

      vi.advanceTimersByTime(31 * 60 * 1000)

      expect(() => {
        fileServer.resolveFolderId(folderId)
      }).toThrow(/list_folders\(\)/)

      vi.useRealTimers()
    })

    it('should explain what to do for invalid folderId', () => {
      expect(() => {
        fileServer.resolveFolderId('invalid-id')
      }).toThrow(/not found|invalid/i)
    })
  })
})
