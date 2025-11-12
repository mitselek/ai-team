import { v4 as uuidv4 } from 'uuid'
import { saveOrganization, saveTeam, saveAgent } from '../persistence/filesystem'
import { organizations } from '../../data/organizations'
import { teams } from '../../data/teams'
import { agents } from '../../data/agents'
import { INITIAL_ORG, CORE_TEAMS, MARCUS_TEMPLATE } from '../../data/bootstrap-data'
import type { Organization, Team, Agent } from '@@/types'
import { createLogger } from '../../utils/logger'

const log = createLogger('bootstrap:create')

/**
 * Creates the initial organization with core teams and Marcus agent.
 * Saves to filesystem and populates in-memory stores.
 *
 * @returns The created organization
 */
export async function createInitialOrganization(): Promise<Organization> {
  log.info('Creating initial organization...')

  // Create organization
  const orgId = uuidv4()
  const org: Organization = {
    ...INITIAL_ORG,
    id: orgId,
    createdAt: new Date()
  }

  await saveOrganization(org)
  organizations.push(org)
  log.info({ orgId, name: org.name }, 'Organization created')

  // Create core teams
  const createdTeams: Team[] = []
  for (const teamTemplate of CORE_TEAMS) {
    const team: Team = {
      ...teamTemplate,
      id: uuidv4(),
      organizationId: orgId
    }
    await saveTeam(team)
    teams.push(team)
    createdTeams.push(team)
    log.info({ teamId: team.id, teamName: team.name, type: team.type }, 'Team created')
  }

  // Find HR team for Marcus
  const hrTeam = createdTeams.find((t) => t.type === 'hr')
  if (!hrTeam) {
    throw new Error('HR team not found in core teams')
  }

  // Create Marcus agent
  const marcusId = uuidv4()
  const marcus: Agent = {
    ...MARCUS_TEMPLATE,
    id: marcusId,
    teamId: hrTeam.id,
    organizationId: orgId,
    createdAt: new Date(),
    lastActiveAt: new Date()
  }

  await saveAgent(marcus)
  agents.push(marcus)
  log.info({ agentId: marcus.id, agentName: marcus.name, role: marcus.role }, 'Marcus created')

  // Update organization with root agent
  org.rootAgentId = marcusId
  await saveOrganization(org)
  log.info(
    {
      orgId,
      teamsCount: createdTeams.length,
      rootAgent: marcus.name
    },
    'Initial organization bootstrap complete'
  )

  return org
}
