import { defineEventHandler, readBody, getRouterParam, setResponseStatus } from 'h3'
import { createLogger, newCorrelationId } from '../../../utils/logger'
import { cancelInterview } from '../../../services/interview/workflow'
import { getSession } from '../../../services/interview/session'

const logger = createLogger('api.interview.cancel')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  const sessionId = getRouterParam(event, 'id')

  if (!sessionId) {
    log.warn('Session ID missing from URL')
    setResponseStatus(event, 400)
    return { error: 'Session ID required' }
  }

  let body: { reason?: string } = {}
  try {
    body = await readBody(event)
  } catch (error) {
    // Body is optional, ignore parse errors
    log.debug('No body provided or failed to parse (reason is optional)')
  }

  try {
    // Check if session exists
    const session = getSession(sessionId)
    if (!session) {
      log.warn({ sessionId }, 'Session not found')
      setResponseStatus(event, 404)
      return { error: 'Session not found' }
    }

    // Check if session can be cancelled
    if (session.status === 'completed') {
      log.warn({ sessionId }, 'Cannot cancel completed session')
      setResponseStatus(event, 400)
      return { error: 'Cannot cancel a completed interview' }
    }

    if (session.status === 'cancelled') {
      log.warn({ sessionId }, 'Session already cancelled')
      setResponseStatus(event, 400)
      return { error: 'Interview is already cancelled' }
    }

    // Cancel the session
    await cancelInterview(sessionId, body.reason)

    log.info({ sessionId, reason: body.reason }, 'Interview cancelled successfully')

    return {
      success: true,
      message: 'Interview cancelled',
      sessionId
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('not found')) {
      log.warn({ error: error.message }, 'Resource not found')
      setResponseStatus(event, 404)
      return { error: error.message }
    }

    log.error({ error, sessionId }, 'Failed to cancel interview')
    setResponseStatus(event, 500)
    return { error: 'Internal Server Error' }
  }
})
