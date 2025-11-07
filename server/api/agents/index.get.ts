import { defineEventHandler, getQuery } from 'h3'
import { createLogger } from '../../utils/logger'
import { agents } from '../../data/agents'
import type { AgentStatus } from '../../../types'

const logger = createLogger('api.agents.get')

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const { organizationId, teamId, status } = query

  logger.info({ organizationId, teamId, status }, 'Fetching agents with filters')

  let filteredAgents = agents

  if (organizationId) {
    filteredAgents = filteredAgents.filter((agent) => agent.organizationId === organizationId)
  }

  if (teamId) {
    filteredAgents = filteredAgents.filter((agent) => agent.teamId === teamId)
  }

  if (status) {
    filteredAgents = filteredAgents.filter((agent) => agent.status === (status as AgentStatus))
  }

  return filteredAgents
})
