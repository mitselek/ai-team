import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { H3Event } from 'h3'
import { readBody } from 'h3'

import setDetailsHandler from '../../app/server/api/interview/[id]/set-details.post'
import { getSession } from '../../app/server/services/interview/session'
import { setAgentDetails } from '../../app/server/services/interview/workflow'
import type { InterviewSession } from '../../app/server/services/interview/types'

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
    readBody: vi.fn(),
    createError: vi.fn((options) => {
      const error: MockH3Error = new Error(options.data.error)
      error.statusCode = options.statusCode
      error.data = options.data
      return error
    })
  }
})

// Mock services
vi.mock('../../app/server/services/interview/session', () => ({
  getSession: vi.fn()
}))
vi.mock('../../app/server/services/interview/workflow', () => ({
  setAgentDetails: vi.fn()
}))

const createTestSession = (
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
      draftPrompt: 'You are a helpful TypeScript developer.',
      suggestedNames: ['Alex', 'Jordan', 'Casey']
    },
    testConversationHistory: [],
    exchangesInCurrentState: 0
  }
}

describe('Interview Agent Details Assignment API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/interview/[id]/set-details', () => {
    it('1. Set details and create agent successfully', async () => {
      const session = createTestSession('session-1', 'assign_details')
      const updatedSession = {
        ...session,
        currentState: 'complete',
        agentDraft: {
          ...session.agentDraft!,
          finalName: 'Alex',
          gender: 'non-binary'
        }
      }
      vi.mocked(getSession).mockReturnValue(session)
      vi.mocked(setAgentDetails).mockResolvedValue({
        session: updatedSession,
        agentId: 'new-agent-id'
      })
      vi.mocked(readBody).mockResolvedValue({ name: 'Alex', gender: 'non-binary' })

      const mockEvent = { context: { params: { id: 'session-1' } } } as unknown as H3Event
      const result = await setDetailsHandler(mockEvent)

      expect(getSession).toHaveBeenCalledWith('session-1')
      expect(readBody).toHaveBeenCalledWith(mockEvent)
      expect(setAgentDetails).toHaveBeenCalledWith('session-1', 'Alex', 'non-binary')
      expect(result).toEqual({ success: true, agentId: 'new-agent-id' })
    })

    it('2. Throw 400 if not in assign_details state', async () => {
      const session = createTestSession('session-1', 'test_conversation')
      vi.mocked(getSession).mockReturnValue(session)
      vi.mocked(readBody).mockResolvedValue({ name: 'Alex', gender: 'non-binary' })

      const mockEvent = { context: { params: { id: 'session-1' } } } as unknown as H3Event

      await expect(setDetailsHandler(mockEvent)).rejects.toThrow(
        "Cannot set details in state 'test_conversation'"
      )
      expect(getSession).toHaveBeenCalledWith('session-1')
      expect(setAgentDetails).not.toHaveBeenCalled()
    })

    it('3. Throw 404 if session not found', async () => {
      vi.mocked(getSession).mockReturnValue(undefined)
      const mockEvent = {
        context: { params: { id: 'non-existent-id' } }
      } as unknown as H3Event

      await expect(setDetailsHandler(mockEvent)).rejects.toThrow(
        'Interview session non-existent-id not found'
      )
      expect(getSession).toHaveBeenCalledWith('non-existent-id')
    })

    it('4. Throw 400 if interviewId is missing', async () => {
      const mockEvent = { context: { params: {} } } as unknown as H3Event
      await expect(setDetailsHandler(mockEvent)).rejects.toThrow('interviewId is required')
    })

    it('5. Throw 400 if name is missing', async () => {
      const session = createTestSession('session-1', 'assign_details')
      vi.mocked(getSession).mockReturnValue(session)
      vi.mocked(readBody).mockResolvedValue({ gender: 'female' })

      const mockEvent = { context: { params: { id: 'session-1' } } } as unknown as H3Event

      await expect(setDetailsHandler(mockEvent)).rejects.toThrow('name is required')
    })

    it('6. Throw 400 if gender is missing', async () => {
      const session = createTestSession('session-1', 'assign_details')
      vi.mocked(getSession).mockReturnValue(session)
      vi.mocked(readBody).mockResolvedValue({ name: 'Alex' })

      const mockEvent = { context: { params: { id: 'session-1' } } } as unknown as H3Event

      await expect(setDetailsHandler(mockEvent)).rejects.toThrow('gender is required')
    })

    it('7. Throw 400 if gender is invalid', async () => {
      const session = createTestSession('session-1', 'assign_details')
      vi.mocked(getSession).mockReturnValue(session)
      vi.mocked(readBody).mockResolvedValue({ name: 'Alex', gender: 'invalid' })

      const mockEvent = { context: { params: { id: 'session-1' } } } as unknown as H3Event

      await expect(setDetailsHandler(mockEvent)).rejects.toThrow(
        'gender must be one of: male, female, non-binary, other'
      )
    })

    it('8. Throw 500 if setAgentDetails fails', async () => {
      const session = createTestSession('session-1', 'assign_details')
      vi.mocked(getSession).mockReturnValue(session)
      vi.mocked(readBody).mockResolvedValue({ name: 'Alex', gender: 'female' })
      vi.mocked(setAgentDetails).mockImplementation(() => {
        throw new Error('Something went wrong')
      })
      const mockEvent = { context: { params: { id: 'session-1' } } } as unknown as H3Event

      await expect(setDetailsHandler(mockEvent)).rejects.toThrow('An internal error occurred')
    })
  })
})
