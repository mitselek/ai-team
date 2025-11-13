import { defineEventHandler, setResponseStatus } from 'h3'
import { createLogger, newCorrelationId } from '../../../utils/logger'
import { agents } from '../../../data/agents'
import { loadChatSessions } from '../../../services/persistence/filesystem'
import type { ChatSession } from '../../../services/persistence/chat-types'

const logger = createLogger('api.agents.chats')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  const agentId = event.context.params?.id

  if (!agentId) {
    log.warn('Missing agentId')
    setResponseStatus(event, 400)
    return { error: 'agentId is required' }
  }

  log.info({ agentId }, 'Received request for GET /api/agents/{id}/chats')

  const agent = agents.find((a) => a.id === agentId)
  if (!agent) {
    log.warn({ agentId }, 'Agent not found')
    setResponseStatus(event, 404)
    return { error: 'Agent not found' }
  }

  try {
    const sessions: ChatSession[] = await loadChatSessions(agentId, agent.organizationId)
    log.info({ agentId, count: sessions.length }, 'Chat sessions retrieved successfully')
    return { sessions }
  } catch (error: unknown) {
    log.error({ error, agentId }, 'Failed to load chat sessions')
    setResponseStatus(event, 500)
    return { error: 'Failed to load chat sessions' }
  }
})
