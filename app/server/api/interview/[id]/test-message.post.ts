// app/server/api/interview/[id]/test-message.post.ts
import { defineEventHandler, readBody, setResponseStatus, getRouterParam } from 'h3'
import { sendTestMessage } from '~/server/services/interview/workflow'
import { createLogger } from '~/server/utils/logger'
import { getSession } from '~/server/services/interview/session'

export default defineEventHandler(async (event) => {
  const log = createLogger('api:interview:test-message')
  const interviewId = getRouterParam(event, 'id')

  if (!interviewId) {
    log.warn('Interview ID not provided')
    setResponseStatus(event, 400)
    return { error: 'Interview ID is required' }
  }

  const body = await readBody(event)
  const { message, correlationId } = body

  if (!message || typeof message !== 'string' || !message.trim()) {
    setResponseStatus(event, 400)
    return { error: 'A non-empty message is required' }
  }

  try {
    // Pre-validate session state to give a clear error
    const session = getSession(interviewId)
    if (!session) {
      setResponseStatus(event, 404)
      return { error: 'Interview not found' }
    }
    if (session.currentState !== 'test_conversation') {
      setResponseStatus(event, 400)
      return {
        error: `Cannot send test message in state '${session.currentState}'. Must be in 'test_conversation' state.`
      }
    }

    const result = await sendTestMessage(interviewId, message, correlationId)
    return {
      response: result.response,
      historyLength: result.historyLength
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    log.error({ interviewId, error: errorMessage }, 'Failed to send test message')
    setResponseStatus(event, 500)
    return { error: 'Failed to send test message' }
  }
})
