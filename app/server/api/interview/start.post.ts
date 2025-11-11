import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { createLogger, newCorrelationId } from '../../utils/logger'
import { startInterview } from '../../services/interview/workflow'

const logger = createLogger('api.interview.start')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  log.info('Received request to start interview')

  let body: { teamId?: string; interviewerId?: string }
  try {
    body = await readBody(event)
  } catch (error) {
    log.error({ error }, 'Failed to parse request body')
    setResponseStatus(event, 400)
    return { error: 'Invalid request body' }
  }

  const { teamId, interviewerId } = body
  if (!teamId || !interviewerId) {
    log.warn({ teamId, interviewerId }, 'Missing required fields')
    setResponseStatus(event, 400)
    return { error: 'teamId and interviewerId are required' }
  }

  try {
    const session = await startInterview(teamId, interviewerId)

    // Extract greeting and first question from transcript
    const greeting = session.transcript.find((m) => m.speaker === 'interviewer')?.message || ''
    const firstQuestion = session.transcript[session.transcript.length - 1]?.message || ''

    log.info({ sessionId: session.id }, 'Interview started successfully')

    setResponseStatus(event, 201)
    return {
      sessionId: session.id,
      greeting,
      firstQuestion,
      status: session.status,
      createdAt: session.createdAt
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('not found')) {
      log.warn({ error: error.message }, 'Resource not found')
      setResponseStatus(event, 404)
      return { error: error.message }
    }

    log.error({ error, teamId, interviewerId }, 'Failed to start interview')
    setResponseStatus(event, 500)
    return { error: 'Failed to start interview' }
  }
})
