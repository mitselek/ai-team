import type { Team } from '@@/types'
import { teams } from '../data/teams'
import { createLogger } from './logger'
import { newCorrelationId } from './logger'

const logger = createLogger('initializeOrganization')

// Define the core teams configuration
const coreTeamDefinitions = [
  { name: 'Human Resources', type: 'hr', tokenAllocation: 50000 },
  { name: 'Toolsmiths', type: 'toolsmith', tokenAllocation: 100000 },
  { name: 'Knowledge Library', type: 'library', tokenAllocation: 75000 },
  { name: 'Vault', type: 'vault', tokenAllocation: 25000 },
  { name: 'Tools Library', type: 'tools-library', tokenAllocation: 50000 },
  { name: 'The Nurse', type: 'nurse', tokenAllocation: 50000 }
] as const

/**
 * Initialize the 6 core teams for an organization.
 * Creates: HR, Toolsmith, Library, Vault, Tools Library, and Nurse teams.
 *
 * This function is idempotent - calling it multiple times for the same
 * organization will not create duplicate teams.
 *
 * @param organizationId - The ID of the organization to initialize teams for
 * @returns Array of created Team objects
 */
export function initializeDefaultTeams(organizationId: string): Team[] {
  const correlationId = newCorrelationId()
  const childLogger = logger.child({ correlationId, organizationId })

  childLogger.info({ organizationId }, 'Starting core team initialization check')

  // Idempotency Check: Check if teams for this organization already exist
  const existingOrgTeams = teams.filter((t) => t.organizationId === organizationId)
  const existingCoreTeams = existingOrgTeams.filter((t) =>
    coreTeamDefinitions.some((def) => def.type === t.type)
  )

  if (existingCoreTeams.length === coreTeamDefinitions.length) {
    childLogger.info(
      { organizationId },
      'Core teams already exist for this organization. Skipping creation.'
    )
    return existingCoreTeams.sort((a, b) => {
      const aIndex = coreTeamDefinitions.findIndex((def) => def.type === a.type)
      const bIndex = coreTeamDefinitions.findIndex((def) => def.type === b.type)
      return aIndex - bIndex
    })
  }

  const createdTeams: Team[] = []

  childLogger.info({ organizationId }, 'Initializing core teams')

  for (const definition of coreTeamDefinitions) {
    // Double-check if this specific team type already exists to be safe
    if (existingOrgTeams.some((t) => t.type === definition.type)) {
      childLogger.warn(
        { organizationId, teamType: definition.type },
        `Core team with type '${definition.type}' already exists. Skipping.`
      )
      continue
    }

    const newTeam: Team = {
      id: crypto.randomUUID(),
      name: definition.name,
      organizationId,
      leaderId: null,
      tokenAllocation: definition.tokenAllocation,
      type: definition.type
    }

    teams.push(newTeam)
    createdTeams.push(newTeam)
    childLogger.info(
      { organizationId, teamId: newTeam.id, teamName: newTeam.name, teamType: newTeam.type },
      `Created ${definition.name} team`
    )
  }

  childLogger.info(
    { organizationId, teamCount: createdTeams.length },
    'Core team initialization complete'
  )

  // Return all core teams for the org, including any that existed before
  return teams
    .filter(
      (t) =>
        t.organizationId === organizationId &&
        coreTeamDefinitions.some((def) => def.type === t.type)
    )
    .sort((a, b) => {
      const aIndex = coreTeamDefinitions.findIndex((def) => def.type === a.type)
      const bIndex = coreTeamDefinitions.findIndex((def) => def.type === b.type)
      return aIndex - bIndex
    })
}
