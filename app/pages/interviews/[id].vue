<template>
  <div>
    <h1>Interview {{ $route.params.id }}</h1>
    <div v-if="currentInterview">
      <p>Status: {{ currentInterview.status }}</p>
      <div class="chat-window">
        <div v-for="(message, index) in chatHistory" :key="index" class="chat-message">
          <strong>{{ message.sender }}:</strong> {{ message.text }}
        </div>
      </div>
      <div class="chat-input">
        <input v-model="newMessage" @keyup.enter="sendMessage" placeholder="Type your message..." />
        <button @click="sendMessage">Send</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useInterview } from '~/composables/useInterview'

const route = useRoute()
const { currentInterview, getInterview, respondToInterview } = useInterview()
const newMessage = ref('')

const interviewId = route.params.id as string

onMounted(() => {
  getInterview(interviewId)
  // Poll for updates every 2 seconds
  setInterval(() => getInterview(interviewId), 2000)
})

const chatHistory = computed(() => {
  if (!currentInterview.value) {
    return []
  }

  const history = []
  const questions = currentInterview.value.questions || []
  const responses = currentInterview.value.responses || []

  for (let i = 0; i < questions.length; i++) {
    history.push({ sender: 'Marcus', text: questions[i].text })
    if (responses[i]) {
      history.push({ sender: 'You', text: responses[i].text })
    }
  }
  return history
})

const sendMessage = () => {
  if (newMessage.value.trim() !== '') {
    respondToInterview(interviewId, { text: newMessage.value })
    newMessage.value = ''
  }
}
</script>

<style scoped>
.chat-window {
  border: 1px solid #ccc;
  padding: 10px;
  height: 300px;
  overflow-y: scroll;
  margin-bottom: 10px;
}

.chat-message {
  margin-bottom: 5px;
}

.chat-input {
  display: flex;
}

.chat-input input {
  flex-grow: 1;
  padding: 5px;
}

.chat-input button {
  margin-left: 5px;
}
</style>
