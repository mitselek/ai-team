// tests/services/interview/team-analysis.spec.ts
// Tests for team analysis helper (Issue #33)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Team } from '@@/types'

// Mock the filesystem module before importing the function
vi.mock('../../../app/server/services/persistence/filesystem', () => ({
  loadTeams: vi.fn()
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

describe('getAvailableTeams', () => {
  let getAvailableTeams: (organizationId: string) => Promise<
    Array<{
      id: string
      name: string
      type: string
      description: string
    }>
  >
  let loadTeams: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    // Get the mocked loadTeams
    const filesystem = await import('../../../app/server/services/persistence/filesystem')
    loadTeams = vi.mocked(filesystem.loadTeams)
    loadTeams.mockClear()

    // Import the function (will be exported in implementation)
    const hrSpecialist = (await import('../../../app/server/services/interview/hr-specialist')) as {
      getAvailableTeams?: (organizationId: string) => Promise<
        Array<{
          id: string
          name: string
          type: string
          description: string
        }>
      >
    }
    getAvailableTeams = hrSpecialist.getAvailableTeams!
  })

  it('should return empty array when organization has no teams', async () => {
    loadTeams.mockResolvedValue([])

    const result = await getAvailableTeams('org-123')

    expect(result).toEqual([])
    expect(loadTeams).toHaveBeenCalledWith('org-123')
  })

  it('should return array of team objects with id, name, type, description', async () => {
    const mockTeam: Team = {
      id: 'team-1',
      name: 'Library Team',
      type: 'library',
      description: 'MCP server development',
      organizationId: 'org-123',
      leaderId: 'agent-1',
      tokenAllocation: 50000
    }
    loadTeams.mockResolvedValue([mockTeam])

    const result = await getAvailableTeams('org-123')

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 'team-1',
      name: 'Library Team',
      type: 'library',
      description: 'MCP server development'
    })
  })

  it('should handle teams with missing description (use No description)', async () => {
    const mockTeam: Team = {
      id: 'team-2',
      name: 'Development Team',
      type: 'custom',
      description: undefined, // Missing description
      organizationId: 'org-123',
      leaderId: 'agent-2',
      tokenAllocation: 40000
    }
    loadTeams.mockResolvedValue([mockTeam])

    const result = await getAvailableTeams('org-123')

    expect(result).toHaveLength(1)
    expect(result[0].description).toBe('No description')
  })

  it('should work with multiple teams', async () => {
    const mockTeams: Team[] = [
      {
        id: 'team-1',
        name: 'Library Team',
        type: 'library',
        description: 'MCP servers',
        organizationId: 'org-123',
        leaderId: 'agent-1',
        tokenAllocation: 50000
      },
      {
        id: 'team-2',
        name: 'HR Team',
        type: 'hr',
        description: 'Recruitment',
        organizationId: 'org-123',
        leaderId: 'agent-2',
        tokenAllocation: 30000
      },
      {
        id: 'team-3',
        name: 'Development Team',
        type: 'custom',
        description: 'Backend services',
        organizationId: 'org-123',
        leaderId: null,
        tokenAllocation: 60000
      }
    ]
    loadTeams.mockResolvedValue(mockTeams)

    const result = await getAvailableTeams('org-123')

    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('team-1')
    expect(result[1].id).toBe('team-2')
    expect(result[2].id).toBe('team-3')
  })

  it('should handle teams with all fields present', async () => {
    const mockTeam: Team = {
      id: 'team-complete',
      name: 'Complete Team',
      type: 'toolsmith',
      description: 'Full description provided',
      organizationId: 'org-456',
      leaderId: 'agent-leader',
      tokenAllocation: 75000
    }
    loadTeams.mockResolvedValue([mockTeam])

    const result = await getAvailableTeams('org-456')

    expect(result[0]).toEqual({
      id: 'team-complete',
      name: 'Complete Team',
      type: 'toolsmith',
      description: 'Full description provided'
    })
  })

  it('should call loadTeams with correct organizationId', async () => {
    loadTeams.mockResolvedValue([])

    await getAvailableTeams('org-test-123')

    expect(loadTeams).toHaveBeenCalledTimes(1)
    expect(loadTeams).toHaveBeenCalledWith('org-test-123')
  })

  it('should return format suitable for HR prompt', async () => {
    const mockTeams: Team[] = [
      {
        id: 'team-lib',
        name: 'Library',
        type: 'library',
        description: 'MCP development',
        organizationId: 'org-1',
        leaderId: 'agent-1',
        tokenAllocation: 50000
      }
    ]
    loadTeams.mockResolvedValue(mockTeams)

    const result = await getAvailableTeams('org-1')

    // Verify the format is clean and contains only necessary fields
    expect(result[0]).toHaveProperty('id')
    expect(result[0]).toHaveProperty('name')
    expect(result[0]).toHaveProperty('type')
    expect(result[0]).toHaveProperty('description')
    // Should NOT include organizationId, leaderId, tokenAllocation
    expect(result[0]).not.toHaveProperty('organizationId')
    expect(result[0]).not.toHaveProperty('leaderId')
    expect(result[0]).not.toHaveProperty('tokenAllocation')
  })

  it('should handle empty description string as missing description', async () => {
    const mockTeam: Team = {
      id: 'team-empty',
      name: 'Empty Desc Team',
      type: 'custom',
      description: '', // Empty string
      organizationId: 'org-123',
      leaderId: 'agent-1',
      tokenAllocation: 20000
    }
    loadTeams.mockResolvedValue([mockTeam])

    const result = await getAvailableTeams('org-123')

    expect(result[0].description).toBe('No description')
  })
})
