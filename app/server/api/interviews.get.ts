import { defineEventHandler, getQuery, setResponseStatus } from 'h3'
import { getSessionsByTeam } from '../services/interview/session'
import { createLogger, newCorrelationId } from '../utils/logger'
import type { InterviewSession } from '../services/interview/types'

const logger = createLogger('api.interviews.get')

export default defineEventHandler((event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  log.info('Received request for GET /api/interviews')

  const query = getQuery(event)
  const teamId = query.teamId as string | undefined

  if (!teamId) {
    log.warn('teamId query parameter missing')
    setResponseStatus(event, 400)
    return { error: 'Missing teamId query parameter' }
  }

  try {
    const sessions: InterviewSession[] = getSessionsByTeam(teamId)

    log.info({ teamId, count: sessions.length }, 'Sessions retrieved successfully')

    return sessions
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('not found')) {
      log.warn({ error: error.message, teamId }, 'Resource not found')
      setResponseStatus(event, 404)
      return { error: error.message }
    }

    log.error({ error, teamId }, 'Failed to retrieve sessions')
    setResponseStatus(event, 500)
    return { error: 'Internal Server Error' }
  }
})
