// tests/api/interview-intent-detection.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { teams } from '../../app/server/data/teams'
import { agents } from '../../app/server/data/agents'
import {
  startInterview,
  processCandidateResponse
} from '../../app/server/services/interview/workflow'
import { interviewSessions } from '../../app/server/services/interview/session'
import { generateCompletion } from '../../app/server/services/llm'
import { LLMProvider } from '../../app/server/services/llm/types'
import type { Team, Agent } from '@@/types'

// Mock the LLM service
vi.mock('../../app/server/services/llm')

// Mock logger
vi.mock('../../app/server/utils/logger', () => ({
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
  })),
  newCorrelationId: vi.fn(() => 'test-correlation-id')
}))

describe('Interview Intent Detection', () => {
  let testTeam: Team
  let testAgent: Agent

  beforeEach(() => {
    // Clear existing data
    teams.length = 0
    agents.length = 0
    interviewSessions.length = 0

    // Create test team
    testTeam = {
      id: 'test-team-1',
      name: 'Test HR Team',
      organizationId: 'test-org-1',
      type: 'hr',
      tokenAllocation: 100000,
      leaderId: null
    }
    teams.push(testTeam)

    // Create test agent (Marcus)
    testAgent = {
      id: 'test-agent-1',
      name: 'Marcus',
      role: 'HR Specialist',
      seniorId: null,
      teamId: testTeam.id,
      organizationId: 'test-org-1',
      systemPrompt: 'Test prompt',
      tokenAllocation: 50000,
      tokenUsed: 0,
      status: 'active',
      createdAt: new Date(),
      lastActiveAt: new Date()
    }
    agents.push(testAgent)

    // Clear mocks
    vi.clearAllMocks()

    // Default mock for LLM responses
    vi.mocked(generateCompletion).mockResolvedValue({
      content: 'What role are you looking to fill?',
      tokensUsed: { total: 20, input: 15, output: 5 },
      provider: LLMProvider.ANTHROPIC,
      model: 'mock-model',
      finishReason: 'stop'
    })
  })

  describe('When recruitment intent is detected', () => {
    it('should acknowledge and proceed with interview', async () => {
      // Start interview
      const session = await startInterview(testTeam.id, testAgent.id)
      expect(session).toBeDefined()
      expect(session.currentState).toBe('ask_role')

      // User expresses clear hiring intent
      const result = await processCandidateResponse(
        session.id,
        'I want to hire a developer for our team'
      )

      // Should proceed with interview
      expect(result.complete).toBe(false)
      expect(result.nextQuestion).toBeTruthy()

      // Check transcript includes acknowledgment
      const updatedSession = interviewSessions.find((s) => s.id === session.id)
      expect(updatedSession).toBeDefined()

      const acknowledgmentMessage = updatedSession!.transcript.find(
        (msg) => msg.speakerLLM === 'system:intent-acknowledged'
      )
      expect(acknowledgmentMessage).toBeDefined()
      expect(acknowledgmentMessage!.message.toLowerCase()).toContain('great')
    })

    it('should handle various hiring phrases', async () => {
      const hiringPhrases = [
        'We need someone who can handle DevOps',
        'Looking to recruit a data scientist',
        'I need an agent for testing',
        'Can you help me hire a frontend developer?'
      ]

      for (const phrase of hiringPhrases) {
        // Clear sessions for each test
        interviewSessions.length = 0

        const session = await startInterview(testTeam.id, testAgent.id)
        const result = await processCandidateResponse(session.id, phrase)

        expect(result.complete).toBe(false)
        expect(result.nextQuestion).toBeTruthy()

        const updatedSession = interviewSessions.find((s) => s.id === session.id)
        const acknowledgment = updatedSession!.transcript.find(
          (msg) => msg.speakerLLM === 'system:intent-acknowledged'
        )
        expect(acknowledgment).toBeDefined()
      }
    })
  })

  describe('When NO recruitment intent is detected', () => {
    it('should provide guidance message', async () => {
      const session = await startInterview(testTeam.id, testAgent.id)

      // User asks a non-hiring question
      const result = await processCandidateResponse(
        session.id,
        'What is the status of our current projects?'
      )

      // Should return guidance instead of continuing interview
      expect(result.complete).toBe(false)
      expect(result.nextQuestion).toBeTruthy()
      expect(result.nextQuestion).toContain('Marcus')
      expect(result.nextQuestion).toContain('recruiting')

      // Check transcript includes guidance
      const updatedSession = interviewSessions.find((s) => s.id === session.id)
      const guidanceMessage = updatedSession!.transcript.find(
        (msg) => msg.speakerLLM === 'system:intent-guidance'
      )
      expect(guidanceMessage).toBeDefined()
      expect(guidanceMessage!.message).toContain('HR Specialist')
    })

    it('should handle general questions appropriately', async () => {
      const generalQuestions = [
        'Tell me about the team structure',
        'How do I check agent performance?',
        'What are the current team goals?'
      ]

      for (const question of generalQuestions) {
        interviewSessions.length = 0

        const session = await startInterview(testTeam.id, testAgent.id)
        const result = await processCandidateResponse(session.id, question)

        expect(result.nextQuestion).toContain('Marcus')

        const updatedSession = interviewSessions.find((s) => s.id === session.id)
        const guidance = updatedSession!.transcript.find(
          (msg) => msg.speakerLLM === 'system:intent-guidance'
        )
        expect(guidance).toBeDefined()
      }
    })
  })

  describe('When message is too vague', () => {
    it('should continue with normal interview flow for short responses', async () => {
      const session = await startInterview(testTeam.id, testAgent.id)

      // User gives vague response
      const result = await processCandidateResponse(session.id, 'Yes')

      // Should continue with next question (not show guidance)
      expect(result.complete).toBe(false)
      expect(result.nextQuestion).toBeTruthy()

      // Should NOT have guidance message
      const updatedSession = interviewSessions.find((s) => s.id === session.id)
      const guidanceMessage = updatedSession!.transcript.find(
        (msg) => msg.speakerLLM === 'system:intent-guidance'
      )
      expect(guidanceMessage).toBeUndefined()
    })
  })

  describe('Intent detection only on first response', () => {
    it('should only check intent on the first user message', async () => {
      const session = await startInterview(testTeam.id, testAgent.id)

      // First response with hiring intent - should get acknowledgment
      await processCandidateResponse(session.id, 'I need to hire someone')

      let updatedSession = interviewSessions.find((s) => s.id === session.id)
      const acknowledgment = updatedSession!.transcript.find(
        (msg) => msg.speakerLLM === 'system:intent-acknowledged'
      )
      expect(acknowledgment).toBeDefined()

      // Second response - should NOT trigger intent detection again
      // Even if it lacks hiring intent
      await processCandidateResponse(session.id, 'What is the weather today?')

      updatedSession = interviewSessions.find((s) => s.id === session.id)
      const guidanceMessages = updatedSession!.transcript.filter(
        (msg) => msg.speakerLLM === 'system:intent-guidance'
      )
      expect(guidanceMessages.length).toBe(0)
    })
  })
})
