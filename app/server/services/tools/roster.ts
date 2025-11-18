/**
 * Roster Tool - Organizational Awareness for Agents
 * Provides agents with context about their colleagues for delegation decisions
 */

import { agents } from '../../data/agents'
import { teams } from '../../data/teams'
import type { Agent } from '@@/types'

interface RosterParams {
  filter?: 'all' | 'my_team' | 'available' | 'by_expertise'
  expertise?: string
}

interface AgentContext {
  id: string
  name: string
  role: string
  team: string
  current_workload: number
  workload_capacity: number
  expertise: string[]
  status: string
}

interface ColleagueInfo {
  id: string
  name: string
  role: string
  team: string
  seniorId: string | null
  expertise: string[]
  status: string
  current_workload: number
  workload_capacity: number
}

interface RosterResponse {
  agent_context: AgentContext
  colleagues: ColleagueInfo[]
}

/**
 * Calculate agent status based on workload and agent status
 * - idle: currentWorkload 0-2
 * - active: currentWorkload 3
 * - busy: currentWorkload 4-5
 * - offline: agent.status === 'paused'
 */
function calculateStatus(agent: Agent): string {
  if (agent.status === 'paused') {
    return 'offline'
  }

  const workload = agent.currentWorkload ?? 0

  if (workload <= 2) {
    return 'idle'
  } else if (workload === 3) {
    return 'active'
  } else {
    return 'busy'
  }
}

/**
 * Format agent data for agent context
 */
function formatAgentContext(agent: Agent, teamName: string): AgentContext {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    team: teamName,
    current_workload: agent.currentWorkload ?? 0,
    workload_capacity: 5,
    expertise: agent.expertise ?? [],
    status: calculateStatus(agent)
  }
}

/**
 * Format agent data for colleague info
 */
function formatColleague(agent: Agent, teamName: string): ColleagueInfo {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    team: teamName,
    seniorId: agent.seniorId,
    expertise: agent.expertise ?? [],
    status: calculateStatus(agent),
    current_workload: agent.currentWorkload ?? 0,
    workload_capacity: 5
  }
}

/**
 * Filter agents based on filter type
 */
function filterAgents(allAgents: Agent[], requestingAgent: Agent, params: RosterParams): Agent[] {
  const filter = params.filter ?? 'all'

  // Always exclude requesting agent
  let filtered = allAgents.filter((agent) => agent.id !== requestingAgent.id)

  if (filter === 'my_team') {
    filtered = filtered.filter((agent) => agent.teamId === requestingAgent.teamId)
  } else if (filter === 'available') {
    filtered = filtered.filter((agent) => {
      const workload = agent.currentWorkload ?? 0
      return agent.status !== 'paused' && workload < 4
    })
  } else if (filter === 'by_expertise') {
    if (!params.expertise) {
      throw new Error('expertise parameter required when filter is by_expertise')
    }

    const searchExpertise = params.expertise.toLowerCase()

    filtered = filtered.filter((agent) => {
      if (!agent.expertise || agent.expertise.length === 0) {
        return false
      }

      return agent.expertise.some((exp: string) => exp.toLowerCase() === searchExpertise)
    })
  }

  return filtered
}

/**
 * Get organization roster for an agent
 * Main entry point for the get_organization_roster tool
 */
export async function getRosterTool(
  agentId: string,
  organizationId: string,
  params: RosterParams
): Promise<RosterResponse> {
  // Find requesting agent
  const requestingAgent = agents.find(
    (a) => a.id === agentId && a.organizationId === organizationId
  )

  if (!requestingAgent) {
    throw new Error(`Agent ${agentId} not found`)
  }

  // Find agent's team
  const agentTeam = teams.find((t) => t.id === requestingAgent.teamId)

  if (!agentTeam) {
    throw new Error(`Team ${requestingAgent.teamId} not found`)
  }

  // Get all agents in organization
  const orgAgents = agents.filter((a) => a.organizationId === organizationId)

  // Filter colleagues based on params
  const colleagues = filterAgents(orgAgents, requestingAgent, params)

  // Format response
  const agentContext = formatAgentContext(requestingAgent, agentTeam.name)

  const colleagueInfo = colleagues.map((colleague) => {
    const colleagueTeam = teams.find((t) => t.id === colleague.teamId)
    const teamName = colleagueTeam?.name ?? 'Unknown'
    return formatColleague(colleague, teamName)
  })

  return {
    agent_context: agentContext,
    colleagues: colleagueInfo
  }
}
