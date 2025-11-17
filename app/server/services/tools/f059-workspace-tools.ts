// F059 folder-based workspace tool executors
// These tools provide folder discovery and ID-based file operations

import { createLogger } from '../../utils/logger'
import type { ToolExecutor, ExecutionContext } from '../orchestrator'
import { MCPFileServer } from '../mcp/file-server'
import { FilesystemService } from '../persistence/file-workspace'
import { AuditService } from '../persistence/audit'
import { loadAgents, loadTeams } from '../persistence/filesystem'
import path from 'path'

const logger = createLogger('tools:f059-workspace')

// Get data directory for workspace files
function getDataDir(): string {
  return process.env.TEST_DATA_DIR || path.resolve(process.cwd(), 'data/organizations')
}

// Create singleton filesystem service and MCP file server
const auditService = new AuditService(path.join(getDataDir(), 'audit'))
const filesystemService = new FilesystemService(getDataDir(), auditService)
const mcpFileServer = new MCPFileServer(filesystemService)

/**
 * Setup permissions for filesystem service by loading agents and teams
 */
async function setupPermissions(organizationId: string): Promise<void> {
  const agents = await loadAgents(organizationId)
  const teams = await loadTeams(organizationId)
  filesystemService.setAgentsAndTeams(agents, teams)
}

/**
 * list_folders - Discover available workspace folders by scope
 */
export const listFoldersExecutor: ToolExecutor = {
  async execute(params: Record<string, unknown>, context: ExecutionContext): Promise<unknown> {
    const { agentId, organizationId, teamId, scope } = params as {
      agentId?: string
      organizationId?: string
      teamId?: string
      scope?: string
    }

    logger.info({
      agentId,
      organizationId,
      scope,
      correlationId: context.correlationId
    })

    if (!agentId || !scope) {
      return { error: 'Missing required parameters: agentId, scope' }
    }

    try {
      // Set organization context on MCP file server
      if (organizationId) {
        mcpFileServer.setOrganizationId(organizationId)
        // Setup permissions with current agents/teams
        await setupPermissions(organizationId)
      }

      const result = await mcpFileServer.executeTool({
        name: 'list_folders',
        arguments: { agentId, organizationId, teamId, scope }
      })

      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({
        agentId,
        scope,
        error: errorMessage,
        correlationId: context.correlationId
      })
      return { error: errorMessage }
    }
  }
}

/**
 * read_file_by_id - Read file content using discovered folderId
 */
export const readFileByIdExecutor: ToolExecutor = {
  async execute(params: Record<string, unknown>, context: ExecutionContext): Promise<unknown> {
    const { agentId, organizationId, folderId, filename } = params as {
      agentId?: string
      organizationId?: string
      folderId?: string
      filename?: string
    }

    logger.info({
      agentId,
      organizationId,
      folderId,
      filename,
      correlationId: context.correlationId
    })

    if (!agentId || !folderId || !filename) {
      return { error: 'Missing required parameters: agentId, folderId, filename' }
    }

    try {
      // Set organization context on MCP file server
      if (organizationId) {
        mcpFileServer.setOrganizationId(organizationId)
        // Setup permissions with current agents/teams
        await setupPermissions(organizationId)
      }

      const result = await mcpFileServer.executeTool({
        name: 'read_file_by_id',
        arguments: { agentId, folderId, filename }
      })

      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({
        agentId,
        folderId,
        filename,
        error: errorMessage,
        correlationId: context.correlationId
      })
      return { error: errorMessage }
    }
  }
}

/**
 * write_file_by_id - Write file content using discovered folderId
 */
export const writeFileByIdExecutor: ToolExecutor = {
  async execute(params: Record<string, unknown>, context: ExecutionContext): Promise<unknown> {
    const { agentId, organizationId, folderId, filename, content } = params as {
      agentId?: string
      organizationId?: string
      folderId?: string
      filename?: string
      content?: string
    }

    logger.info({
      agentId,
      organizationId,
      folderId,
      filename,
      contentLength: content?.length || 0,
      correlationId: context.correlationId
    })

    if (!agentId || !folderId || !filename || content === undefined) {
      return { error: 'Missing required parameters: agentId, folderId, filename, content' }
    }

    try {
      // Set organization context on MCP file server
      if (organizationId) {
        mcpFileServer.setOrganizationId(organizationId)
        // Setup permissions with current agents/teams
        await setupPermissions(organizationId)
      }

      const result = await mcpFileServer.executeTool({
        name: 'write_file_by_id',
        arguments: { agentId, folderId, filename, content }
      })

      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({
        agentId,
        folderId,
        filename,
        error: errorMessage,
        correlationId: context.correlationId
      })
      return { error: errorMessage }
    }
  }
}

/**
 * delete_file_by_id - Delete file using discovered folderId
 */
export const deleteFileByIdExecutor: ToolExecutor = {
  async execute(params: Record<string, unknown>, context: ExecutionContext): Promise<unknown> {
    const { agentId, organizationId, folderId, filename } = params as {
      agentId?: string
      organizationId?: string
      folderId?: string
      filename?: string
    }

    logger.info({
      agentId,
      organizationId,
      folderId,
      filename,
      correlationId: context.correlationId
    })

    if (!agentId || !folderId || !filename) {
      return { error: 'Missing required parameters: agentId, folderId, filename' }
    }

    try {
      // Set organization context on MCP file server
      if (organizationId) {
        mcpFileServer.setOrganizationId(organizationId)
        // Setup permissions with current agents/teams
        await setupPermissions(organizationId)
      }

      const result = await mcpFileServer.executeTool({
        name: 'delete_file_by_id',
        arguments: { agentId, folderId, filename }
      })

      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({
        agentId,
        folderId,
        filename,
        error: errorMessage,
        correlationId: context.correlationId
      })
      return { error: errorMessage }
    }
  }
}

/**
 * get_file_info_by_id - Get file metadata using discovered folderId
 */
export const getFileInfoByIdExecutor: ToolExecutor = {
  async execute(params: Record<string, unknown>, context: ExecutionContext): Promise<unknown> {
    const { agentId, organizationId, folderId, filename } = params as {
      agentId?: string
      organizationId?: string
      folderId?: string
      filename?: string
    }

    logger.info({
      agentId,
      organizationId,
      folderId,
      filename,
      correlationId: context.correlationId
    })

    if (!agentId || !folderId || !filename) {
      return { error: 'Missing required parameters: agentId, folderId, filename' }
    }

    try {
      // Set organization context on MCP file server
      if (organizationId) {
        mcpFileServer.setOrganizationId(organizationId)
        // Setup permissions with current agents/teams
        await setupPermissions(organizationId)
      }

      const result = await mcpFileServer.executeTool({
        name: 'get_file_info_by_id',
        arguments: { agentId, folderId, filename }
      })

      return result
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error({
        agentId,
        folderId,
        filename,
        error: errorMessage,
        correlationId: context.correlationId
      })
      return { error: errorMessage }
    }
  }
}
