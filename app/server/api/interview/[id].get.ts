import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3'
import { createLogger, newCorrelationId } from '../../utils/logger'
import { getSession } from '../../services/interview/session'
import type { InterviewSession } from '../../services/interview/types'

const logger = createLogger('api.interview.get')

export default defineEventHandler((event): InterviewSession | { error: string } => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  const sessionId = getRouterParam(event, 'id')

  if (!sessionId) {
    log.warn('Session ID missing from URL')
    setResponseStatus(event, 400)
    return { error: 'Session ID required' }
  }

  log.info({ sessionId }, 'Received request to retrieve interview session')

  try {
    const session = getSession(sessionId)

    if (!session) {
      log.warn({ sessionId }, 'Session not found')
      setResponseStatus(event, 404)
      return { error: 'Session not found' }
    }

    log.info({ sessionId, status: session.status }, 'Session retrieved successfully')
    return session
  } catch (error: unknown) {
    log.error({ error, sessionId }, 'Failed to retrieve session')
    setResponseStatus(event, 500)
    return { error: 'Internal Server Error' }
  }
})
