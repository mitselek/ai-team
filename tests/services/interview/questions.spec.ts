// tests/services/interview/questions.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateNextQuestion,
  hasMinimumInformation,
  shouldContinueInterview
} from '../../../app/server/services/interview/questions'
import { generateCompletion } from '../../../app/server/services/llm'
import type { InterviewSession } from '../../../app/server/services/interview/types'
import { LLMProvider } from '../../../app/server/services/llm/types'

vi.mock('../../../app/server/services/llm')
vi.mock('../../../app/server/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  }))
}))

const createMockSession = (): InterviewSession => ({
  id: 'session-1',
  candidateId: 'candidate-1',
  teamId: 'team-1',
  interviewerId: 'interviewer-1',
  status: 'active',
  currentState: 'ask_role',
  transcript: [],
  candidateProfile: {
    role: '',
    expertise: [],
    preferences: {
      communicationStyle: '',
      workingHours: '',
      autonomyLevel: ''
    },
    personality: {
      traits: [],
      tone: ''
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
})

describe('Interview Questions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate a question based on interview state', async () => {
    const session = createMockSession()

    vi.mocked(generateCompletion).mockResolvedValue({
      content: 'What role will you be taking on our team?',
      tokensUsed: { total: 15, input: 10, output: 5 },
      provider: LLMProvider.ANTHROPIC,
      model: 'mock',
      finishReason: 'stop'
    })

    const result = await generateNextQuestion(session)

    expect(result).toBeDefined()
    expect(result?.content).toContain('role')
    expect(result?.speakerLLM).toBe('anthropic:mock')
    expect(vi.mocked(generateCompletion)).toHaveBeenCalledWith(
      expect.stringContaining('role'),
      expect.objectContaining({
        agentId: 'interviewer-1',
        temperature: 0.7
      })
    )
  })

  it('should return null when LLM indicates interview is complete', async () => {
    const session = createMockSession()

    vi.mocked(generateCompletion).mockResolvedValue({
      content: 'INTERVIEW_COMPLETE',
      tokensUsed: { total: 10, input: 5, output: 5 },
      provider: LLMProvider.ANTHROPIC,
      model: 'mock',
      finishReason: 'stop'
    })

    const question = await generateNextQuestion(session)

    expect(question).toBeNull()
  })

  it('should detect when minimum information is collected', () => {
    const session = createMockSession()

    // No information yet
    expect(hasMinimumInformation(session)).toBe(false)

    // Add role and expertise
    session.candidateProfile.role = 'Frontend Developer'
    session.candidateProfile.expertise = ['Vue.js', 'TypeScript']
    expect(hasMinimumInformation(session)).toBe(false) // Still need preferences

    // Add preferences
    session.candidateProfile.preferences.communicationStyle = 'Written'

    // Add minimum messages
    for (let i = 0; i < 16; i++) {
      session.transcript.push({
        id: `msg-${i}`,
        speaker: i % 2 === 0 ? 'interviewer' : 'requester',
        message: `Message ${i}`,
        timestamp: new Date()
      })
    }

    expect(hasMinimumInformation(session)).toBe(true)
  })

  it('should determine if interview should continue', () => {
    const session = createMockSession()

    // Should continue at start
    expect(shouldContinueInterview(session)).toBe(true)

    // Should stop after timeout
    session.createdAt = new Date(Date.now() - 2000000) // 2000 seconds ago
    expect(shouldContinueInterview(session)).toBe(false)

    // Reset time
    session.createdAt = new Date()

    // Should stop after max questions
    for (let i = 0; i < 30; i++) {
      session.transcript.push({
        id: `msg-${i}`,
        speaker: i % 2 === 0 ? 'interviewer' : 'requester',
        message: `Message ${i}`,
        timestamp: new Date()
      })
    }
    expect(shouldContinueInterview(session)).toBe(false)
  })
})
