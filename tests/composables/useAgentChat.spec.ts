import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAgentChat } from '../../app/composables/useAgentChat'
import type { Agent } from '../../types'

// Mock fetch globally
global.fetch = vi.fn()

const mockAgent: Agent = {
  id: 'agent-123',
  name: 'Test Agent',
  role: 'developer',
  seniorId: null,
  teamId: 'team-1',
  organizationId: 'org-1',
  systemPrompt: 'You are a helpful assistant.',
  tokenAllocation: 10000,
  tokenUsed: 100,
  status: 'active',
  createdAt: new Date(),
  lastActiveAt: new Date()
}

describe('useAgentChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with empty state', () => {
    const { messages, isLoading, error } = useAgentChat('agent-123')

    expect(messages.value).toEqual([])
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('should load agent successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockAgent]
    } as Response)

    const { agent, loadAgent, error } = useAgentChat('agent-123')

    await loadAgent()

    expect(fetch).toHaveBeenCalledWith('/api/agents?organizationId=undefined')
    expect(agent.value).toEqual(mockAgent)
    expect(error.value).toBeNull()
  })

  it('should handle agent not found error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response)

    const { agent, loadAgent, error } = useAgentChat('non-existent')

    await loadAgent()

    expect(agent.value).toBeNull()
    expect(error.value).toBe('Agent not found')
  })

  it('should send message and receive response', async () => {
    const mockResponse = {
      response: 'Hello! How can I help you?',
      sessionId: 'session-123',
      timestamp: '2024-01-01T00:00:00.000Z'
    }

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const { messages, sendMessage, isLoading, error } = useAgentChat('agent-123')

    await sendMessage('Hello')

    expect(messages.value).toHaveLength(2)
    expect(messages.value[0]).toMatchObject({
      role: 'user',
      content: 'Hello'
    })
    expect(messages.value[1]).toMatchObject({
      role: 'assistant',
      content: 'Hello! How can I help you?'
    })
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('should set loading state during message send', async () => {
    const { sendMessage, isLoading } = useAgentChat('agent-123')

    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                response: 'Response',
                sessionId: 'session-123',
                timestamp: '2024-01-01T00:00:00.000Z'
              })
            } as Response)
          }, 100)
        })
    )

    const promise = sendMessage('Test message')
    expect(isLoading.value).toBe(true)

    await promise
    expect(isLoading.value).toBe(false)
  })

  it('should handle API error during message send', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Agent not found' })
    } as Response)

    const { sendMessage, error, messages } = useAgentChat('agent-123')

    await sendMessage('Hello')

    expect(error.value).toBe('Agent not found')
    expect(messages.value).toHaveLength(1) // Only user message added
  })

  it('should handle network error during message send', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const { sendMessage, error } = useAgentChat('agent-123')

    await sendMessage('Hello')

    expect(error.value).toBe('Failed to send message. Please try again.')
  })

  it('should clear messages', () => {
    const { messages, clearMessages } = useAgentChat('agent-123')

    messages.value = [
      {
        id: '1',
        role: 'user',
        content: 'Test',
        timestamp: new Date()
      }
    ]

    clearMessages()

    expect(messages.value).toEqual([])
  })

  it('should maintain sessionId across multiple messages', async () => {
    const sessionId = 'session-123'

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'First response',
          sessionId,
          timestamp: '2024-01-01T00:00:00.000Z'
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: 'Second response',
          sessionId,
          timestamp: '2024-01-01T00:01:00.000Z'
        })
      } as Response)

    const { sendMessage } = useAgentChat('agent-123')

    await sendMessage('First message')
    await sendMessage('Second message')

    expect(fetch).toHaveBeenCalledTimes(2)

    const secondCall = vi.mocked(fetch).mock.calls[1]
    const secondCallBody = JSON.parse(secondCall[1]?.body as string)
    expect(secondCallBody.sessionId).toBe(sessionId)
  })

  it('should not send empty messages', async () => {
    const { sendMessage } = useAgentChat('agent-123')

    await sendMessage('')
    await sendMessage('   ')

    expect(fetch).not.toHaveBeenCalled()
  })
})
