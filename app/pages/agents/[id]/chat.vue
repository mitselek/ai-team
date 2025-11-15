<template>
  <div class="flex h-screen flex-col bg-gray-50">
    <!-- Header -->
    <div class="bg-gray-900 p-6 text-white shadow-md">
      <div class="mx-auto max-w-4xl">
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
import { useRoute } from 'vue-router'
import { useAgentChat } from '~/composables/useAgentChat'
import type { Agent } from '@@/types'
import { logger } from '@/utils/logger'

const route = useRoute()
const { messages, loading, error, sendMessage, clearMessages } = useAgentChat()

const agentId = ref(route.params.id as string)
const agent = ref<Agent | null>(null)
const agentError = ref(false)
const messageInput = ref('')
const messageContainer = ref<HTMLDivElement | null>(null)
const inputElement = ref<HTMLInputElement | null>(null)

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

onMounted(() => {
  loadAgent()
  clearMessages()
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
