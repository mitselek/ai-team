import { createLogger } from '../utils/logger'
import type { Agent, Task, Organization, MCPTool, Team } from '@@/types'
import {
  writeFileExecutor,
  readFileExecutor,
  deleteFileExecutor,
  listFilesExecutor,
  getFileInfoExecutor
} from './tools/filesystem-tools'
import {
  listFoldersExecutor,
  readFileByIdExecutor,
  writeFileByIdExecutor,
  deleteFileByIdExecutor,
  getFileInfoByIdExecutor
} from './tools/f059-workspace-tools'

const logger = createLogger('orchestrator')

/**
 * Security error for identity validation failures
 */
export class SecurityError extends Error {
  public readonly claimedAgentId: string | undefined
  public readonly actualAgentId: string
  public readonly toolName: string
  public readonly correlationId: string

  constructor(
    message: string,
    claimedAgentId: string | undefined,
    actualAgentId: string,
    toolName: string,
    correlationId: string
  ) {
    super(message)
    this.name = 'SecurityError'
    this.claimedAgentId = claimedAgentId
    this.actualAgentId = actualAgentId
    this.toolName = toolName
    this.correlationId = correlationId

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SecurityError)
    }
  }
}

/**
 * Permission error for file access denials
 */
export class PermissionError extends Error {
  public readonly agentId: string
  public readonly path: string
  public readonly operation: string
  public readonly correlationId: string

  constructor(
    message: string,
    agentId: string,
    path: string,
    operation: string,
    correlationId: string
  ) {
    super(message)
    this.name = 'PermissionError'
    this.agentId = agentId
    this.path = path
    this.operation = operation
    this.correlationId = correlationId

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PermissionError)
    }
  }
}

/**
 * Execution context provided to tool executors
 */
export interface ExecutionContext {
  agentId: string
  organizationId: string
  correlationId: string
  agent?: Agent
  team?: Team
}

/**
 * Interface for tool executors
 */
export interface ToolExecutor {
  execute(params: Record<string, unknown>, context: ExecutionContext): Promise<unknown>
}

/**
 * Interface for permission service
 */
export interface PermissionService {
  checkFileAccess(agentId: string, path: string, operation: string): boolean
}

/**
 * Validates that the claimed agent identity matches the execution context
 * @param claimedAgentId - The agent ID from the tool parameters (optional - will use context.agentId if not provided)
 * @param context - The execution context with the actual agent ID
 * @param toolName - The name of the tool being executed
 * @throws SecurityError if the identity does not match
 */
export function validateAgentIdentity(
  claimedAgentId: string | undefined,
  context: ExecutionContext,
  toolName: string
): void {
  // Normalize claimed ID for comparison
  const normalizedClaimedId = typeof claimedAgentId === 'string' ? claimedAgentId : undefined

  // If no agentId is claimed, use context.agentId (agent is acting as themselves)
  if (normalizedClaimedId === undefined) {
    return // Valid - agent is using their own identity from context
  }

  // Check for identity mismatch
  if (normalizedClaimedId !== context.agentId) {
    const error = new SecurityError(
      'Agent ID mismatch - potential impersonation attempt',
      claimedAgentId,
      context.agentId,
      toolName,
      context.correlationId
    )

    // Log security violation with full context
    logger.error(
      {
        securityViolation: 'agent_identity_mismatch',
        claimedAgentId: claimedAgentId,
        actualAgentId: context.agentId,
        toolName,
        correlationId: context.correlationId,
        organizationId: context.organizationId,
        timestamp: new Date().toISOString()
      },
      'SECURITY: Agent identity validation failed'
    )

    throw error
  }
}

/**
 * Tool Registry for managing and executing tools
 */
export interface ToolRegistry {
  register(name: string, executor: ToolExecutor): void
  unregister(name: string): void
  getExecutor(name: string): ToolExecutor | undefined
  listTools(): string[]
  has(name: string): boolean
  count(): number
  executeTool(
    name: string,
    params: Record<string, unknown>,
    context: ExecutionContext,
    organization?: Organization,
    agent?: Agent,
    team?: Team
  ): Promise<unknown>
}

/**
 * Filesystem tools requiring permission checks
 */
const FILESYSTEM_TOOLS = new Set([
  'read_file',
  'write_file',
  'delete_file',
  'list_files',
  'get_file_info'
])

/**
 * Map tool names to filesystem operations
 */
function mapToolToOperation(toolName: string): 'read' | 'write' | 'delete' {
  switch (toolName) {
    case 'read_file':
    case 'list_files':
    case 'get_file_info':
      return 'read'
    case 'write_file':
      return 'write'
    case 'delete_file':
      return 'delete'
    default:
      return 'read' // Default fallback
  }
}

/**
 * Creates a new tool registry instance with filesystem tools pre-registered
 */
export function createToolRegistry(permissionService?: PermissionService): ToolRegistry {
  const tools = new Map<string, ToolExecutor>()

  // Pre-register filesystem tools (legacy path-based)
  tools.set('write_file', writeFileExecutor)
  tools.set('read_file', readFileExecutor)
  tools.set('delete_file', deleteFileExecutor)
  tools.set('list_files', listFilesExecutor)
  tools.set('get_file_info', getFileInfoExecutor)

  // Pre-register F059 folder-based workspace tools
  tools.set('list_folders', listFoldersExecutor)
  tools.set('read_file_by_id', readFileByIdExecutor)
  tools.set('write_file_by_id', writeFileByIdExecutor)
  tools.set('delete_file_by_id', deleteFileByIdExecutor)
  tools.set('get_file_info_by_id', getFileInfoByIdExecutor)

  return {
    register(name: string, executor: ToolExecutor): void {
      if (!name || name.trim() === '') {
        throw new Error('Tool name cannot be empty')
      }
      tools.set(name, executor)
    },

    unregister(name: string): void {
      tools.delete(name)
    },

    getExecutor(name: string): ToolExecutor | undefined {
      return tools.get(name)
    },

    listTools(): string[] {
      return Array.from(tools.keys()).sort()
    },

    has(name: string): boolean {
      return tools.has(name)
    },

    count(): number {
      return tools.size
    },

    async executeTool(
      name: string,
      params: Record<string, unknown>,
      context: ExecutionContext,
      organization?: Organization,
      agent?: Agent,
      team?: Team
    ): Promise<unknown> {
      // Auto-inject agentId, organizationId, and teamId from context if not already provided
      // This allows agents to use tools without explicitly passing their own ID
      const enhancedParams = {
        ...params,
        agentId: params.agentId || context.agentId,
        organizationId: params.organizationId || context.organizationId,
        teamId: params.teamId || (agent?.teamId ? agent.teamId : undefined)
      }

      // Validate identity after injection
      const claimedAgentId =
        typeof enhancedParams.agentId === 'string' ? enhancedParams.agentId : undefined
      validateAgentIdentity(claimedAgentId, context, name)

      // Issue #54: Validate tool access if org/agent provided
      if (organization && agent) {
        // Check tool exists in organization's tool list
        const toolDefinition = getToolDefinition(name, organization)
        if (!toolDefinition) {
          const error = new PermissionError(
            `Tool '${name}' is not available in this organization`,
            context.agentId,
            '',
            'execute',
            context.correlationId
          )

          logger.warn(
            {
              agentId: context.agentId,
              toolName: name,
              correlationId: context.correlationId,
              organizationId: context.organizationId,
              timestamp: new Date().toISOString()
            },
            'PERMISSION DENIED: Tool not in organization tool list'
          )

          throw error
        }

        // Check tool not blacklisted for agent/team
        const hasAccess = validateToolAccess(name, organization, agent, team)
        if (!hasAccess) {
          // Determine which blacklist blocked access
          const teamBlocked = team?.toolBlacklist?.includes(name)
          const agentBlocked = agent.toolBlacklist?.includes(name)

          let reason = ''
          if (teamBlocked && agentBlocked) {
            reason = `Tool '${name}' is restricted for your role and team`
          } else if (teamBlocked) {
            reason = `Tool '${name}' is restricted for your team`
          } else {
            reason = `Tool '${name}' is restricted for your role`
          }

          const error = new PermissionError(
            reason,
            context.agentId,
            '',
            'execute',
            context.correlationId
          )

          logger.warn(
            {
              agentId: context.agentId,
              toolName: name,
              teamBlocked,
              agentBlocked,
              correlationId: context.correlationId,
              organizationId: context.organizationId,
              timestamp: new Date().toISOString()
            },
            'PERMISSION DENIED: Tool blacklisted for agent/team'
          )

          throw error
        }
      }

      // Check permissions for filesystem tools
      if (FILESYSTEM_TOOLS.has(name) && permissionService) {
        const path = typeof params.path === 'string' ? params.path : ''
        const operation = mapToolToOperation(name)

        // Validate path parameter
        if (!path || path.trim() === '') {
          logger.warn(
            {
              agentId: context.agentId,
              toolName: name,
              operation,
              correlationId: context.correlationId,
              organizationId: context.organizationId,
              timestamp: new Date().toISOString()
            },
            'PERMISSION DENIED: Missing or empty path parameter'
          )

          throw new PermissionError(
            `Missing or empty path parameter for ${name}`,
            context.agentId,
            path,
            operation,
            context.correlationId
          )
        }

        const hasAccess = permissionService.checkFileAccess(context.agentId, path, operation)

        if (!hasAccess) {
          // Log access denial
          logger.warn(
            {
              agentId: context.agentId,
              toolName: name,
              path,
              operation,
              correlationId: context.correlationId,
              organizationId: context.organizationId,
              timestamp: new Date().toISOString()
            },
            'PERMISSION DENIED: Filesystem access denied'
          )

          throw new PermissionError(
            `Agent ${context.agentId} does not have ${operation} access to ${path}`,
            context.agentId,
            path,
            operation,
            context.correlationId
          )
        }
      }

      const executor = tools.get(name)
      if (!executor) {
        throw new Error(`Tool ${name} not found`)
      }

      // Enhanced context with agent and team references for security
      const enhancedContext: ExecutionContext = {
        ...context,
        agent,
        team
      }

      return executor.execute(enhancedParams, enhancedContext)
    }
  }
}

const BOREDOM_THRESHOLD_MS = 1000 * 60 * 10 // 10 minutes
const STUCK_THRESHOLD_MS = 1000 * 60 * 30 // 30 minutes

/**
 * A simple in-memory task queue for an agent.
 */
export class AgentTaskQueue {
  private tasks: Task[] = []
  private agentId: string

  constructor(agentId: string) {
    this.agentId = agentId
  }

  /**
   * Adds a task to the end of the queue.
   * @param task - The task to add.
   */
  enqueue(task: Task): void {
    if (task.assignedToId !== this.agentId) {
      logger.warn(
        { agentId: this.agentId, taskId: task.id, assignedTo: task.assignedToId },
        'Task enqueued to wrong agent'
      )
    }
    this.tasks.push(task)
    logger.info({ agentId: this.agentId, taskId: task.id }, 'Task enqueued')
  }

  /**
   * Removes and returns the task at the front of the queue.
   * @returns The task at the front of the queue, or undefined if the queue is empty.
   */
  dequeue(): Task | undefined {
    const task = this.tasks.shift()
    if (task) {
      logger.info({ agentId: this.agentId, taskId: task.id }, 'Task dequeued')
    }
    return task
  }

  /**
   * Returns the task at the front of the queue without removing it.
   * @returns The task at the front of the queue, or undefined if the queue is empty.
   */
  peek(): Task | undefined {
    return this.tasks[0]
  }

  /**
   * Checks if the queue is empty.
   * @returns True if the queue is empty, false otherwise.
   */
  isEmpty(): boolean {
    return this.tasks.length === 0
  }

  /**
   * Gets the number of tasks in the queue.
   * @returns The number of tasks.
   */
  size(): number {
    return this.tasks.length
  }
}

/**
 * Assesses if a task should be delegated to another agent.
 * This is a placeholder for more complex logic, such as checking agent competency.
 * @param task - The task to assess.
 * @param agent - The agent currently assigned to the task.
 * @param agents - A list of all available agents in the organization.
 * @returns The ID of the agent to delegate to, or null if no delegation is needed.
 */
export function assessDelegation(task: Task, agent: Agent, agents: Agent[]): string | null {
  // Example logic: Delegate if the agent is a manager and there are more suitable agents.
  // A real implementation would involve competency checks, workload balancing, etc.
  if (agent.role === 'manager') {
    const subordinate = agents.find((a) => a.seniorId === agent.id && a.status === 'active')
    if (subordinate) {
      logger.info(
        { taskId: task.id, fromAgentId: agent.id, toAgentId: subordinate.id },
        'Delegation assessed: delegating to subordinate'
      )
      return subordinate.id
    }
  }

  logger.info({ taskId: task.id, agentId: agent.id }, 'Delegation assessed: no action')
  return null
}

/**
 * Detects if an agent is bored (inactive for a certain period).
 * @param agent - The agent to check.
 * @returns True if the agent is bored, false otherwise.
 */
export function detectBoredom(agent: Agent): boolean {
  const now = new Date()
  const lastActive = agent.lastActiveAt
  const isBored = now.getTime() - lastActive.getTime() > BOREDOM_THRESHOLD_MS

  if (isBored && agent.status !== 'bored') {
    logger.warn({ agentId: agent.id }, 'Agent has become bored')
  }

  return isBored
}

/**
 * Detects if a task is stuck (in-progress for too long).
 * @param task - The task to check.
 * @returns True if the task is stuck, false otherwise.
 */
export function detectStuck(task: Task): boolean {
  if (task.status !== 'in-progress') {
    return false
  }

  const now = new Date()
  const updatedAt = task.updatedAt
  const isStuck = now.getTime() - updatedAt.getTime() > STUCK_THRESHOLD_MS

  if (isStuck) {
    logger.error({ taskId: task.id, agentId: task.assignedToId }, 'Task is stuck')
  }

  return isStuck
}

/**
 * Tracks token usage for an agent and the organization.
 * @param agent - The agent who used the tokens.
 * @param organization - The organization to which the agent belongs.
 * @param tokensUsed - The number of tokens used in the operation.
 * @returns An object with the updated agent and organization.
 */
export function trackTokenUsage(
  agent: Agent,
  organization: Organization,
  tokensUsed: number
): { updatedAgent: Agent; updatedOrganization: Organization } {
  const updatedAgent = {
    ...agent,
    tokenUsed: agent.tokenUsed + tokensUsed
  }

  const updatedOrganization = {
    ...organization,
    tokenPool: organization.tokenPool - tokensUsed
  }

  logger.info(
    {
      agentId: agent.id,
      organizationId: organization.id,
      tokensUsed,
      agentTokenPoolRemaining: agent.tokenAllocation - updatedAgent.tokenUsed,
      orgTokenPoolRemaining: updatedOrganization.tokenPool
    },
    'Token usage tracked'
  )

  if (updatedOrganization.tokenPool < 0) {
    logger.fatal({ organizationId: organization.id }, 'Organization token pool exhausted')
  }

  return { updatedAgent, updatedOrganization }
}

/**
 * Get tools available to an agent based on organization, team, and agent blacklists.
 *
 * Validation chain:
 * 1. Start with organization's tools (whitelist)
 * 2. Remove tools in team's blacklist (if agent is in a team)
 * 3. Remove tools in agent's blacklist
 * 4. Return filtered list
 *
 * @param organization - Organization containing base tool list
 * @param agent - Agent requesting tools
 * @param team - Optional team the agent belongs to
 * @returns Array of tools the agent can access
 */
export function getAvailableTools(
  organization: Organization,
  agent: Agent,
  team?: Team
): MCPTool[] {
  // Start with organization tools (or empty array if none defined)
  const orgTools = organization.tools || []

  // Build combined blacklist
  const blacklist = new Set<string>()

  // Add team blacklist if agent is in a team
  if (team?.toolBlacklist) {
    team.toolBlacklist.forEach((toolName) => blacklist.add(toolName))
  }

  // Add agent blacklist
  if (agent.toolBlacklist) {
    agent.toolBlacklist.forEach((toolName) => blacklist.add(toolName))
  }

  // Filter org tools by blacklist
  return orgTools.filter((tool) => !blacklist.has(tool.name))
}

/**
 * Validate that an agent has access to a specific tool.
 *
 * Used during tool execution to ensure agent isn't trying to use
 * a blacklisted tool.
 *
 * @param toolName - Name of the tool to validate
 * @param organization - Organization containing base tool list
 * @param agent - Agent requesting tool access
 * @param team - Optional team the agent belongs to
 * @returns true if agent can access the tool, false otherwise
 */
export function validateToolAccess(
  toolName: string,
  organization: Organization,
  agent: Agent,
  team?: Team
): boolean {
  const availableTools = getAvailableTools(organization, agent, team)
  return availableTools.some((tool) => tool.name === toolName)
}

/**
 * Get a specific tool definition by name.
 *
 * Used to retrieve full tool metadata when executing a tool call.
 *
 * @param toolName - Name of the tool to find
 * @param organization - Organization containing tool definitions
 * @returns Tool definition or undefined if not found
 */
export function getToolDefinition(
  toolName: string,
  organization: Organization
): MCPTool | undefined {
  const orgTools = organization.tools || []
  return orgTools.find((tool) => tool.name === toolName)
}
