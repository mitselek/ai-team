// server/services/agent-engine/loop.ts

import { v4 as uuidv4 } from 'uuid'
import { agents } from '../../data/agents'
import { tasks } from '../../data/tasks'
import { createLogger } from '../../utils/logger'
import { processTask } from './processor'
import { handleBoredom } from './status'
import { checkBudget, handleBudgetExhausted } from './budget'

const logger = createLogger('agent-engine:loop')

const POLL_INTERVAL = 30000 // 30 seconds
const ERROR_RETRY_DELAY = 60000 // 60 seconds
const BOREDOM_THRESHOLD = 15 * 60 * 1000 // 15 minutes

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function startAgentLoop(agentId: string): Promise<void> {
  const agent = agents.find((a) => a.id === agentId)
  if (!agent || agent.status === 'paused') return

  const log = logger.child({ agentId, correlationId: uuidv4() })
  log.info(`Starting agent loop for ${agent.name}`)

  while (true) {
    try {
      const agent = agents.find((a) => a.id === agentId)
      if (!agent || agent.status === 'paused') {
        log.info(`Agent ${agent?.name} is paused. Stopping loop.`)
        break
      }

      if (!(await checkBudget(agent))) {
        await handleBudgetExhausted(agent)
        break
      }

      const agentTasks = tasks.filter((t) => t.assignedToId === agentId)

      if (agentTasks.length === 0) {
        const idleTime = Date.now() - (agent.lastActiveAt?.getTime() || 0)
        if (idleTime > BOREDOM_THRESHOLD) {
          await handleBoredom(agent)
        }
      } else {
        const task = agentTasks[0]
        await processTask(agent, task)
      }

      agent.lastActiveAt = new Date()
      await sleep(POLL_INTERVAL)
    } catch (error) {
      log.error({ error }, 'Agent loop error')
      await sleep(ERROR_RETRY_DELAY)
    }
  }
}
