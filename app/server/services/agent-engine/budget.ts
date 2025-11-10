// server/services/agent-engine/budget.ts

import type { Agent } from '@@/types'
import { createLogger } from '../../utils/logger'
import { tasks } from '../../data/tasks'
import { agents } from '../../data/agents'
import { v4 as uuidv4 } from 'uuid'

const logger = createLogger('agent-engine:budget')

const BUDGET_WARNING_THRESHOLDS = [0.9, 0.95]

export async function checkBudget(agent: Agent): Promise<boolean> {
  return agent.tokenUsed < agent.tokenAllocation
}

export async function warnOnLowBudget(agent: Agent): Promise<void> {
  const usage = agent.tokenUsed / agent.tokenAllocation
  const log = logger.child({ agentId: agent.id })

  for (const threshold of BUDGET_WARNING_THRESHOLDS) {
    if (usage >= threshold && usage < threshold + 0.05) {
      // Simple check to avoid spamming warnings
      log.warn(`Agent has used ${Math.round(usage * 100)}% of token budget.`)
      if (agent.seniorId) {
        const senior = agents.find((a) => a.id === agent.seniorId)
        if (senior) {
          tasks.push({
            id: uuidv4(),
            title: `Token Budget Warning for ${agent.name}`,
            description: `${agent.name} (${agent.role}) has used ${Math.round(
              usage * 100
            )}% of their token budget. Please consider increasing their allocation.`,
            assignedToId: senior.id,
            createdById: 'system',
            priority: 'medium',
            status: 'pending',
            organizationId: agent.organizationId,
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: null
          })
        }
      }
    }
  }
}

export async function handleBudgetExhausted(agent: Agent): Promise<void> {
  const log = logger.child({ agentId: agent.id })
  log.error('Agent has exhausted their token budget.')
  agent.status = 'paused'

  if (agent.seniorId) {
    const senior = agents.find((a) => a.id === agent.seniorId)
    if (senior) {
      tasks.push({
        id: uuidv4(),
        title: `URGENT: ${agent.name} has exhausted their token budget`,
        description: `${agent.name} (${agent.role}) has used 100% of their token budget and is now paused. All assigned tasks are blocked. Please increase their allocation to resume operation.`,
        assignedToId: senior.id,
        createdById: 'system',
        priority: 'high',
        status: 'pending',
        organizationId: agent.organizationId,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null
      })
    }
  }
}
