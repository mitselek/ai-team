<template>
  <div class="space-y-4 rounded-lg bg-white p-6 shadow-sm">
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
            <strong>{{ message.sender === 'agent' ? 'Agent' : 'You' }}:</strong> {{ message.text }}
          </span>
        </div>
      </div>
    </div>
    <div class="mb-4 flex gap-2">
      <input
        v-model="messageInput"
        @keyup.enter="handleSend"
        placeholder="Send a test message..."
        class="flex-grow rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        @click="handleSend"
        class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
      >
        Send
      </button>
    </div>
    <div class="flex gap-3">
      <button
        @click="emit('approve')"
        class="rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
      >
        Approve Agent
      </button>
      <button
        @click="emit('reject')"
        class="rounded-lg bg-red-600 px-6 py-2 text-white transition-colors hover:bg-red-700"
      >
        Reject Agent
      </button>
      <button
        @click="emit('clear')"
        class="rounded-lg bg-gray-600 px-6 py-2 text-white transition-colors hover:bg-gray-700"
      >
        Clear History
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface TestMessage {
  sender: string
  text: string
}

interface Props {
  testHistory: TestMessage[]
}

defineProps<Props>()

const emit = defineEmits<{
  send: [message: string]
  approve: []
  reject: []
  clear: []
}>()

const messageInput = ref('')

const handleSend = () => {
  if (messageInput.value.trim()) {
    emit('send', messageInput.value)
    messageInput.value = ''
  }
}
</script>
