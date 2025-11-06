# F005: Basic Dashboard UI

## Status

Planning

## Objective

Create a foundational dashboard UI in `pages/index.vue` that displays token spending across the organization hierarchy (Org → Teams → Agents) with an organization selector. This is the visual foundation for the AI Team system - no D3.js visualizations yet, just functional data display and organization management.

## Scope

### In Scope

- Organization selector dropdown (switch between orgs)
- Current organization token pool display
- Team-level token allocation and usage display
- Agent-level token allocation and usage display
- Hierarchical view: Organization → Teams → Agents
- Real-time data from existing composables (useOrganization, useTeam, useAgent)
- Responsive Tailwind CSS layout
- Basic interactivity (expand/collapse teams)

### Out of Scope (Future)

- D3.js force-directed visualization (F006+)
- Token spending charts/graphs
- Historical token usage trends
- Task queue visualization
- Activity log integration
- Agent status indicators (bored/stuck/paused)
- Edit/create functionality (view-only for now)
- GitHub integration display

## Dependencies

**Required (Complete):**

- F001 Agent System ✅ (composable, types, data)
- F002 Team System ✅ (composable, types, data)
- F004 Core Team Init ✅ (default teams created)

**Uses:**

- `app/composables/useOrganization.ts`
- `app/composables/useTeam.ts`
- `app/composables/useAgent.ts`
- `types/index.ts` (Organization, Team, Agent)

## Implementation Tasks

### Task 1: Dashboard Page Component

**File:** `app/pages/index.vue`

**Requirements:**

1. **Organization Selector**

   - Dropdown showing all organizations (from `useOrganization().listOrganizations()`)
   - Select to switch current organization
   - Display selected org name prominently
   - Show org tokenPool prominently

2. **Token Spending Overview**

   - Organization total token pool (Organization.tokenPool)
   - Total allocated to teams (sum of Team.tokenAllocation for org)
   - Total used by agents (sum of Agent.tokenUsed for org)
   - Remaining pool calculation

3. **Teams Section**

   - List all teams for selected organization (from `useTeam().listTeams({organizationId})`)
   - For each team show:
     - Team name and type
     - Token allocation
     - Number of agents in team
     - Total tokens used by team's agents
     - Expand/collapse to show agents

4. **Agents Section (within team)**

   - When team expanded, show all agents (from `useAgent().listAgents({teamId})`)
   - For each agent show:
     - Agent name and role
     - Token allocation
     - Token used
     - Remaining tokens (allocation - used)
     - Status (active/bored/stuck/paused)

5. **Layout & Styling**
   - Clean Tailwind CSS design
   - Card-based layout for teams
   - Responsive grid (works on mobile)
   - Color coding for status/usage levels
   - Progress bars for token usage visualization

**Component Structure:**

```vue
<template>
  <div class="dashboard">
    <!-- Header with org selector -->
    <header>
      <h1>AI Team Dashboard</h1>
      <select v-model="currentOrgId">
        ...
      </select>
    </header>

    <!-- Token overview cards -->
    <section class="token-overview">
      <div class="card">Total Pool</div>
      <div class="card">Allocated</div>
      <div class="card">Used</div>
      <div class="card">Remaining</div>
    </section>

    <!-- Teams list -->
    <section class="teams">
      <div v-for="team in orgTeams" class="team-card">
        <div @click="toggleTeam(team.id)">
          <!-- Team header -->
        </div>
        <div v-if="expandedTeams.has(team.id)">
          <!-- Agents in team -->
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Composables
const { organizations, currentOrganization, setCurrentOrganization } = useOrganization()
const { listTeams } = useTeam()
const { listAgents } = useAgent()

// Reactive state
const currentOrgId = ref(currentOrganization.value?.id || null)
const expandedTeams = ref(new Set<string>())

// Computed
const orgTeams = computed(() => ...)
const teamAgents = (teamId: string) => ...
const tokenStats = computed(() => ...)

// Methods
const toggleTeam = (teamId: string) => ...
</script>
```

## Acceptance Criteria

### Functionality

- [ ] Organization dropdown shows all organizations
- [ ] Selecting organization updates entire dashboard
- [ ] Token pool displays correctly (org, teams, agents)
- [ ] Teams list shows only teams for selected org
- [ ] Clicking team expands/collapses agent list
- [ ] Agents list shows only agents for that team
- [ ] Token calculations are accurate (allocated, used, remaining)
- [ ] Data updates reactively when underlying data changes

### UI/UX

- [ ] Clean, professional Tailwind CSS design
- [ ] Responsive layout (mobile, tablet, desktop)
- [ ] Clear visual hierarchy (Org → Teams → Agents)
- [ ] Progress bars or visual indicators for token usage
- [ ] Color coding for different status/levels
- [ ] Smooth expand/collapse transitions
- [ ] No layout shift when expanding teams

### Code Quality

- [ ] TypeScript strict mode passes
- [ ] All types properly imported from `types/index.ts`
- [ ] Composables used correctly (no direct data access)
- [ ] Reactive state management with `ref()` and `computed()`
- [ ] Clean component structure (template, script, style)
- [ ] Comments for complex calculations

## Expected Output

Single file: `app/pages/index.vue` (~200-300 lines)

No tests required (UI component, visual verification sufficient)

## Execution Plan

### Step 1: Planning (5 mins)

- Review existing composables APIs
- Sketch component structure
- Identify computed properties needed

### Step 2: Specification (15 mins)

- Write detailed prompt for Gemini
- Define component structure
- List all required composable methods
- Define data flow

### Step 3: Implementation (5 mins - Gemini)

```bash
cd /home/michelek/Documents/github/ai-team
gemini --yolo "$(cat .specify/features/F005-dashboard-ui/01-dashboard-page.prompt.md)" \
  > .specify/logs/F005-dashboard-$(date +%H%M%S).log 2>&1 &
```

### Step 4: Visual Testing (10 mins)

- Start dev server: `npm run dev`
- Navigate to <http://localhost:3000>
- Test organization switching
- Test team expand/collapse
- Verify token calculations
- Test responsive layout
- Check console for errors

### Step 5: Refinement (10 mins)

- Adjust styling if needed
- Fix any calculation errors
- Improve UX (transitions, colors)
- Add polish (icons, spacing)

## Success Metrics

- Dashboard loads without errors
- All token data displays correctly
- Organization switching works smoothly
- Team expand/collapse is intuitive
- Layout is clean and professional
- Foundation ready for D3.js visualization (F006)

## Notes

**Design Philosophy:**

- Start simple, iterate to excellence
- Function over form (but make it pretty)
- Use existing composables (don't reinvent)
- Mobile-first responsive design
- Accessibility considerations (semantic HTML)

**Future Enhancements (Post-F005):**

- D3.js force-directed graph (F006)
- Real-time token usage updates
- Historical trend charts
- Agent activity timeline
- Task queue visualization
- Click agents to see details
- Inline editing capabilities

## Gemini Grade Prediction

Expected: **A** (straightforward Vue component with existing data sources)

Potential issues:

- Token calculation logic might need manual review
- Styling might need tweaks
- Expand/collapse state management
