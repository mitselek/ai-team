import type { FilesystemService } from '../persistence/file-workspace'
import type { MCPTool, MCPToolCall, MCPToolResult } from '../llm/mcp/types'
import type { FolderScope, FileEntry, FileListResult } from '@@/types'
import { loadAllTeams } from '../../data/organizations'
import { loadTeamAgents } from '../../data/teams'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export class MCPFileServer {
  private organizationId?: string

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
      },
      {
        name: 'list_folders',
        description: 'Discover available workspace folders by scope',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent requesting folder discovery'
            },
            organizationId: {
              type: 'string',
              description: 'The organization ID (required for org_shared scope)'
            },
            teamId: {
              type: 'string',
              description: 'The team ID (optional, auto-derived for team scopes)'
            },
            scope: {
              type: 'string',
              enum: ['my_private', 'my_shared', 'team_private', 'team_shared', 'org_shared'],
              description: 'The discovery scope'
            }
          },
          required: ['agentId', 'scope']
        }
      },
      {
        name: 'read_file_by_id',
        description: 'Read file content using discovered folderId',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent requesting access'
            },
            folderId: {
              type: 'string',
              description: 'Folder ID from list_folders'
            },
            filename: {
              type: 'string',
              description: 'Filename within folder'
            }
          },
          required: ['agentId', 'folderId', 'filename']
        }
      },
      {
        name: 'write_file_by_id',
        description: 'Write file content using discovered folderId',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent requesting access'
            },
            folderId: {
              type: 'string',
              description: 'Folder ID from list_folders'
            },
            filename: {
              type: 'string',
              description: 'Filename within folder'
            },
            content: {
              type: 'string',
              description: 'File content'
            }
          },
          required: ['agentId', 'folderId', 'filename', 'content']
        }
      },
      {
        name: 'delete_file_by_id',
        description: 'Delete file using discovered folderId',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent requesting access'
            },
            folderId: {
              type: 'string',
              description: 'Folder ID from list_folders'
            },
            filename: {
              type: 'string',
              description: 'Filename within folder'
            }
          },
          required: ['agentId', 'folderId', 'filename']
        }
      },
      {
        name: 'get_file_info_by_id',
        description: 'Get file metadata using discovered folderId',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent requesting access'
            },
            folderId: {
              type: 'string',
              description: 'Folder ID from list_folders'
            },
            filename: {
              type: 'string',
              description: 'Filename within folder'
            }
          },
          required: ['agentId', 'folderId', 'filename']
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

        case 'list_folders':
          return await this.executeListFolders(toolCall.arguments)

        case 'read_file_by_id':
          return await this.executeReadFileById(toolCall.arguments)

        case 'write_file_by_id':
          return await this.executeWriteFileById(toolCall.arguments)

        case 'delete_file_by_id':
          return await this.executeDeleteFileById(toolCall.arguments)

        case 'get_file_info_by_id':
          return await this.executeGetFileInfoById(toolCall.arguments)

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
      if (!this.organizationId) {
        return this.errorResult('Organization ID not set')
      }
      const result = await this.filesystemService.readFile(agentId, path, this.organizationId)
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
      if (!this.organizationId) {
        return this.errorResult('Organization ID not set')
      }
      const result = await this.filesystemService.writeFile(
        agentId,
        path,
        content,
        this.organizationId
      )
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
      if (!this.organizationId) {
        return this.errorResult('Organization ID not set')
      }
      const result = await this.filesystemService.deleteFile(agentId, path, this.organizationId)
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

  private async executeListFolders(args: {
    agentId?: string
    organizationId?: string
    teamId?: string
    scope?: string
  }): Promise<MCPToolResult> {
    const { agentId, organizationId, teamId, scope } = args

    if (!agentId) {
      return this.errorResult('Missing required parameter: agentId')
    }
    if (!scope) {
      return this.errorResult('Missing required parameter: scope')
    }

    try {
      const folders: FileListResult[] = []

      switch (scope as FolderScope) {
        case 'my_private': {
          const folderPath = this.getWorkspaceFolder(agentId, 'private')
          folders.push(await this.buildFolderResult(agentId, folderPath, 'my_private'))
          break
        }

        case 'my_shared': {
          const folderPath = this.getWorkspaceFolder(agentId, 'shared')
          folders.push(await this.buildFolderResult(agentId, folderPath, 'my_shared'))
          break
        }

        case 'team_private': {
          if (!teamId) {
            return this.errorResult('Agent is not on a team')
          }
          const folderPath = this.getWorkspaceFolder(teamId, 'private')
          folders.push(await this.buildFolderResult(agentId, folderPath, 'team_private'))
          break
        }

        case 'team_shared': {
          if (!teamId) {
            return this.errorResult('Agent is not on a team')
          }
          const folderPath = this.getWorkspaceFolder(teamId, 'shared')
          folders.push(await this.buildFolderResult(agentId, folderPath, 'team_shared'))
          break
        }

        case 'org_shared': {
          if (!organizationId) {
            return this.errorResult(
              'Missing required parameter: organizationId for org_shared scope'
            )
          }

          // Get all teams in org
          const teams = loadAllTeams(organizationId)

          // Add all team shared folders
          for (const team of teams) {
            const folderPath = this.getWorkspaceFolder(team.id, 'shared')
            folders.push(await this.buildFolderResult(agentId, folderPath, 'org_shared'))
          }

          // Add all team members' shared folders (excluding requesting agent)
          for (const team of teams) {
            const teamAgents = loadTeamAgents(team.id)
            for (const agent of teamAgents) {
              if (agent.id !== agentId) {
                const folderPath = this.getWorkspaceFolder(agent.id, 'shared')
                folders.push(await this.buildFolderResult(agentId, folderPath, 'org_shared'))
              }
            }
          }
          break
        }

        default:
          return this.errorResult(`Invalid scope: ${scope}`)
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ folders }, null, 2)
          }
        ]
      }
    } catch (error: unknown) {
      return this.errorResult(error instanceof Error ? error.message : 'Failed to list folders')
    }
  }

  private async buildFolderResult(
    agentId: string,
    folderPath: string,
    folderType: FolderScope
  ): Promise<FileListResult> {
    // Ensure directory exists (create if missing)
    const fullPath = join(this.filesystemService.getBasePath(), folderPath)
    try {
      await mkdir(fullPath, { recursive: true })
    } catch (error: unknown) {
      // Directory might already exist - that's fine
      if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) {
        throw error
      }
    }

    // List files in folder
    let fileInfos: Array<{
      path: string
      name: string
      size: number
      modified: Date
      isDirectory: boolean
    }> = []
    try {
      fileInfos = await this.filesystemService.listFiles(agentId, folderPath)
    } catch (error: unknown) {
      // Folder may not exist yet - return empty
      fileInfos = []
    }

    // Map to FileEntry with mimeType
    const files: FileEntry[] = fileInfos
      .filter((f) => !f.isDirectory)
      .map((f) => ({
        filename: f.name,
        size: f.size,
        modified: f.modified.toISOString(),
        mimeType: this.guessMimeType(f.name)
      }))

    // Extract folderId (agent/team UUID) from path
    // Path format: {orgId}/workspaces/{folderId}/{scope}/
    const pathParts = folderPath.split('/').filter((p) => p.length > 0)
    const folderId = pathParts.length >= 3 ? pathParts[2] : agentId // Fallback to agentId
    const folderName = pathParts.length >= 2 ? `${pathParts[1]}/${pathParts[2]}` : folderPath

    return {
      folderId,
      folderName,
      folderType,
      path: folderPath,
      fileCount: files.length,
      files
    }
  }

  private async executeReadFileById(args: {
    agentId?: string
    folderId?: string
    scope?: string
    path?: string
  }): Promise<MCPToolResult> {
    const { agentId, folderId, scope, path } = args

    if (!agentId) {
      return this.errorResult('Missing required parameter: agentId')
    }
    if (!folderId) {
      return this.errorResult('Missing required parameter: folderId')
    }
    if (!scope) {
      return this.errorResult('Missing required parameter: scope')
    }
    if (!path) {
      return this.errorResult('Missing required parameter: path')
    }

    try {
      if (!this.organizationId) {
        return this.errorResult('Organization ID not set')
      }

      // Construct UUID-based path: {orgId}/workspaces/{folderId}/{scope}/{path}
      const fullPath = `${this.organizationId}/workspaces/${folderId}/${scope}/${path}`

      const result = await this.filesystemService.readFile(agentId, fullPath, this.organizationId)

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

  private async executeWriteFileById(args: {
    agentId?: string
    folderId?: string
    scope?: string
    path?: string
    content?: string
  }): Promise<MCPToolResult> {
    const { agentId, folderId, scope, path, content } = args

    if (!agentId) {
      return this.errorResult('Missing required parameter: agentId')
    }
    if (!folderId) {
      return this.errorResult('Missing required parameter: folderId')
    }
    if (!scope) {
      return this.errorResult('Missing required parameter: scope')
    }
    if (!path) {
      return this.errorResult('Missing required parameter: path')
    }
    if (content === undefined) {
      return this.errorResult('Missing required parameter: content')
    }

    try {
      if (!this.organizationId) {
        return this.errorResult('Organization ID not set')
      }

      // Construct UUID-based path: {orgId}/workspaces/{folderId}/{scope}/{path}
      const fullPath = `${this.organizationId}/workspaces/${folderId}/${scope}/${path}`

      console.error('[DEBUG writeFileById]', {
        agentId,
        folderId,
        scope,
        path,
        organizationId: this.organizationId,
        fullPath
      })

      const result = await this.filesystemService.writeFile(
        agentId,
        fullPath,
        content,
        this.organizationId
      )

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

  private async executeDeleteFileById(args: {
    agentId?: string
    folderId?: string
    scope?: string
    path?: string
  }): Promise<MCPToolResult> {
    const { agentId, folderId, scope, path } = args

    if (!agentId) {
      return this.errorResult('Missing required parameter: agentId')
    }
    if (!folderId) {
      return this.errorResult('Missing required parameter: folderId')
    }
    if (!scope) {
      return this.errorResult('Missing required parameter: scope')
    }
    if (!path) {
      return this.errorResult('Missing required parameter: path')
    }

    try {
      if (!this.organizationId) {
        return this.errorResult('Organization ID not set')
      }

      // Construct UUID-based path: {orgId}/workspaces/{folderId}/{scope}/{path}
      const fullPath = `${this.organizationId}/workspaces/${folderId}/${scope}/${path}`

      const result = await this.filesystemService.deleteFile(agentId, fullPath, this.organizationId)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: result.success }, null, 2)
          }
        ]
      }
    } catch (error: unknown) {
      // Make delete idempotent - if file doesn't exist, still return success
      if (error instanceof Error && error.message.includes('ENOENT')) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true }, null, 2)
            }
          ]
        }
      }
      return this.errorResult(error instanceof Error ? error.message : 'Failed to delete file')
    }
  }

  private async executeGetFileInfoById(args: {
    agentId?: string
    folderId?: string
    scope?: string
    path?: string
  }): Promise<MCPToolResult> {
    const { agentId, folderId, scope, path } = args

    if (!agentId) {
      return this.errorResult('Missing required parameter: agentId')
    }
    if (!folderId) {
      return this.errorResult('Missing required parameter: folderId')
    }
    if (!scope) {
      return this.errorResult('Missing required parameter: scope')
    }
    if (!path) {
      return this.errorResult('Missing required parameter: path')
    }

    try {
      if (!this.organizationId) {
        return this.errorResult('Organization ID not set')
      }

      // Construct UUID-based path: {orgId}/workspaces/{folderId}/{scope}/{path}
      const fullPath = `${this.organizationId}/workspaces/${folderId}/${scope}/${path}`

      const result = await this.filesystemService.getFileInfo(agentId, fullPath)

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

  private getWorkspaceFolder(entityId: string, folderType: 'private' | 'shared'): string {
    if (!this.organizationId) {
      throw new Error('OrganizationId not set on MCPFileServer - call setOrganizationId first')
    }
    return `${this.organizationId}/workspaces/${entityId}/${folderType}/`
  }

  /**
   * Set the organization context for workspace operations.
   * Must be called before using F059 folder-based tools.
   */
  setOrganizationId(orgId: string): void {
    this.organizationId = orgId
  }

  private guessMimeType(filename: string): string {
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.yaml': 'application/x-yaml',
      '.yml': 'application/x-yaml',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    }
    return mimeMap[ext] || 'application/octet-stream'
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
}
