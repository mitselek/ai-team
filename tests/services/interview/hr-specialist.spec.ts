// tests/services/interview/hr-specialist.spec.ts
// Test to verify HR specialist consultation tracks speakerLLM

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { consultHRSpecialist } from '../../../app/server/services/interview/hr-specialist'
import { createSession } from '../../../app/server/services/interview/session'
import { generateCompletion } from '../../../app/server/services/llm'
import { LLMProvider } from '../../../app/server/services/llm/types'
import { agents } from '../../../app/server/data/agents'
import { tasks } from '../../../app/server/data/tasks'
import type { Agent } from '../../../types'

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

const mockDirector: Agent = {
  id: 'director-1',
  name: 'Marcus Director',
  role: 'HR Director',
  status: 'active',
  seniorId: null,
  teamId: 'hr-team',
  organizationId: 'org-1',
  systemPrompt: 'You are an HR director',
  tokenAllocation: 500000,
  tokenUsed: 0,
  createdAt: new Date(),
  lastActiveAt: new Date()
}

describe('HR Specialist Consultation - speakerLLM Tracking', () => {
  beforeEach(() => {
    // Clear arrays
    agents.length = 0
    tasks.length = 0

    // Add mock director
    agents.push(JSON.parse(JSON.stringify(mockDirector)))

    vi.clearAllMocks()
  })

  it('should capture speakerLLM from generateCompletion response', async () => {
    const session = createSession('team-1', 'interviewer-1')
    session.candidateProfile = {
      role: 'Frontend Developer',
      expertise: ['React', 'TypeScript'],
      preferences: {
        communicationStyle: 'Direct',
        workingHours: 'Flexible',
        autonomyLevel: 'High'
      },
      personality: {
        traits: ['analytical', 'creative'],
        tone: 'professional'
      }
    }

    // Mock the LLM response with Sonnet 4.5
    vi.mocked(generateCompletion).mockResolvedValue({
      content: JSON.stringify({
        systemPrompt: 'You are a frontend developer...',
        suggestedNames: ['Alex', 'Jordan', 'Morgan'],
        feedback: 'Great candidate profile'
      }),
      provider: LLMProvider.ANTHROPIC,
      model: 'claude-sonnet-4-5-20250929',
      tokensUsed: { total: 150, input: 100, output: 50 },
      finishReason: 'stop'
    })

    const recommendation = await consultHRSpecialist(session)

    expect(recommendation).toBeDefined()
    expect(recommendation.speakerLLM).toBe('anthropic:claude-sonnet-4-5-20250929')
    expect(recommendation.systemPrompt).toContain('frontend developer')
    expect(recommendation.suggestedNames).toEqual(['Alex', 'Jordan', 'Morgan'])
  })

  it('should use director role with final-report task type', async () => {
    const session = createSession('team-1', 'interviewer-1')
    session.candidateProfile = {
      role: 'Backend Developer',
      expertise: ['Node.js', 'PostgreSQL'],
      preferences: {
        communicationStyle: 'Collaborative',
        workingHours: 'Standard',
        autonomyLevel: 'Medium'
      },
      personality: {
        traits: ['detail-oriented'],
        tone: 'friendly'
      }
    }

    vi.mocked(generateCompletion).mockResolvedValue({
      content: JSON.stringify({
        systemPrompt: 'You are a backend developer...',
        suggestedNames: ['Sam', 'Taylor', 'Casey'],
        feedback: 'Strong technical profile'
      }),
      provider: LLMProvider.ANTHROPIC,
      model: 'claude-sonnet-4-5-20250929',
      tokensUsed: { total: 200, input: 120, output: 80 },
      finishReason: 'stop'
    })

    await consultHRSpecialist(session)

    // Verify generateCompletion was called with correct options
    expect(generateCompletion).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        agentId: 'director-1',
        agentRole: 'director',
        taskType: 'final-report',
        temperature: 0.7,
        maxTokens: 2048
      })
    )
  })

  it('should track different models for different providers', async () => {
    const session = createSession('team-1', 'interviewer-1')
    session.candidateProfile = {
      role: 'DevOps Engineer',
      expertise: ['Docker', 'Kubernetes'],
      preferences: {
        communicationStyle: 'Technical',
        workingHours: 'Flexible',
        autonomyLevel: 'High'
      },
      personality: {
        traits: ['problem-solver'],
        tone: 'direct'
      }
    }

    // Mock with Google provider (though config should use Anthropic for final-report)
    vi.mocked(generateCompletion).mockResolvedValue({
      content: JSON.stringify({
        systemPrompt: 'You are a DevOps engineer...',
        suggestedNames: ['Robin', 'Drew', 'Skyler'],
        feedback: 'Excellent DevOps background'
      }),
      provider: LLMProvider.GOOGLE,
      model: 'gemini-2.5-pro',
      tokensUsed: { total: 180, input: 110, output: 70 },
      finishReason: 'stop'
    })

    const recommendation = await consultHRSpecialist(session)

    expect(recommendation.speakerLLM).toBe('google:gemini-2.5-pro')
  })

  it('should not include speakerLLM in fallback scenario (no LLM used)', async () => {
    // Remove director to trigger fallback
    agents.length = 0

    const session = createSession('team-1', 'interviewer-1')
    session.candidateProfile = {
      role: 'Data Scientist',
      expertise: ['Python', 'TensorFlow'],
      preferences: {
        communicationStyle: 'Academic',
        workingHours: 'Flexible',
        autonomyLevel: 'High'
      },
      personality: {
        traits: ['analytical'],
        tone: 'thoughtful'
      }
    }

    // Fallback doesn't use LLM, generates template directly
    const recommendation = await consultHRSpecialist(session)

    // Fallback scenario doesn't use LLM, so no speakerLLM
    expect(recommendation.speakerLLM).toBeUndefined()
    expect(recommendation.systemPrompt).toContain('Data Scientist')
    expect(recommendation.feedback).toContain('automatically')
  })

  it('should format speakerLLM consistently as provider:model', async () => {
    const session = createSession('team-1', 'interviewer-1')
    session.candidateProfile = {
      role: 'QA Engineer',
      expertise: ['Automation', 'Testing'],
      preferences: {
        communicationStyle: 'Detailed',
        workingHours: 'Standard',
        autonomyLevel: 'Medium'
      },
      personality: {
        traits: ['meticulous'],
        tone: 'professional'
      }
    }

    vi.mocked(generateCompletion).mockResolvedValue({
      content: JSON.stringify({
        systemPrompt: 'You are a QA engineer...',
        suggestedNames: ['Dakota', 'River', 'Sage'],
        feedback: 'Thorough and detail-oriented'
      }),
      provider: LLMProvider.ANTHROPIC,
      model: 'claude-sonnet-4-5-20250929',
      tokensUsed: { total: 160, input: 100, output: 60 },
      finishReason: 'stop'
    })

    const recommendation = await consultHRSpecialist(session)

    // Verify format is exactly "provider:model"
    expect(recommendation.speakerLLM).toMatch(/^[a-z]+:[a-z0-9-]+$/)
    expect(recommendation.speakerLLM?.split(':')).toHaveLength(2)
    expect(recommendation.speakerLLM?.split(':')[0]).toBe('anthropic')
  })
})
