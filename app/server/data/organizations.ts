import type { Organization } from '@@/types'
import { teams } from './teams'

/**
 * In-memory storage for organizations.
 * In a real application, this would be a database.
 */
export const organizations: Organization[] = []

/**
 * Load all teams for an organization.
 * @param organizationId - The organization ID
 * @returns Array of teams in the organization
 */
export function loadAllTeams(organizationId: string) {
  return teams.filter((t) => t.organizationId === organizationId)
}
