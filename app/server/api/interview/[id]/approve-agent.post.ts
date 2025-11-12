import { defineEventHandler, getRouterParam, createError } from 'h3'
import { getSession } from '~/server/services/interview/session'
import { approveAgent } from '~/server/services/interview/workflow'
import { createLogger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const log = createLogger('api:interview:approve-agent')
  const interviewId = getRouterParam(event, 'id')

  if (!interviewId) {
    log.warn('Validation failed: interviewId is required')
    throw createError({
      statusCode: 400,
      data: { error: 'interviewId is required' }
    })
  }

  log.info({ interviewId }, 'Processing request to approve agent')

  try {
    const session = getSession(interviewId)
    if (!session) {
      log.warn({ interviewId }, 'Interview session not found')
      throw createError({
        statusCode: 404,
        data: { error: `Interview session ${interviewId} not found` }
      })
    }

    if (session.currentState !== 'test_conversation') {
      log.warn(
        { interviewId, currentState: session.currentState },
        'Validation failed: Cannot approve agent in current state'
      )
      throw createError({
        statusCode: 400,
        data: { error: `Cannot approve agent in state '${session.currentState}'` }
      })
    }

    approveAgent(interviewId)

    log.info({ interviewId }, 'Agent approved successfully')
    return { success: true }
  } catch (error: unknown) {
    // Re-throw H3Errors
    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'An unknown error occurred'
    log.error({ interviewId, error: message }, 'Failed to approve agent')
    throw createError({
      statusCode: 500,
      data: { error: 'An internal error occurred' }
    })
  }
})
