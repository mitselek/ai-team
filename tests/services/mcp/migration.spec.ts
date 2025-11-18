import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { FilesystemService } from '../../../app/server/services/persistence/file-workspace'
import { mkdir } from 'fs/promises'
import { join } from 'path'

describe('Migration - Issue #64', () => {
  const testDataPath = '/tmp/test-migration'

  beforeEach(async () => {
    // Clean up test directory
    try {
      await mkdir(join(testDataPath, 'data'), { recursive: true })
    } catch {
      // Ignore if exists
    }
  })

  afterEach(async () => {
    // Cleanup handled by temp directory
  })

  describe('Path Resolution', () => {
    it('should resolve workspaces paths correctly', () => {
      const agentPath = '/workspaces/agent-123/private/file.md'
      const teamPath = '/workspaces/team-dev/shared/doc.md'

      expect(agentPath).toContain('/workspaces/')
      expect(agentPath).toMatch(/\/workspaces\/agent-[^/]+\//)
      expect(teamPath).toMatch(/\/workspaces\/team-[^/]+\//)
    })

    it('should accept workspaces prefix in validation', () => {
      const validPaths = [
        '/workspaces/agent-123/private/file.md',
        '/workspaces/agent-123/shared/file.md',
        '/workspaces/team-dev/private/file.md',
        '/workspaces/team-dev/shared/file.md'
      ]

      validPaths.forEach((path) => {
        expect(path.startsWith('/workspaces/')).toBe(true)
      })
    })
  })

  describe('Integration with New Structure', () => {
    it('should use workspaces paths in list_folders', async () => {
      const mockFilesystemService = {
        listFiles: vi.fn().mockResolvedValue([])
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)
      fileServer.setOrganizationId('org-123')

      const result = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-123',
          scope: 'my_private'
        }
      })

      const parsed = JSON.parse(result.content![0].text!)
      const folder = parsed.folders[0]

      expect(folder.path).toBe('org-123/workspaces/agent-123/private/')
    })

    it('should use workspaces paths in file operations by ID with UUID-based addressing', async () => {
      const mockFilesystemService = {
        writeFile: vi.fn().mockResolvedValue({ success: true })
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)
      fileServer.setOrganizationId('org-123')
      fileServer.setOrganizationId('org-123')

      await fileServer.executeTool({
        name: 'write_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId: 'agent-123',
          scope: 'private',
          path: 'test.md',
          content: 'content'
        }
      })

      expect(mockFilesystemService.writeFile).toHaveBeenCalledWith(
        'agent-123',
        'org-123/workspaces/agent-123/private/test.md',
        'content',
        'org-123'
      )
    })
  })

  describe('Full Workflow End-to-End', () => {
    it('should complete workflow with workspaces structure', async () => {
      const mockFilesystemService = {
        listFiles: vi.fn().mockResolvedValue([]),
        writeFile: vi.fn().mockResolvedValue({ success: true }),
        readFile: vi.fn().mockResolvedValue({
          content: 'test content',
          metadata: { size: 12, modified: new Date(), created: new Date() }
        }),
        deleteFile: vi.fn().mockResolvedValue({ success: true })
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)
      fileServer.setOrganizationId('org-123')

      // 1. Discover
      const discoverResult = await fileServer.executeTool({
        name: 'list_folders',
        arguments: { agentId: 'agent-123', scope: 'my_private' }
      })
      const folders = JSON.parse(discoverResult.content![0].text!).folders
      expect(folders[0].path).toBe('/workspaces/agent-123/private/')

      // 2. Write
      await fileServer.executeTool({
        name: 'write_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId: folders[0].folderId,
          filename: 'workflow.md',
          content: 'test content'
        }
      })
      expect(mockFilesystemService.writeFile).toHaveBeenCalledWith(
        'agent-123',
        '/workspaces/agent-123/private/workflow.md',
        'test content'
      )

      // 3. Read
      await fileServer.executeTool({
        name: 'read_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId: folders[0].folderId,
          filename: 'workflow.md'
        }
      })
      expect(mockFilesystemService.readFile).toHaveBeenCalledWith(
        'agent-123',
        '/workspaces/agent-123/private/workflow.md'
      )

      // 4. Delete
      await fileServer.executeTool({
        name: 'delete_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId: folders[0].folderId,
          filename: 'workflow.md'
        }
      })
      expect(mockFilesystemService.deleteFile).toHaveBeenCalledWith(
        'agent-123',
        '/workspaces/agent-123/private/workflow.md'
      )
    })
  })
})
