<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gray-900 p-6 text-white shadow-md">
      <div class="mx-auto max-w-4xl">
        <h1 class="text-3xl font-bold">Start New Interview</h1>
        <p v-if="interviewer" class="text-gray-300">with {{ interviewer.name }}</p>
        <p v-else-if="!loading" class="text-red-400">[ERROR] Interviewer not found</p>
      </div>
    </div>

    <!-- Main Content -->
    <div class="mx-auto max-w-4xl p-6">
      <!-- Team Selection (if not started) -->
      <div v-if="!interviewId && !loading" class="mb-6 rounded-lg bg-white p-6 shadow-lg">
        <h2 class="mb-4 text-xl font-bold">Select Team for New Hire</h2>
        <div class="space-y-4">
          <div>
            <label for="team-select" class="mb-2 block font-medium text-gray-700">Team:</label>
            <select
              id="team-select"
              v-model="selectedTeamId"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a team...</option>
              <option v-for="team in teams" :key="team.id" :value="team.id">
                {{ team.name }}
              </option>
            </select>
          </div>
          <button
            @click="handleStartInterview"
            :disabled="!selectedTeamId || starting"
            class="w-full rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ starting ? 'Starting Interview...' : 'Start Interview' }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="text-gray-600">Loading...</div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="rounded-lg bg-red-50 p-6 shadow-lg">
        <p class="text-red-700">[ERROR] {{ error }}</p>
        <NuxtLink
          to="/"
          class="mt-4 inline-block rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Return to Dashboard
        </NuxtLink>
      </div>

      <!-- Interview Started - Redirect -->
      <div v-if="interviewId" class="rounded-lg bg-white p-6 shadow-lg">
        <p class="mb-4 text-gray-700">Interview started successfully!</p>
        <p class="text-sm text-gray-500">Redirecting to interview...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useInterview } from '~/composables/useInterview'
import { useAgent } from '~/composables/useAgent'
import { useTeam } from '~/composables/useTeam'
import type { Agent, Team } from '@@/types'
import { logger } from '@/utils/logger'

const route = useRoute()
const router = useRouter()
const { startInterview } = useInterview()
const { listAgents } = useAgent()
const { listTeams } = useTeam()

const interviewerId = ref(route.query.interviewerId as string)
const interviewer = ref<Agent | null>(null)
const teams = ref<Team[]>([])
const selectedTeamId = ref('')

const loading = ref(true)
const starting = ref(false)
const error = ref<string | null>(null)
const interviewId = ref<string | null>(null)

/**
 * Load interviewer and teams
 */
const loadData = async () => {
  try {
    loading.value = true
    error.value = null

    if (!interviewerId.value) {
      error.value = 'No interviewer specified'
      return
    }

    // Load all agents to find the interviewer
    const agents = await listAgents({})
    interviewer.value = agents.find((a: Agent) => a.id === interviewerId.value) || null

    if (!interviewer.value) {
      error.value = 'Interviewer not found'
      return
    }

    // Load teams for the interviewer's organization
    teams.value = await listTeams({ organizationId: interviewer.value.organizationId })

    logger.info(
      { interviewerId: interviewerId.value, teamCount: teams.value.length },
      'Loaded interview data'
    )
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load data'
    logger.error({ error: err }, 'Failed to load interview data')
  } finally {
    loading.value = false
  }
}

/**
 * Start the interview
 */
const handleStartInterview = async () => {
  if (!selectedTeamId.value || !interviewerId.value) {
    return
  }

  try {
    starting.value = true
    error.value = null

    const result = await startInterview(selectedTeamId.value, interviewerId.value)
    interviewId.value = result.id

    logger.info(
      { interviewId: interviewId.value, teamId: selectedTeamId.value },
      'Interview started successfully'
    )

    // Redirect to the interview page
    setTimeout(() => {
      router.push(`/interviews/${interviewId.value}`)
    }, 1000)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start interview'
    logger.error({ error: err }, 'Failed to start interview')
    starting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
