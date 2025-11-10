// server/services/agent-engine/delegation.ts

import type { Agent, Task } from '../../../types'
import { agents } from '../../data/agents'
import { tasks } from '../../data/tasks'
import { generateCompletion } from '../llm'
import { createLogger } from '../../utils/logger'
import { v4 as uuidv4 } from 'uuid'

const logger = createLogger('agent-engine:delegation')

export async function assessDelegation(agent: Agent, task: Task): Promise<boolean> {
  const subordinates = agents.filter((a) => a.seniorId === agent.id)
  if (subordinates.length === 0) return false

  const prompt = `Assess if this task should be delegated:
Task: ${task.title}
Description: ${task.description}

Agent role: ${agent.role}
Available subordinates: ${subordinates.map((s) => `${s.name} (${s.role})`).join(', ')}

Should this agent delegate the task? Answer YES or NO with brief reasoning.`

  const response = await generateCompletion(prompt, {
    agentId: agent.id,
    temperature: 0.3,
    maxTokens: 200
  })

  return response.content.toUpperCase().includes('YES')
}

export async function selectSubordinate(agent: Agent): Promise<Agent | null> {
  const subordinates = agents.filter((a) => a.seniorId === agent.id && a.status !== 'paused')
  if (subordinates.length === 0) return null
  if (subordinates.length === 1) return subordinates[0]

  // More sophisticated selection logic can be added here
  // For now, we'll just pick the first one
  return subordinates[0]
}

export async function delegateTask(task: Task, senior: Agent, subordinate: Agent): Promise<void> {
  const log = logger.child({
    seniorId: senior.id,
    subordinateId: subordinate.id,
    taskId: task.id
  })
  log.info(`Delegating task from ${senior.name} to ${subordinate.name}`)

  // Create a new task for the subordinate
  tasks.push({
    id: uuidv4(),
    title: `Delegated: ${task.title}`,
    description: `This task was delegated by your senior, ${senior.name}. Please complete the following:\n\n${task.description}`,
    assignedToId: subordinate.id,
    createdById: senior.id,
    priority: task.priority,
    status: 'pending',
    organizationId: senior.organizationId,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    metadata: {
      originalTaskId: task.id
    }
  })

  // Mark the original task as pending delegation
  task.status = 'pending'
  task.metadata = {
    ...task.metadata,
    delegatedTo: subordinate.id
  }
}
