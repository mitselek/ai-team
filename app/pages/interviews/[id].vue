<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="mx-auto max-w-4xl">
      <!-- Header with Refresh Button -->
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-3xl font-bold text-gray-900">Interview {{ interviewId }}</h1>
        <button
          @click="refreshInterview"
          class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div v-if="currentInterview" class="space-y-6">
        <!-- Status Badge -->
        <div class="rounded-lg bg-white p-4 shadow-sm">
          <span
            class="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
          >
            Status: {{ currentInterview.status }}
          </span>
        </div>

        <!-- Standard Interview Chat (for greet, ask_role, etc.) -->
        <StandardChat v-if="!isApprovalState" :chat-history="chatHistory" @send="sendMessage" />

        <!-- Review Prompt State -->
        <ReviewPrompt
          v-if="currentInterview.currentState === 'review_prompt'"
          :prompt="agentDraft?.generatedPrompt || ''"
          @approve="handleApprovePrompt"
          @reject="handleRejectPrompt"
          @save="handleSavePrompt"
        />

        <!-- Test Conversation State -->
        <TestConversation
          v-if="currentInterview.currentState === 'test_conversation'"
          :test-history="testHistory"
          @send="handleSendTestMessage"
          @approve="handleApproveAgent"
          @reject="handleRejectAgent"
          @clear="handleClearTestHistory"
        />

        <!-- Assign Details State -->
        <AssignDetails
          v-if="currentInterview.currentState === 'assign_details'"
          :name-suggestions="nameSuggestions"
          v-model:selected-name="selectedName"
          v-model:selected-gender="selectedGender"
          @create="handleSetAgentDetails"
        />

        <!-- Complete State -->
        <CompleteState
          v-if="currentInterview.currentState === 'complete'"
          :agent-id="currentInterview.agentId"
          :name="agentDraft?.finalDetails?.name"
          :gender="agentDraft?.finalDetails?.gender"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useInterview } from '~/composables/useInterview'
import StandardChat from '~/components/interview/StandardChat.vue'
import ReviewPrompt from '~/components/interview/ReviewPrompt.vue'
import TestConversation from '~/components/interview/TestConversation.vue'
import AssignDetails from '~/components/interview/AssignDetails.vue'
import CompleteState from '~/components/interview/CompleteState.vue'

const route = useRoute()
const {
  currentInterview,
  getInterview,
  respondToInterview,
  approvePrompt,
  rejectPrompt,
  editPrompt,
  sendTestMessage,
  getTestHistory,
  clearTestHistory,
  approveAgent,
  rejectAgent,
  getNameSuggestions,
  setAgentDetails
} = useInterview()

const interviewId = ref(route.params.id as string)

// Test conversation
const testHistory = ref<Array<{ sender: string; text: string }>>([])

// Agent details
const nameSuggestions = ref<string[]>([])
const selectedName = ref('')
const selectedGender = ref('')

onMounted(() => {
  if (interviewId.value) {
    getInterview(interviewId.value)
  }
})

const chatHistory = computed(() => {
  if (!currentInterview.value) {
    return []
  }

  const transcript = currentInterview.value.transcript || []
  return transcript.map((entry) => ({
    sender: entry.speaker === 'interviewer' ? 'Marcus' : 'You',
    text: typeof entry.message === 'string' ? entry.message : entry.message.text
  }))
})

const agentDraft = computed(() => currentInterview.value?.agentDraft)

const isApprovalState = computed(() => {
  return ['review_prompt', 'test_conversation', 'assign_details', 'complete'].includes(
    currentInterview.value?.currentState || ''
  )
})

const refreshInterview = async () => {
  await getInterview(interviewId.value)

  // Load test history if in test_conversation state
  if (currentInterview.value?.currentState === 'test_conversation') {
    await loadTestHistory()
  }

  // Load name suggestions if in assign_details state
  if (currentInterview.value?.currentState === 'assign_details') {
    await loadNameSuggestions()
  }
}

const sendMessage = async (message: string) => {
  await respondToInterview(interviewId.value, message)
  await getInterview(interviewId.value)
}

const handleApprovePrompt = async () => {
  await approvePrompt(interviewId.value)
  await getInterview(interviewId.value)
}

const handleRejectPrompt = async () => {
  await rejectPrompt(interviewId.value)
  await getInterview(interviewId.value)
}

const handleSavePrompt = async (newPrompt: string) => {
  await editPrompt(interviewId.value, newPrompt)
  await getInterview(interviewId.value)
}

const handleSendTestMessage = async (message: string) => {
  await sendTestMessage(interviewId.value, message)
  await loadTestHistory()
}

const loadTestHistory = async () => {
  const history = await getTestHistory(interviewId.value)
  if (history && Array.isArray(history)) {
    testHistory.value = history.map((entry: any) => ({
      sender: entry.sender || entry.speaker,
      text:
        typeof entry.message === 'string' ? entry.message : entry.message?.text || entry.text || ''
    }))
  }
}

const handleClearTestHistory = async () => {
  await clearTestHistory(interviewId.value)
  testHistory.value = []
}

const handleApproveAgent = async () => {
  await approveAgent(interviewId.value)
  await getInterview(interviewId.value)
}

const handleRejectAgent = async () => {
  await rejectAgent(interviewId.value)
  await getInterview(interviewId.value)
}

const loadNameSuggestions = async () => {
  const suggestions = await getNameSuggestions(interviewId.value)
  if (suggestions && Array.isArray(suggestions)) {
    nameSuggestions.value = suggestions
  }
}

const handleSetAgentDetails = async (name: string, gender: string) => {
  await setAgentDetails(interviewId.value, name, gender)
  await getInterview(interviewId.value)
}
</script>
