// app/server/api/interview/[id]/test-history.get.ts
import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3'
import { getSession } from '~/server/services/interview/session'
import { createLogger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const log = createLogger('api:interview:test-history')
  const interviewId = getRouterParam(event, 'id')

  if (!interviewId) {
    log.warn('Interview ID not provided')
    setResponseStatus(event, 400)
    return { error: 'Interview ID is required' }
  }

  try {
    const session = getSession(interviewId)
    if (!session) {
      log.warn({ interviewId }, 'Interview session not found')
      setResponseStatus(event, 404)
      return { error: 'Interview not found' }
    }

    return {
      history: session.testConversationHistory || []
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    log.error({ interviewId, error: errorMessage }, 'Failed to get test history')
    setResponseStatus(event, 500)
    return { error: 'Failed to get test history' }
  }
})
