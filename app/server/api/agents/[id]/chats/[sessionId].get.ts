import { defineEventHandler, setResponseStatus } from 'h3'
import { createLogger, newCorrelationId } from '../../../../utils/logger'
import { agents } from '../../../../data/agents'
import { loadChatSession } from '../../../../services/persistence/filesystem'
import type { ChatSession } from '../../../../services/persistence/chat-types'

const logger = createLogger('api.agents.chats.session')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  const agentId = event.context.params?.id
  const sessionId = event.context.params?.sessionId

  if (!agentId || !sessionId) {
    log.warn({ agentId, sessionId }, 'Missing required parameters')
    setResponseStatus(event, 400)
    return { error: 'agentId and sessionId are required' }
  }

  log.info({ agentId, sessionId }, 'Received request for GET /api/agents/{id}/chats/{sessionId}')

  const agent = agents.find((a) => a.id === agentId)
  if (!agent) {
    log.warn({ agentId }, 'Agent not found')
    setResponseStatus(event, 404)
    return { error: 'Agent not found' }
  }

  try {
    const session: ChatSession | null = await loadChatSession(
      agentId,
      sessionId,
      agent.organizationId
    )
    if (!session) {
      log.warn({ agentId, sessionId }, 'Session not found')
      setResponseStatus(event, 404)
      return { error: 'Session not found' }
    }

    log.info(
      { agentId, sessionId, messageCount: session.messages.length },
      'Chat session retrieved successfully'
    )
    return { session }
  } catch (error: unknown) {
    log.error({ error, agentId, sessionId }, 'Failed to load chat session')
    setResponseStatus(event, 500)
    return { error: 'Failed to load chat session' }
  }
})
