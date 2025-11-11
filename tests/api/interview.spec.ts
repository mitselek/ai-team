import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { H3Event } from 'h3'
import { setResponseStatus, readBody, getQuery } from 'h3'

// Import handlers
import startHandler from '../../app/server/api/interview/start.post'
import respondHandler from '../../app/server/api/interview/[id]/respond.post'
import getHandler from '../../app/server/api/interview/[id].get'
import cancelHandler from '../../app/server/api/interview/[id]/cancel.post'
import listHandler from '../../app/server/api/interviews.get'

// Mock the logger
vi.mock('../../app/server/utils/logger', () => ({
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

// Mock H3 functions
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn(),
    setResponseStatus: vi.fn(),
    getQuery: vi.fn(),
    getRouterParam: vi.fn((event, param) => event.context?.params?.[param])
  }
})

// Mock service layer
vi.mock('../../app/server/services/interview/workflow', () => ({
  startInterview: vi.fn(),
  processCandidateResponse: vi.fn(),
  cancelInterview: vi.fn()
}))

vi.mock('../../app/server/services/interview/session', () => ({
  getSession: vi.fn(),
  getSessionsByTeam: vi.fn()
}))

import {
  startInterview,
  processCandidateResponse,
  cancelInterview
} from '../../app/server/services/interview/workflow'
import { getSession, getSessionsByTeam } from '../../app/server/services/interview/session'
import { agents } from '../../app/server/data/agents'
import { teams } from '../../app/server/data/teams'
import type { Agent, Team } from '@@/types'
import type { InterviewSession } from '../../app/server/services/interview/types'

const mockEvent = {
  context: { params: {} }
} as unknown as H3Event

describe('HR Interview API Endpoints', () => {
  const testAgent: Agent = {
    id: 'test-interviewer-id',
    name: 'Test Interviewer',
    role: 'interviewer',
    seniorId: null,
    teamId: 'test-team-id',
    organizationId: 'org-1',
    systemPrompt: 'You are an interviewer.',
    tokenAllocation: 10000,
    tokenUsed: 0,
    status: 'active',
    createdAt: new Date(),
    lastActiveAt: new Date()
  }

  const testTeam: Team = {
    id: 'test-team-id',
    name: 'Test Team',
    organizationId: 'org-1',
    leaderId: null,
    tokenAllocation: 20000,
    type: 'hr'
  }

  const mockSession: InterviewSession = {
    id: 'session-123',
    candidateId: 'candidate-456',
    teamId: 'test-team-id',
    interviewerId: 'test-interviewer-id',
    status: 'active' as const,
    currentState: 'ask_role' as const,
    transcript: [
      {
        id: 'msg-1',
        speaker: 'interviewer' as const,
        message: 'Hello! Welcome to the interview.',
        timestamp: new Date(),
        metadata: { questionType: 'greeting' }
      }
    ],
    candidateProfile: {
      role: 'Software Engineer',
      expertise: [],
      preferences: {
        communicationStyle: 'collaborative',
        workingHours: 'flexible',
        autonomyLevel: 'medium'
      },
      personality: {
        traits: ['analytical'],
        tone: 'professional'
      }
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    agents.length = 0
    teams.length = 0
    agents.push(testAgent)
    teams.push(testTeam)
  })

  describe('POST /api/interview/start', () => {
    it('should create a new interview session', async () => {
      vi.mocked(readBody).mockResolvedValue({
        teamId: 'test-team-id',
        interviewerId: 'test-interviewer-id'
      })
      vi.mocked(startInterview).mockResolvedValue(mockSession)

      const result = await startHandler(mockEvent)

      expect(startInterview).toHaveBeenCalledWith('test-team-id', 'test-interviewer-id')
      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 201)
      expect(result).toHaveProperty('sessionId')
      expect(result).toHaveProperty('greeting')
      expect(result).toHaveProperty('firstQuestion')
    })

    it('should return 400 if teamId is missing', async () => {
      vi.mocked(readBody).mockResolvedValue({ interviewerId: 'test-interviewer-id' })
      const result = await startHandler(mockEvent)
      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
      if ('error' in result) {
        expect(result.error).toBeDefined()
      }
    })

    it('should return 400 if interviewerId is missing', async () => {
      vi.mocked(readBody).mockResolvedValue({ teamId: 'test-team-id' })
      const result = await startHandler(mockEvent)
      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
      if ('error' in result) {
        expect(result.error).toBeDefined()
      }
    })

    it('should return 500 on service layer error', async () => {
      vi.mocked(readBody).mockResolvedValue({
        teamId: 'test-team-id',
        interviewerId: 'test-interviewer-id'
      })
      vi.mocked(startInterview).mockRejectedValue(new Error('Service error'))
      const result = await startHandler(mockEvent)
      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 500)
      if ('error' in result) {
        expect(result.error).toBe('Failed to start interview')
      }
    })
  })

  describe('POST /api/interview/[id]/respond', () => {
    beforeEach(() => {
      mockEvent.context = { params: { id: 'session-123' } }
      vi.mocked(getSession).mockReturnValue(mockSession)
    })

    it('should process a response and return the next question', async () => {
      vi.mocked(readBody).mockResolvedValue({ response: 'My name is Bob' })
      const respondResponse = {
        nextQuestion: 'What is your quest?',
        complete: false
      }
      vi.mocked(processCandidateResponse).mockResolvedValue(respondResponse)

      const result = await respondHandler(mockEvent)

      expect(processCandidateResponse).toHaveBeenCalledWith('session-123', 'My name is Bob')
      expect(result).toEqual(respondResponse)
    })

    it('should return 400 if response is missing', async () => {
      vi.mocked(readBody).mockResolvedValue({})
      const result = await respondHandler(mockEvent)
      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
      if ('error' in result) {
        expect(result.error).toBeDefined()
      }
    })

    it('should return 404 if session not found', async () => {
      vi.mocked(getSession).mockReturnValue(undefined)
      vi.mocked(readBody).mockResolvedValue({ response: 'A response' })
      const result = await respondHandler(mockEvent)
      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 404)
      if ('error' in result) {
        expect(result.error).toBe('Session not found')
      }
    })
  })

  describe('GET /api/interview/[id]', () => {
    beforeEach(() => {
      mockEvent.context = { params: { id: 'session-123' } }
    })

    it('should return a session by id', async () => {
      vi.mocked(getSession).mockReturnValue(mockSession)
      const result = await getHandler(mockEvent)
      expect(getSession).toHaveBeenCalledWith('session-123')
      expect(result).toEqual(mockSession)
    })

    it('should return 404 if session not found', async () => {
      vi.mocked(getSession).mockReturnValue(undefined)
      const result = await getHandler(mockEvent)
      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 404)
      if ('error' in result) {
        expect(result.error).toBe('Session not found')
      }
    })
  })

  describe('POST /api/interview/[id]/cancel', () => {
    beforeEach(() => {
      mockEvent.context = { params: { id: 'session-123' } }
    })

    it('should cancel an interview', async () => {
      vi.mocked(readBody).mockResolvedValue({ reason: 'Test cancellation' })
      vi.mocked(cancelInterview).mockReturnValue(undefined) // Returns void
      vi.mocked(getSession).mockReturnValue(mockSession)

      const result = await cancelHandler(mockEvent)

      expect(cancelInterview).toHaveBeenCalledWith('session-123', 'Test cancellation')
      expect(result).toHaveProperty('success', true)
    })
  })

  describe('GET /api/interviews', () => {
    it('should return a list of interviews for a team', async () => {
      vi.mocked(getQuery).mockReturnValue({ teamId: 'test-team-id' })
      vi.mocked(getSessionsByTeam).mockReturnValue([mockSession])
      const result = await listHandler(mockEvent)
      expect(getSessionsByTeam).toHaveBeenCalledWith('test-team-id')
      expect(result).toEqual([mockSession])
    })

    it('should return 400 if teamId is missing', async () => {
      vi.mocked(getQuery).mockReturnValue({})
      const result = await listHandler(mockEvent)
      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
      if ('error' in result) {
        expect(result.error).toBe('Missing teamId query parameter')
      }
    })
  })
})
