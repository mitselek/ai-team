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
}

/**
 * Team type definition
 */
export interface Team {
  id: string
  name: string
  organizationId: string
  leaderId: string | null
  tokenAllocation: number
  type: TeamType
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
