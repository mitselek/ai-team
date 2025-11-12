/*
 * DISABLED: 2025-11-12 (F012 Phase 4)
 *
 * This client-side plugin has been replaced by server-side bootstrap.
 * See: app/server/plugins/bootstrap.ts
 *
 * ISSUE: Client plugin created browser-memory data, but API runs server-side
 * with separate in-memory stores. This led to client/server data separation:
 * - Client had organization/teams/agents in browser memory
 * - Server API had empty stores (no access to client-seeded data)
 * - API calls failed because server couldn't see client-seeded data
 *
 * SOLUTION: Server-side plugin with filesystem persistence (F012).
 * All organizational state now lives on server where API can access it.
 * Data persists across restarts in data/organizations/ directory.
 *
 * Bootstrap behavior:
 * - First startup: Creates initial organization + 6 teams + Marcus
 * - Subsequent startups: Loads existing data from filesystem
 * - Interview sessions: Persist automatically on every mutation
 *
 * Original code preserved at bottom for reference.
 * To re-enable (not recommended), remove this wrapper and uncomment code below.
 */

import { defineNuxtPlugin } from '#app'

// No-op plugin - client-side seeding disabled
export default defineNuxtPlugin(() => {
  // Server-side bootstrap handles all initialization
})

/*
====== ORIGINAL CLIENT-SIDE SEEDING CODE (DISABLED) ======

import { defineNuxtPlugin } from '#app'
import { useOrganization } from '../composables/useOrganization'
import { useTeam } from '../composables/useTeam'
import { useAgent } from '../composables/useAgent'
import type { AgentStatus, TeamType } from '@@/types'
import { logger } from '../utils/logger'
import { validateAllocations } from '../utils/validateAllocations'

export default defineNuxtPlugin(async () => {
  const { organizations, createOrganization, currentOrganization } = useOrganization()
  const { createTeam } = useTeam()
  const { createAgent, updateAgent } = useAgent()

  if (organizations.value.length > 0) {
    logger.info(
      { count: organizations.value.length },
      'Seed skipped: organizations already present'
    )
    return
  }

  logger.info({}, 'Seeding demo data...')

  // 1. Organization
  const org = createOrganization(
    'Demo AI Org',
    'https://github.com/example/demo-ai-org',
    11_000_000
  )
  currentOrganization.value = org

  // 2. Teams definition
  const teamDefs: { name: string; tokenAllocation: number; type: TeamType }[] = [
    { name: 'Toolsmiths', tokenAllocation: 2_500_000, type: 'toolsmith' },
    { name: 'Libraries', tokenAllocation: 1_200_000, type: 'library' },
    { name: 'Nurses', tokenAllocation: 800_000, type: 'nurse' },
    { name: 'Vault Ops', tokenAllocation: 1_500_000, type: 'vault' },
    { name: 'Post Office', tokenAllocation: 1_000_000, type: 'post-office' },
    { name: 'HR Team', tokenAllocation: 1_000_000, type: 'hr' }
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
  interface AgentSeed {
    name: string
    role: string
    teamName: string
    status: AgentStatus
    used: number
    allocation: number
  }
  const agentSeeds: AgentSeed[] = [
    {
      name: 'Forge',
      role: 'Compiler/Builder',
      teamName: 'Toolsmiths',
      status: 'active',
      used: 450_000,
      allocation: 600_000
    },
    {
      name: 'SpecBot',
      role: 'Spec Generator',
      teamName: 'Toolsmiths',
      status: 'bored',
      used: 120_000,
      allocation: 400_000
    },
    {
      name: 'Refactorer',
      role: 'Code Refactoring',
      teamName: 'Toolsmiths',
      status: 'active',
      used: 300_000,
      allocation: 500_000
    },
    {
      name: 'LibIndex',
      role: 'Dependency Curator',
      teamName: 'Libraries',
      status: 'stuck',
      used: 950_000,
      allocation: 1_000_000
    },
    {
      name: 'TypeGuard',
      role: 'Type Safety Auditor',
      teamName: 'Libraries',
      status: 'active',
      used: 80_000,
      allocation: 150_000
    },
    {
      name: 'CareTaker',
      role: 'Agent Health Monitor',
      teamName: 'Nurses',
      status: 'paused',
      used: 50_000,
      allocation: 200_000
    },
    {
      name: 'Recovery',
      role: 'Failure Recovery',
      teamName: 'Nurses',
      status: 'active',
      used: 300_000,
      allocation: 400_000
    },
    {
      name: 'VaultSentinel',
      role: 'Secret Scanner',
      teamName: 'Vault Ops',
      status: 'active',
      used: 700_000,
      allocation: 900_000
    },
    {
      name: 'AuditTrail',
      role: 'Compliance Logger',
      teamName: 'Vault Ops',
      status: 'bored',
      used: 150_000,
      allocation: 300_000
    },
    {
      name: 'Postmaster',
      role: 'Message Routing Overseer',
      teamName: 'Post Office',
      status: 'active',
      used: 80_000,
      allocation: 200_000
    },
    {
      name: 'Dispatcher',
      role: 'Message Router',
      teamName: 'Post Office',
      status: 'active',
      used: 180_000,
      allocation: 350_000
    },
    {
      name: 'Notifier',
      role: 'Alert Manager',
      teamName: 'Post Office',
      status: 'active',
      used: 120_000,
      allocation: 250_000
    },
    {
      name: 'Archivist',
      role: 'Communication Logger',
      teamName: 'Post Office',
      status: 'bored',
      used: 40_000,
      allocation: 200_000
    },
    {
      name: 'Marcus',
      role: 'HR Specialist',
      teamName: 'HR Team',
      status: 'active',
      used: 150_000,
      allocation: 500_000
    }
  ]

  const teamMap = new Map<string, string>() // teamName -> teamId
  teamsCreated.forEach((t) => teamMap.set(t.name, t.id))

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

  // 4. Budget validation: ensure total agent allocations per team do not exceed team tokenAllocation
  const grouped = new Map<string, { name: string; allocation: number }[]>()
  for (const a of agentSeeds) {
    const arr = grouped.get(a.teamName) ?? []
    arr.push({ name: a.name, allocation: a.allocation })
    grouped.set(a.teamName, arr)
  }
  for (const t of teamDefs) {
    const items = grouped.get(t.name) ?? []
    const res = validateAllocations(items, t.tokenAllocation)
    if (!res.valid) {
      logger.warn(
        {
          team: t.name,
          allocated: res.total,
          teamAllocation: t.tokenAllocation,
          overflow: res.overflow
        },
        'Agent allocations exceed team tokenAllocation'
      )
    } else {
      logger.info(
        {
          team: t.name,
          allocated: res.total,
          teamAllocation: t.tokenAllocation,
          remaining: res.remaining
        },
        'Team token budget validated'
      )
    }
  }

  logger.info(
    { orgId: org.id, teams: teamsCreated.length, agents: agentSeeds.length },
    'Demo data seeded'
  )
})

========== END ORIGINAL CODE ==========
*/
