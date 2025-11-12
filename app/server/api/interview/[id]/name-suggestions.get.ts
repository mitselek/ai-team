import { defineEventHandler, getRouterParam, createError } from 'h3'
import { getSession } from '../../../services/interview/session'
import { createLogger } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  const logger = createLogger(event.context.id)
  const interviewId = getRouterParam(event, 'id')

  if (!interviewId) {
    throw createError({
      statusCode: 400,
      data: { error: 'interviewId is required' }
    })
  }

  logger.info(`Fetching name suggestions for interview: ${interviewId}`)

  const session = getSession(interviewId)
  if (!session) {
    logger.warn(`Interview session not found: ${interviewId}`)
    throw createError({
      statusCode: 404,
      data: { error: `Interview session ${interviewId} not found` }
    })
  }

  if (session.currentState !== 'assign_details') {
    const errorMessage = `Cannot get name suggestions in state '${session.currentState}'`
    logger.warn(errorMessage)
    throw createError({
      statusCode: 400,
      data: { error: errorMessage }
    })
  }

  if (!session.agentDraft) {
    const errorMessage = 'Agent draft not found'
    logger.warn(errorMessage)
    throw createError({
      statusCode: 400,
      data: { error: errorMessage }
    })
  }

  const names = session.agentDraft.suggestedNames || []

  return { names }
})
