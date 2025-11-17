import { describe, it, expect, beforeEach, vi } from 'vitest'
import { H3Event, readBody, setResponseStatus } from 'h3'

// Mock logger
vi.mock('../../app/server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }))
  }),
  newCorrelationId: () => 'test-correlation-id'
}))

// Mock H3
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn(),
    setResponseStatus: vi.fn()
  }
})

// Mock persistence functions
vi.mock('../../app/server/services/persistence/filesystem', () => ({
  loadOrganization: vi.fn(),
  loadTeams: vi.fn(),
  loadChatSession: vi.fn(),
  saveChatSession: vi.fn(),
  loadChatSessions: vi.fn()
}))

// Mock LLM service
vi.mock('../../app/server/services/llm', () => ({
  generateCompletion: vi.fn()
}))

// Mock orchestrator
vi.mock('../../app/server/services/orchestrator', () => ({
  getAvailableTools: vi.fn(),
  validateToolAccess: vi.fn()
}))

import postHandler from '~/server/api/agents/[id]/chat.post'
import getSessionsHandler from '~/server/api/agents/[id]/chats.get'
import getSessionHandler from '~/server/api/agents/[id]/chats/[sessionId].get'
import * as persistence from '../../app/server/services/persistence/filesystem'
import * as llmService from '../../app/server/services/llm'
import { LLMProvider } from '../../app/server/services/llm/types'
import { agents } from '../../app/server/data/agents'
import type { Agent, Organization } from '@@/types'
import type { ChatSession } from '../../app/server/services/persistence/chat-types'

const mockOrganizationId = '537ba67e-0e50-47f7-931d-360b547efe90'
const mockAgentId = 'agent-abc-123'
const mockSessionId = 'session-def-456'

const mockOrganization: Organization = {
  id: mockOrganizationId,
  name: 'Test Org',
  githubRepoUrl: 'https://github.com/test/repo',
  tokenPool: 100000,
  rootAgentId: null,
  toolWhitelist: [],
  createdAt: new Date()
}

const mockAgent: Agent = {
  id: mockAgentId,
  name: 'Test Agent',
  role: 'worker',
  organizationId: mockOrganizationId,
  teamId: 'team-1',
  seniorId: null,
  systemPrompt: 'You are a helpful assistant.',
  tokenAllocation: 10000,
  tokenUsed: 0,
  status: 'active',
  createdAt: new Date(),
  lastActiveAt: new Date()
}

const mockSession: ChatSession = {
  id: mockSessionId,
  agentId: mockAgentId,
  organizationId: mockOrganizationId,
  messages: [{ id: 'msg-1', role: 'user', content: 'Hello', timestamp: new Date() }],
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockEvent = {
  context: {
    params: {}
  }
} as H3Event

describe('Agent Chat API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    agents.length = 0
    agents.push(mockAgent)

    // Setup default mocks for new chat API architecture
    vi.mocked(persistence.loadOrganization).mockResolvedValue(mockOrganization)
    vi.mocked(persistence.loadTeams).mockResolvedValue([])
    vi.mocked(persistence.loadChatSession).mockResolvedValue(null)
    vi.mocked(persistence.saveChatSession).mockResolvedValue(undefined)
  })

  describe('POST /api/agents/[id]/chat', () => {
    it('creates a new session and returns sessionId', async () => {
      mockEvent.context.params = { id: mockAgentId }
      vi.mocked(readBody).mockResolvedValue({ message: 'Hello' })
      vi.mocked(llmService.generateCompletion).mockResolvedValue({
        content: 'Hi there!',
        tokensUsed: { input: 5, output: 15, total: 20 },
        provider: LLMProvider.OPENAI,
        model: 'test-model',
        finishReason: 'stop'
      })
      vi.mocked(persistence.saveChatSession).mockResolvedValue()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await postHandler(mockEvent)

      // If there's an error, the test should fail early with a clear message
      if ('error' in result) {
        throw new Error(`Chat API returned error: ${result.error}`)
      }

      expect(persistence.saveChatSession).toHaveBeenCalled()
      const savedSession = vi.mocked(persistence.saveChatSession).mock.calls[0][0]
      expect(savedSession.messages).toHaveLength(2)
      expect(savedSession.messages[0].role).toBe('user')
      expect(savedSession.messages[1].role).toBe('agent')
      expect(savedSession.messages[1].tokensUsed).toBe(20)
      expect(result.sessionId).toBeTypeOf('string')
    })

    it('appends to an existing session if sessionId is provided', async () => {
      mockEvent.context.params = { id: mockAgentId }
      vi.mocked(readBody).mockResolvedValue({ message: 'Follow up', sessionId: mockSessionId })
      vi.mocked(persistence.loadChatSession).mockResolvedValue(mockSession)
      vi.mocked(llmService.generateCompletion).mockResolvedValue({
        content: 'Another response',
        tokensUsed: { input: 10, output: 15, total: 25 },
        provider: LLMProvider.OPENAI,
        model: 'test-model',
        finishReason: 'stop'
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await postHandler(mockEvent)

      // If there's an error, the test should fail early with a clear message
      if ('error' in result) {
        throw new Error(`Chat API returned error: ${result.error}`)
      }

      expect(persistence.loadChatSession).toHaveBeenCalledWith(
        mockAgentId,
        mockSessionId,
        mockOrganizationId
      )
      expect(persistence.saveChatSession).toHaveBeenCalled()
      const savedSession = vi.mocked(persistence.saveChatSession).mock.calls[0][0]
      expect(savedSession.messages).toHaveLength(3) // 1 original + 1 user + 1 agent
      expect(savedSession.id).toBe(mockSessionId)
      expect(result.sessionId).toBe(mockSessionId)
    })

    it('creates a new session with the provided sessionId if not found', async () => {
      mockEvent.context.params = { id: mockAgentId }
      vi.mocked(readBody).mockResolvedValue({ message: 'Hello', sessionId: 'not-found-id' })
      vi.mocked(persistence.loadChatSession).mockResolvedValue(null)
      vi.mocked(llmService.generateCompletion).mockResolvedValue({
        content: 'Hi',
        tokensUsed: { input: 2, output: 3, total: 5 },
        provider: LLMProvider.OPENAI,
        model: 'test-model',
        finishReason: 'stop'
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await postHandler(mockEvent)

      // If there's an error, the test should fail early with a clear message
      if ('error' in result) {
        throw new Error(`Chat API returned error: ${result.error}`)
      }

      expect(persistence.loadChatSession).toHaveBeenCalledWith(
        mockAgentId,
        'not-found-id',
        mockOrganizationId
      )
      expect(result.sessionId).toBe('not-found-id') // Keeps the provided sessionId
      expect(result.sessionId).toBeTypeOf('string')
      const savedSession = vi.mocked(persistence.saveChatSession).mock.calls[0][0]
      expect(savedSession.messages).toHaveLength(2)
      expect(savedSession.id).toBe('not-found-id')
    })
  })

  describe('GET /api/agents/[id]/chats', () => {
    it('returns an array of chat sessions for an agent', async () => {
      const sessions = [mockSession, { ...mockSession, id: 'session-2' }]
      mockEvent.context.params = { id: mockAgentId }
      vi.mocked(persistence.loadChatSessions).mockResolvedValue(sessions)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await getSessionsHandler(mockEvent)

      expect(persistence.loadChatSessions).toHaveBeenCalledWith(mockAgentId, mockOrganizationId)
      expect(result.sessions).toEqual(sessions)
    })

    it('returns 404 if agent does not exist', async () => {
      mockEvent.context.params = { id: 'non-existent-agent' }

      const result = await getSessionsHandler(mockEvent)

      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 404)
      expect(result.error).toBe('Agent not found')
    })

    it('returns an empty array if agent has no sessions', async () => {
      mockEvent.context.params = { id: mockAgentId }
      vi.mocked(persistence.loadChatSessions).mockResolvedValue([])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await getSessionsHandler(mockEvent)
      expect(result.sessions).toEqual([])
    })
  })

  describe('GET /api/agents/[id]/chats/[sessionId]', () => {
    it('returns a specific chat session', async () => {
      mockEvent.context.params = { id: mockAgentId, sessionId: mockSessionId }
      vi.mocked(persistence.loadChatSession).mockResolvedValue(mockSession)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await getSessionHandler(mockEvent)

      expect(persistence.loadChatSession).toHaveBeenCalledWith(
        mockAgentId,
        mockSessionId,
        mockOrganizationId
      )
      expect(result.session).toEqual(mockSession)
    })

    it('returns 404 if agent does not exist', async () => {
      mockEvent.context.params = { id: 'non-existent-agent', sessionId: mockSessionId }

      const result = await getSessionHandler(mockEvent)

      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 404)
      expect(result.error).toBe('Agent not found')
    })

    it('returns 404 if session does not exist', async () => {
      mockEvent.context.params = { id: mockAgentId, sessionId: 'non-existent-session' }
      vi.mocked(persistence.loadChatSession).mockResolvedValue(null)

      const result = await getSessionHandler(mockEvent)

      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 404)
      expect(result.error).toBe('Session not found')
    })
  })
})
