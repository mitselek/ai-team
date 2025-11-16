import type { Team } from '@@/types'
import { agents } from './agents'

/**
 * In-memory storage for Team objects
 * TODO: Replace with GitHub-backed persistent storage
 */
export const teams: Team[] = []

/**
 * Load all agents for a team.
 * @param teamId - The team ID
 * @returns Array of agents on the team
 */
export function loadTeamAgents(teamId: string) {
  return agents.filter((a) => a.teamId === teamId)
}
