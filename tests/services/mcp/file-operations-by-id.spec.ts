import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FilesystemService } from '../../../app/server/services/persistence/file-workspace'
import type { MCPToolResult } from '../../../app/server/services/llm/mcp/types'

// Helper to safely parse MCP tool result
function parseToolResult(result: MCPToolResult) {
  if (result.isError) {
    return { error: JSON.parse(result.content![0].text!).error }
  }
  return JSON.parse(result.content![0].text!)
}

describe('File Operations by ID - Issue #63', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Tool Definitions', () => {
    it('should register read_file_by_id tool', async () => {
      const mockFilesystemService = {} as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const tools = fileServer.getToolDefinitions()
      const tool = tools.find((t) => t.name === 'read_file_by_id')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('folderId')
      expect(tool?.inputSchema.required).toContain('filename')
    })

    it('should register write_file_by_id tool', async () => {
      const mockFilesystemService = {} as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const tools = fileServer.getToolDefinitions()
      const tool = tools.find((t) => t.name === 'write_file_by_id')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('folderId')
      expect(tool?.inputSchema.required).toContain('filename')
      expect(tool?.inputSchema.required).toContain('content')
    })

    it('should register delete_file_by_id tool', async () => {
      const mockFilesystemService = {} as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const tools = fileServer.getToolDefinitions()
      const tool = tools.find((t) => t.name === 'delete_file_by_id')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('folderId')
      expect(tool?.inputSchema.required).toContain('filename')
    })

    it('should register get_file_info_by_id tool', async () => {
      const mockFilesystemService = {} as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const tools = fileServer.getToolDefinitions()
      const tool = tools.find((t) => t.name === 'get_file_info_by_id')

      expect(tool).toBeDefined()
      expect(tool?.inputSchema.required).toContain('folderId')
      expect(tool?.inputSchema.required).toContain('filename')
    })
  })

  describe('read_file_by_id', () => {
    it('should read file using valid folderId', async () => {
      const mockFilesystemService = {
        readFile: vi.fn().mockResolvedValue({
          content: 'test content',
          metadata: { size: 100, modified: new Date(), created: new Date() }
        })
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      // Generate a folderId first
      const folderId = fileServer.generateFolderId('/workspaces/agent-123/private/')

      const result = await fileServer.executeTool({
        name: 'read_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId,
          filename: 'test.md'
        }
      })

      expect(result.isError).toBeFalsy()
      const parsed = parseToolResult(result)
      expect(parsed.success).toBe(true)
      expect(parsed.content).toBe('test content')
      expect(parsed.metadata).toBeDefined()
    })

    it('should error on expired folderId with actionable message', async () => {
      const mockFilesystemService = {} as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'read_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId: 'expired-uuid',
          filename: 'test.md'
        }
      })

      expect(result.isError).toBe(true)
      const parsed = parseToolResult(result)
      expect(parsed.error).toContain('list_folders()')
    })

    it('should error on file not found', async () => {
      const mockFilesystemService = {
        readFile: vi.fn().mockRejectedValue(new Error('File not found'))
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const folderId = fileServer.generateFolderId('/workspaces/agent-123/private/')

      const result = await fileServer.executeTool({
        name: 'read_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId,
          filename: 'missing.md'
        }
      })

      expect(result.isError).toBe(true)
      const parsed = parseToolResult(result)
      expect(parsed.error).toContain('not found')
    })
  })

  describe('write_file_by_id', () => {
    it('should write new file using valid folderId', async () => {
      const mockFilesystemService = {
        writeFile: vi.fn().mockResolvedValue({ success: true })
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const folderId = fileServer.generateFolderId('/workspaces/agent-123/private/')

      const result = await fileServer.executeTool({
        name: 'write_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId,
          filename: 'new.md',
          content: 'new content'
        }
      })

      expect(result.isError).toBeFalsy()
      const parsed = parseToolResult(result)
      expect(parsed.success).toBe(true)
      expect(mockFilesystemService.writeFile).toHaveBeenCalledWith(
        'agent-123',
        '/workspaces/agent-123/private/new.md',
        'new content'
      )
    })

    it('should overwrite existing file', async () => {
      const mockFilesystemService = {
        writeFile: vi.fn().mockResolvedValue({ success: true })
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const folderId = fileServer.generateFolderId('/workspaces/agent-123/private/')

      const result = await fileServer.executeTool({
        name: 'write_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId,
          filename: 'existing.md',
          content: 'updated content'
        }
      })

      expect(result.isError).toBeFalsy()
      const parsed = parseToolResult(result)
      expect(parsed.success).toBe(true)
    })

    it('should error on expired folderId', async () => {
      const mockFilesystemService = {} as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'write_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId: 'expired-uuid',
          filename: 'test.md',
          content: 'content'
        }
      })

      expect(result.isError).toBe(true)
      const parsed = parseToolResult(result)
      expect(parsed.error).toContain('list_folders()')
    })
  })

  describe('delete_file_by_id', () => {
    it('should delete file using valid folderId', async () => {
      const mockFilesystemService = {
        deleteFile: vi.fn().mockResolvedValue({ success: true })
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const folderId = fileServer.generateFolderId('/workspaces/agent-123/private/')

      const result = await fileServer.executeTool({
        name: 'delete_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId,
          filename: 'old.md'
        }
      })

      expect(result.isError).toBeFalsy()
      const parsed = parseToolResult(result)
      expect(parsed.success).toBe(true)
    })

    it('should be idempotent (no error if file already deleted)', async () => {
      const mockFilesystemService = {
        deleteFile: vi.fn().mockRejectedValue(new Error('ENOENT: File not found'))
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const folderId = fileServer.generateFolderId('/workspaces/agent-123/private/')

      const result = await fileServer.executeTool({
        name: 'delete_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId,
          filename: 'already-deleted.md'
        }
      })

      // Should succeed even if file doesn't exist
      expect(result.isError).toBeFalsy()
      const parsed = parseToolResult(result)
      expect(parsed.success).toBe(true)
    })

    it('should error on expired folderId', async () => {
      const mockFilesystemService = {} as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'delete_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId: 'expired-uuid',
          filename: 'test.md'
        }
      })

      expect(result.isError).toBe(true)
      const parsed = parseToolResult(result)
      expect(parsed.error).toContain('list_folders()')
    })
  })

  describe('get_file_info_by_id', () => {
    it('should get file metadata using valid folderId', async () => {
      const mockFilesystemService = {
        getFileInfo: vi.fn().mockResolvedValue({
          size: 1024,
          modified: new Date('2024-01-01'),
          created: new Date('2024-01-01')
        })
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const folderId = fileServer.generateFolderId('/workspaces/agent-123/private/')

      const result = await fileServer.executeTool({
        name: 'get_file_info_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId,
          filename: 'info.md'
        }
      })

      expect(result.isError).toBeFalsy()
      const parsed = parseToolResult(result)
      expect(parsed.success).toBe(true)
      expect(parsed.metadata.size).toBe(1024)
    })

    it('should error on expired folderId', async () => {
      const mockFilesystemService = {} as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      const result = await fileServer.executeTool({
        name: 'get_file_info_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId: 'expired-uuid',
          filename: 'test.md'
        }
      })

      expect(result.isError).toBe(true)
      const parsed = parseToolResult(result)
      expect(parsed.error).toContain('list_folders()')
    })
  })

  describe('Integration Flow', () => {
    it('should complete full workflow: discover → write → read → info → delete', async () => {
      const mockFilesystemService = {
        listFiles: vi.fn().mockResolvedValue([]),
        writeFile: vi.fn().mockResolvedValue({ success: true }),
        readFile: vi.fn().mockResolvedValue({
          content: 'workflow test',
          metadata: { size: 13, modified: new Date(), created: new Date() }
        }),
        getFileInfo: vi.fn().mockResolvedValue({
          size: 13,
          modified: new Date(),
          created: new Date()
        }),
        deleteFile: vi.fn().mockResolvedValue({ success: true })
      } as unknown as FilesystemService

      const { MCPFileServer } = await import('../../../app/server/services/mcp/file-server')
      const fileServer = new MCPFileServer(mockFilesystemService)

      // 1. Discover folders
      const discoverResult = await fileServer.executeTool({
        name: 'list_folders',
        arguments: {
          agentId: 'agent-123',
          scope: 'my_private'
        }
      })
      expect(discoverResult.isError).toBeFalsy()
      const folders = parseToolResult(discoverResult).folders
      const folderId = folders[0].folderId

      // 2. Write file
      const writeResult = await fileServer.executeTool({
        name: 'write_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId,
          filename: 'workflow.md',
          content: 'workflow test'
        }
      })
      expect(parseToolResult(writeResult).success).toBe(true)

      // 3. Read file
      const readResult = await fileServer.executeTool({
        name: 'read_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId,
          filename: 'workflow.md'
        }
      })
      expect(parseToolResult(readResult).content).toBe('workflow test')

      // 4. Get file info
      const infoResult = await fileServer.executeTool({
        name: 'get_file_info_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId,
          filename: 'workflow.md'
        }
      })
      expect(parseToolResult(infoResult).metadata.size).toBe(13)

      // 5. Delete file
      const deleteResult = await fileServer.executeTool({
        name: 'delete_file_by_id',
        arguments: {
          agentId: 'agent-123',
          folderId,
          filename: 'workflow.md'
        }
      })
      expect(parseToolResult(deleteResult).success).toBe(true)
    })
  })
})
