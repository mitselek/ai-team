import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('Agent Chat Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.$fetch = vi.fn() as never
  })

  it('should initialize with empty messages', async () => {
    const { useAgentChat } = await import('../../../app/composables/useAgentChat')
    const { messages, loading, error } = useAgentChat()

    expect(messages.value).toEqual([])
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('should add user message and agent response', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      response: 'Agent response',
      sessionId: 'session-1',
      timestamp: new Date().toISOString()
    })
    global.$fetch = mockFetch as never

    const { useAgentChat } = await import('../../../app/composables/useAgentChat')
    const { messages, sendMessage } = useAgentChat()

    await sendMessage('test-agent-id', 'Hello')

    expect(messages.value.length).toBe(2)
    expect(messages.value[0].role).toBe('user')
    expect(messages.value[0].content).toBe('Hello')
    expect(messages.value[1].role).toBe('agent')
    expect(messages.value[1].content).toBe('Agent response')
  })

  it('should not send empty messages', async () => {
    const { useAgentChat } = await import('../../../app/composables/useAgentChat')
    const { messages, sendMessage } = useAgentChat()

    await sendMessage('test-agent-id', '')
    await sendMessage('test-agent-id', '   ')

    expect(messages.value.length).toBe(0)
  })

  it('should set error on API failure', async () => {
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))
    global.$fetch = mockFetch as never

    const { useAgentChat } = await import('../../../app/composables/useAgentChat')
    const { error, sendMessage } = useAgentChat()

    await sendMessage('test-agent-id', 'Hello')

    expect(error.value).toBeTruthy()
  })

  it('should clear messages', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      response: 'Agent response',
      sessionId: 'session-1',
      timestamp: new Date().toISOString()
    })
    global.$fetch = mockFetch as never

    const { useAgentChat } = await import('../../../app/composables/useAgentChat')
    const { messages, sendMessage, clearMessages } = useAgentChat()

    await sendMessage('test-agent-id', 'Hello')
    expect(messages.value.length).toBe(2)

    clearMessages()
    expect(messages.value.length).toBe(0)
  })

  it('should remove user message on error', async () => {
    const mockFetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))
    global.$fetch = mockFetch as never

    const { useAgentChat } = await import('../../../app/composables/useAgentChat')
    const { messages, sendMessage } = useAgentChat()

    await sendMessage('test-agent-id', 'Hello')

    expect(messages.value.length).toBe(0)
  })

  it('should set loading state during API call', async () => {
    let resolvePromise: (value: unknown) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    const mockFetch = vi.fn().mockReturnValueOnce(promise)
    global.$fetch = mockFetch as never

    const { useAgentChat } = await import('../../../app/composables/useAgentChat')
    const { loading, sendMessage } = useAgentChat()

    const sendPromise = sendMessage('test-agent-id', 'Hello')
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(loading.value).toBe(true)

    resolvePromise!({
      response: 'Agent response',
      sessionId: 'session-1',
      timestamp: new Date().toISOString()
    })

    await sendPromise
    expect(loading.value).toBe(false)
  })
})
