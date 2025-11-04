import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setResponseStatus, readBody, getQuery } from 'h3'
import type { H3Event } from 'h3'
import { v4 as uuidv4 } from 'uuid'

import GET from '../../server/api/teams/index.get'
import POST from '../../server/api/teams/index.post'
import { teams } from '../../server/data/teams'
import type { Team } from '../../types'

// Mock the logger to avoid stream.write errors
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

// Mock h3 functions
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn(),
    setResponseStatus: vi.fn(),
    getQuery: vi.fn()
  }
})

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-1234')
}))

const mockEvent = {} as H3Event

const testTeam1: Team = {
  id: "team-1",
  name: "Toolsmiths",
  organizationId: "org-1",
  leaderId: "agent-1",
  tokenAllocation: 100000,
  type: "toolsmith",
};

const testTeam2: Team = {
  id: "team-2",
  name: "HR Team",
  organizationId: "org-1",
  leaderId: null,
  tokenAllocation: 50000,
  type: "hr",
};

const testTeam3: Team = {
  id: "team-3",
  name: "Library Team",
  organizationId: "org-2",
  leaderId: "agent-2",
  tokenAllocation: 75000,
  type: "library",
};

describe('API - /api/teams', () => {
  beforeEach(() => {
    // Clear data before each test
    teams.length = 0
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return empty array when no teams exist', () => {
      vi.mocked(getQuery).mockReturnValue({})
      const result = GET(mockEvent)
      expect(result).toEqual([])
    })

    it('should return all teams when no filters applied', () => {
      teams.push(testTeam1, testTeam2, testTeam3)
      vi.mocked(getQuery).mockReturnValue({})
      const result = GET(mockEvent)
      expect(result.length).toBe(3)
      expect(result).toEqual([testTeam1, testTeam2, testTeam3])
    })

    it('should filter by organizationId correctly', () => {
      teams.push(testTeam1, testTeam2, testTeam3)
      vi.mocked(getQuery).mockReturnValue({ organizationId: 'org-1' })
      const result = GET(mockEvent)
      expect(result.length).toBe(2)
      expect(result).toEqual([testTeam1, testTeam2])
    })

    it('should filter by type correctly', () => {
      teams.push(testTeam1, testTeam2, testTeam3)
      vi.mocked(getQuery).mockReturnValue({ type: 'library' })
      const result = GET(mockEvent)
      expect(result.length).toBe(1)
      expect(result).toEqual([testTeam3])
    })

    it('should combine organizationId and type filters', () => {
      teams.push(testTeam1, testTeam2, testTeam3)
      vi.mocked(getQuery).mockReturnValue({ organizationId: 'org-1', type: 'toolsmith' })
      const result = GET(mockEvent)
      expect(result.length).toBe(1)
      expect(result).toEqual([testTeam1])
    })
  })

  describe('POST', () => {
    it('should create a team with all required fields and return 201', async () => {
      const newTeamPayload = {
        name: 'Test Team',
        organizationId: 'org-1',
        type: 'custom'
      }
      vi.mocked(readBody).mockResolvedValue(newTeamPayload)

      const result = await POST(mockEvent)

      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 201)
      expect(teams.length).toBe(1)
      expect(result).toBeDefined()
    })

    it('should auto-generate a uuid for the id', async () => {
        const newTeamPayload = {
            name: 'Test Team',
            organizationId: 'org-1',
            type: 'custom'
        }
        vi.mocked(readBody).mockResolvedValue(newTeamPayload)
        vi.mocked(uuidv4).mockReturnValue('generated-uuid')

        const result = await POST(mockEvent)

        expect(result.id).toBe('generated-uuid')
        expect(teams[0].id).toBe('generated-uuid')
    })

    it('should apply default leaderId=null and tokenAllocation=0', async () => {
        const newTeamPayload = {
            name: 'Test Team',
            organizationId: 'org-1',
            type: 'custom'
        }
        vi.mocked(readBody).mockResolvedValue(newTeamPayload)

        const result = await POST(mockEvent)

        expect(result.leaderId).toBeNull()
        expect(result.tokenAllocation).toBe(0)
        expect(teams[0].leaderId).toBeNull()
        expect(teams[0].tokenAllocation).toBe(0)
    })

    it('should return the created team with all 6 fields', async () => {
        const newTeamPayload = {
            name: 'Test Team',
            organizationId: 'org-1',
            type: 'custom',
            leaderId: 'agent-leader',
            tokenAllocation: 500
        }
        vi.mocked(readBody).mockResolvedValue(newTeamPayload)
        vi.mocked(uuidv4).mockReturnValue('specific-uuid')

        const result = await POST(mockEvent)

        expect(result).toEqual({
            id: 'specific-uuid',
            name: 'Test Team',
            organizationId: 'org-1',
            type: 'custom',
            leaderId: 'agent-leader',
            tokenAllocation: 500
        })
        expect(Object.keys(result).length).toBe(6)
    })

    it.each([
        ['name'],
        ['organizationId'],
        ['type']
    ])('should return 400 when %s is missing', async (field) => {
        const newTeamPayload: any = {
            name: 'Test Team',
            organizationId: 'org-1',
            type: 'custom'
        }
        delete newTeamPayload[field]
        vi.mocked(readBody).mockResolvedValue(newTeamPayload)

        const result = await POST(mockEvent)

        expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
        expect(result.error).toBeDefined()
        expect(result.error).toContain(`Missing required fields: ${field}`)
        expect(teams.length).toBe(0)
    })

    it('should return 400 for an invalid team type', async () => {
        const newTeamPayload = {
            name: 'Test Team',
            organizationId: 'org-1',
            type: 'invalid-type'
        }
        vi.mocked(readBody).mockResolvedValue(newTeamPayload)

        const result = await POST(mockEvent)

        expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
        expect(result.error).toBeDefined()
        expect(result.error).toContain('Invalid team type')
        expect(teams.length).toBe(0)
    })
  })
})
