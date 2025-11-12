// app/server/api/interview/[id]/clear-test-history.post.ts
import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3'
import { clearTestHistory } from '~/server/services/interview/workflow'
import { createLogger } from '~/server/utils/logger'
import { getSession } from '~/server/services/interview/session'

export default defineEventHandler(async (event) => {
  const log = createLogger('api:interview:clear-test-history')
  const interviewId = getRouterParam(event, 'id')

  if (!interviewId) {
    log.warn('Interview ID not provided')
    setResponseStatus(event, 400)
    return { error: 'Interview ID is required' }
  }

  try {
    // Validate session exists and is in the correct state before clearing
    const session = getSession(interviewId)
    if (!session) {
      setResponseStatus(event, 404)
      return { error: 'Interview not found' }
    }
    if (session.currentState !== 'test_conversation') {
      setResponseStatus(event, 400)
      return {
        error: `Cannot clear history in state '${session.currentState}'. Must be in 'test_conversation' state.`
      }
    }

    await clearTestHistory(interviewId)

    return { success: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    log.error({ interviewId, error: errorMessage }, 'Failed to clear test history')
    setResponseStatus(event, 500)
    return { error: 'Failed to clear test history' }
  }
})
