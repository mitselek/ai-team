// server/services/agent-engine/processor.ts

import type { Agent, Task } from '@@/types'
import { createLogger } from '../../utils/logger'
import { generateCompletion } from '../llm'
import { assessDelegation, selectSubordinate, delegateTask } from './delegation'
import { reportCompletion, escalateFailure } from './status'

const logger = createLogger('agent-engine:processor')

function buildTaskPrompt(task: Task): string {
  return `You are an AI agent. Your task is to complete the following objective:
Title: ${task.title}
Description: ${task.description}
Priority: ${task.priority}

Provide your response as a structured result.
`
}

export async function processTask(agent: Agent, task: Task): Promise<void> {
  const log = logger.child({ agentId: agent.id, taskId: task.id })

  task.status = 'in-progress'
  task.assignedToId = agent.id

  log.info(
    {
      taskTitle: task.title,
      priority: task.priority
    },
    'Processing task'
  )

  try {
    const shouldDelegate = await assessDelegation(agent, task)

    if (shouldDelegate) {
      const subordinate = await selectSubordinate(agent)
      if (subordinate) {
        await delegateTask(task, agent, subordinate)
        return
      }
    }

    const prompt = buildTaskPrompt(task)
    const response = await generateCompletion(prompt, {
      agentId: agent.id
      // correlationId: log.correlationId, // How to get this?
    })

    task.status = 'completed'
    task.result = response.content
    task.completedAt = new Date()

    agent.tokenUsed += response.tokensUsed.total
    agent.lastActiveAt = new Date()

    if (agent.seniorId) {
      await reportCompletion(agent, task)
    }

    log.info({ tokensUsed: response.tokensUsed.total }, 'Task completed')
  } catch (error: unknown) {
    log.error({ error }, 'Task processing failed')
    task.status = 'blocked'
    task.result = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`

    if (agent.seniorId) {
      const errorToEscalate =
        error instanceof Error
          ? error
          : new Error('An unknown error occurred during task processing.')
      await escalateFailure(agent, task, errorToEscalate)
    }
  }
}
