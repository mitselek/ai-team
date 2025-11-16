import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FilesystemService } from '@@/app/server/services/persistence/file-workspace'
import type { FolderScope, FileListResult } from '@@/types'
import type { MCPToolResult } from '@@/app/server/services/llm/mcp/types'

// Helper to safely parse MCP tool result
function parseToolResult(result: MCPToolResult) {
  if (result.isError) {
    return { error: JSON.parse(result.content![0].text!).error }
  }
  return JSON.parse(result.content![0].text!)
}

describe('list_folders Tool - Issue #62', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Tool Definition', () => {
    it('should register list_folders tool', async () => {
      const mockFilesystemService = {} as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const tools = fileServer.getToolDefinitions()
      const listFoldersTool = tools.find((t) => t.name === 'list_folders')

      expect(listFoldersTool).toBeDefined()
      expect(listFoldersTool?.name).toBe('list_folders')
      expect(listFoldersTool?.description).toBeTruthy()
    })

    it('should have scope parameter as required enum', async () => {
      const mockFilesystemService = {} as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const tools = fileServer.getToolDefinitions()
      const listFoldersTool = tools.find((t) => t.name === 'list_folders')

      expect(listFoldersTool?.inputSchema.properties?.scope).toBeDefined()
      expect(listFoldersTool?.inputSchema.required).toContain('scope')

      const scopeProperty = listFoldersTool?.inputSchema.properties?.scope as { enum: string[] }
      expect(scopeProperty?.enum).toEqual([
        'my_private',
        'my_shared',
        'team_private',
        'team_shared',
        'org_shared'
      ])
    })
  })

  describe('my_private scope', () => {
    it('should return agent private folder with files and metadata', async () => {
      const mockFilesystemService = {
        listFiles: vi.fn().mockResolvedValue([
          {
            path: '/workspaces/agent-123/private/notes.md',
            name: 'notes.md',
            size: 1024,
            modified: new Date('2024-01-01'),
            isDirectory: false
          }
        ])
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-123',
          scope: 'my_private' as FolderScope
        }
      })

      expect(result.isError).toBeFalsy()
      const parsed = parseToolResult(result)
      expect(parsed.folders).toHaveLength(1)

      const folder: FileListResult = parsed.folders[0]
      expect(folder.folderType).toBe('my_private')
      expect(folder.folderId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
      expect(folder.path).toBe('/workspaces/agent-123/private/')
      expect(folder.fileCount).toBe(1)
      expect(folder.files).toHaveLength(1)
      expect(folder.files[0].filename).toBe('notes.md')
      expect(folder.files[0].size).toBe(1024)
      expect(folder.files[0].mimeType).toBe('text/markdown')
    })

    it('should handle empty private folder', async () => {
      const mockFilesystemService = {
        listFiles: vi.fn().mockResolvedValue([])
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-123',
          scope: 'my_private' as FolderScope
        }
      })

      const parsed = parseToolResult(result)
      const folder: FileListResult = parsed.folders[0]
      expect(folder.fileCount).toBe(0)
      expect(folder.files).toEqual([])
    })
  })

  describe('my_shared scope', () => {
    it('should return agent shared folder', async () => {
      const mockFilesystemService = {
        listFiles: vi.fn().mockResolvedValue([
          {
            path: '/workspaces/agent-123/shared/public.md',
            name: 'public.md',
            size: 2048,
            modified: new Date(),
            isDirectory: false
          }
        ])
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-123',
          scope: 'my_shared' as FolderScope
        }
      })

      const parsed = parseToolResult(result)
      const folder: FileListResult = parsed.folders[0]
      expect(folder.folderType).toBe('my_shared')
      expect(folder.path).toBe('/workspaces/agent-123/shared/')
      expect(folder.files).toHaveLength(1)
      expect(folder.files[0].mimeType).toBe('text/markdown')
    })
  })

  describe('team_private scope', () => {
    it('should return team private folder when agent has team', async () => {
      const mockFilesystemService = {
        listFiles: vi.fn().mockResolvedValue([])
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-123',
          teamId: 'team-dev',
          scope: 'team_private' as FolderScope
        }
      })

      const parsed = parseToolResult(result)
      const folder: FileListResult = parsed.folders[0]
      expect(folder.folderType).toBe('team_private')
      expect(folder.path).toBe('/workspaces/team-dev/private/')
    })

    it('should error when agent has no team', async () => {
      const mockFilesystemService = {} as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-solo',
          scope: 'team_private' as FolderScope
        }
      })

      expect(result.isError).toBe(true)
      const parsed = parseToolResult(result)
      expect(parsed.error).toContain('not on a team')
    })
  })

  describe('team_shared scope', () => {
    it('should return team shared folder', async () => {
      const mockFilesystemService = {
        listFiles: vi.fn().mockResolvedValue([])
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-123',
          teamId: 'team-dev',
          scope: 'team_shared' as FolderScope
        }
      })

      const parsed = parseToolResult(result)
      const folder: FileListResult = parsed.folders[0]
      expect(folder.folderType).toBe('team_shared')
      expect(folder.path).toBe('/workspaces/team-dev/shared/')
    })

    it('should error when agent has no team', async () => {
      const mockFilesystemService = {} as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-solo',
          scope: 'team_shared' as FolderScope
        }
      })

      expect(result.isError).toBe(true)
      const parsed = parseToolResult(result)
      expect(parsed.error).toContain('not on a team')
    })
  })

  describe('org_shared scope', () => {
    it('should return all teams shared and members shared excluding own', async () => {
      const mockFilesystemService = {
        listFiles: vi.fn().mockResolvedValue([])
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      // This test validates the org_shared pattern
      // Implementation will require mocking data loaders in Issue #62
      const result = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-123',
          organizationId: 'org-1',
          teamId: 'team-dev',
          scope: 'org_shared' as FolderScope
        }
      })

      const parsed = parseToolResult(result)
      expect(parsed.folders).toBeDefined()
      expect(Array.isArray(parsed.folders)).toBe(true)

      // Verify own shared folder not included
      const ownFolder = parsed.folders.find((f: FileListResult) => f.path.includes('/agent-123/'))
      expect(ownFolder).toBeUndefined()
    })

    it('should return empty when no other shared folders exist', async () => {
      const mockFilesystemService = {} as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-solo',
          organizationId: 'org-1',
          scope: 'org_shared' as FolderScope
        }
      })

      const parsed = parseToolResult(result)
      expect(parsed.folders).toBeDefined()
      expect(Array.isArray(parsed.folders)).toBe(true)
    })
  })

  describe('MIME type guessing', () => {
    it('should guess correct MIME types for common extensions', async () => {
      const mockFilesystemService = {
        listFiles: vi.fn().mockResolvedValue([
          {
            path: '/workspaces/agent-123/private/doc.md',
            name: 'doc.md',
            size: 100,
            modified: new Date(),
            isDirectory: false
          },
          {
            path: '/workspaces/agent-123/private/data.json',
            name: 'data.json',
            size: 200,
            modified: new Date(),
            isDirectory: false
          },
          {
            path: '/workspaces/agent-123/private/readme.txt',
            name: 'readme.txt',
            size: 50,
            modified: new Date(),
            isDirectory: false
          }
        ])
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-123',
          scope: 'my_private' as FolderScope
        }
      })

      const parsed = parseToolResult(result)
      const folder: FileListResult = parsed.folders[0]

      const mdFile = folder.files.find((f) => f.filename === 'doc.md')
      expect(mdFile?.mimeType).toBe('text/markdown')

      const jsonFile = folder.files.find((f) => f.filename === 'data.json')
      expect(jsonFile?.mimeType).toBe('application/json')

      const txtFile = folder.files.find((f) => f.filename === 'readme.txt')
      expect(txtFile?.mimeType).toBe('text/plain')
    })
  })

  describe('FolderId resolution', () => {
    it('should generate valid UUID v4 folderIds', async () => {
      const mockFilesystemService = {
        listFiles: vi.fn().mockResolvedValue([])
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-123',
          scope: 'my_private' as FolderScope
        }
      })

      const parsed = parseToolResult(result)
      const folder: FileListResult = parsed.folders[0]

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      // where y is 8, 9, a, or b
      expect(folder.folderId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
    })

    it('should allow folderId resolution for returned folders', async () => {
      const mockFilesystemService = {
        listFiles: vi.fn().mockResolvedValue([])
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('@@/app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-123',
          scope: 'my_private' as FolderScope
        }
      })

      const parsed = parseToolResult(result)
      const folder: FileListResult = parsed.folders[0]

      // Should be able to resolve the folderId
      const resolvedPath = fileServer.resolveFolderId(folder.folderId)
      expect(resolvedPath).toBe('/workspaces/agent-123/private/')
    })
  })
})
