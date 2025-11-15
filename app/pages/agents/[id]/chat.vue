<template>
  <div class="flex h-screen flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-gray-900 p-6 text-white shadow-md">
      <div class="mx-auto max-w-4xl">
        <div class="flex items-center justify-between">
          <!-- Agent Info -->
          <div>
            <div v-if="agent">
              <h1 class="text-3xl font-bold">{{ agent.name }}</h1>
              <p class="text-gray-300">{{ agent.role }}</p>
            </div>
            <div v-else-if="agentError" class="text-red-400">
              <p>[ERROR] Failed to load agent information</p>
            </div>
            <div v-else>
              <p class="text-gray-400">Loading agent information...</p>
            </div>
          </div>

          <!-- Controls -->
          <div class="flex items-center gap-4">
            <!-- Conversation History Dropdown -->
            <div class="relative">
              <button
                @click="showConversations = !showConversations"
                class="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"
                  />
                  <path
                    d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"
                  />
                </svg>
                Conversations
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  :class="{ 'rotate-180': showConversations }"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>

              <!-- Dropdown Menu -->
              <div
                v-if="showConversations"
                class="absolute right-0 z-10 mt-2 w-80 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5"
              >
                <div class="max-h-96 overflow-y-auto py-2">
                  <div v-if="loadingSessions" class="px-4 py-3 text-center text-sm text-gray-500">
                    Loading conversations...
                  </div>
                  <div
                    v-else-if="sessions.length === 0"
                    class="px-4 py-3 text-center text-sm text-gray-500"
                  >
                    No previous conversations
                  </div>
                  <button
                    v-else
                    v-for="session in sessions"
                    :key="session.id"
                    @click="loadSession(session.id)"
                    class="block w-full px-4 py-3 text-left text-sm transition-colors hover:bg-gray-100"
                    :class="{
                      'bg-blue-50': sessionId === session.id
                    }"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1 overflow-hidden">
                        <p class="truncate font-medium text-gray-900">
                          {{ getSessionPreview(session) }}
                        </p>
                        <p class="text-xs text-gray-500">
                          {{ formatSessionDate(session.updatedAt) }} • {{ session.messages.length }}
                          messages
                        </p>
                      </div>
                      <svg
                        v-if="sessionId === session.id"
                        xmlns="http://www.w3.org/2000/svg"
                        class="ml-2 h-5 w-5 flex-shrink-0 text-blue-600"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </div>
                  </button>
                </div>
                <div v-if="messages.length > 0" class="border-t border-gray-200 px-4 py-2">
                  <button
                    @click="startNewConversation"
                    class="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    + New Conversation
                  </button>
                </div>
              </div>
            </div>

            <!-- Back to Dashboard Button -->
            <button
              @click="goToDashboard"
              class="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
                />
              </svg>
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Chat Area -->
    <div class="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-6 pb-6">
      <div class="flex flex-1 flex-col overflow-hidden rounded-lg bg-white shadow-lg">
        <!-- Message History -->
        <div
          ref="messageContainer"
          class="flex-1 space-y-4 overflow-y-auto border-b border-gray-200 p-6"
        >
          <div v-if="messages.length === 0" class="flex h-full items-center justify-center">
            <p class="text-gray-500">No messages yet. Start a conversation below.</p>
          </div>
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="[
              'rounded-lg p-4',
              message.role === 'user'
                ? 'ml-12 bg-blue-100 text-right'
                : 'mr-12 bg-gray-100 text-left'
            ]"
          >
            <div class="mb-1 text-xs font-semibold uppercase text-gray-600">
              {{ message.role === 'user' ? 'You' : agent?.name || 'Agent' }}
            </div>
            <div class="whitespace-pre-wrap text-gray-900">{{ message.content }}</div>
            <div class="mt-2 text-xs text-gray-500">
              {{ formatTimestamp(message.timestamp) }}
            </div>
          </div>

          <!-- Loading Indicator -->
          <div v-if="loading" class="mr-12 rounded-lg bg-gray-100 p-4 text-left">
            <div class="mb-1 text-xs font-semibold uppercase text-gray-600">
              {{ agent?.name || 'Agent' }}
            </div>
            <div class="text-gray-500">Typing...</div>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="bg-red-50 p-4">
          <p class="text-red-700">[ERROR] {{ error }}</p>
        </div>

        <!-- Input Area -->
        <div class="flex-shrink-0 p-6">
          <form @submit.prevent="handleSendMessage" class="flex gap-4">
            <input
              ref="inputElement"
              v-model="messageInput"
              type="text"
              placeholder="Type your message..."
              :disabled="loading || !agent"
              class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            <button
              type="submit"
              :disabled="loading || !messageInput.trim() || !agent"
              class="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAgentChat } from '~/composables/useAgentChat'
import type { Agent } from '@@/types'
import type { ChatSession } from '~/server/services/persistence/chat-types'
import { logger } from '@/utils/logger'

const route = useRoute()
const router = useRouter()
const { messages, loading, error, sendMessage, clearMessages, sessionId } = useAgentChat()

const agentId = ref(route.params.id as string)
const agent = ref<Agent | null>(null)
const agentError = ref(false)
const messageInput = ref('')
const messageContainer = ref<HTMLDivElement | null>(null)
const inputElement = ref<HTMLInputElement | null>(null)

// Conversation dropdown state
const showConversations = ref(false)
const sessions = ref<ChatSession[]>([])
const loadingSessions = ref(false)

/**
 * Load agent information from API
 */
const loadAgent = async () => {
  try {
    const response = await $fetch<Agent[]>(`/api/agents`)
    const foundAgent = response.find((a: Agent) => a.id === agentId.value)

    if (foundAgent) {
      agent.value = foundAgent
      logger.info({ agentId: agentId.value }, 'Agent loaded successfully')

      // Focus input after agent is loaded and input is enabled
      await nextTick()
      if (inputElement.value) {
        inputElement.value.focus()
      }
    } else {
      agentError.value = true
      logger.warn({ agentId: agentId.value }, 'Agent not found')
    }
  } catch (err) {
    agentError.value = true
    logger.error({ agentId: agentId.value, error: err }, 'Failed to load agent')
  }
}

/**
 * Handle sending a message
 */
const handleSendMessage = async () => {
  if (!messageInput.value.trim() || loading.value || !agent.value) {
    return
  }

  const message = messageInput.value
  messageInput.value = ''

  await sendMessage(agentId.value, message)

  await nextTick()
  scrollToBottom()
}

/**
 * Scroll to bottom of message container
 */
const scrollToBottom = () => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

/**
 * Load chat sessions for the dropdown
 */
const loadChatSessions = async () => {
  if (!agent.value) return

  loadingSessions.value = true
  try {
    const response = await $fetch<{ sessions: ChatSession[] }>(`/api/agents/${agentId.value}/chats`)
    sessions.value = response.sessions.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    logger.info({ agentId: agentId.value, count: sessions.value.length }, 'Sessions loaded')
  } catch (err) {
    logger.error({ agentId: agentId.value, error: err }, 'Failed to load sessions')
  } finally {
    loadingSessions.value = false
  }
}

/**
 * Load a specific session
 */
const loadSession = async (sessionIdToLoad: string) => {
  try {
    const response = await $fetch<{ session: ChatSession }>(
      `/api/agents/${agentId.value}/chats/${sessionIdToLoad}`
    )

    // Clear current messages and load session messages
    clearMessages()
    messages.value = response.session.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp).toISOString()
    }))

    // Update sessionId in composable
    sessionId.value = sessionIdToLoad

    showConversations.value = false

    await nextTick()
    scrollToBottom()

    logger.info({ agentId: agentId.value, sessionId: sessionIdToLoad }, 'Session loaded')
  } catch (err) {
    logger.error(
      { agentId: agentId.value, sessionId: sessionIdToLoad, error: err },
      'Failed to load session'
    )
  }
}

/**
 * Start a new conversation
 */
const startNewConversation = () => {
  clearMessages()
  sessionId.value = null
  showConversations.value = false
  logger.info({ agentId: agentId.value }, 'Starting new conversation')
}

/**
 * Get preview text from session (first user message)
 */
const getSessionPreview = (session: ChatSession): string => {
  const firstUserMessage = session.messages.find((msg) => msg.role === 'user')
  if (firstUserMessage) {
    return firstUserMessage.content.length > 60
      ? firstUserMessage.content.substring(0, 60) + '...'
      : firstUserMessage.content
  }
  return 'New conversation'
}

/**
 * Format session date for display
 */
const formatSessionDate = (date: Date): string => {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

/**
 * Navigate to dashboard
 */
const goToDashboard = () => {
  router.push('/')
}

onMounted(() => {
  loadAgent()
  clearMessages()
})

// Watch for conversation dropdown toggle to load sessions
watch(showConversations, (isShown) => {
  if (isShown && sessions.value.length === 0) {
    loadChatSessions()
  }
})

watch(messages, () => {
  nextTick(() => {
    scrollToBottom()
  })
})

// Watch loading state to focus input when agent finishes replying
watch(loading, (isLoading, wasLoading) => {
  // When loading transitions from true to false (agent finished replying)
  if (wasLoading && !isLoading) {
    nextTick(() => {
      if (inputElement.value) {
        inputElement.value.focus()
      }
    })
  }
})
</script>
