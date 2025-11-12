import {
  listOrganizations,
  loadOrganization,
  loadTeams,
  loadAgents,
  loadInterviews
} from '../persistence/filesystem'
import { organizations } from '../../data/organizations'
import { teams } from '../../data/teams'
import { agents } from '../../data/agents'
import { interviewSessions } from '../interview/session'
import { createLogger } from '../../utils/logger'

const log = createLogger('bootstrap:load')

/**
 * Loads all existing organizations from filesystem into memory.
 * Populates in-memory stores: organizations, teams, agents, interviewSessions.
 *
 * @returns Number of organizations loaded
 */
export async function loadExistingOrganizations(): Promise<number> {
  log.info('Loading existing organizations from filesystem...')

  try {
    const orgIds = await listOrganizations()

    if (orgIds.length === 0) {
      log.info('No organizations found in filesystem')
      return 0
    }

    log.info({ count: orgIds.length }, 'Found organizations to load')

    let loadedCount = 0
    for (const orgId of orgIds) {
      try {
        // Load organization
        const org = await loadOrganization(orgId)
        if (!org) {
          log.warn({ orgId }, 'Organization manifest not found, skipping')
          continue
        }

        // Load teams
        const orgTeams = await loadTeams(orgId)

        // Load agents
        const orgAgents = await loadAgents(orgId)

        // Load interviews
        const orgInterviews = await loadInterviews(orgId)

        // Populate in-memory stores
        organizations.push(org)
        teams.push(...orgTeams)
        agents.push(...orgAgents)
        orgInterviews.forEach((interview) => {
          interviewSessions.push(interview)
        })

        loadedCount++
        log.info(
          {
            orgId,
            orgName: org.name,
            teamsCount: orgTeams.length,
            agentsCount: orgAgents.length,
            interviewsCount: orgInterviews.length
          },
          'Organization loaded'
        )
      } catch (error: unknown) {
        log.error(
          {
            error,
            orgId
          },
          'Failed to load organization, skipping'
        )
        // Continue with other organizations
      }
    }

    log.info(
      {
        totalOrgs: loadedCount,
        totalTeams: teams.length,
        totalAgents: agents.length,
        totalInterviews: interviewSessions.length
      },
      'All organizations loaded successfully'
    )

    return loadedCount
  } catch (error: unknown) {
    log.error({ error }, 'Failed to load organizations from filesystem')
    throw error
  }
}
