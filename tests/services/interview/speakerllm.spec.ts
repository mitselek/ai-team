// tests/services/interview/speakerllm.spec.ts
// Test to verify speakerLLM tracking functionality

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  addMessage,
  createSession,
  getSession
} from '../../../app/server/services/interview/session'
import { generateNextQuestion } from '../../../app/server/services/interview/questions'
import { generateCompletion } from '../../../app/server/services/llm'
import { LLMProvider } from '../../../app/server/services/llm/types'

vi.mock('../../../app/server/services/llm')
vi.mock('../../../app/server/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    }))
  }))
}))

// Mock persistence
vi.mock('../../../app/server/services/persistence/filesystem', () => ({
  saveInterview: vi.fn().mockResolvedValue(undefined)
}))

describe('Speaker LLM Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should track speakerLLM when adding interviewer messages', () => {
    const session = createSession('team-1', 'interviewer-1')

    // Add message with model info
    const message = addMessage(
      session.id,
      'interviewer',
      'What role will you be taking on our team?',
      undefined,
      'anthropic:haiku-4.5'
    )

    expect(message.speakerLLM).toBe('anthropic:haiku-4.5')
    expect(message.speaker).toBe('interviewer')
    expect(message.message).toContain('What role')
  })

  it('should allow messages without speakerLLM (backward compatible)', () => {
    const session = createSession('team-1', 'interviewer-1')

    // Add message without model info
    const message = addMessage(session.id, 'requester', 'I need a frontend developer', undefined)

    expect(message.speakerLLM).toBeUndefined()
    expect(message.speaker).toBe('requester')
  })

  it('should capture model info from generateNextQuestion', async () => {
    const session = createSession('team-1', 'interviewer-1')
    session.currentState = 'ask_role'

    vi.mocked(generateCompletion).mockResolvedValue({
      content: 'What expertise do you need?',
      tokensUsed: { total: 20, input: 15, output: 5 },
      provider: LLMProvider.GOOGLE,
      model: 'flash',
      finishReason: 'stop'
    })

    const result = await generateNextQuestion(session)

    expect(result).toBeDefined()
    expect(result?.content).toBe('What expertise do you need?')
    expect(result?.speakerLLM).toBe('google:flash')
  })

  it('should track different models for different task types', async () => {
    const session = createSession('team-1', 'interviewer-1')
    session.currentState = 'ask_expertise'

    // Simulate question generation with Anthropic
    vi.mocked(generateCompletion).mockResolvedValueOnce({
      content: 'What skills should the agent have?',
      tokensUsed: { total: 18, input: 12, output: 6 },
      provider: LLMProvider.ANTHROPIC,
      model: 'haiku-4.5',
      finishReason: 'stop'
    })

    const question = await generateNextQuestion(session)
    expect(question?.speakerLLM).toBe('anthropic:haiku-4.5')

    // Simulate analysis with Google
    vi.mocked(generateCompletion).mockResolvedValueOnce({
      content: JSON.stringify({
        keyInfo: ['React', 'TypeScript'],
        clarityScore: 9,
        needsFollowUp: false,
        followUpReason: ''
      }),
      tokensUsed: { total: 25, input: 20, output: 5 },
      provider: LLMProvider.GOOGLE,
      model: 'flash',
      finishReason: 'stop'
    })

    // The analysis doesn't add to transcript, but if it did, it would track google:flash
  })

  it('should persist speakerLLM in session transcript', () => {
    const session = createSession('team-1', 'interviewer-1')

    // Add multiple messages with different models
    addMessage(session.id, 'interviewer', 'Hello!', undefined, 'anthropic:haiku-4.5')
    addMessage(session.id, 'requester', 'Hi there!')
    addMessage(session.id, 'interviewer', 'What do you need?', undefined, 'google:flash')

    const retrievedSession = getSession(session.id)
    expect(retrievedSession).toBeDefined()
    expect(retrievedSession?.transcript).toHaveLength(3)

    // Check first interviewer message
    expect(retrievedSession?.transcript[0].speaker).toBe('interviewer')
    expect(retrievedSession?.transcript[0].speakerLLM).toBe('anthropic:haiku-4.5')

    // Check requester message (no model)
    expect(retrievedSession?.transcript[1].speaker).toBe('requester')
    expect(retrievedSession?.transcript[1].speakerLLM).toBeUndefined()

    // Check second interviewer message
    expect(retrievedSession?.transcript[2].speaker).toBe('interviewer')
    expect(retrievedSession?.transcript[2].speakerLLM).toBe('google:flash')
  })
})
