<template>
  <div class="space-y-4 rounded-lg bg-white p-6 shadow-sm">
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
        v-model="messageInput"
        @keyup.enter="handleSend"
        placeholder="Type your message..."
        class="flex-grow rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        @click="handleSend"
        class="rounded-lg bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
      >
        Send
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface ChatMessage {
  sender: string
  text: string
}

interface Props {
  chatHistory: ChatMessage[]
}

defineProps<Props>()

const emit = defineEmits<{
  send: [message: string]
}>()

const messageInput = ref('')

const handleSend = () => {
  if (messageInput.value.trim()) {
    emit('send', messageInput.value)
    messageInput.value = ''
  }
}
</script>
