```prompt
# Development Task: Dashboard UI Component

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create the main dashboard page component at `app/pages/index.vue` that displays token spending across the organization hierarchy (Organization → Teams → Agents) with an organization selector dropdown. This is a view-only dashboard showing real-time data from existing composables.

## Critical Constraints

### DO NOT MODIFY
- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **Any composables** - Use existing composables, don't modify them
- **Any API endpoints** - This is client-side only

### MUST USE
- **Type-only imports** - For types/interfaces use `import type { ... }`
- **Relative imports** for types: `import type { Organization, Team, Agent } from '~/types'`
- **Vue 3 Composition API** - `<script setup lang="ts">`
- **Existing composables**:
  - `useOrganization()` for org data and selection
  - `useTeam()` for team data
  - `useAgent()` for agent data
- **Tailwind CSS** for all styling (no custom CSS)
- **Reactive state** - Use `ref()` for reactive values, `computed()` for derived state
- **TypeScript strict mode** - All variables must have proper types

## Type Definitions (Reference Only - DO NOT MODIFY)

```typescript
export interface Organization {
  id: string
  name: string
  githubRepoUrl: string
  tokenPool: number
  createdAt: Date
  rootAgentId: string | null
}

export interface Team {
  id: string
  name: string
  organizationId: string
  leaderId: string | null
  tokenAllocation: number
  type: TeamType
}

export type TeamType = 'hr' | 'toolsmith' | 'library' | 'vault' | 'tools-library' | 'nurse' | 'custom'

export interface Agent {
  id: string
  name: string
  role: string
  seniorId: string | null
  teamId: string
  organizationId: string
  systemPrompt: string
  tokenAllocation: number
  tokenUsed: number
  status: AgentStatus
  createdAt: Date
  lastActiveAt: Date
}

export type AgentStatus = 'active' | 'bored' | 'stuck' | 'paused'
```

## Composable APIs (Use These - DO NOT Modify)

### useOrganization()

```typescript
const {
  organizations,           // Ref<Organization[]> - all orgs
  currentOrganization,     // Ref<Organization | null> - selected org
  createOrganization,      // (name, githubRepoUrl, tokenPool) => Organization
  getOrganization,         // (id) => Organization | undefined
  listOrganizations,       // () => Organization[]
  updateOrganization,      // (id, updates) => Organization | undefined
  setCurrentOrganization,  // (id) => void
  deleteOrganization       // (id) => void
} = useOrganization()
```

### useTeam()

```typescript
const {
  createTeam,    // (teamData: Omit<Team, 'id'>) => Promise<Team>
  getTeam,       // (id: string) => Team | undefined
  listTeams,     // (filters?: {organizationId?, type?}) => Team[]
  updateTeam,    // (id: string, updates: Partial<Team>) => Promise<Team | undefined>
  deleteTeam     // (id: string) => Promise<boolean>
} = useTeam()
```

### useAgent()

```typescript
const {
  createAgent,  // (name, role, orgId, teamId, systemPrompt, seniorId?, tokenAllocation?) => Agent
  getAgent,     // (id: string) => Agent | undefined
  listAgents,   // (filters?: {organizationId?, teamId?, status?}) => Agent[]
  updateAgent,  // (id: string, updates: Partial<Agent>) => Agent | undefined
  deleteAgent   // (id: string) => void
} = useAgent()
```

## Component Requirements

### 1. Organization Selector (Header Section)

- **Dropdown** to select organization
- Bind to `currentOrganization` from `useOrganization()`
- On change, call `setCurrentOrganization(selectedId)`
- Display selected org name prominently
- Show org creation date

### 2. Token Overview (Card Grid)

Display 4 cards showing:

1. **Total Pool**: `currentOrganization.value.tokenPool`
2. **Allocated to Teams**: Sum of `Team.tokenAllocation` for all teams in org
3. **Used by Agents**: Sum of `Agent.tokenUsed` for all agents in org
4. **Remaining**: `tokenPool - used`

Use computed properties for calculations.

### 3. Teams Section

- List all teams for current org using `listTeams({organizationId: currentOrgId})`
- For each team, display a collapsible card showing:
  - Team name
  - Team type (with type-specific color/icon)
  - Token allocation
  - Number of agents in team
  - Total tokens used by team's agents
  - Expand/collapse indicator (▶ when collapsed, ▼ when expanded)
- When team is expanded, show the agents list (described in section 4 below)
- Use `expandedTeams` Set to track which teams are expanded
- Clicking team header toggles expand/collapse state

### 4. Agents List (Nested Within Expanded Team Card)

**Display condition**: Only visible when the parent team card is expanded

**Implementation**:
- For each expanded team, call `listAgents({teamId: team.id})` to get team members
- Display each agent as a row showing:
  - Agent name and role
  - Token allocation
  - Token used
  - Remaining tokens: `allocation - used`
  - Usage percentage: `(used / allocation) * 100`
  - Status badge (active/bored/stuck/paused) with color coding
- Visual hierarchy: Indent agents slightly to show they belong to the team
- Empty state: If team has no agents, show "No agents in this team" message

## Layout & Styling Requirements

### Design System

- **Colors**:
  - Green: tokens available/healthy
  - Yellow: warning (>70% used)
  - Red: critical (>90% used)
  - Gray: neutral/inactive
  - Blue: primary actions
- **Spacing**: Use Tailwind spacing (p-4, p-6, p-8, gap-4, etc.)
- **Cards**: `bg-white rounded-lg shadow p-6`
- **Responsive**: Mobile-first, use `md:` and `lg:` breakpoints

### Layout Structure

```
┌─────────────────────────────────────────┐
│ Header (bg-gray-900, text-white)        │
│  ┌─────────────────┐                    │
│  │ Org Selector ▼  │  AI Team Dashboard │
│  └─────────────────┘                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Token Overview (grid of 4 cards)        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ Pool │ │Alloc │ │ Used │ │ Left │   │
│  └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Teams Section                            │
│  ┌───────────────────────────────────┐  │
│  │ ▶ Team Name (type) │ Tokens │ 👥  │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │ ▼ Expanded Team                   │  │
│  │   ├─ Agent 1 │ tokens │ [===] 60% │  │
│  │   ├─ Agent 2 │ tokens │ [====] 80%│  │
│  │   └─ Agent 3 │ tokens │ [=] 20%   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Specific Styling Requirements

1. **Header**: Dark background (`bg-gray-900`), white text, padding
2. **Token Cards**: Grid layout (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4`), white cards with shadow
3. **Team Cards**: White background, rounded corners, shadow, margin between cards
4. **Agent Rows**: Subtle border, padding, hover effect
5. **Progress Bars**: Use div with `bg-gray-200` background and colored fill based on percentage
6. **Status Badges**: Small rounded pill badges with appropriate colors

## Expected Component Structure

```vue
<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header with Org Selector -->
    <header class="bg-gray-900 text-white p-6 mb-8">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <h1 class="text-3xl font-bold">AI Team Dashboard</h1>
        <div class="flex items-center gap-4">
          <label class="text-sm">Organization:</label>
          <select 
            v-model="currentOrgId" 
            @change="handleOrgChange"
            class="px-4 py-2 rounded bg-gray-800 text-white border border-gray-700"
          >
            <option v-for="org in allOrgs" :key="org.id" :value="org.id">
              {{ org.name }}
            </option>
          </select>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4">
      <!-- Token Overview Cards -->
      <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- 4 cards here -->
      </section>

      <!-- Teams Section -->
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold mb-4">Teams</h2>
        <div v-for="team in orgTeams" :key="team.id" class="bg-white rounded-lg shadow">
          <!-- Team header (clickable) -->
          <div @click="toggleTeam(team.id)" class="p-6 cursor-pointer hover:bg-gray-50">
            <!-- Team info -->
          </div>
          
          <!-- Agents (shown when expanded) -->
          <div v-if="expandedTeams.has(team.id)" class="border-t border-gray-200 p-6">
            <div v-for="agent in getTeamAgents(team.id)" :key="agent.id" class="...">
              <!-- Agent info -->
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Organization, Team, Agent } from '~/types'

// Composables
const { organizations, currentOrganization, setCurrentOrganization } = useOrganization()
const { listTeams } = useTeam()
const { listAgents } = useAgent()

// Reactive state
const currentOrgId = ref<string | null>(currentOrganization.value?.id || null)
const expandedTeams = ref<Set<string>>(new Set())

// Computed properties
const allOrgs = computed<Organization[]>(() => organizations.value)

const currentOrg = computed<Organization | null>(() => 
  currentOrganization.value
)

const orgTeams = computed<Team[]>(() => {
  if (!currentOrgId.value) return []
  return listTeams({ organizationId: currentOrgId.value })
})

const allAgentsInOrg = computed<Agent[]>(() => {
  if (!currentOrgId.value) return []
  return listAgents({ organizationId: currentOrgId.value })
})

const tokenStats = computed(() => {
  if (!currentOrg.value) return { total: 0, allocated: 0, used: 0, remaining: 0 }
  
  const total = currentOrg.value.tokenPool
  const allocated = orgTeams.value.reduce((sum, team) => sum + team.tokenAllocation, 0)
  const used = allAgentsInOrg.value.reduce((sum, agent) => sum + agent.tokenUsed, 0)
  const remaining = total - used
  
  return { total, allocated, used, remaining }
})

// Methods
const handleOrgChange = () => {
  if (currentOrgId.value) {
    setCurrentOrganization(currentOrgId.value)
    expandedTeams.value.clear()
  }
}

const toggleTeam = (teamId: string) => {
  if (expandedTeams.value.has(teamId)) {
    expandedTeams.value.delete(teamId)
  } else {
    expandedTeams.value.add(teamId)
  }
}

const getTeamAgents = (teamId: string): Agent[] => {
  return listAgents({ teamId })
}

const getTeamTokenUsage = (teamId: string): number => {
  const agents = getTeamAgents(teamId)
  return agents.reduce((sum, agent) => sum + agent.tokenUsed, 0)
}

const getUsagePercentage = (used: number, allocated: number): number => {
  if (allocated === 0) return 0
  return Math.round((used / allocated) * 100)
}

const getUsageColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-red-500'
  if (percentage >= 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800'
    case 'bored': return 'bg-yellow-100 text-yellow-800'
    case 'stuck': return 'bg-red-100 text-red-800'
    case 'paused': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const formatNumber = (num: number): string => {
  return num.toLocaleString()
}
</script>
```

## Implementation Checklist

- [ ] Import all required types from `~/types`
- [ ] Use all three composables (useOrganization, useTeam, useAgent)
- [ ] Create reactive refs for currentOrgId and expandedTeams
- [ ] Create computed properties for: allOrgs, currentOrg, orgTeams, allAgentsInOrg, tokenStats
- [ ] Implement handleOrgChange method
- [ ] Implement toggleTeam method
- [ ] Implement getTeamAgents helper
- [ ] Implement getTeamTokenUsage helper
- [ ] Implement getUsagePercentage helper
- [ ] Implement getUsageColor helper (for progress bars)
- [ ] Implement getStatusColor helper (for status badges)
- [ ] Implement formatNumber helper (for displaying large numbers)
- [ ] Create header with org selector
- [ ] Create 4 token overview cards with proper styling
- [ ] Create teams list with expand/collapse
- [ ] Create agents list within expanded teams
- [ ] Add progress bars for token usage
- [ ] Add status badges for agents
- [ ] Add hover effects and transitions
- [ ] Test responsive layout (mobile, tablet, desktop)
- [ ] Ensure TypeScript strict mode passes
- [ ] Format with Prettier

## Validation

After creating the file, verify:

1. **TypeScript**: Run `npm run typecheck` - should pass
2. **Dev Server**: Run `npm run dev` - should start without errors
3. **Browser**: Navigate to http://localhost:3000
   - Should see dashboard
   - Org selector should work
   - Token cards should show correct numbers
   - Teams should expand/collapse
   - Agents should appear in teams
4. **Responsive**: Test on different screen sizes

## Expected Output

Create ONLY: `app/pages/index.vue`

**Estimated lines**: 250-350 lines (template ~150, script ~100-150, includes comments)

**Grade expectation**: A (straightforward Vue component, data already available)

```
