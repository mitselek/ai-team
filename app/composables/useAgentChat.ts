import { ref } from 'vue'
import type { ChatMessage } from '@@/types'
import { logger } from '@/utils/logger'

export const useAgentChat = () => {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const sessionId = ref<string | null>(null)

  /**
   * Send a message to an agent and receive a response
   * @param agentId - The ID of the agent to chat with
   * @param message - The message to send
   * @returns Promise that resolves when the message is sent and response received
   */
  const sendMessage = async (agentId: string, message: string): Promise<void> => {
    if (!message || message.trim() === '') {
      logger.warn({ agentId }, 'Attempted to send empty message')
      return
    }

    loading.value = true
    error.value = null

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }

    messages.value.push(userMessage)

    try {
      const response = await $fetch<{ response: string; sessionId: string; timestamp: string }>(
        `/api/agents/${agentId}/chat`,
        {
          method: 'POST',
          body: {
            message,
            sessionId: sessionId.value || undefined
          }
        }
      )

      // Store session ID for subsequent messages
      if (response.sessionId) {
        sessionId.value = response.sessionId
      }

      const agentMessage: ChatMessage = {
        role: 'agent',
        content: response.response,
        timestamp: response.timestamp
      }

      messages.value.push(agentMessage)
      logger.info(
        { agentId, sessionId: sessionId.value, messageCount: messages.value.length },
        'Message sent successfully'
      )
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to send message. Please try again.'
      error.value = errorMessage
      logger.error({ agentId, error: err }, 'Failed to send message')

      messages.value.pop()
    } finally {
      loading.value = false
    }
  }

  /**
   * Clear all messages from the chat history
   */
  const clearMessages = (): void => {
    messages.value = []
    error.value = null
    sessionId.value = null
    logger.info('Chat messages cleared')
  }

  return {
    messages,
    loading,
    error,
    sessionId,
    sendMessage,
    clearMessages
  }
}
