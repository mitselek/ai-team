// tests/services/interview/analyzer.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeResponse, needsFollowUp } from '../../../app/server/services/interview/analyzer'
import { generateCompletion } from '../../../app/server/services/llm'
import { interviewSessions } from '../../../app/server/services/interview/session'
import type { InterviewSession, AnalysisResult } from '../../../app/server/services/interview/types'
import { LLMProvider } from '../../../app/server/services/llm/types'

vi.mock('../../../app/server/services/llm')
vi.mock('../../../app/server/services/persistence/filesystem', () => ({
  saveInterview: vi.fn().mockResolvedValue(undefined),
  saveAgent: vi.fn().mockResolvedValue(undefined)
}))
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

const createMockSession = (): InterviewSession => {
  const session: InterviewSession = {
    id: 'session-1',
    candidateId: 'candidate-1',
    teamId: 'team-1',
    interviewerId: 'interviewer-1',
    status: 'active',
    currentState: 'ask_role',
    transcript: [
      {
        id: 'msg-1',
        speaker: 'interviewer',
        message: 'What role will you be taking?',
        timestamp: new Date()
      }
    ],
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
  }

  // Add session to the sessions array
  interviewSessions.push(session)

  return session
}

describe('Response Analyzer', () => {
  beforeEach(() => {
    // Clear sessions array
    interviewSessions.length = 0
    vi.clearAllMocks()
  })

  it('should analyze a clear response', async () => {
    const session = createMockSession()

    vi.mocked(generateCompletion).mockResolvedValue({
      content: JSON.stringify({
        keyInfo: ['Frontend Developer', 'Vue.js', 'Nuxt', 'TypeScript'],
        clarityScore: 9,
        needsFollowUp: false,
        followUpReason: ''
      }),
      tokensUsed: { total: 20, input: 15, output: 5 },
      provider: LLMProvider.ANTHROPIC,
      model: 'mock',
      finishReason: 'stop'
    })

    const analysis = await analyzeResponse(
      session,
      "I'll be a Frontend Developer focusing on Vue.js, Nuxt, and TypeScript."
    )

    expect(analysis.keyInfo.length).toBeGreaterThan(0)
    expect(analysis.clarityScore).toBeGreaterThan(7)
    expect(analysis.needsFollowUp).toBe(false)
  })

  it('should detect unclear response needing follow-up', async () => {
    const session = createMockSession()

    vi.mocked(generateCompletion).mockResolvedValue({
      content: JSON.stringify({
        keyInfo: ['developer'],
        clarityScore: 4,
        needsFollowUp: true,
        followUpReason: 'Response too vague, need specific role details'
      }),
      tokensUsed: { total: 20, input: 15, output: 5 },
      provider: LLMProvider.ANTHROPIC,
      model: 'mock',
      finishReason: 'stop'
    })

    const analysis = await analyzeResponse(session, 'I am a developer.')

    expect(analysis.clarityScore).toBeLessThan(6)
    expect(analysis.needsFollowUp).toBe(true)
    expect(analysis.followUpReason).toBeTruthy()
  })

  it('should handle malformed JSON response', async () => {
    const session = createMockSession()

    vi.mocked(generateCompletion).mockResolvedValue({
      content: 'Not valid JSON',
      tokensUsed: { total: 10, input: 5, output: 5 },
      provider: LLMProvider.ANTHROPIC,
      model: 'mock',
      finishReason: 'stop'
    })

    const analysis = await analyzeResponse(session, 'Some response')

    // Should return default analysis on error
    expect(analysis).toBeDefined()
    expect(analysis.keyInfo).toEqual([])
    expect(analysis.clarityScore).toBe(5)
  })

  it('should determine if follow-up is needed based on analysis', () => {
    const clearAnalysis: AnalysisResult = {
      keyInfo: ['Frontend Developer', 'Vue.js'],
      clarityScore: 9,
      needsFollowUp: false,
      followUpReason: ''
    }
    expect(needsFollowUp(clearAnalysis)).toBe(false)

    const unclearAnalysis: AnalysisResult = {
      keyInfo: ['developer'],
      clarityScore: 4,
      needsFollowUp: false,
      followUpReason: ''
    }
    expect(needsFollowUp(unclearAnalysis)).toBe(true)

    const explicitFollowUp: AnalysisResult = {
      keyInfo: ['developer'],
      clarityScore: 7,
      needsFollowUp: true,
      followUpReason: 'Need more details'
    }
    expect(needsFollowUp(explicitFollowUp)).toBe(true)
  })
})
