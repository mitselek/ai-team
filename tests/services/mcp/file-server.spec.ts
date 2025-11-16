import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MCPFileServer } from '../../../app/server/services/mcp/file-server'
import { FilesystemService } from '../../../app/server/services/persistence/file-workspace'
import type { MCPTool, MCPToolCall } from '../../../app/server/services/llm/mcp/types'

describe('MCPFileServer - Issue #44', () => {
  let mcpFileServer: MCPFileServer
  let mockFilesystemService: FilesystemService

  beforeEach(() => {
    mockFilesystemService = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      listFiles: vi.fn(),
      getFileInfo: vi.fn()
    } as unknown as FilesystemService

    mcpFileServer = new MCPFileServer(mockFilesystemService)
  })

  describe('getToolDefinitions()', () => {
    it('should return all 6 tool definitions', () => {
      const tools = mcpFileServer.getToolDefinitions()

      expect(tools).toHaveLength(6)
      expect(tools.map((t) => t.name)).toEqual([
        'read_file',
        'write_file',
        'delete_file',
        'list_files',
        'get_file_info',
        'list_folders'
      ])
    })

    it('should have valid MCP tool structure for each tool', () => {
      const tools = mcpFileServer.getToolDefinitions()

      tools.forEach((tool: MCPTool) => {
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('inputSchema')
        expect(tool.inputSchema).toHaveProperty('type', 'object')
        expect(tool.inputSchema).toHaveProperty('properties')
        expect(typeof tool.name).toBe('string')
        expect(typeof tool.description).toBe('string')
      })
    })

    it('should have correct parameters for read_file tool', () => {
      const tools = mcpFileServer.getToolDefinitions()
      const readFileTool = tools.find((t) => t.name === 'read_file')

      expect(readFileTool).toBeDefined()
      expect(readFileTool!.inputSchema.properties).toHaveProperty('agentId')
      expect(readFileTool!.inputSchema.properties).toHaveProperty('path')
      expect(readFileTool!.inputSchema.required).toEqual(['agentId', 'path'])
    })

    it('should have correct parameters for write_file tool', () => {
      const tools = mcpFileServer.getToolDefinitions()
      const writeFileTool = tools.find((t) => t.name === 'write_file')

      expect(writeFileTool).toBeDefined()
      expect(writeFileTool!.inputSchema.properties).toHaveProperty('agentId')
      expect(writeFileTool!.inputSchema.properties).toHaveProperty('path')
      expect(writeFileTool!.inputSchema.properties).toHaveProperty('content')
      expect(writeFileTool!.inputSchema.required).toEqual(['agentId', 'path', 'content'])
    })

    it('should have correct parameters for delete_file tool', () => {
      const tools = mcpFileServer.getToolDefinitions()
      const deleteFileTool = tools.find((t) => t.name === 'delete_file')

      expect(deleteFileTool).toBeDefined()
      expect(deleteFileTool!.inputSchema.properties).toHaveProperty('agentId')
      expect(deleteFileTool!.inputSchema.properties).toHaveProperty('path')
      expect(deleteFileTool!.inputSchema.required).toEqual(['agentId', 'path'])
    })

    it('should have correct parameters for list_files tool', () => {
      const tools = mcpFileServer.getToolDefinitions()
      const listFilesTool = tools.find((t) => t.name === 'list_files')

      expect(listFilesTool).toBeDefined()
      expect(listFilesTool!.inputSchema.properties).toHaveProperty('agentId')
      expect(listFilesTool!.inputSchema.properties).toHaveProperty('path')
      expect(listFilesTool!.inputSchema.required).toEqual(['agentId', 'path'])
    })

    it('should have correct parameters for get_file_info tool', () => {
      const tools = mcpFileServer.getToolDefinitions()
      const getFileInfoTool = tools.find((t) => t.name === 'get_file_info')

      expect(getFileInfoTool).toBeDefined()
      expect(getFileInfoTool!.inputSchema.properties).toHaveProperty('agentId')
      expect(getFileInfoTool!.inputSchema.properties).toHaveProperty('path')
      expect(getFileInfoTool!.inputSchema.required).toEqual(['agentId', 'path'])
    })
  })

  describe('executeTool() - read_file', () => {
    it('should call filesystemService.readFile with correct parameters', async () => {
      const mockResult = {
        content: 'file content',
        metadata: { size: 12, modified: new Date(), created: new Date() }
      }
      vi.mocked(mockFilesystemService.readFile).mockResolvedValue(mockResult)

      const toolCall: MCPToolCall = {
        name: 'read_file',
        arguments: {
          agentId: 'agent-1',
          path: '/agents/agent-1/private/file.md'
        }
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(mockFilesystemService.readFile).toHaveBeenCalledWith(
        'agent-1',
        '/agents/agent-1/private/file.md'
      )
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toContain('file content')
    })

    it('should return error result on read_file failure', async () => {
      vi.mocked(mockFilesystemService.readFile).mockRejectedValue(new Error('File not found'))

      const toolCall: MCPToolCall = {
        name: 'read_file',
        arguments: {
          agentId: 'agent-1',
          path: '/agents/agent-1/private/missing.md'
        }
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('File not found')
    })
  })

  describe('executeTool() - write_file', () => {
    it('should call filesystemService.writeFile with correct parameters', async () => {
      const mockResult = { success: true }
      vi.mocked(mockFilesystemService.writeFile).mockResolvedValue(mockResult)

      const toolCall: MCPToolCall = {
        name: 'write_file',
        arguments: {
          agentId: 'agent-1',
          path: '/agents/agent-1/private/file.md',
          content: 'new content'
        }
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(mockFilesystemService.writeFile).toHaveBeenCalledWith(
        'agent-1',
        '/agents/agent-1/private/file.md',
        'new content'
      )
      expect(result.content[0].text).toContain('success')
    })

    it('should return error result on write_file failure', async () => {
      vi.mocked(mockFilesystemService.writeFile).mockRejectedValue(
        new Error('File exceeds 5MB limit')
      )

      const toolCall: MCPToolCall = {
        name: 'write_file',
        arguments: {
          agentId: 'agent-1',
          path: '/agents/agent-1/private/large.md',
          content: 'x'.repeat(6000000)
        }
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('File exceeds 5MB limit')
    })
  })

  describe('executeTool() - delete_file', () => {
    it('should call filesystemService.deleteFile with correct parameters', async () => {
      const mockResult = { success: true }
      vi.mocked(mockFilesystemService.deleteFile).mockResolvedValue(mockResult)

      const toolCall: MCPToolCall = {
        name: 'delete_file',
        arguments: {
          agentId: 'agent-1',
          path: '/agents/agent-1/private/file.md'
        }
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(mockFilesystemService.deleteFile).toHaveBeenCalledWith(
        'agent-1',
        '/agents/agent-1/private/file.md'
      )
      expect(result.content[0].text).toContain('success')
    })

    it('should return error result on delete_file failure', async () => {
      vi.mocked(mockFilesystemService.deleteFile).mockRejectedValue(new Error('File not found'))

      const toolCall: MCPToolCall = {
        name: 'delete_file',
        arguments: {
          agentId: 'agent-1',
          path: '/agents/agent-1/private/missing.md'
        }
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('File not found')
    })
  })

  describe('executeTool() - list_files', () => {
    it('should call filesystemService.listFiles with correct parameters', async () => {
      const mockResult = [
        {
          path: '/agents/agent-1/private/file1.md',
          name: 'file1.md',
          size: 100,
          modified: new Date(),
          isDirectory: false
        },
        {
          path: '/agents/agent-1/private/file2.txt',
          name: 'file2.txt',
          size: 200,
          modified: new Date(),
          isDirectory: false
        }
      ]
      vi.mocked(mockFilesystemService.listFiles).mockResolvedValue(mockResult)

      const toolCall: MCPToolCall = {
        name: 'list_files',
        arguments: {
          agentId: 'agent-1',
          path: '/agents/agent-1/private'
        }
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(mockFilesystemService.listFiles).toHaveBeenCalledWith(
        'agent-1',
        '/agents/agent-1/private'
      )
      expect(result.content[0].text).toContain('file1.md')
      expect(result.content[0].text).toContain('file2.txt')
    })

    it('should return error result on list_files failure', async () => {
      vi.mocked(mockFilesystemService.listFiles).mockRejectedValue(new Error('Directory not found'))

      const toolCall: MCPToolCall = {
        name: 'list_files',
        arguments: {
          agentId: 'agent-1',
          path: '/agents/agent-1/missing'
        }
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Directory not found')
    })
  })

  describe('executeTool() - get_file_info', () => {
    it('should call filesystemService.getFileInfo with correct parameters', async () => {
      const mockResult = {
        size: 1024,
        modified: new Date('2025-01-01'),
        created: new Date('2025-01-01')
      }
      vi.mocked(mockFilesystemService.getFileInfo).mockResolvedValue(mockResult)

      const toolCall: MCPToolCall = {
        name: 'get_file_info',
        arguments: {
          agentId: 'agent-1',
          path: '/agents/agent-1/private/file.md'
        }
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(mockFilesystemService.getFileInfo).toHaveBeenCalledWith(
        'agent-1',
        '/agents/agent-1/private/file.md'
      )
      expect(result.content[0].text).toContain('1024')
    })

    it('should return error result on get_file_info failure', async () => {
      vi.mocked(mockFilesystemService.getFileInfo).mockRejectedValue(new Error('File not found'))

      const toolCall: MCPToolCall = {
        name: 'get_file_info',
        arguments: {
          agentId: 'agent-1',
          path: '/agents/agent-1/private/missing.md'
        }
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('File not found')
    })
  })

  describe('Parameter Validation', () => {
    it('should handle missing agentId parameter', async () => {
      const toolCall: MCPToolCall = {
        name: 'read_file',
        arguments: {
          path: '/agents/agent-1/private/file.md'
        }
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('agentId')
    })

    it('should handle missing path parameter', async () => {
      const toolCall: MCPToolCall = {
        name: 'read_file',
        arguments: {
          agentId: 'agent-1'
        }
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('path')
    })

    it('should handle missing content parameter for write_file', async () => {
      const toolCall: MCPToolCall = {
        name: 'write_file',
        arguments: {
          agentId: 'agent-1',
          path: '/agents/agent-1/private/file.md'
        }
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('content')
    })

    it('should handle unknown tool name', async () => {
      const toolCall: MCPToolCall = {
        name: 'unknown_tool',
        arguments: {}
      }

      const result = await mcpFileServer.executeTool(toolCall)

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Unknown tool')
    })
  })
})
