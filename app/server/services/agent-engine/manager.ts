// server/services/agent-engine/manager.ts

import { agents } from '../../data/agents'
import { createLogger } from '../../utils/logger'
import { startAgentLoop } from './loop'

const logger = createLogger('agent-engine:manager')

const runningLoops = new Map<string, boolean>()

export async function startAll(): Promise<void> {
  logger.info('Starting all active agents...')
  const activeAgents = agents.filter((a) => a.status === 'active')
  for (const agent of activeAgents) {
    start(agent.id)
  }
}

export async function stopAll(): Promise<void> {
  logger.info('Stopping all agent loops...')
  for (const agentId of runningLoops.keys()) {
    stop(agentId)
  }
}

export async function start(agentId: string): Promise<void> {
  if (runningLoops.get(agentId)) {
    logger.warn(`Agent loop for ${agentId} is already running.`)
    return
  }
  runningLoops.set(agentId, true)
  startAgentLoop(agentId).catch((error) => {
    logger.error({ error, agentId }, 'Agent loop crashed.')
    runningLoops.delete(agentId)
  })
}

export async function stop(agentId: string): Promise<void> {
  if (!runningLoops.get(agentId)) {
    logger.warn(`No active loop found for agent ${agentId}.`)
    return
  }
  logger.info(`Stopping agent loop for ${agentId}.`)
  runningLoops.delete(agentId)
  // This is a simplified stop. In a real scenario, we'd need a more graceful
  // way to signal the loop to exit. For now, we'll rely on the loop
  // checking the agent's status.
  const agent = agents.find((a) => a.id === agentId)
  if (agent) {
    agent.status = 'paused'
  }
}

export async function restart(agentId: string): Promise<void> {
  await stop(agentId)
  await start(agentId)
}
