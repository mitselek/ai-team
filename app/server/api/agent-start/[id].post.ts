import { defineEventHandler, getRouterParam } from 'h3'
import { start } from '../../services/agent-engine/manager'
import { createLogger } from '../../utils/logger'

const logger = createLogger('api:agent-start')

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')

  if (!agentId) {
    event.node.res.statusCode = 400
    return { success: false, message: 'Agent ID is required' }
  }

  // TODO: Add agent validation once GitHub-backed persistence is implemented
  // For MVP: Skip validation - manager.start() works with any agent ID
  // The agent execution loop will handle missing agents gracefully

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
