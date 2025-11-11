<template>
  <div>
    <h1>Interviews</h1>
    <div>
      <label for="team-select">Team:</label>
      <select id="team-select" v-model="selectedTeam">
        <option v-for="team in teams" :key="team.id" :value="team.id">
          {{ team.name }}
        </option>
      </select>
    </div>
    <div>
      <label for="interviewer-select">Interviewer:</label>
      <select id="interviewer-select" v-model="selectedInterviewer">
        <option v-for="agent in agents" :key="agent.id" :value="agent.id">
          {{ agent.name }}
        </option>
      </select>
    </div>
    <button @click="startNewInterview" :disabled="!selectedTeam || !selectedInterviewer">
      Start New Interview
    </button>
    <ul>
      <li v-for="interview in interviews" :key="interview.id">
        <router-link :to="`/interviews/${interview.id}`">
          {{ interview.id }} - {{ interview.status }}
        </router-link>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useInterview } from '~/composables/useInterview'
import { useTeam } from '~/composables/useTeam'
import { useAgent } from '~/composables/useAgent'
import type { Team } from '~/types'
import type { Agent } from '~/types'

const { interviews, listInterviews, startInterview } = useInterview()
const { listTeams } = useTeam()
const { listAgents } = useAgent()
const router = useRouter()

const teams = ref<Team[]>([])
const agents = ref<Agent[]>([])
const selectedTeam = ref<string | null>(null)
const selectedInterviewer = ref<string | null>(null)

onMounted(async () => {
  teams.value = await listTeams({ type: 'hr' })
  if (teams.value.length > 0) {
    selectedTeam.value = teams.value[0].id
  }
})

watch(selectedTeam, async (newTeamId) => {
  if (newTeamId) {
    agents.value = await listAgents({ teamId: newTeamId })
    if (agents.value.length > 0) {
      selectedInterviewer.value =
        agents.value.find((a: Agent) => a.name === 'Marcus')?.id || agents.value[0].id
    } else {
      selectedInterviewer.value = null
    }
    await listInterviews(newTeamId)
  }
})

const startNewInterview = async () => {
  if (selectedTeam.value && selectedInterviewer.value) {
    const newInterview = await startInterview(selectedTeam.value, selectedInterviewer.value)
    router.push(`/interviews/${newInterview.id}`)
  }
}
</script>
