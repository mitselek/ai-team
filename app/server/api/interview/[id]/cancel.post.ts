import { defineEventHandler, setResponseStatus } from 'h3'
import { createLogger, newCorrelationId } from '../../../utils/logger'
import { cancelInterview } from '../../../services/interview/workflow'

const logger = createLogger('api.interview.cancel')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  const interviewId = event.context.params?.id
  if (!interviewId) {
    log.warn('Missing interviewId')
    setResponseStatus(event, 400)
    return { error: 'interviewId is required' }
  }

  log.info({ interviewId }, 'Received request to cancel interview')

  try {
    cancelInterview(interviewId)
    log.info({ interviewId }, 'Interview cancelled successfully')
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('not found')) {
      log.warn({ error: error.message }, 'Resource not found')
      setResponseStatus(event, 404)
      return { error: error.message }
    }

    log.error({ error, interviewId }, 'Failed to cancel interview')
    setResponseStatus(event, 500)
    return { error: 'Failed to cancel interview' }
  }
})
