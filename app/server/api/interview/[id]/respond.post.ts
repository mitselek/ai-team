import { defineEventHandler, readBody, getRouterParam, setResponseStatus } from 'h3'
import { createLogger, newCorrelationId } from '../../../utils/logger'
import { processCandidateResponse } from '../../../services/interview/workflow'
import { getSession } from '../../../services/interview/session'

const logger = createLogger('api.interview.respond')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  log.info('Received request to respond to interview question')

  const sessionId = getRouterParam(event, 'id')

  if (!sessionId) {
    log.warn('Session ID missing from URL')
    setResponseStatus(event, 400)
    return { error: 'Session ID required' }
  }

  let body: { response?: string }
  try {
    body = await readBody(event)
  } catch (error) {
    log.error({ error }, 'Failed to parse request body')
    setResponseStatus(event, 400)
    return { error: 'Invalid request body' }
  }

  if (!body.response || body.response.trim() === '') {
    log.warn('Empty response provided')
    setResponseStatus(event, 400)
    return { error: 'Response text required' }
  }

  try {
    // Check if session exists and is active
    const session = getSession(sessionId)
    if (!session) {
      log.warn({ sessionId }, 'Session not found')
      setResponseStatus(event, 404)
      return { error: 'Session not found' }
    }

    if (session.status !== 'active') {
      log.warn({ sessionId, status: session.status }, 'Session not active')
      setResponseStatus(event, 400)
      return { error: 'Interview session is not active' }
    }

    // Process response
    const result = await processCandidateResponse(sessionId, body.response)

    log.info({ sessionId, complete: result.complete }, 'Response processed successfully')

    if (result.complete) {
      return {
        nextQuestion: result.nextQuestion,
        complete: result.complete,
        profile: session.candidateProfile,
        systemPrompt: session.candidateProfile.systemPrompt,
        suggestedName: session.candidateProfile.suggestedName
      }
    }

    return result
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('not found')) {
      log.warn({ error: error.message }, 'Resource not found')
      setResponseStatus(event, 404)
      return { error: error.message }
    }

    log.error({ error }, 'Failed to process response')
    setResponseStatus(event, 500)
    return { error: 'Internal Server Error' }
  }
})
