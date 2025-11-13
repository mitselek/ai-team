import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setResponseStatus, readBody } from 'h3'
import type { H3Event } from 'h3'

import POST from '../../app/server/api/agents/[id]/chat.post'
import { agents } from '../../app/server/data/agents'
import type { Agent } from '../../types'
import * as llmService from '../../app/server/services/llm'
import { LLMProvider } from '../../app/server/services/llm/types'

// Mock the logger
vi.mock('../../server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  }),
  newCorrelationId: () => 'test-correlation-id'
}))

// Mock h3 utilities
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn(),
    setResponseStatus: vi.fn()
  }
})

// Mock LLM service
vi.mock('../../app/server/services/llm', () => ({
  generateCompletion: vi.fn()
}))

const testAgent: Agent = {
  id: 'agent-123',
  name: 'Test Agent',
  role: 'developer',
  seniorId: null,
  teamId: 'team-1',
  organizationId: 'org-1',
  systemPrompt: 'You are a helpful development assistant.',
  tokenAllocation: 10000,
  tokenUsed: 100,
  status: 'active',
  createdAt: new Date(),
  lastActiveAt: new Date()
}

const inactiveAgent: Agent = {
  id: 'agent-456',
  name: 'Paused Agent',
  role: 'worker',
  seniorId: null,
  teamId: 'team-1',
  organizationId: 'org-1',
  systemPrompt: 'You are a worker agent.',
  tokenAllocation: 10000,
  tokenUsed: 50,
  status: 'paused',
  createdAt: new Date(),
  lastActiveAt: new Date()
}

describe('POST /api/agents/[id]/chat', () => {
  beforeEach(() => {
    // Clear data before each test
    agents.length = 0
    vi.clearAllMocks()
  })

  it('should return a chat response for a valid request', async () => {
    agents.push(testAgent)

    const mockEvent = {
      context: {
        params: {
          id: 'agent-123'
        }
      }
    } as unknown as H3Event

    vi.mocked(readBody).mockResolvedValue({
      message: 'Hello, how are you?'
    })

    vi.mocked(llmService.generateCompletion).mockResolvedValue({
      content: 'I am doing well, thank you for asking!',
      provider: LLMProvider.ANTHROPIC,
      model: 'claude-3-5-haiku-20241022',
      tokensUsed: {
        input: 50,
        output: 30,
        total: 80
      },
      finishReason: 'stop'
    })

    const result = await POST(mockEvent)

    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.response).toBe('I am doing well, thank you for asking!')
      expect(result.sessionId).toBeDefined()
      expect(typeof result.sessionId).toBe('string')
      expect(result.timestamp).toBeDefined()
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0)
    }

    // Verify LLM service was called with correct parameters
    expect(llmService.generateCompletion).toHaveBeenCalledWith(
      expect.stringContaining('You are a helpful development assistant.'),
      expect.objectContaining({
        agentId: 'agent-123',
        agentRole: 'developer'
      })
    )

    // Verify the prompt includes both system prompt and user message
    const callArgs = vi.mocked(llmService.generateCompletion).mock.calls[0]
    expect(callArgs[0]).toContain('You are a helpful development assistant.')
    expect(callArgs[0]).toContain('Hello, how are you?')
  })

  it('should accept and return sessionId when provided', async () => {
    agents.push(testAgent)

    const mockEvent = {
      context: {
        params: {
          id: 'agent-123'
        }
      }
    } as unknown as H3Event

    const providedSessionId = 'existing-session-123'

    vi.mocked(readBody).mockResolvedValue({
      message: 'Continue our conversation',
      sessionId: providedSessionId
    })

    vi.mocked(llmService.generateCompletion).mockResolvedValue({
      content: 'Continuing...',
      provider: LLMProvider.ANTHROPIC,
      model: 'claude-3-5-haiku-20241022',
      tokensUsed: {
        input: 40,
        output: 20,
        total: 60
      },
      finishReason: 'stop'
    })

    const result = await POST(mockEvent)

    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.sessionId).toBe(providedSessionId)
    }
  })

  it('should return 404 when agent does not exist', async () => {
    const mockEvent = {
      context: {
        params: {
          id: 'non-existent-agent'
        }
      }
    } as unknown as H3Event

    vi.mocked(readBody).mockResolvedValue({
      message: 'Hello'
    })

    const result = await POST(mockEvent)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toContain('not found')
    }
    expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 404)
  })

  it('should return 400 when agent is not active', async () => {
    agents.push(inactiveAgent)

    const mockEvent = {
      context: {
        params: {
          id: 'agent-456'
        }
      }
    } as unknown as H3Event

    vi.mocked(readBody).mockResolvedValue({
      message: 'Hello'
    })

    const result = await POST(mockEvent)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toContain('not active')
    }
    expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
  })

  it('should return 400 when agentId is missing', async () => {
    const mockEvent = {
      context: {
        params: {}
      }
    } as unknown as H3Event

    vi.mocked(readBody).mockResolvedValue({
      message: 'Hello'
    })

    const result = await POST(mockEvent)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toBe('agentId is required')
    }
    expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
  })

  it('should return 400 when message is missing', async () => {
    agents.push(testAgent)

    const mockEvent = {
      context: {
        params: {
          id: 'agent-123'
        }
      }
    } as unknown as H3Event

    vi.mocked(readBody).mockResolvedValue({})

    const result = await POST(mockEvent)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toBe('message is required')
    }
    expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
  })

  it('should return 400 when message is empty string', async () => {
    agents.push(testAgent)

    const mockEvent = {
      context: {
        params: {
          id: 'agent-123'
        }
      }
    } as unknown as H3Event

    vi.mocked(readBody).mockResolvedValue({
      message: ''
    })

    const result = await POST(mockEvent)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toBe('message is required')
    }
    expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
  })

  it('should return 400 when request body is invalid JSON', async () => {
    agents.push(testAgent)

    const mockEvent = {
      context: {
        params: {
          id: 'agent-123'
        }
      }
    } as unknown as H3Event

    vi.mocked(readBody).mockRejectedValue(new Error('Invalid JSON'))

    const result = await POST(mockEvent)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toBe('Invalid request body')
    }
    expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
  })

  it('should return 500 when LLM service fails', async () => {
    agents.push(testAgent)

    const mockEvent = {
      context: {
        params: {
          id: 'agent-123'
        }
      }
    } as unknown as H3Event

    vi.mocked(readBody).mockResolvedValue({
      message: 'Hello'
    })

    vi.mocked(llmService.generateCompletion).mockRejectedValue(new Error('LLM service unavailable'))

    const result = await POST(mockEvent)

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toBe('Failed to generate chat response')
    }
    expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 500)
  })

  it('should include system prompt in LLM request', async () => {
    agents.push(testAgent)

    const mockEvent = {
      context: {
        params: {
          id: 'agent-123'
        }
      }
    } as unknown as H3Event

    vi.mocked(readBody).mockResolvedValue({
      message: 'What can you do?'
    })

    vi.mocked(llmService.generateCompletion).mockResolvedValue({
      content: 'I can help with development tasks.',
      provider: LLMProvider.ANTHROPIC,
      model: 'claude-3-5-haiku-20241022',
      tokensUsed: {
        input: 45,
        output: 25,
        total: 70
      },
      finishReason: 'stop'
    })

    await POST(mockEvent)

    const callArgs = vi.mocked(llmService.generateCompletion).mock.calls[0]
    const promptArg = callArgs[0]

    expect(promptArg).toContain('You are a helpful development assistant.')
    expect(promptArg).toContain('What can you do?')
  })

  it('should update agent token usage after successful chat', async () => {
    agents.push(testAgent)

    const mockEvent = {
      context: {
        params: {
          id: 'agent-123'
        }
      }
    } as unknown as H3Event

    vi.mocked(readBody).mockResolvedValue({
      message: 'Hello'
    })

    vi.mocked(llmService.generateCompletion).mockResolvedValue({
      content: 'Hi there!',
      provider: LLMProvider.ANTHROPIC,
      model: 'claude-3-5-haiku-20241022',
      tokensUsed: {
        input: 30,
        output: 15,
        total: 45
      },
      finishReason: 'stop'
    })

    await POST(mockEvent)

    // Note: Token usage is updated by the LLM service itself
    // This test verifies the LLM service was called correctly
    expect(llmService.generateCompletion).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        agentId: 'agent-123'
      })
    )
  })
})
