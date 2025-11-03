
import { createLogger } from '../utils/logger'
import type { Agent, Task, Organization } from '../../types'

const logger = createLogger('orchestrator')

const BOREDOM_THRESHOLD_MS = 1000 * 60 * 10 // 10 minutes
const STUCK_THRESHOLD_MS = 1000 * 60 * 30 // 30 minutes

/**
 * A simple in-memory task queue for an agent.
 */
export class AgentTaskQueue {
  private tasks: Task[] = []
  private agentId: string

  constructor (agentId: string) {
    this.agentId = agentId
  }

  /**
   * Adds a task to the end of the queue.
   * @param task - The task to add.
   */
  enqueue (task: Task): void {
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
  dequeue (): Task | undefined {
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
  peek (): Task | undefined {
    return this.tasks[0]
  }

  /**
   * Checks if the queue is empty.
   * @returns True if the queue is empty, false otherwise.
   */
  isEmpty (): boolean {
    return this.tasks.length === 0
  }

  /**
   * Gets the number of tasks in the queue.
   * @returns The number of tasks.
   */
  size (): number {
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
export function assessDelegation (task: Task, agent: Agent, agents: Agent[]): string | null {
  // Example logic: Delegate if the agent is a manager and there are more suitable agents.
  // A real implementation would involve competency checks, workload balancing, etc.
  if (agent.role === 'manager') {
    const subordinate = agents.find(a => a.seniorId === agent.id && a.status === 'active')
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
export function detectBoredom (agent: Agent): boolean {
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
export function detectStuck (task: Task): boolean {
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
export function trackTokenUsage (
  agent: Agent,
  organization: Organization,
  tokensUsed: number
): { updatedAgent: Agent, updatedOrganization: Organization } {
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
    logger.fatal(
      { organizationId: organization.id },
      'Organization token pool exhausted'
    )
  }

  return { updatedAgent, updatedOrganization }
}
