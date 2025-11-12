import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { createLogger, newCorrelationId } from '../../../utils/logger'
import { editPrompt } from '../../../services/interview/workflow'

const logger = createLogger('api.interview.edit-prompt')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  const interviewId = event.context.params?.id
  if (!interviewId) {
    log.warn('Missing interviewId')
    setResponseStatus(event, 400)
    return { error: 'interviewId is required' }
  }

  log.info({ interviewId }, 'Received request to edit interview prompt')

  let body: { prompt?: string }
  try {
    body = await readBody(event)
  } catch (error) {
    log.error({ error }, 'Failed to parse request body')
    setResponseStatus(event, 400)
    return { error: 'Invalid request body' }
  }

  const { prompt } = body
  if (!prompt) {
    log.warn({ prompt }, 'Missing required fields')
    setResponseStatus(event, 400)
    return { error: 'prompt is required' }
  }

  try {
    await editPrompt(interviewId, prompt)
    log.info({ interviewId }, 'Interview prompt edited successfully')
    return { success: true }
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('not found')) {
      log.warn({ error: error.message }, 'Resource not found')
      setResponseStatus(event, 404)
      return { error: error.message }
    }

    if (error instanceof Error && error.message?.includes('Cannot edit prompt in state')) {
      log.warn({ error: error.message, interviewId }, 'State is blocked')
      setResponseStatus(event, 400)
      return { error: error.message }
    }

    log.error({ error, interviewId }, 'Failed to edit interview prompt')
    setResponseStatus(event, 500)
    return { error: 'Failed to edit interview prompt' }
  }
})
