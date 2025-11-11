<template>
  <div>
    <h1>Interviews</h1>
    <button @click="startNewInterview">Start New Interview</button>
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
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useInterview } from '~/composables/useInterview'

const { interviews, listInterviews, startInterview } = useInterview()
const router = useRouter()

onMounted(listInterviews)

const startNewInterview = async () => {
  const newInterview = await startInterview('user@example.com')
  router.push(`/interviews/${newInterview.id}`)
}
</script>
