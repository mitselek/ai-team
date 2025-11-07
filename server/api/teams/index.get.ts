import { defineEventHandler, getQuery } from 'h3'
import { createLogger } from '../../utils/logger'
import { teams } from '../../data/teams'
import type { TeamType } from '../../../types'

const logger = createLogger('api.teams.get')

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const { organizationId, type } = query

  logger.info({ organizationId, type }, 'Fetching teams with filters')

  let filteredTeams = teams

  if (organizationId) {
    filteredTeams = filteredTeams.filter((team) => team.organizationId === organizationId)
  }

  if (type) {
    filteredTeams = filteredTeams.filter((team) => team.type === (type as TeamType))
  }

  return filteredTeams
})
