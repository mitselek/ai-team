import type { FilesystemService } from '../persistence/file-workspace'
import type { MCPTool, MCPToolCall, MCPToolResult } from '../llm/mcp/types'
import { randomUUID } from 'node:crypto'

export class MCPFileServer {
  private folderIdCache = new Map<string, { path: string; timestamp: number }>()
  private readonly FOLDER_ID_TTL_MS = 30 * 60 * 1000 // 30 minutes

  constructor(private readonly filesystemService: FilesystemService) {}

  getToolDefinitions(): MCPTool[] {
    return [
      {
        name: 'read_file',
        description: 'Read file content from agent/team workspace',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent requesting access'
            },
            path: {
              type: 'string',
              description: 'Path to the file (e.g., /agents/{agentId}/private/file.md)'
            }
          },
          required: ['agentId', 'path']
        }
      },
      {
        name: 'write_file',
        description: 'Write file content to agent/team workspace',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent requesting access'
            },
            path: {
              type: 'string',
              description: 'Path to the file (e.g., /agents/{agentId}/private/file.md)'
            },
            content: {
              type: 'string',
              description: 'Content to write to the file'
            }
          },
          required: ['agentId', 'path', 'content']
        }
      },
      {
        name: 'delete_file',
        description: 'Delete file from agent/team workspace',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent requesting access'
            },
            path: {
              type: 'string',
              description: 'Path to the file (e.g., /agents/{agentId}/private/file.md)'
            }
          },
          required: ['agentId', 'path']
        }
      },
      {
        name: 'list_files',
        description: 'List files in a directory within agent/team workspace',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent requesting access'
            },
            path: {
              type: 'string',
              description: 'Path to the directory (e.g., /agents/{agentId}/private)'
            }
          },
          required: ['agentId', 'path']
        }
      },
      {
        name: 'get_file_info',
        description: 'Get metadata for a file in agent/team workspace',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent requesting access'
            },
            path: {
              type: 'string',
              description: 'Path to the file (e.g., /agents/{agentId}/private/file.md)'
            }
          },
          required: ['agentId', 'path']
        }
      }
    ]
  }

  async executeTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    try {
      // Validate arguments exist
      if (!toolCall.arguments) {
        return this.errorResult('Missing tool arguments')
      }

      const { agentId, path, content } = toolCall.arguments as {
        agentId?: string
        path?: string
        content?: string
      }

      // Route to appropriate tool handler
      switch (toolCall.name) {
        case 'read_file':
          return await this.executeReadFile(agentId, path)

        case 'write_file':
          return await this.executeWriteFile(agentId, path, content)

        case 'delete_file':
          return await this.executeDeleteFile(agentId, path)

        case 'list_files':
          return await this.executeListFiles(agentId, path)

        case 'get_file_info':
          return await this.executeGetFileInfo(agentId, path)

        default:
          return this.errorResult(`Unknown tool: ${toolCall.name}`)
      }
    } catch (error: unknown) {
      return this.errorResult(error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  private async executeReadFile(
    agentId: string | undefined,
    path: string | undefined
  ): Promise<MCPToolResult> {
    if (!agentId) {
      return this.errorResult('Missing required parameter: agentId')
    }
    if (!path) {
      return this.errorResult('Missing required parameter: path')
    }

    try {
      const result = await this.filesystemService.readFile(agentId, path)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                content: result.content,
                metadata: result.metadata
              },
              null,
              2
            )
          }
        ]
      }
    } catch (error: unknown) {
      return this.errorResult(error instanceof Error ? error.message : 'Failed to read file')
    }
  }

  private async executeWriteFile(
    agentId: string | undefined,
    path: string | undefined,
    content: string | undefined
  ): Promise<MCPToolResult> {
    if (!agentId) {
      return this.errorResult('Missing required parameter: agentId')
    }
    if (!path) {
      return this.errorResult('Missing required parameter: path')
    }
    if (content === undefined) {
      return this.errorResult('Missing required parameter: content')
    }

    try {
      const result = await this.filesystemService.writeFile(agentId, path, content)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: result.success }, null, 2)
          }
        ]
      }
    } catch (error: unknown) {
      return this.errorResult(error instanceof Error ? error.message : 'Failed to write file')
    }
  }

  private async executeDeleteFile(
    agentId: string | undefined,
    path: string | undefined
  ): Promise<MCPToolResult> {
    if (!agentId) {
      return this.errorResult('Missing required parameter: agentId')
    }
    if (!path) {
      return this.errorResult('Missing required parameter: path')
    }

    try {
      const result = await this.filesystemService.deleteFile(agentId, path)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: result.success }, null, 2)
          }
        ]
      }
    } catch (error: unknown) {
      return this.errorResult(error instanceof Error ? error.message : 'Failed to delete file')
    }
  }

  private async executeListFiles(
    agentId: string | undefined,
    path: string | undefined
  ): Promise<MCPToolResult> {
    if (!agentId) {
      return this.errorResult('Missing required parameter: agentId')
    }
    if (!path) {
      return this.errorResult('Missing required parameter: path')
    }

    try {
      const result = await this.filesystemService.listFiles(agentId, path)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                files: result
              },
              null,
              2
            )
          }
        ]
      }
    } catch (error: unknown) {
      return this.errorResult(error instanceof Error ? error.message : 'Failed to list files')
    }
  }

  private async executeGetFileInfo(
    agentId: string | undefined,
    path: string | undefined
  ): Promise<MCPToolResult> {
    if (!agentId) {
      return this.errorResult('Missing required parameter: agentId')
    }
    if (!path) {
      return this.errorResult('Missing required parameter: path')
    }

    try {
      const result = await this.filesystemService.getFileInfo(agentId, path)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                metadata: result
              },
              null,
              2
            )
          }
        ]
      }
    } catch (error: unknown) {
      return this.errorResult(error instanceof Error ? error.message : 'Failed to get file info')
    }
  }

  private errorResult(message: string): MCPToolResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: message }, null, 2)
        }
      ],
      isError: true
    }
  }

  /**
   * Generate a unique ephemeral folder ID with 30-minute TTL.
   * Maps the folderId to the workspace path for later resolution.
   *
   * @param path - Workspace path (e.g., /workspaces/agent-123/private/)
   * @returns UUID v4 folderId
   */
  generateFolderId(path: string): string {
    const folderId = randomUUID()
    this.folderIdCache.set(folderId, {
      path,
      timestamp: Date.now()
    })
    return folderId
  }

  /**
   * Resolve a folderId to its workspace path.
   * Checks TTL expiration and throws error if expired or not found.
   *
   * @param folderId - UUID from generateFolderId()
   * @returns Workspace path
   * @throws Error if folderId not found or expired
   */
  resolveFolderId(folderId: string): string {
    const entry = this.folderIdCache.get(folderId)

    if (!entry) {
      throw new Error(
        `Folder ID '${folderId}' not found. It may have expired. Use list_folders() to discover current folders.`
      )
    }

    const age = Date.now() - entry.timestamp

    if (age > this.FOLDER_ID_TTL_MS) {
      // Remove expired entry
      this.folderIdCache.delete(folderId)
      throw new Error(
        `Folder ID '${folderId}' has expired. Use list_folders() to discover current folders.`
      )
    }

    return entry.path
  }

  /**
   * Remove expired folderIds from cache.
   * Should be called periodically to prevent memory leaks.
   */
  cleanupExpiredFolderIds(): void {
    const now = Date.now()
    for (const [folderId, entry] of this.folderIdCache.entries()) {
      if (now - entry.timestamp > this.FOLDER_ID_TTL_MS) {
        this.folderIdCache.delete(folderId)
      }
    }
  }
}
