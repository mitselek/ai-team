import { defineEventHandler, getRouterParam } from 'h3'
import { stop } from '../../services/agent-engine/manager'
import { createLogger } from '../../utils/logger'

const logger = createLogger('api:agent-stop')

export default defineEventHandler(async (event) => {
  const agentId = getRouterParam(event, 'id')

  if (!agentId) {
    event.node.res.statusCode = 400
    return { success: false, message: 'Agent ID is required' }
  }

  // TODO: Add agent validation once GitHub-backed persistence is implemented
  // For MVP: Skip validation - manager.stop() works with any agent ID
  // The agent execution loop will handle missing agents gracefully

  try {
    await stop(agentId)
    logger.info({ agentId }, 'Agent loop stopped successfully')
    return { success: true, message: 'Agent loop stopped' }
  } catch (error: unknown) {
    logger.error({ error, agentId }, 'Failed to stop agent loop')
    event.node.res.statusCode = 500
    return { success: false, message: 'Failed to stop agent loop' }
  }
})
