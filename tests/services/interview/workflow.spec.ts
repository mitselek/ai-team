// tests/services/interview/workflow.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  startInterview,
  processCandidateResponse,
  handleNameSelection
} from '../../../app/server/services/interview/workflow'
import { agents } from '../../../app/server/data/agents'
import { teams } from '../../../app/server/data/teams'
import { interviewSessions } from '../../../app/server/services/interview/session'
import { generateCompletion } from '../../../app/server/services/llm'
import type { Agent, Team } from '../../../types'
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

const mockTeam: Team = {
  id: 'team-1',
  name: 'Engineering Team',
  organizationId: 'org-1',
  leaderId: null,
  tokenAllocation: 1000000,
  type: 'custom'
}

const mockInterviewer: Agent = {
  id: 'interviewer-1',
  name: 'Sarah HR',
  role: 'HR Manager',
  status: 'active',
  seniorId: null,
  teamId: 'team-1',
  organizationId: 'org-1',
  systemPrompt: 'You are an HR manager',
  tokenAllocation: 200000,
  tokenUsed: 0,
  createdAt: new Date(),
  lastActiveAt: new Date()
}

describe('Interview Workflow', () => {
  beforeEach(() => {
    // Clear arrays
    agents.length = 0
    teams.length = 0
    interviewSessions.length = 0

    // Add mock data
    teams.push(JSON.parse(JSON.stringify(mockTeam)))
    agents.push(JSON.parse(JSON.stringify(mockInterviewer)))

    vi.clearAllMocks()
  })

  it('should start an interview successfully', async () => {
    vi.mocked(generateCompletion).mockResolvedValue({
      content: 'What role will you be taking on our team?',
      tokensUsed: { total: 15, input: 10, output: 5 },
      provider: LLMProvider.ANTHROPIC,
      model: 'mock',
      finishReason: 'stop'
    })

    const session = await startInterview('team-1', 'interviewer-1')

    expect(session).toBeDefined()
    expect(session.teamId).toBe('team-1')
    expect(session.interviewerId).toBe('interviewer-1')
    expect(session.status).toBe('active')
    expect(session.currentState).toBe('ask_role')
    expect(session.transcript.length).toBeGreaterThan(0)
    expect(interviewSessions.length).toBe(1)
  })

  it('should process candidate response and continue interview', async () => {
    vi.mocked(generateCompletion)
      .mockResolvedValueOnce({
        content: 'What role will you be taking on our team?',
        tokensUsed: { total: 15, input: 10, output: 5 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          keyInfo: ['Frontend Developer', 'Vue.js', 'Nuxt'],
          clarityScore: 9,
          needsFollowUp: false,
          followUpReason: ''
        }),
        tokensUsed: { total: 20, input: 15, output: 5 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({
        content: 'Can you tell me about your specific areas of expertise?',
        tokensUsed: { total: 18, input: 12, output: 6 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })

    const session = await startInterview('team-1', 'interviewer-1')
    const result = await processCandidateResponse(
      session.id,
      "I'll be a Frontend Developer focusing on Vue.js and Nuxt."
    )

    expect(result.complete).toBe(false)
    expect(result.nextQuestion).toBeTruthy()
    expect(session.transcript.length).toBeGreaterThan(2)
  })

  it('should handle follow-up when response is unclear', async () => {
    vi.mocked(generateCompletion)
      .mockResolvedValueOnce({
        content: 'What role will you be taking on our team?',
        tokensUsed: { total: 15, input: 10, output: 5 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          keyInfo: ['developer'],
          clarityScore: 4,
          needsFollowUp: true,
          followUpReason: 'Response too vague, need more details'
        }),
        tokensUsed: { total: 20, input: 15, output: 5 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({
        content: 'Could you provide more details about what type of developer?',
        tokensUsed: { total: 18, input: 12, output: 6 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })

    const session = await startInterview('team-1', 'interviewer-1')
    const result = await processCandidateResponse(session.id, 'I am a developer.')

    expect(result.complete).toBe(false)
    expect(result.nextQuestion).toContain('more details')
    expect(session.currentState).toBe('follow_up')
  })

  it('should complete interview and create agent', async () => {
    vi.mocked(generateCompletion)
      .mockResolvedValueOnce({
        content: 'What role will you be taking on our team?',
        tokensUsed: { total: 15, input: 10, output: 5 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({
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
      .mockResolvedValueOnce({
        content: 'INTERVIEW_COMPLETE', // Trigger finalization by returning completion signal
        tokensUsed: { total: 10, input: 5, output: 5 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({
        // HR Specialist recommendation
        content: JSON.stringify({
          systemPrompt:
            'You are Alex, a Frontend Developer. Your expertise: Vue.js, Nuxt, TypeScript.',
          suggestedNames: ['Alex', 'Jordan', 'Morgan'],
          feedback: 'Great candidate!'
        }),
        tokensUsed: { total: 50, input: 30, output: 20 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({
        // Name generation
        content: 'Alex\nJordan\nMorgan',
        tokensUsed: { total: 20, input: 15, output: 5 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })

    const session = await startInterview('team-1', 'interviewer-1')

    // Simulate minimum questions by setting state and profile
    session.currentState = 'ask_expertise'
    session.candidateProfile.role = 'Frontend Developer'
    session.candidateProfile.expertise = ['Vue.js', 'Nuxt', 'TypeScript']
    session.candidateProfile.preferences.communicationStyle = 'Written'
    session.candidateProfile.preferences.autonomyLevel = 'High'

    // Add minimum messages to transcript
    for (let i = 0; i < 8; i++) {
      session.transcript.push({
        id: `msg-${i}`,
        speaker: i % 2 === 0 ? 'interviewer' : 'requester',
        message: `Message ${i}`,
        timestamp: new Date()
      })
    }

    const result = await processCandidateResponse(
      session.id,
      'I have 5 years of experience with Vue.js and TypeScript.'
    )

    expect(result.complete).toBe(true)
    expect(session.status).toBe('completed')
    expect(agents.length).toBe(2) // Interviewer + new agent
    const newAgent = agents.find((a) => a.id !== 'interviewer-1')
    expect(newAgent).toBeDefined()
    expect(newAgent?.role).toBe('Frontend Developer')
  })

  it('should auto-trigger finalization when transitioning to finalize state', async () => {
    vi.mocked(generateCompletion)
      .mockResolvedValueOnce({
        content: 'What role will you be taking on our team?',
        tokensUsed: { total: 15, input: 10, output: 5 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({
        content: JSON.stringify({
          keyInfo: ['Backend Developer', 'Node.js', 'TypeScript'],
          clarityScore: 9,
          needsFollowUp: false,
          followUpReason: ''
        }),
        tokensUsed: { total: 20, input: 15, output: 5 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({
        content: 'INTERVIEW_COMPLETE',
        tokensUsed: { total: 10, input: 5, output: 5 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({
        // HR Specialist recommendation
        content: JSON.stringify({
          systemPrompt: 'You are Sam, a Backend Developer specializing in Node.js.',
          suggestedNames: ['Sam', 'Taylor', 'Morgan'],
          feedback: 'Excellent candidate!'
        }),
        tokensUsed: { total: 50, input: 30, output: 20 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })
      .mockResolvedValueOnce({
        // Name generation
        content: 'Sam\nTaylor\nMorgan',
        tokensUsed: { total: 20, input: 15, output: 5 },
        provider: LLMProvider.ANTHROPIC,
        model: 'mock',
        finishReason: 'stop'
      })

    const session = await startInterview('team-1', 'interviewer-1')

    // Set state to nameSelection (one state before finalize)
    session.currentState = 'nameSelection'
    session.candidateProfile.role = 'Backend Developer'
    session.candidateProfile.expertise = ['Node.js', 'TypeScript']
    session.candidateProfile.preferences.communicationStyle = 'Written'
    session.candidateProfile.preferences.autonomyLevel = 'High'
    session.candidateProfile.preferences.workingHours = 'Flexible'

    // Set up name selection with options and selected name
    session.nameSelection = {
      options: [
        { name: 'Adrian', rationale: 'Conveys reliability' },
        { name: 'Iris', rationale: 'Represents clarity' },
        { name: 'Morgan', rationale: 'Suggests strategic thinking' }
      ],
      selectedName: 'Adrian',
      selectedAt: new Date()
    }

    // Set exchanges to trigger transition to finalize
    session.exchangesInCurrentState = 1 // Max for nameSelection is 1

    // Add minimum messages to transcript
    for (let i = 0; i < 10; i++) {
      session.transcript.push({
        id: `msg-${i}`,
        speaker: i % 2 === 0 ? 'interviewer' : 'requester',
        message: `Message ${i}`,
        timestamp: new Date()
      })
    }

    // Process response that should trigger transition to finalize and auto-finalization
    const result = await processCandidateResponse(session.id, 'Looks great!')

    // Verify that finalization was automatically triggered
    expect(result.complete).toBe(true)
    expect(session.status).toBe('completed')
    expect(agents.length).toBe(2) // Interviewer + new agent
    const newAgent = agents.find((a) => a.id !== 'interviewer-1')
    expect(newAgent).toBeDefined()
    expect(newAgent?.role).toBe('Backend Developer')
  })
})

describe('handleNameSelection', () => {
  const mockOptions = [
    { name: 'Adrian', rationale: 'Conveys reliability and steady presence' },
    { name: 'Iris', rationale: 'Represents clarity and commitment to insight' },
    { name: 'Morgan', rationale: 'Suggests strategic thinking and flexibility' }
  ]

  beforeEach(() => {
    // Clear arrays
    agents.length = 0
    teams.length = 0
    interviewSessions.length = 0

    // Add mock data
    teams.push(JSON.parse(JSON.stringify(mockTeam)))
    agents.push(JSON.parse(JSON.stringify(mockInterviewer)))

    vi.clearAllMocks()
  })

  it('should generate and present 3 name options on first entry', async () => {
    vi.mocked(generateCompletion).mockResolvedValue({
      content: `Name: Adrian - Rationale: Conveys reliability and steady presence
Name: Iris - Rationale: Represents clarity and commitment to insight
Name: Morgan - Rationale: Suggests strategic thinking and flexibility`,
      tokensUsed: { total: 50, input: 30, output: 20 },
      provider: LLMProvider.ANTHROPIC,
      model: 'mock',
      finishReason: 'stop'
    })

    const session = await startInterview('team-1', 'interviewer-1')
    session.currentState = 'nameSelection'
    session.candidateProfile.role = 'Developer'
    session.candidateProfile.expertise = ['TypeScript']
    session.candidateProfile.preferences.communicationStyle = 'Written'
    session.candidateProfile.preferences.autonomyLevel = 'High'
    session.candidateProfile.preferences.workingHours = 'Flexible'
    session.candidateProfile.personality.traits = ['analytical']
    session.candidateProfile.personality.tone = 'professional'

    const result = await handleNameSelection(session)

    expect(result.complete).toBe(false)
    expect(result.nextQuestion).toContain('three name suggestions')
    expect(session.nameSelection?.options).toHaveLength(3)
    expect(session.nameSelection?.selectedName).toBeNull()
  })

  it('should accept numeric selection (1)', async () => {
    const session = await startInterview('team-1', 'interviewer-1')
    session.currentState = 'nameSelection'
    session.nameSelection = {
      options: mockOptions,
      selectedName: null,
      selectedAt: null
    }

    const result = await handleNameSelection(session, '1')

    expect(result.complete).toBe(false)
    expect(session.nameSelection?.selectedName).toBe(mockOptions[0].name)
    expect(session.nameSelection?.selectedAt).toBeInstanceOf(Date)
    expect(result.nextQuestion).toContain('Excellent choice')
  })

  it('should accept numeric selection (2)', async () => {
    const session = await startInterview('team-1', 'interviewer-1')
    session.currentState = 'nameSelection'
    session.nameSelection = {
      options: mockOptions,
      selectedName: null,
      selectedAt: null
    }

    const result = await handleNameSelection(session, '2')

    expect(result.complete).toBe(false)
    expect(session.nameSelection?.selectedName).toBe(mockOptions[1].name)
  })

  it('should accept name directly', async () => {
    const session = await startInterview('team-1', 'interviewer-1')
    session.currentState = 'nameSelection'
    session.nameSelection = {
      options: mockOptions,
      selectedName: null,
      selectedAt: null
    }

    const result = await handleNameSelection(session, 'Iris')

    expect(result.complete).toBe(false)
    expect(session.nameSelection?.selectedName).toBe('Iris')
  })

  it('should reject invalid selection and prompt retry', async () => {
    const session = await startInterview('team-1', 'interviewer-1')
    session.currentState = 'nameSelection'
    session.nameSelection = {
      options: mockOptions,
      selectedName: null,
      selectedAt: null
    }

    const result = await handleNameSelection(session, 'invalid')

    expect(result.complete).toBe(false)
    expect(result.nextQuestion).toContain('Please choose')
    expect(session.nameSelection?.selectedName).toBeNull()
  })

  it('should throw error if called without options or user input', async () => {
    const session = await startInterview('team-1', 'interviewer-1')
    session.currentState = 'nameSelection'
    session.nameSelection = {
      options: mockOptions,
      selectedName: null,
      selectedAt: null
    }

    await expect(handleNameSelection(session)).rejects.toThrow('Invalid state')
  })
})

describe('Finalize with Name Selection', () => {
  beforeEach(() => {
    agents.length = 0
    teams.length = 0
    teams.push(mockTeam)
    agents.push(mockInterviewer)
    interviewSessions.length = 0
    vi.clearAllMocks()
  })

  it('should use selected name when available', async () => {
    vi.mocked(generateCompletion).mockResolvedValueOnce({
      // HR Specialist recommendation
      content: JSON.stringify({
        systemPrompt: 'You are a Backend Developer specializing in Node.js.',
        suggestedNames: ['Adrian', 'Morgan', 'Taylor'],
        feedback: 'Excellent candidate!'
      }),
      tokensUsed: { total: 50, input: 30, output: 20 },
      provider: LLMProvider.ANTHROPIC,
      model: 'mock',
      finishReason: 'stop'
    })

    const session = await startInterview('team-1', 'interviewer-1')

    // Set state to nameSelection (one state before finalize)
    session.currentState = 'nameSelection'
    session.candidateProfile = {
      role: 'Backend Developer',
      expertise: ['Node.js', 'TypeScript'],
      personality: {
        traits: ['analytical', 'detail-oriented'],
        tone: 'professional'
      },
      preferences: {
        communicationStyle: 'direct',
        workingHours: 'flexible',
        autonomyLevel: 'high'
      }
    }

    // Set nameSelection with selected name
    session.nameSelection = {
      options: [
        { name: 'Adrian', rationale: 'Reliable' },
        { name: 'Morgan', rationale: 'Strategic' }
      ],
      selectedName: 'Morgan',
      selectedAt: new Date()
    }

    // Set exchanges to trigger transition to finalize
    session.exchangesInCurrentState = 1

    // Process response that should trigger transition to finalize and use selected name
    const result = await processCandidateResponse(session.id, 'done')

    expect(result.complete).toBe(true)
    expect(agents.find((a) => a.name === 'Morgan')).toBeDefined()
  })
})
