// server/services/tools/filesystem-tools.ts

import { mkdir, writeFile, readFile, readdir, stat, unlink } from 'fs/promises'
import path from 'path'
import { createLogger } from '../../utils/logger'
import type { ToolExecutor, ExecutionContext } from '../orchestrator'
import type { Agent, Team } from '@@/types'

const logger = createLogger('tools:filesystem')

// Operation types for permission checking
type FileOperation = 'read' | 'write' | 'delete' | 'list'

// Base workspace directory
function getWorkspaceDir(): string {
  return process.env.TEST_DATA_DIR || path.resolve(process.cwd(), 'data/organizations')
}

// Helper to ensure directory exists
async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true })
}

// Helper to resolve and validate path
function resolvePath(orgId: string, filePath: string): string {
  const workspaceDir = getWorkspaceDir()
  const orgDir = path.join(workspaceDir, orgId)

  // Handle both absolute and relative paths
  let resolvedPath: string
  if (filePath.startsWith('/')) {
    // Absolute path - prepend org directory
    resolvedPath = path.join(orgDir, filePath)
  } else {
    // Relative path
    resolvedPath = path.join(orgDir, filePath)
  }

  // Ensure path is within org directory (prevent directory traversal)
  const normalized = path.normalize(resolvedPath)
  if (!normalized.startsWith(orgDir)) {
    throw new Error('Path must be within organization workspace')
  }

  return normalized
}

/**
 * Check if an agent has permission to access a specific path for a given operation.
 *
 * Workspace Structure:
 * - /agents/{agentId}/private/     - Only that agent (read/write/delete)
 * - /agents/{agentId}/shared/      - All agents read, owner write/delete
 * - /teams/{teamId}/private/       - Team members only (read/write/delete)
 * - /teams/{teamId}/shared/        - All agents read, team members write/delete
 * - /organization/public/          - All agents (read/write/delete)
 * - Other paths                    - No access (explicit deny)
 *
 * @param filePath - The file path to check (relative to org workspace)
 * @param operation - The operation type (read/write/delete/list)
 * @param agent - The agent attempting the operation
 * @param team - The agent's team (if any)
 * @returns true if access is allowed, false otherwise
 */
export function checkAgentPathAccess(
  filePath: string,
  operation: FileOperation,
  agent: Agent,
  team: Team | undefined
): boolean {
  // Normalize path for comparison (remove leading slash)
  const normalizedPath = filePath.startsWith('/') ? filePath.slice(1) : filePath
  const pathParts = normalizedPath.split('/').filter((p) => p.length > 0)

  if (pathParts.length === 0) {
    // Root directory - allow list only
    return operation === 'list'
  }

  const topLevel = pathParts[0]

  // Agent workspace access
  if (topLevel === 'agents' && pathParts.length >= 2) {
    const targetAgentId = pathParts[1]

    if (pathParts.length >= 3) {
      const workspace = pathParts[2]

      // /agents/{agentId}/private/ - owner only
      if (workspace === 'private') {
        return targetAgentId === agent.id
      }

      // /agents/{agentId}/shared/ - all agents read, owner write/delete
      if (workspace === 'shared') {
        if (operation === 'read' || operation === 'list') {
          return true // All agents can read
        }
        return targetAgentId === agent.id // Only owner can write/delete
      }
    }

    // /agents/{agentId}/ directory itself - allow list only if owner
    if (pathParts.length === 2) {
      return targetAgentId === agent.id && operation === 'list'
    }
  }

  // Team workspace access
  if (topLevel === 'teams' && pathParts.length >= 2) {
    const targetTeamId = pathParts[1]
    const isTeamMember = team?.id === targetTeamId

    if (pathParts.length >= 3) {
      const workspace = pathParts[2]

      // /teams/{teamId}/private/ - team members only
      if (workspace === 'private') {
        return isTeamMember
      }

      // /teams/{teamId}/shared/ - all agents read, team members write/delete
      if (workspace === 'shared') {
        if (operation === 'read' || operation === 'list') {
          return true // All agents can read
        }
        return isTeamMember // Only team members can write/delete
      }
    }

    // /teams/{teamId}/ directory itself - allow list only if team member
    if (pathParts.length === 2) {
      return isTeamMember && operation === 'list'
    }
  }

  // Organization public workspace - all agents have full access
  if (topLevel === 'organization' && pathParts.length >= 2 && pathParts[1] === 'public') {
    return true
  }

  // Organization root - allow list only
  if (topLevel === 'organization' && pathParts.length === 1) {
    return operation === 'list'
  }

  // Explicit deny for all other paths
  logger.warn(
    {
      agentId: agent.id,
      teamId: team?.id,
      path: filePath,
      operation
    },
    '[PERMISSION DENIED] Path does not match any workspace pattern'
  )

  return false
}

/**
 * Validate agent has permission to access a path, throw error if not
 */
export function validatePathAccess(
  filePath: string,
  operation: FileOperation,
  context: ExecutionContext
): void {
  if (!context.agent) {
    throw new Error('Agent information missing from execution context')
  }

  const hasAccess = checkAgentPathAccess(filePath, operation, context.agent, context.team)

  if (!hasAccess) {
    logger.error(
      {
        agentId: context.agentId,
        teamId: context.team?.id,
        path: filePath,
        operation,
        correlationId: context.correlationId
      },
      '[PERMISSION DENIED] Access denied to path'
    )

    throw new Error(`Permission denied: You do not have ${operation} access to ${filePath}`)
  }
}

/**
 * write_file tool executor
 */
export const writeFileExecutor: ToolExecutor = {
  async execute(params: Record<string, unknown>, context: ExecutionContext): Promise<unknown> {
    const filePath = typeof params.path === 'string' ? params.path : ''
    const content = typeof params.content === 'string' ? params.content : ''

    if (!filePath) {
      throw new Error('Missing required parameter: path')
    }

    logger.info(
      {
        agentId: context.agentId,
        organizationId: context.organizationId,
        path: filePath,
        contentLength: content.length,
        correlationId: context.correlationId
      },
      '[WRITE_FILE] Executing'
    )

    try {
      // Validate agent has write permission to this path
      validatePathAccess(filePath, 'write', context)

      const resolvedPath = resolvePath(context.organizationId, filePath)

      // Ensure parent directory exists
      await ensureDir(path.dirname(resolvedPath))

      // Write file
      await writeFile(resolvedPath, content, 'utf-8')

      logger.info(
        {
          agentId: context.agentId,
          organizationId: context.organizationId,
          path: filePath,
          resolvedPath,
          correlationId: context.correlationId
        },
        '[WRITE_FILE] Success'
      )

      return {
        success: true,
        path: filePath,
        message: `File written successfully to ${filePath}`
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error(
        {
          agentId: context.agentId,
          organizationId: context.organizationId,
          path: filePath,
          error: errorMessage,
          correlationId: context.correlationId
        },
        '[WRITE_FILE] Failed'
      )

      throw new Error(`Failed to write file: ${errorMessage}`)
    }
  }
}

/**
 * read_file tool executor
 */
export const readFileExecutor: ToolExecutor = {
  async execute(params: Record<string, unknown>, context: ExecutionContext): Promise<unknown> {
    const filePath = typeof params.path === 'string' ? params.path : ''

    if (!filePath) {
      throw new Error('Missing required parameter: path')
    }

    logger.info(
      {
        agentId: context.agentId,
        organizationId: context.organizationId,
        path: filePath,
        correlationId: context.correlationId
      },
      '[READ_FILE] Executing'
    )

    try {
      // Validate agent has read permission to this path
      validatePathAccess(filePath, 'read', context)

      const resolvedPath = resolvePath(context.organizationId, filePath)
      const content = await readFile(resolvedPath, 'utf-8')

      logger.info(
        {
          agentId: context.agentId,
          organizationId: context.organizationId,
          path: filePath,
          contentLength: content.length,
          correlationId: context.correlationId
        },
        '[READ_FILE] Success'
      )

      return {
        success: true,
        path: filePath,
        content
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error(
        {
          agentId: context.agentId,
          organizationId: context.organizationId,
          path: filePath,
          error: errorMessage,
          correlationId: context.correlationId
        },
        '[READ_FILE] Failed'
      )

      throw new Error(`Failed to read file: ${errorMessage}`)
    }
  }
}

/**
 * delete_file tool executor
 */
export const deleteFileExecutor: ToolExecutor = {
  async execute(params: Record<string, unknown>, context: ExecutionContext): Promise<unknown> {
    const filePath = typeof params.path === 'string' ? params.path : ''

    if (!filePath) {
      throw new Error('Missing required parameter: path')
    }

    logger.info(
      {
        agentId: context.agentId,
        organizationId: context.organizationId,
        path: filePath,
        correlationId: context.correlationId
      },
      '[DELETE_FILE] Executing'
    )

    try {
      // Validate agent has delete permission to this path
      validatePathAccess(filePath, 'delete', context)

      const resolvedPath = resolvePath(context.organizationId, filePath)
      await unlink(resolvedPath)

      logger.info(
        {
          agentId: context.agentId,
          organizationId: context.organizationId,
          path: filePath,
          correlationId: context.correlationId
        },
        '[DELETE_FILE] Success'
      )

      return {
        success: true,
        path: filePath,
        message: `File deleted successfully: ${filePath}`
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error(
        {
          agentId: context.agentId,
          organizationId: context.organizationId,
          path: filePath,
          error: errorMessage,
          correlationId: context.correlationId
        },
        '[DELETE_FILE] Failed'
      )

      throw new Error(`Failed to delete file: ${errorMessage}`)
    }
  }
}

/**
 * list_files tool executor
 * Lists files in a directory, filtered by access permissions
 */
export const listFilesExecutor: ToolExecutor = {
  async execute(params: Record<string, unknown>, context: ExecutionContext): Promise<unknown> {
    const dirPath = typeof params.path === 'string' ? params.path : '/'

    logger.info(
      {
        agentId: context.agentId,
        organizationId: context.organizationId,
        path: dirPath,
        correlationId: context.correlationId
      },
      '[LIST_FILES] Executing'
    )

    try {
      // Validate agent has list permission to this path
      validatePathAccess(dirPath, 'list', context)

      const resolvedPath = resolvePath(context.organizationId, dirPath)
      const entries = await readdir(resolvedPath, { withFileTypes: true })

      // Filter entries based on agent's access permissions
      const files = entries
        .map((entry) => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
          path: path.posix.join(dirPath, entry.name) // Use posix for consistent forward slashes
        }))
        .filter((entry) => {
          // Check if agent has at least list access to this entry
          try {
            if (!context.agent) return false

            const entryPath = entry.path
            // For directories, check list permission; for files, check read permission
            const operation: FileOperation = entry.isDirectory ? 'list' : 'read'
            return checkAgentPathAccess(entryPath, operation, context.agent, context.team)
          } catch {
            return false // If any error, exclude from results
          }
        })
        .map(({ path: _, ...rest }) => rest) // Remove the temporary path field

      logger.info(
        {
          agentId: context.agentId,
          organizationId: context.organizationId,
          path: dirPath,
          totalEntries: entries.length,
          filteredCount: files.length,
          correlationId: context.correlationId
        },
        '[LIST_FILES] Success - results filtered by permissions'
      )

      return {
        success: true,
        path: dirPath,
        files
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error(
        {
          agentId: context.agentId,
          organizationId: context.organizationId,
          path: dirPath,
          error: errorMessage,
          correlationId: context.correlationId
        },
        '[LIST_FILES] Failed'
      )

      throw new Error(`Failed to list files: ${errorMessage}`)
    }
  }
}

/**
 * get_file_info tool executor
 */
export const getFileInfoExecutor: ToolExecutor = {
  async execute(params: Record<string, unknown>, context: ExecutionContext): Promise<unknown> {
    const filePath = typeof params.path === 'string' ? params.path : ''

    if (!filePath) {
      throw new Error('Missing required parameter: path')
    }

    logger.info(
      {
        agentId: context.agentId,
        organizationId: context.organizationId,
        path: filePath,
        correlationId: context.correlationId
      },
      '[GET_FILE_INFO] Executing'
    )

    try {
      // Validate agent has read permission to this path
      validatePathAccess(filePath, 'read', context)

      const resolvedPath = resolvePath(context.organizationId, filePath)
      const stats = await stat(resolvedPath)

      logger.info(
        {
          agentId: context.agentId,
          organizationId: context.organizationId,
          path: filePath,
          size: stats.size,
          correlationId: context.correlationId
        },
        '[GET_FILE_INFO] Success'
      )

      return {
        success: true,
        path: filePath,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile(),
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString()
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      logger.error(
        {
          agentId: context.agentId,
          organizationId: context.organizationId,
          path: filePath,
          error: errorMessage,
          correlationId: context.correlationId
        },
        '[GET_FILE_INFO] Failed'
      )

      throw new Error(`Failed to get file info: ${errorMessage}`)
    }
  }
}
