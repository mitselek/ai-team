import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { H3Event } from 'h3'

import approveAgentHandler from '../../app/server/api/interview/[id]/approve-agent.post'
import rejectAgentHandler from '../../app/server/api/interview/[id]/reject-agent.post'
import { getSession } from '../../app/server/services/interview/session'
import { approveAgent, rejectAgent } from '../../app/server/services/interview/workflow'
import type { InterviewSession } from '../../app/server/services/interview/types'

// Mock the logger
vi.mock('~/server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

// Mock H3 functions
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  interface MockH3Error extends Error {
    statusCode?: number
    data?: unknown
  }
  return {
    ...actual,
    getRouterParam: vi.fn((event, param) => event.context?.params?.[param]),
    createError: vi.fn((options) => {
      const error: MockH3Error = new Error(options.data.error)
      error.statusCode = options.statusCode
      error.data = options.data
      return error
    })
  }
})

// Mock services
vi.mock('~/server/services/interview/session', () => ({
  getSession: vi.fn()
}))
vi.mock('~/server/services/interview/workflow', () => ({
  approveAgent: vi.fn(),
  rejectAgent: vi.fn()
}))

const createMockSession = (
  id: string,
  currentState: InterviewSession['currentState']
): InterviewSession => {
  return {
    id,
    candidateId: 'test-candidate',
    teamId: 'test-team',
    interviewerId: 'test-interviewer',
    status: 'active',
    currentState,
    candidateProfile: {
      role: 'Software Engineer',
      expertise: ['TypeScript', 'Nuxt'],
      preferences: {
        communicationStyle: 'Direct',
        workingHours: 'Flexible',
        autonomyLevel: 'High'
      },
      personality: {
        traits: ['analytical', 'detail-oriented'],
        tone: 'professional'
      }
    },
    transcript: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    agentDraft: {
      profile: {
        role: 'Software Engineer',
        expertise: ['TypeScript', 'Nuxt'],
        preferences: {
          communicationStyle: 'Direct',
          workingHours: 'Flexible',
          autonomyLevel: 'High'
        },
        personality: {
          traits: ['analytical', 'detail-oriented'],
          tone: 'professional'
        }
      },
      draftPrompt: 'You are a helpful assistant.',
      suggestedNames: ['Agent Smith']
    },
    testConversationHistory: [],
    exchangesInCurrentState: 0
  }
}

describe('Interview Agent Approval API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/interview/[id]/approve-agent', () => {
    it('should call approveAgent and return success', async () => {
      const session = createMockSession('session-1', 'test_conversation')
      vi.mocked(getSession).mockReturnValue(session)
      const mockEvent = { context: { params: { id: 'session-1' } } } as unknown as H3Event

      const result = await approveAgentHandler(mockEvent)

      expect(getSession).toHaveBeenCalledWith('session-1')
      expect(approveAgent).toHaveBeenCalledWith('session-1')
      expect(result).toEqual({ success: true })
    })

    it('should throw 400 if not in test_conversation state', async () => {
      const session = createMockSession('session-1', 'review_prompt')
      vi.mocked(getSession).mockReturnValue(session)
      const mockEvent = { context: { params: { id: 'session-1' } } } as unknown as H3Event

      await expect(approveAgentHandler(mockEvent)).rejects.toThrow(
        "Cannot approve agent in state 'review_prompt'"
      )
      expect(getSession).toHaveBeenCalledWith('session-1')
      expect(approveAgent).not.toHaveBeenCalled()
    })

    it('should throw 404 if session not found', async () => {
      vi.mocked(getSession).mockReturnValue(undefined)
      const mockEvent = {
        context: { params: { id: 'nonexistent-id' } }
      } as unknown as H3Event

      await expect(approveAgentHandler(mockEvent)).rejects.toThrow(
        'Interview session nonexistent-id not found'
      )
      expect(getSession).toHaveBeenCalledWith('nonexistent-id')
    })

    it('should throw 400 if interviewId is missing', async () => {
      const mockEvent = { context: { params: {} } } as unknown as H3Event
      await expect(approveAgentHandler(mockEvent)).rejects.toThrow('interviewId is required')
    })

    it('should throw 500 if approveAgent fails', async () => {
      const session = createMockSession('session-1', 'test_conversation')
      vi.mocked(getSession).mockReturnValue(session)
      vi.mocked(approveAgent).mockImplementation(() => {
        throw new Error('Something went wrong')
      })
      const mockEvent = { context: { params: { id: 'session-1' } } } as unknown as H3Event

      await expect(approveAgentHandler(mockEvent)).rejects.toThrow('An internal error occurred')
    })
  })

  describe('POST /api/interview/[id]/reject-agent', () => {
    it('should call rejectAgent and return success', async () => {
      const session = createMockSession('session-1', 'test_conversation')
      vi.mocked(getSession).mockReturnValue(session)
      const mockEvent = { context: { params: { id: 'session-1' } } } as unknown as H3Event

      const result = await rejectAgentHandler(mockEvent)

      expect(getSession).toHaveBeenCalledWith('session-1')
      expect(rejectAgent).toHaveBeenCalledWith('session-1')
      expect(result).toEqual({ success: true })
    })

    it('should throw 400 if not in test_conversation state', async () => {
      const session = createMockSession('session-1', 'assign_details')
      vi.mocked(getSession).mockReturnValue(session)
      const mockEvent = { context: { params: { id: 'session-1' } } } as unknown as H3Event

      await expect(rejectAgentHandler(mockEvent)).rejects.toThrow(
        "Cannot reject agent in state 'assign_details'"
      )
      expect(getSession).toHaveBeenCalledWith('session-1')
      expect(rejectAgent).not.toHaveBeenCalled()
    })

    it('should throw 404 if session not found', async () => {
      vi.mocked(getSession).mockReturnValue(undefined)
      const mockEvent = {
        context: { params: { id: 'nonexistent-id' } }
      } as unknown as H3Event

      await expect(rejectAgentHandler(mockEvent)).rejects.toThrow(
        'Interview session nonexistent-id not found'
      )
    })
  })
})
