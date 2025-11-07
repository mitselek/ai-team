import { defineNuxtPlugin } from '#app'
import { useOrganization } from '../composables/useOrganization'
import { useTeam } from '../composables/useTeam'
import { useAgent } from '../composables/useAgent'
import type { AgentStatus, TeamType } from '@@/types'
import { logger } from '../utils/logger'

/**
 * Demo data seeding plugin.
 * Populates one organization, several teams, and agents with varied usage/status
 * ONLY if there is currently no organization data (idempotent on first load).
 */
export default defineNuxtPlugin(async () => {
  const { organizations, createOrganization, currentOrganization } = useOrganization()
  const { createTeam } = useTeam()
  const { createAgent, updateAgent } = useAgent()

  if (organizations.value.length > 0) {
    logger.info({ count: organizations.value.length }, 'Seed skipped: organizations already present')
    return
  }

  logger.info({}, 'Seeding demo data...')

  // 1. Organization
  const org = createOrganization('Demo AI Org', 'https://github.com/example/demo-ai-org', 10_000_000)
  currentOrganization.value = org

  // 2. Teams definition
  const teamDefs: { name: string; tokenAllocation: number; type: TeamType }[] = [
    { name: 'Toolsmiths', tokenAllocation: 2_500_000, type: 'toolsmith' },
    { name: 'Libraries', tokenAllocation: 1_200_000, type: 'library' },
    { name: 'Nurses', tokenAllocation: 800_000, type: 'nurse' },
    { name: 'Vault Ops', tokenAllocation: 1_500_000, type: 'vault' }
  ]

  const teamsCreated = [] as { id: string; name: string; type: TeamType }[]
  for (const td of teamDefs) {
    const t = await createTeam({
      name: td.name,
      organizationId: org.id,
      leaderId: null,
      tokenAllocation: td.tokenAllocation,
      type: td.type
    })
    teamsCreated.push({ id: t.id, name: t.name, type: t.type })
  }

  // 3. Agents per team (some varied statuses & usage)
  interface AgentSeed { name: string; role: string; teamName: string; status: AgentStatus; used: number; allocation: number }
  const agentSeeds: AgentSeed[] = [
    { name: 'Forge', role: 'Compiler/Builder', teamName: 'Toolsmiths', status: 'active', used: 450_000, allocation: 600_000 },
    { name: 'SpecBot', role: 'Spec Generator', teamName: 'Toolsmiths', status: 'bored', used: 120_000, allocation: 400_000 },
    { name: 'Refactorer', role: 'Code Refactoring', teamName: 'Toolsmiths', status: 'active', used: 300_000, allocation: 500_000 },
    { name: 'LibIndex', role: 'Dependency Curator', teamName: 'Libraries', status: 'stuck', used: 950_000, allocation: 1_000_000 },
    { name: 'TypeGuard', role: 'Type Safety Auditor', teamName: 'Libraries', status: 'active', used: 80_000, allocation: 150_000 },
    { name: 'CareTaker', role: 'Agent Health Monitor', teamName: 'Nurses', status: 'paused', used: 50_000, allocation: 200_000 },
    { name: 'Recovery', role: 'Failure Recovery', teamName: 'Nurses', status: 'active', used: 300_000, allocation: 400_000 },
    { name: 'VaultSentinel', role: 'Secret Scanner', teamName: 'Vault Ops', status: 'active', used: 700_000, allocation: 900_000 },
    { name: 'AuditTrail', role: 'Compliance Logger', teamName: 'Vault Ops', status: 'bored', used: 150_000, allocation: 300_000 }
  ]

  const teamMap = new Map<string, string>() // teamName -> teamId
  teamsCreated.forEach(t => teamMap.set(t.name, t.id))

  for (const a of agentSeeds) {
    const teamId = teamMap.get(a.teamName)
    if (!teamId) continue
    const agent = createAgent(
      a.name,
      a.role,
      org.id,
      teamId,
      `System prompt for ${a.name}`,
      null,
      a.allocation
    )
    // Update usage & status (createAgent sets 0 usage and active by default)
    updateAgent(agent.id, { tokenUsed: a.used, status: a.status })
  }

  logger.info({ orgId: org.id, teams: teamsCreated.length, agents: agentSeeds.length }, 'Demo data seeded')
})
