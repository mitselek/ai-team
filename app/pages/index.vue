<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header with Org Selector -->
    <header class="mb-8 bg-gray-900 p-6 text-white shadow-md">
      <div class="mx-auto flex max-w-7xl items-center justify-between">
        <h1 class="text-3xl font-bold">AI Team Dashboard</h1>
        <div v-if="allOrgs.length > 0" class="flex items-center gap-4">
          <label for="org-selector" class="text-sm font-medium">Organization:</label>
          <select
            id="org-selector"
            v-model="currentOrgId"
            @change="handleOrgChange"
            class="rounded border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="org in allOrgs" :key="org.id" :value="org.id">
              {{ org.name }}
            </option>
          </select>
        </div>
        <div v-else class="text-sm text-gray-400">No organizations found.</div>
      </div>
      <div v-if="currentOrg" class="mx-auto mt-2 max-w-7xl text-sm text-gray-300">
        <p>
          Displaying data for: <span class="font-semibold">{{ currentOrg.name }}</span>
        </p>
        <p>
          Created:
          <span class="font-semibold">{{
            new Date(currentOrg.createdAt).toLocaleDateString()
          }}</span>
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" v-if="currentOrg">
      <!-- Token Overview Cards -->
      <section class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg bg-white p-6 shadow">
          <h3 class="text-sm font-medium text-gray-500">Total Pool</h3>
          <p class="mt-2 text-3xl font-bold text-gray-900">{{ formatNumber(tokenStats.total) }}</p>
        </div>
        <div class="rounded-lg bg-white p-6 shadow">
          <h3 class="text-sm font-medium text-gray-500">Allocated to Teams</h3>
          <p class="mt-2 text-3xl font-bold text-gray-900">
            {{ formatNumber(tokenStats.allocated) }}
          </p>
        </div>
        <div class="rounded-lg bg-white p-6 shadow">
          <h3 class="text-sm font-medium text-gray-500">Used by Agents</h3>
          <p class="mt-2 text-3xl font-bold text-red-600">{{ formatNumber(tokenStats.used) }}</p>
        </div>
        <div class="rounded-lg bg-white p-6 shadow">
          <h3 class="text-sm font-medium text-gray-500">Remaining in Pool</h3>
          <p class="mt-2 text-3xl font-bold text-green-600">
            {{ formatNumber(tokenStats.remaining) }}
          </p>
        </div>
      </section>

      <!-- Teams Section -->
      <section class="space-y-4">
        <h2 class="mb-4 text-2xl font-semibold text-gray-800">Teams</h2>
        <div
          v-if="orgTeams.length === 0"
          class="rounded-lg bg-white p-6 text-center text-gray-500 shadow"
        >
          <p>No teams found for this organization.</p>
        </div>
        <div
          v-for="team in orgTeams"
          :key="team.id"
          class="rounded-lg bg-white shadow transition-shadow duration-300 hover:shadow-lg"
        >
          <!-- Team header (clickable) -->
          <div
            @click="toggleTeam(team.id)"
            class="flex cursor-pointer items-center justify-between p-6"
          >
            <div class="flex items-center gap-4">
              <span
                class="transform transition-transform duration-200"
                :class="{ 'rotate-90': expandedTeams.has(team.id) }"
                >▶</span
              >
              <div>
                <h3 class="text-lg font-bold text-gray-900">{{ team.name }}</h3>
                <span
                  class="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold uppercase text-blue-800"
                  >{{ team.type }}</span
                >
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">Tokens Allocated</p>
              <p class="font-semibold text-gray-800">{{ formatNumber(team.tokenAllocation) }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">Tokens Used</p>
              <p class="font-semibold text-red-600">
                {{ formatNumber(getTeamTokenUsage(team.id)) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">Agents</p>
              <p class="font-semibold text-gray-800">👥 {{ getTeamAgents(team.id).length }}</p>
            </div>
          </div>

          <!-- Agents (shown when expanded) -->
          <div v-if="expandedTeams.has(team.id)" class="space-y-4 border-t border-gray-200 p-6">
            <div v-if="getTeamAgents(team.id).length === 0" class="py-4 text-center text-gray-500">
              No agents in this team.
            </div>
            <div
              v-else
              v-for="agent in getTeamAgents(team.id)"
              :key="agent.id"
              class="rounded-md bg-gray-50 p-4 transition-colors duration-200 hover:bg-gray-100"
            >
              <div class="grid grid-cols-1 items-center gap-4 md:grid-cols-3">
                <!-- Agent Info -->
                <div>
                  <p class="font-bold text-gray-800">{{ agent.name }}</p>
                  <p class="text-sm text-gray-600">{{ agent.role }}</p>
                </div>
                <!-- Token Info -->
                <div class="space-y-1">
                  <div class="flex justify-between text-sm">
                    <span class="text-gray-600"
                      >Used:
                      <span class="font-medium text-red-600">{{
                        formatNumber(agent.tokenUsed)
                      }}</span></span
                    >
                    <span class="text-gray-600"
                      >Allocated:
                      <span class="font-medium">{{
                        formatNumber(agent.tokenAllocation)
                      }}</span></span
                    >
                  </div>
                  <div class="h-2.5 w-full rounded-full bg-gray-200">
                    <div
                      :class="
                        getUsageColor(getUsagePercentage(agent.tokenUsed, agent.tokenAllocation))
                      "
                      class="h-2.5 rounded-full"
                      :style="{
                        width: getUsagePercentage(agent.tokenUsed, agent.tokenAllocation) + '%'
                      }"
                    ></div>
                  </div>
                  <div class="text-right text-sm font-semibold">
                    {{ getUsagePercentage(agent.tokenUsed, agent.tokenAllocation) }}%
                  </div>
                </div>
                <!-- Status & Actions -->
                <div class="flex flex-col items-end gap-2">
                  <div class="flex items-center gap-2">
                    <!-- Chat Button -->
                    <NuxtLink
                      v-if="agent.status === 'active'"
                      :to="`/agents/${agent.id}/chat`"
                      class="rounded bg-blue-500 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-600"
                    >
                      Chat
                    </NuxtLink>

                    <!-- Interview Button (for HR agents like Marcus) -->
                    <NuxtLink
                      v-if="agent.status === 'active' && isHRAgent(agent)"
                      :to="`/interviews/new?interviewerId=${agent.id}`"
                      class="rounded bg-purple-500 px-3 py-1 text-sm text-white transition-colors hover:bg-purple-600"
                    >
                      Start Interview
                    </NuxtLink>

                    <!-- Start Button -->
                    <button
                      v-if="agent.status !== 'active'"
                      @click="handleStartAgent(agent.id)"
                      :disabled="loadingAgents.get(agent.id)"
                      class="rounded bg-green-500 px-3 py-1 text-sm text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {{ loadingAgents.get(agent.id) ? '⏳' : '▶ Start' }}
                    </button>

                    <!-- Stop Button -->
                    <button
                      v-if="agent.status === 'active'"
                      @click="handleStopAgent(agent.id)"
                      :disabled="loadingAgents.get(agent.id)"
                      class="rounded bg-red-500 px-3 py-1 text-sm text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {{ loadingAgents.get(agent.id) ? '⏳' : '⏸ Stop' }}
                    </button>

                    <!-- Status Badge -->
                    <span
                      :class="getStatusColor(agent.status)"
                      class="rounded-full px-3 py-1 text-xs font-medium capitalize"
                    >
                      {{ agent.status }}
                    </span>
                  </div>

                  <!-- Error Message -->
                  <div
                    v-if="errorMessages.get(agent.id)"
                    class="animate-pulse text-sm text-red-600"
                  >
                    {{ errorMessages.get(agent.id) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
    <div v-else class="py-20 text-center">
      <h2 class="text-2xl font-semibold text-gray-700">
        Please select an organization to view the dashboard.
      </h2>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Organization, Team, Agent, AgentStatus } from '@@/types'
import { useOrganization } from '../composables/useOrganization'
import { useTeam } from '../composables/useTeam'
import { useAgent } from '../composables/useAgent'

// Composables
const { organizations, currentOrganization, getOrganization, fetchOrganizations } =
  useOrganization()
const { listTeams } = useTeam()
const { listAgents, startAgent, stopAgent } = useAgent()

// Reactive state
const currentOrgId = ref<string | null>(null)
const expandedTeams = ref<Set<string>>(new Set())
const orgTeams = ref<Team[]>([])
const orgAgents = ref<Agent[]>([]) // All agents for current org
const loadingAgents = ref<Map<string, boolean>>(new Map())
const errorMessages = ref<Map<string, string>>(new Map())

// Methods
const setCurrentOrganization = (id: string) => {
  const org = getOrganization(id)
  if (org) {
    currentOrganization.value = org
  }
}

// Computed properties
const allOrgs = computed<Organization[]>(() => organizations.value)

const currentOrg = computed<Organization | null>(() => currentOrganization.value)

const tokenStats = computed(() => {
  if (!currentOrg.value) return { total: 0, allocated: 0, used: 0, remaining: 0 }

  const total = currentOrg.value.tokenPool
  const allocated = orgTeams.value.reduce((sum, team) => sum + team.tokenAllocation, 0)
  const used = orgAgents.value.reduce((sum, agent) => sum + agent.tokenUsed, 0)
  const remaining = total - used

  return { total, allocated, used, remaining }
})

const handleOrgChange = () => {
  if (currentOrgId.value) {
    setCurrentOrganization(currentOrgId.value)
    expandedTeams.value.clear() // Collapse all teams on org change
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
  return orgAgents.value.filter((agent) => agent.teamId === teamId)
}

const isHRAgent = (agent: Agent): boolean => {
  return agent.name === 'Marcus' || agent.role.toLowerCase().includes('hr')
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

const getStatusColor = (status: AgentStatus): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'bored':
      return 'bg-yellow-100 text-yellow-800'
    case 'stuck':
      return 'bg-red-100 text-red-800'
    case 'paused':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const formatNumber = (num: number): string => {
  return num.toLocaleString()
}

const handleStartAgent = async (agentId: string) => {
  loadingAgents.value.set(agentId, true)
  errorMessages.value.delete(agentId)

  const result = await startAgent(agentId)

  loadingAgents.value.set(agentId, false)

  if (!result.success) {
    errorMessages.value.set(agentId, `Failed to start: ${result.message}`)
    setTimeout(() => errorMessages.value.delete(agentId), 5000)
  }
}

const handleStopAgent = async (agentId: string) => {
  loadingAgents.value.set(agentId, true)
  errorMessages.value.delete(agentId)

  const result = await stopAgent(agentId)

  loadingAgents.value.set(agentId, false)

  if (!result.success) {
    errorMessages.value.set(agentId, `Failed to stop: ${result.message}`)
    setTimeout(() => errorMessages.value.delete(agentId), 5000)
  }
}

// Watchers
watch(
  currentOrgId,
  async (newId) => {
    if (newId) {
      orgTeams.value = await listTeams({ organizationId: newId })
      orgAgents.value = await listAgents({ organizationId: newId })
    } else {
      orgTeams.value = []
      orgAgents.value = []
    }
  },
  { immediate: true }
)

// Lifecycle Hooks
onMounted(async () => {
  // Fetch organizations from API
  await fetchOrganizations()

  if (currentOrganization.value) {
    currentOrgId.value = currentOrganization.value.id
  } else if (allOrgs.value.length > 0) {
    const orgId = allOrgs.value[0].id
    currentOrgId.value = orgId
    setCurrentOrganization(orgId)
  }
})
</script>
