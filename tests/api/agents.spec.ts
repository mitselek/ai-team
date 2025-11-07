import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setResponseStatus, readBody, getQuery } from 'h3'
import type { H3Event } from 'h3'

import GET from '../../server/api/agents/index.get'
import POST from '../../server/api/agents/index.post'
import { agents } from '../../server/data/agents'
import type { Agent } from '../../types'

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
  }),
  newCorrelationId: () => 'test-correlation-id'
}))

// Mock h3 utilities
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn(),
    setResponseStatus: vi.fn(),
    getQuery: vi.fn()
  }
})

const mockEvent = {} as H3Event

const testAgent1: Agent = {
  id: 'agent-1',
  name: 'Test Agent 1',
  role: 'worker',
  seniorId: null,
  teamId: 'team-1',
  organizationId: 'org-1',
  systemPrompt: 'You are a test agent 1',
  tokenAllocation: 10000,
  tokenUsed: 0,
  status: 'active',
  createdAt: new Date(),
  lastActiveAt: new Date()
}

const testAgent2: Agent = {
  id: 'agent-2',
  name: 'Test Agent 2',
  role: 'worker',
  seniorId: 'agent-1',
  teamId: 'team-1',
  organizationId: 'org-1',
  systemPrompt: 'You are a test agent 2',
  tokenAllocation: 10000,
  tokenUsed: 500,
  status: 'bored',
  createdAt: new Date(),
  lastActiveAt: new Date()
}

const testAgent3: Agent = {
  id: 'agent-3',
  name: 'Test Agent 3',
  role: 'worker',
  seniorId: null,
  teamId: 'team-2',
  organizationId: 'org-2',
  systemPrompt: 'You are a test agent 3',
  tokenAllocation: 10000,
  tokenUsed: 100,
  status: 'active',
  createdAt: new Date(),
  lastActiveAt: new Date()
}

describe('Agent API Endpoints', () => {
  beforeEach(() => {
    // Clear data before each test
    agents.length = 0
    vi.clearAllMocks()
  })

  describe('GET /api/agents', () => {
    it('should return empty array when no agents exist', () => {
      vi.mocked(getQuery).mockReturnValue({})
      const result = GET(mockEvent)
      expect(result).toEqual([])
    })

    it('should return all agents when some exist', () => {
      vi.mocked(getQuery).mockReturnValue({})
      agents.push(testAgent1, testAgent2)
      const result = GET(mockEvent)
      expect(result.length).toBe(2)
      expect(result).toEqual([testAgent1, testAgent2])
    })

    it('should filter agents by organizationId', () => {
      vi.mocked(getQuery).mockReturnValue({ organizationId: 'org-2' })
      agents.push(testAgent1, testAgent2, testAgent3)
      const result = GET(mockEvent)
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('agent-3')
    })

    it('should filter agents by teamId', () => {
      vi.mocked(getQuery).mockReturnValue({ teamId: 'team-2' })
      agents.push(testAgent1, testAgent2, testAgent3)
      const result = GET(mockEvent)
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('agent-3')
    })

    it('should filter agents by status', () => {
      vi.mocked(getQuery).mockReturnValue({ status: 'bored' })
      agents.push(testAgent1, testAgent2, testAgent3)
      const result = GET(mockEvent)
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('agent-2')
    })

    it('should filter by organizationId AND status together', () => {
      vi.mocked(getQuery).mockReturnValue({ organizationId: 'org-1', status: 'active' })
      agents.push(testAgent1, testAgent2, testAgent3)
      const result = GET(mockEvent)
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('agent-1')
    })
  })

interface NewAgentPayload {
  name: string
  role: string
  organizationId: string
  teamId: string
  systemPrompt: string
}

  describe('POST /api/agents', () => {
    it('should create agent with all required fields', async () => {
      const newAgentPayload: NewAgentPayload = {
        name: 'New Valid Agent',
        role: 'manager',
        organizationId: 'org-1',
        teamId: 'team-1',
        systemPrompt: 'A valid prompt.'
      }
      vi.mocked(readBody).mockResolvedValue(newAgentPayload)

      const result = await POST(mockEvent)

      if ('error' in result) {
        throw new Error(`Expected agent, but got error: ${result.error}`)
      }

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.name).toBe(newAgentPayload.name)
      expect(result.role).toBe(newAgentPayload.role)
      expect(agents.length).toBe(1)
    })

  const requiredFields: Array<keyof NewAgentPayload> = ['name', 'role', 'organizationId', 'teamId', 'systemPrompt']
  requiredFields.forEach((field) => {
      it(`should return 400 when ${field} is missing`, async () => {
        const payload: Partial<NewAgentPayload> = {
          name: 'Test Agent',
          role: 'worker',
          organizationId: 'org-1',
          teamId: 'team-1',
          systemPrompt: 'A prompt'
        }
  delete payload[field]
        vi.mocked(readBody).mockResolvedValue(payload)

        const result = await POST(mockEvent)

        if (!('error' in result)) {
          throw new Error('Expected an error object, but got an Agent.')
        }
        expect(result.error).toBeDefined()
        expect(result.error).toContain(`Missing required fields: ${field}`)
        expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
      })
    })

    it('should use defaults for seniorId (null) and tokenAllocation (10000)', async () => {
      const newAgentPayload: NewAgentPayload = {
        name: 'New Agent',
        role: 'worker',
        organizationId: 'org-1',
        teamId: 'team-1',
        systemPrompt: 'A prompt.'
      }
      vi.mocked(readBody).mockResolvedValue(newAgentPayload)

      const result = await POST(mockEvent)

      if ('error' in result) {
        throw new Error(`Expected agent, but got error: ${result.error}`)
      }

      expect(result.seniorId).toBeNull()
      expect(result.tokenAllocation).toBe(10000)
    })

    it('should set auto-generated fields correctly', async () => {
      const newAgentPayload: NewAgentPayload = {
        name: 'New Agent',
        role: 'worker',
        organizationId: 'org-1',
        teamId: 'team-1',
        systemPrompt: 'A prompt.'
      }
      vi.mocked(readBody).mockResolvedValue(newAgentPayload)

      const result = await POST(mockEvent)

      if ('error' in result) {
        throw new Error(`Expected agent, but got error: ${result.error}`)
      }

      expect(result.tokenUsed).toBe(0)
      expect(result.status).toBe('active')
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.lastActiveAt).toBeInstanceOf(Date)
    })
  })
})
