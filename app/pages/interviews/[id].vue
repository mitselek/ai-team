<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="mx-auto max-w-4xl">
      <!-- Header with Refresh Button -->
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-3xl font-bold text-gray-900">Interview {{ $route.params.id }}</h1>
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
        <div v-if="!isApprovalState" class="rounded-lg bg-white p-6 shadow-sm">
          <div
            class="chat-window mb-4 h-96 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <div v-for="(message, index) in chatHistory" :key="index" class="chat-message mb-3">
              <div :class="message.sender === 'Marcus' ? 'text-left' : 'text-right'">
                <span
                  class="inline-block rounded-lg px-4 py-2"
                  :class="
                    message.sender === 'Marcus'
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-green-100 text-green-900'
                  "
                >
                  <strong>{{ message.sender }}:</strong> {{ message.text }}
                </span>
              </div>
            </div>
          </div>
          <div class="chat-input flex gap-2">
            <input
              v-model="newMessage"
              @keyup.enter="sendMessage"
              placeholder="Type your message..."
              class="flex-grow rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              @click="sendMessage"
              class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </div>

        <!-- Review Prompt State -->
        <div
          v-if="currentInterview.currentState === 'review_prompt'"
          class="space-y-4 rounded-lg bg-white p-6 shadow-sm"
        >
          <h2 class="text-2xl font-semibold text-gray-900">Review Interview Prompt</h2>
          <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p class="whitespace-pre-wrap text-gray-700">
              {{ agentDraft?.generatedPrompt || 'No prompt available' }}
            </p>
          </div>
          <div v-if="!editingPrompt" class="flex gap-3">
            <button
              @click="handleApprovePrompt"
              class="rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
            >
              Approve
            </button>
            <button
              @click="handleRejectPrompt"
              class="rounded-lg bg-red-600 px-6 py-2 text-white transition-colors hover:bg-red-700"
            >
              Reject
            </button>
            <button
              @click="editingPrompt = true"
              class="rounded-lg bg-yellow-600 px-6 py-2 text-white transition-colors hover:bg-yellow-700"
            >
              Edit
            </button>
          </div>
          <div v-if="editingPrompt" class="space-y-3">
            <textarea
              v-model="editedPrompt"
              class="h-40 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Edit the prompt..."
            ></textarea>
            <div class="flex gap-3">
              <button
                @click="handleSavePrompt"
                class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
              >
                Save
              </button>
              <button
                @click="editingPrompt = false"
                class="rounded-lg bg-gray-600 px-6 py-2 text-white transition-colors hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Test Conversation State -->
        <div
          v-if="currentInterview.currentState === 'test_conversation'"
          class="space-y-4 rounded-lg bg-white p-6 shadow-sm"
        >
          <h2 class="text-2xl font-semibold text-gray-900">Test Agent Conversation</h2>
          <div
            class="chat-window mb-4 h-96 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4"
          >
            <div v-for="(message, index) in testHistory" :key="index" class="chat-message mb-3">
              <div :class="message.sender === 'agent' ? 'text-left' : 'text-right'">
                <span
                  class="inline-block rounded-lg px-4 py-2"
                  :class="
                    message.sender === 'agent'
                      ? 'bg-purple-100 text-purple-900'
                      : 'bg-green-100 text-green-900'
                  "
                >
                  <strong>{{ message.sender === 'agent' ? 'Agent' : 'You' }}:</strong>
                  {{ message.text }}
                </span>
              </div>
            </div>
          </div>
          <div class="mb-4 flex gap-2">
            <input
              v-model="testMessage"
              @keyup.enter="handleSendTestMessage"
              placeholder="Send a test message..."
              class="flex-grow rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              @click="handleSendTestMessage"
              class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Send
            </button>
          </div>
          <div class="flex gap-3">
            <button
              @click="handleApproveAgent"
              class="rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
            >
              Approve Agent
            </button>
            <button
              @click="handleRejectAgent"
              class="rounded-lg bg-red-600 px-6 py-2 text-white transition-colors hover:bg-red-700"
            >
              Reject Agent
            </button>
            <button
              @click="handleClearTestHistory"
              class="rounded-lg bg-gray-600 px-6 py-2 text-white transition-colors hover:bg-gray-700"
            >
              Clear History
            </button>
          </div>
        </div>

        <!-- Assign Details State -->
        <div
          v-if="currentInterview.currentState === 'assign_details'"
          class="space-y-4 rounded-lg bg-white p-6 shadow-sm"
        >
          <h2 class="text-2xl font-semibold text-gray-900">Assign Agent Details</h2>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Suggested Names</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="name in nameSuggestions"
                :key="name"
                @click="selectedName = name"
                class="rounded-full border px-4 py-2 transition-colors"
                :class="
                  selectedName === name
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-blue-500'
                "
              >
                {{ name }}
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Agent Name</label>
            <input
              v-model="selectedName"
              type="text"
              placeholder="Enter agent name"
              class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p v-if="nameError" class="text-sm text-red-600">{{ nameError }}</p>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">Gender</label>
            <div class="flex gap-4">
              <label class="flex items-center">
                <input v-model="selectedGender" type="radio" value="male" class="mr-2" />
                <span>Male</span>
              </label>
              <label class="flex items-center">
                <input v-model="selectedGender" type="radio" value="female" class="mr-2" />
                <span>Female</span>
              </label>
              <label class="flex items-center">
                <input v-model="selectedGender" type="radio" value="neutral" class="mr-2" />
                <span>Neutral</span>
              </label>
            </div>
            <p v-if="genderError" class="text-sm text-red-600">{{ genderError }}</p>
          </div>

          <button
            @click="handleSetAgentDetails"
            class="rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
          >
            Create Agent
          </button>
        </div>

        <!-- Complete State -->
        <div
          v-if="currentInterview.currentState === 'complete'"
          class="space-y-4 rounded-lg bg-white p-6 shadow-sm"
        >
          <div class="text-center">
            <div class="mb-4 text-6xl">✓</div>
            <h2 class="mb-2 text-2xl font-semibold text-green-600">Agent Created Successfully!</h2>
            <p class="mb-4 text-gray-700">Your new agent is ready to join the team.</p>
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
              <p><strong>Agent ID:</strong> {{ currentInterview.agentId || 'N/A' }}</p>
              <p><strong>Name:</strong> {{ agentDraft?.finalDetails?.name || 'N/A' }}</p>
              <p><strong>Gender:</strong> {{ agentDraft?.finalDetails?.gender || 'N/A' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useInterview } from '~/composables/useInterview'

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

const interviewId = route.params.id as string

// Standard chat
const newMessage = ref('')

// Prompt review
const editingPrompt = ref(false)
const editedPrompt = ref('')

// Test conversation
const testMessage = ref('')
const testHistory = ref<Array<{ sender: string; text: string }>>([])

// Agent details
const nameSuggestions = ref<string[]>([])
const selectedName = ref('')
const selectedGender = ref('')
const nameError = ref('')
const genderError = ref('')

onMounted(() => {
  getInterview(interviewId)
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
  await getInterview(interviewId)

  // Load test history if in test_conversation state
  if (currentInterview.value?.currentState === 'test_conversation') {
    await loadTestHistory()
  }

  // Load name suggestions if in assign_details state
  if (currentInterview.value?.currentState === 'assign_details') {
    await loadNameSuggestions()
  }
}

const sendMessage = async () => {
  if (newMessage.value.trim() !== '') {
    await respondToInterview(interviewId, newMessage.value)
    newMessage.value = ''
    await getInterview(interviewId)
  }
}

const handleApprovePrompt = async () => {
  await approvePrompt(interviewId)
  await getInterview(interviewId)
}

const handleRejectPrompt = async () => {
  await rejectPrompt(interviewId)
  await getInterview(interviewId)
}

const handleSavePrompt = async () => {
  if (editedPrompt.value.trim()) {
    await editPrompt(interviewId, editedPrompt.value)
    editingPrompt.value = false
    await getInterview(interviewId)
  }
}

const handleSendTestMessage = async () => {
  if (testMessage.value.trim()) {
    await sendTestMessage(interviewId, testMessage.value)
    testMessage.value = ''
    await loadTestHistory()
  }
}

const loadTestHistory = async () => {
  const history = await getTestHistory(interviewId)
  if (history && Array.isArray(history)) {
    testHistory.value = history.map((entry: any) => ({
      sender: entry.sender || entry.speaker,
      text:
        typeof entry.message === 'string' ? entry.message : entry.message?.text || entry.text || ''
    }))
  }
}

const handleClearTestHistory = async () => {
  await clearTestHistory(interviewId)
  testHistory.value = []
}

const handleApproveAgent = async () => {
  await approveAgent(interviewId)
  await getInterview(interviewId)
}

const handleRejectAgent = async () => {
  await rejectAgent(interviewId)
  await getInterview(interviewId)
}

const loadNameSuggestions = async () => {
  const suggestions = await getNameSuggestions(interviewId)
  if (suggestions && Array.isArray(suggestions)) {
    nameSuggestions.value = suggestions
  }
}

const handleSetAgentDetails = async () => {
  nameError.value = ''
  genderError.value = ''

  if (!selectedName.value || selectedName.value.trim().length < 2) {
    nameError.value = 'Name must be at least 2 characters'
    return
  }

  if (!selectedGender.value) {
    genderError.value = 'Please select a gender'
    return
  }

  await setAgentDetails(interviewId, selectedName.value, selectedGender.value)
  await getInterview(interviewId)
}
</script>
