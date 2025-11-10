// server/services/agent-engine/status.ts

import type { Agent, Task } from '../../../types'
import { createLogger } from '../../utils/logger'
import { tasks } from '../../data/tasks'
import { agents } from '../../data/agents'
import { v4 as uuidv4 } from 'uuid'

const logger = createLogger('agent-engine:status')

const BOREDOM_THRESHOLD = 15 * 60 * 1000 // 15 minutes

export async function handleBoredom(agent: Agent): Promise<void> {
  if (agent.status === 'bored') return // Already bored

  const log = logger.child({ agentId: agent.id })
  log.warn('Agent is bored (no tasks assigned)')

  // Update status
  agent.status = 'bored'

  // Report to senior
  if (agent.seniorId) {
    const senior = agents.find((a) => a.id === agent.seniorId)
    if (senior) {
      tasks.push({
        id: uuidv4(),
        title: `Agent ${agent.name} is bored`,
        description: `${agent.name} (${agent.role}) has no tasks assigned for ${
          BOREDOM_THRESHOLD / 60000
        } minutes. Please review workload distribution.`,
        assignedToId: senior.id,
        createdById: agent.id,
        priority: 'low',
        status: 'pending',
        organizationId: agent.organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null
      })
    }
  }
}

export async function handleStuck(agent: Agent, task: Task, error: Error): Promise<void> {
  const log = logger.child({ agentId: agent.id, taskId: task.id })
  log.warn({ error: error.message }, 'Agent is stuck on task')

  // Update status
  agent.status = 'stuck'
  task.status = 'blocked'

  // Escalate to senior
  if (agent.seniorId) {
    const senior = agents.find((a) => a.id === agent.seniorId)
    if (senior) {
      tasks.push({
        id: uuidv4(),
        title: `Agent ${agent.name} is stuck`,
        description: `${agent.name} is blocked on task: ${task.title}\n\nError: ${error.message}\n\nPlease assist or reassign.`,
        assignedToId: senior.id,
        createdById: agent.id,
        priority: 'high',
        status: 'pending',
        organizationId: agent.organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        metadata: {
          blockedTaskId: task.id,
          blockedAgentId: agent.id
        }
      })
    }
  }
}

export async function reportCompletion(agent: Agent, task: Task): Promise<void> {
  if (!agent.seniorId) return

  const senior = agents.find((a) => a.id === agent.seniorId)
  if (senior) {
    tasks.push({
      id: uuidv4(),
      title: `Task Completed: ${task.title}`,
      description: `Subordinate ${agent.name} (${agent.role}) has completed the task: ${task.title}.\n\nResult:\n${task.result}`,
      assignedToId: senior.id,
      createdById: agent.id,
      priority: 'low',
      status: 'pending',
      organizationId: agent.organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null
    })
  }
}

export async function escalateFailure(agent: Agent, task: Task, error: Error): Promise<void> {
  if (!agent.seniorId) return

  const senior = agents.find((a) => a.id === agent.seniorId)
  if (senior) {
    tasks.push({
      id: uuidv4(),
      title: `Task Failed: ${task.title}`,
      description: `Subordinate ${agent.name} (${agent.role}) failed to complete the task: ${task.title}.\n\nError: ${error.message}\n\nPlease review and reassign.`,
      assignedToId: senior.id,
      createdById: agent.id,
      priority: 'high',
      status: 'pending',
      organizationId: agent.organizationId,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      metadata: {
        failedTaskId: task.id
      }
    })
  }
}
