// server/api/agents/[id]/start/index.post.ts
import { defineEventHandler, getRouterParam } from 'h3'
import { start } from '../../../../services/agent-engine/manager'
import { agents } from '../../../../data/agents'
import { createLogger } from '../../../../utils/logger'

export default defineEventHandler(async (event) => {
  const logger = createLogger('api:agents:start')
  const agentId = getRouterParam(event, 'id')

  if (!agentId) {
    event.node.res.statusCode = 400
    return { success: false, message: 'Agent ID is required' }
  }

  const agent = agents.find((a) => a.id === agentId)

  if (!agent) {
    event.node.res.statusCode = 404
    return { success: false, message: 'Agent not found' }
  }

  try {
    await start(agentId)
    logger.info({ agentId }, 'Agent loop started successfully')
    return { success: true, message: 'Agent loop started' }
  } catch (error: unknown) {
    logger.error({ error, agentId }, 'Failed to start agent loop')
    event.node.res.statusCode = 500
    return { success: false, message: 'Failed to start agent loop' }
  }
})
