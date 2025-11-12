import { defineEventHandler, setResponseStatus } from 'h3'
import { createLogger, newCorrelationId } from '../../../utils/logger'
import { rejectPrompt } from '../../../services/interview/workflow'

const logger = createLogger('api.interview.reject-prompt')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  const interviewId = event.context.params?.id
  if (!interviewId) {
    log.warn('Missing interviewId')
    setResponseStatus(event, 400)
    return { error: 'interviewId is required' }
  }

  log.info({ interviewId }, 'Received request to reject interview prompt')

  try {
    rejectPrompt(interviewId)
    log.info({ interviewId }, 'Interview prompt rejected successfully')
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('not found')) {
      log.warn({ error: error.message }, 'Resource not found')
      setResponseStatus(event, 404)
      return { error: error.message }
    }

    if (error instanceof Error && error.message?.includes('Cannot reject prompt in state')) {
      log.warn({ error: error.message, interviewId }, 'State is blocked')
      setResponseStatus(event, 400)
      return { error: error.message }
    }

    log.error({ error, interviewId }, 'Failed to reject interview prompt')
    setResponseStatus(event, 500)
    return { error: 'Failed to reject interview prompt' }
  }
})
