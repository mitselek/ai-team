import { ref } from 'vue'
import type { Agent } from '@@/types'
import { v4 as uuidv4 } from 'uuid'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatResponse {
  response: string
  sessionId: string
  timestamp: string
}

interface ErrorResponse {
  error: string
}

export const useAgentChat = (agentId: string) => {
  const messages = ref<ChatMessage[]>([])
  const agent = ref<Agent | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const sessionId = ref<string | null>(null)

  const loadAgent = async () => {
    try {
      error.value = null
      const response = await fetch(`/api/agents?organizationId=undefined`)

      if (!response.ok) {
        error.value = 'Failed to load agent'
        return
      }

      const agents: Agent[] = await response.json()
      const foundAgent = agents.find((a) => a.id === agentId)

      if (!foundAgent) {
        error.value = 'Agent not found'
        agent.value = null
        return
      }

      agent.value = foundAgent
    } catch (err) {
      error.value = 'Failed to load agent'
      agent.value = null
    }
  }

  const sendMessage = async (content: string) => {
    if (!content || content.trim() === '') {
      return
    }

    error.value = null
    isLoading.value = true

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    messages.value.push(userMessage)

    try {
      const response = await fetch(`/api/agents/${agentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: content.trim(),
          sessionId: sessionId.value
        })
      })

      const data: ChatResponse | ErrorResponse = await response.json()

      if (!response.ok || 'error' in data) {
        const errorMsg = 'error' in data ? data.error : 'Failed to send message'
        error.value = errorMsg
        isLoading.value = false
        return
      }

      const chatResponse = data as ChatResponse
      sessionId.value = chatResponse.sessionId

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: chatResponse.response,
        timestamp: new Date(chatResponse.timestamp)
      }

      messages.value.push(assistantMessage)
    } catch (err) {
      error.value = 'Failed to send message. Please try again.'
    } finally {
      isLoading.value = false
    }
  }

  const clearMessages = () => {
    messages.value = []
    sessionId.value = null
    error.value = null
  }

  return {
    messages,
    agent,
    isLoading,
    error,
    loadAgent,
    sendMessage,
    clearMessages
  }
}
