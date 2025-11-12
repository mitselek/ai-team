import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { createLogger, newCorrelationId } from '../../../utils/logger'
import { processCandidateResponse } from '../../../services/interview/workflow'

const logger = createLogger('api.interview.respond')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  const interviewId = event.context.params?.id
  if (!interviewId) {
    log.warn('Missing interviewId')
    setResponseStatus(event, 400)
    return { error: 'interviewId is required' }
  }

  log.info({ interviewId }, 'Received request to respond to interview')

  let body: { response?: string }
  try {
    body = await readBody(event)
  } catch (error) {
    log.error({ error }, 'Failed to parse request body')
    setResponseStatus(event, 400)
    return { error: 'Invalid request body' }
  }

  const { response } = body
  if (!response) {
    log.warn({ response }, 'Missing required fields')
    setResponseStatus(event, 400)
    return { error: 'response is required' }
  }

  try {
    const result = await processCandidateResponse(interviewId, response)
    log.info({ interviewId }, 'Successfully processed candidate response')
    return result
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('not found')) {
      log.warn({ error: error.message }, 'Resource not found')
      setResponseStatus(event, 404)
      return { error: error.message }
    }

    if (error instanceof Error && error.message?.includes('Cannot respond in state')) {
      log.warn({ error: error.message, interviewId }, 'State is blocked')
      setResponseStatus(event, 400)
      return { error: error.message }
    }

    log.error({ error, interviewId }, 'Failed to process candidate response')
    setResponseStatus(event, 500)
    return { error: 'Failed to process candidate response' }
  }
})
