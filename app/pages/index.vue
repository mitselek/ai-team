<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header with Org Selector -->
    <header class="bg-gray-900 text-white p-6 mb-8 shadow-md">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <h1 class="text-3xl font-bold">AI Team Dashboard</h1>
        <div v-if="allOrgs.length > 0" class="flex items-center gap-4">
          <label for="org-selector" class="text-sm font-medium">Organization:</label>
          <select
            id="org-selector"
            v-model="currentOrgId"
            @change="handleOrgChange"
            class="px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="org in allOrgs" :key="org.id" :value="org.id">
              {{ org.name }}
            </option>
          </select>
        </div>
        <div v-else class="text-sm text-gray-400">
          No organizations found.
        </div>
      </div>
      <div v-if="currentOrg" class="max-w-7xl mx-auto mt-2 text-sm text-gray-300">
        <p>Displaying data for: <span class="font-semibold">{{ currentOrg.name }}</span></p>
        <p>Created: <span class="font-semibold">{{ new Date(currentOrg.createdAt).toLocaleDateString() }}</span></p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" v-if="currentOrg">
      <!-- Token Overview Cards -->
      <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-sm font-medium text-gray-500">Total Pool</h3>
          <p class="mt-2 text-3xl font-bold text-gray-900">{{ formatNumber(tokenStats.total) }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-sm font-medium text-gray-500">Allocated to Teams</h3>
          <p class="mt-2 text-3xl font-bold text-gray-900">{{ formatNumber(tokenStats.allocated) }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-sm font-medium text-gray-500">Used by Agents</h3>
          <p class="mt-2 text-3xl font-bold text-red-600">{{ formatNumber(tokenStats.used) }}</p>
        </div>
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-sm font-medium text-gray-500">Remaining in Pool</h3>
          <p class="mt-2 text-3xl font-bold text-green-600">{{ formatNumber(tokenStats.remaining) }}</p>
        </div>
      </section>

      <!-- Teams Section -->
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Teams</h2>
        <div v-if="orgTeams.length === 0" class="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          <p>No teams found for this organization.</p>
        </div>
        <div v-for="team in orgTeams" :key="team.id" class="bg-white rounded-lg shadow transition-shadow duration-300 hover:shadow-lg">
          <!-- Team header (clickable) -->
          <div @click="toggleTeam(team.id)" class="p-6 cursor-pointer flex justify-between items-center">
            <div class="flex items-center gap-4">
              <span class="transform transition-transform duration-200" :class="{'rotate-90': expandedTeams.has(team.id)}">▶</span>
              <div>
                <h3 class="text-lg font-bold text-gray-900">{{ team.name }}</h3>
                <span class="text-xs font-semibold uppercase px-2 py-1 rounded-full bg-blue-100 text-blue-800">{{ team.type }}</span>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">Tokens Allocated</p>
              <p class="font-semibold text-gray-800">{{ formatNumber(team.tokenAllocation) }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm text-gray-500">Tokens Used</p>
              <p class="font-semibold text-red-600">{{ formatNumber(getTeamTokenUsage(team.id)) }}</p>
            </div>
             <div class="text-right">
              <p class="text-sm text-gray-500">Agents</p>
              <p class="font-semibold text-gray-800">👥 {{ getTeamAgents(team.id).length }}</p>
            </div>
          </div>

          <!-- Agents (shown when expanded) -->
          <div v-if="expandedTeams.has(team.id)" class="border-t border-gray-200 p-6 space-y-4">
             <div v-if="getTeamAgents(team.id).length === 0" class="text-center text-gray-500 py-4">
              No agents in this team.
            </div>
            <div v-else v-for="agent in getTeamAgents(team.id)" :key="agent.id" class="p-4 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <!-- Agent Info -->
                <div>
                  <p class="font-bold text-gray-800">{{ agent.name }}</p>
                  <p class="text-sm text-gray-600">{{ agent.role }}</p>
                </div>
                <!-- Token Info -->
                <div class="space-y-1">
                   <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Used: <span class="font-medium text-red-600">{{ formatNumber(agent.tokenUsed) }}</span></span>
                    <span class="text-gray-600">Allocated: <span class="font-medium">{{ formatNumber(agent.tokenAllocation) }}</span></span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div :class="getUsageColor(getUsagePercentage(agent.tokenUsed, agent.tokenAllocation))" class="h-2.5 rounded-full" :style="{ width: getUsagePercentage(agent.tokenUsed, agent.tokenAllocation) + '%' }"></div>
                  </div>
                   <div class="text-right text-sm font-semibold">{{ getUsagePercentage(agent.tokenUsed, agent.tokenAllocation) }}%</div>
                </div>
                <!-- Status -->
                <div class="flex justify-end items-center">
                   <span :class="getStatusColor(agent.status)" class="px-3 py-1 text-xs font-medium rounded-full capitalize">
                    {{ agent.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
     <div v-else class="text-center py-20">
      <h2 class="text-2xl font-semibold text-gray-700">Please select an organization to view the dashboard.</h2>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Organization, Team, Agent, AgentStatus } from '~~/types'
import { useOrganization } from '../composables/useOrganization'
import { useTeam } from '../composables/useTeam'
import { useAgent } from '../composables/useAgent'

// Composables
const { organizations, currentOrganization, getOrganization } = useOrganization()
const { listTeams } = useTeam()
const { listAgents } = useAgent()

// Reactive state
const currentOrgId = ref<string | null>(null)
const expandedTeams = ref<Set<string>>(new Set())
const orgTeams = ref<Team[]>([])

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

const getStatusColor = (status: AgentStatus): string => {
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

// Watchers
watch(currentOrgId, async (newId) => {
  if (newId) {
    orgTeams.value = await listTeams({ organizationId: newId })
  } else {
    orgTeams.value = []
  }
}, { immediate: true })


// Lifecycle Hooks
onMounted(() => {
  if (currentOrganization.value) {
    currentOrgId.value = currentOrganization.value.id
  } else if (allOrgs.value.length > 0) {
    const orgId = allOrgs.value[0].id
    currentOrgId.value = orgId
    setCurrentOrganization(orgId)
  }
})
</script>