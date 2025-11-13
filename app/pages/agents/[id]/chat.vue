<template>
  <div class="min-h-screen bg-gray-50">
    <div class="mx-auto max-w-4xl p-6">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">
            {{ agent?.name || 'Chat' }}
          </h1>
          <p v-if="agent" class="text-sm text-gray-600">{{ agent.role }}</p>
        </div>
        <div class="flex gap-2">
          <button
            @click="handleClearMessages"
            class="rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700"
          >
            Clear Chat
          </button>
          <NuxtLink
            to="/"
            class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Back to Dashboard
          </NuxtLink>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mb-6 rounded-lg bg-red-100 p-4 text-red-800" role="alert">
        <p class="font-semibold">Error</p>
        <p>{{ error }}</p>
      </div>

      <!-- Agent Status -->
      <div v-if="agent" class="mb-6 rounded-lg bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <span
              :class="getStatusColor(agent.status)"
              class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium capitalize"
            >
              {{ agent.status }}
            </span>
          </div>
          <div class="text-sm text-gray-600">
            <span
              >Tokens: {{ formatNumber(agent.tokenUsed) }} /
              {{ formatNumber(agent.tokenAllocation) }}</span
            >
          </div>
        </div>
        <div v-if="agent.status !== 'active'" class="mt-2 text-sm text-yellow-700">
          Note: This agent is not currently active. Messages may not receive responses.
        </div>
      </div>

      <!-- Chat Messages Container -->
      <div class="mb-6 rounded-lg bg-white shadow-sm">
        <div ref="messagesContainer" class="h-[500px] space-y-4 overflow-y-auto p-6">
          <div
            v-if="messages.length === 0"
            class="flex h-full items-center justify-center text-center text-gray-500"
          >
            <p>No messages yet. Start a conversation!</p>
          </div>

          <div
            v-for="message in messages"
            :key="message.id"
            :class="['flex', message.role === 'user' ? 'justify-end' : 'justify-start']"
          >
            <div
              :class="[
                'max-w-[80%] rounded-lg px-4 py-3',
                message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'
              ]"
            >
              <div class="whitespace-pre-wrap break-words">
                {{ message.content }}
              </div>
              <div
                :class="[
                  'mt-1 text-xs',
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                ]"
              >
                {{ formatTime(message.timestamp) }}
              </div>
            </div>
          </div>

          <!-- Loading Indicator -->
          <div v-if="isLoading" class="flex justify-start">
            <div class="max-w-[80%] rounded-lg bg-gray-200 px-4 py-3">
              <div class="flex items-center space-x-2">
                <div class="h-2 w-2 animate-bounce rounded-full bg-gray-600"></div>
                <div
                  class="h-2 w-2 animate-bounce rounded-full bg-gray-600"
                  style="animation-delay: 0.2s"
                ></div>
                <div
                  class="h-2 w-2 animate-bounce rounded-full bg-gray-600"
                  style="animation-delay: 0.4s"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Message Input -->
        <div class="border-t border-gray-200 p-4">
          <form @submit.prevent="handleSendMessage" class="flex gap-2">
            <input
              v-model="messageInput"
              type="text"
              placeholder="Type your message..."
              :disabled="isLoading || !agent"
              class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
            <button
              type="submit"
              :disabled="isLoading || !messageInput.trim() || !agent"
              class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {{ isLoading ? 'Sending...' : 'Send' }}
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
import type { AgentStatus } from '@@/types'

const route = useRoute()
const agentId = ref(route.params.id as string)

const { messages, agent, isLoading, error, loadAgent, sendMessage, clearMessages } = useAgentChat(
  agentId.value
)

const messageInput = ref('')
const messagesContainer = ref<HTMLDivElement | null>(null)

const handleSendMessage = async () => {
  if (!messageInput.value.trim()) return

  const message = messageInput.value
  messageInput.value = ''

  await sendMessage(message)
  await scrollToBottom()
}

const handleClearMessages = () => {
  if (confirm('Are you sure you want to clear all messages?')) {
    clearMessages()
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const formatTime = (date: Date): string => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatNumber = (num: number): string => {
  return num.toLocaleString()
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

// Watch messages and scroll to bottom when new messages arrive
watch(
  () => messages.value.length,
  () => {
    scrollToBottom()
  }
)

onMounted(async () => {
  await loadAgent()
})
</script>
