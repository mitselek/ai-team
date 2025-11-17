/**
 * Agent type definition
 */
export interface Agent {
  id: string
  name: string
  role: string
  seniorId: string | null
  teamId: string
  organizationId: string
  systemPrompt: string
  tokenAllocation: number
  tokenUsed: number
  status: AgentStatus
  createdAt: Date
  lastActiveAt: Date
  maxFiles?: number // default 1000
  storageQuotaMB?: number // default 100

  /**
   * Tools that this agent can use (whitelist).
   * Must be subset of team's toolWhitelist (if agent is in team).
   * If not specified, agent inherits team's whitelist.
   */
  toolWhitelist?: string[]
}

export type AgentStatus = 'active' | 'bored' | 'stuck' | 'paused'

/**
 * Organization type definition
 */
export interface Organization {
  id: string
  name: string
  githubRepoUrl: string
  tokenPool: number
  createdAt: Date
  rootAgentId: string | null

  /**
   * Tools enabled for this organization (whitelist).
   * Only tools in this list can be used by teams/agents.
   * Tool definitions are centrally managed in ToolRegistry.
   */
  toolWhitelist?: string[]
}

/**
 * Team type definition
 */
export interface Team {
  id: string
  name: string
  description?: string
  organizationId: string
  leaderId: string | null
  tokenAllocation: number
  type: TeamType
  maxFiles?: number // default 2000
  storageQuotaGB?: number // default 1

  /**
   * Tools that this team can use (whitelist).
   * Must be subset of organization's toolWhitelist.
   * If not specified, team inherits organization's whitelist.
   */
  toolWhitelist?: string[]
}

export type TeamType =
  | 'hr'
  | 'toolsmith'
  | 'library'
  | 'vault'
  | 'tools-library'
  | 'nurse'
  | 'post-office'
  | 'custom'

/**
 * Task type definition
 */
export interface Task {
  id: string
  title: string
  description: string
  assignedToId: string
  createdById: string
  organizationId: string
  status: TaskStatus
  priority: TaskPriority
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
  result?: string
  metadata?: Record<string, unknown>
}

export type TaskStatus = 'pending' | 'in-progress' | 'blocked' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

/**
 * Tool type definition
 */
export interface Tool {
  id: string
  name: string
  description: string
  code: string
  createdBy: string
  organizationId: string
  accessLevel: ToolAccessLevel
  approved: boolean
  createdAt: Date
  usageCount: number
}

export type ToolAccessLevel = 'common' | 'organization' | 'team' | 'personal'

/**
 * Log entry type definition
 */
export interface LogEntry {
  id: string
  agentId: string
  organizationId: string
  level: LogLevel
  content: string
  timestamp: Date
}

export type LogLevel = 'org' | 'team' | 'agent'

/**
 * Chat message type definition
 */
export interface ChatMessage {
  role: 'user' | 'agent'
  content: string
  timestamp: string
}

/**
 * MCP Tool Definition (Model Context Protocol)
 *
 * Canonical format for tool definitions across all LLM providers.
 * This is the Single Source of Truth - provider-specific formats
 * are translated from this standard.
 */
export interface MCPTool {
  /** Unique tool name (e.g., 'read_file', 'write_file') */
  name: string

  /** Clear description of tool's purpose and usage */
  description: string

  /** JSON Schema defining the tool's input parameters */
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

/**
 * Folder-based file operations (F059)
 */

/** Folder scope for discovery operations */
export type FolderScope = 'my_private' | 'my_shared' | 'team_private' | 'team_shared' | 'org_shared'

/** Folder metadata returned by discovery */
export interface FolderInfo {
  folderId: string
  folderName: string
  folderType: FolderScope
  path: string
  fileCount: number
}

/** File entry in folder listing */
export interface FileEntry {
  filename: string
  size: number
  modified: string
  mimeType?: string
}

/** File discovery result with folder info and files */
export interface FileListResult extends FolderInfo {
  files: FileEntry[]
}
