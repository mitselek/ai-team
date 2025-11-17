import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Agent, Team } from '@@/types'
import { agents } from '../../../app/server/data/agents'
import { teams } from '../../../app/server/data/teams'
import { WorkspacePermissionService } from '../../../app/server/services/orchestrator/workspace-permission'
import { promises as fs } from 'fs'

// Mock the logger to avoid stream.write errors
vi.mock('../../../app/server/utils/logger', () => ({
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

// Mock filesystem for folderExists checks
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    mkdir: vi.fn()
  }
}))

describe('WorkspacePermissionService', () => {
  let service: WorkspacePermissionService

  // Test data
  const testAgent1: Agent = {
    id: 'agent-1',
    name: 'Agent One',
    role: 'worker',
    seniorId: null,
    teamId: 'team-1',
    organizationId: 'org-1',
    systemPrompt: 'Test prompt',
    tokenAllocation: 10000,
    tokenUsed: 0,
    status: 'active' as const,
    createdAt: new Date(),
    lastActiveAt: new Date()
  }

  const testAgent2: Agent = {
    id: 'agent-2',
    name: 'Agent Two',
    role: 'worker',
    seniorId: null,
    teamId: 'team-1', // Same team as agent-1
    organizationId: 'org-1',
    systemPrompt: 'Test prompt',
    tokenAllocation: 10000,
    tokenUsed: 0,
    status: 'active' as const,
    createdAt: new Date(),
    lastActiveAt: new Date()
  }

  const testAgent3: Agent = {
    id: 'agent-3',
    name: 'Agent Three',
    role: 'worker',
    seniorId: null,
    teamId: 'team-2', // Different team
    organizationId: 'org-1',
    systemPrompt: 'Test prompt',
    tokenAllocation: 10000,
    tokenUsed: 0,
    status: 'active' as const,
    createdAt: new Date(),
    lastActiveAt: new Date()
  }

  const leadershipAgent: Agent = {
    id: 'agent-leader',
    name: 'Leadership Agent',
    role: 'leader',
    seniorId: null,
    teamId: 'team-leadership', // Leadership team
    organizationId: 'org-1',
    systemPrompt: 'Test prompt',
    tokenAllocation: 10000,
    tokenUsed: 0,
    status: 'active' as const,
    createdAt: new Date(),
    lastActiveAt: new Date()
  }

  const testTeam1: Team = {
    id: 'team-1',
    name: 'Development Team',
    description: 'Development team',
    organizationId: 'org-1',
    leaderId: 'agent-1',
    tokenAllocation: 50000,
    type: 'custom' as const
  }

  const testTeam2: Team = {
    id: 'team-2',
    name: 'Support Team',
    description: 'Support team',
    organizationId: 'org-1',
    leaderId: 'agent-3',
    tokenAllocation: 50000,
    type: 'custom' as const
  }

  const leadershipTeam: Team = {
    id: 'team-leadership',
    name: 'Leadership Team',
    description: 'Leadership team',
    organizationId: 'org-1',
    leaderId: 'agent-leader',
    tokenAllocation: 100000,
    type: 'custom' as const
  }

  beforeEach(() => {
    // Clear data before each test
    agents.length = 0
    teams.length = 0

    // Push test data
    agents.push(testAgent1, testAgent2, testAgent3, leadershipAgent)
    teams.push(testTeam1, testTeam2, leadershipTeam)

    // Create service instance
    service = new WorkspacePermissionService()

    // Reset mocks
    vi.clearAllMocks()
  })

  describe('validateAccess', () => {
    describe('Own folder - private scope', () => {
      it('should allow owner to read own private folder', async () => {
        const result = await service.validateAccess(
          'agent-1',
          'agent-1',
          'private',
          'read',
          'org-1'
        )
        expect(result.allowed).toBe(true)
      })

      it('should allow owner to write to own private folder', async () => {
        const result = await service.validateAccess(
          'agent-1',
          'agent-1',
          'private',
          'write',
          'org-1'
        )
        expect(result.allowed).toBe(true)
      })

      it('should deny other agent read access to private folder', async () => {
        const result = await service.validateAccess(
          'agent-2',
          'agent-1',
          'private',
          'read',
          'org-1'
        )
        expect(result.allowed).toBe(false)
        expect(result.reason).toBeDefined()
      })

      it('should deny other agent write access to private folder', async () => {
        const result = await service.validateAccess(
          'agent-2',
          'agent-1',
          'private',
          'write',
          'org-1'
        )
        expect(result.allowed).toBe(false)
        expect(result.reason).toBeDefined()
      })
    })

    describe('Own folder - shared scope', () => {
      it('should allow owner to read own shared folder', async () => {
        const result = await service.validateAccess('agent-1', 'agent-1', 'shared', 'read', 'org-1')
        expect(result.allowed).toBe(true)
      })

      it('should allow owner to write to own shared folder', async () => {
        const result = await service.validateAccess(
          'agent-1',
          'agent-1',
          'shared',
          'write',
          'org-1'
        )
        expect(result.allowed).toBe(true)
      })

      it('should allow team member to read shared folder', async () => {
        const result = await service.validateAccess('agent-2', 'agent-1', 'shared', 'read', 'org-1')
        expect(result.allowed).toBe(true)
      })

      it('should deny team member write access to shared folder', async () => {
        const result = await service.validateAccess(
          'agent-2',
          'agent-1',
          'shared',
          'write',
          'org-1'
        )
        expect(result.allowed).toBe(false)
        expect(result.reason).toBeDefined()
      })

      it('should allow leadership to read shared folder', async () => {
        const result = await service.validateAccess(
          'agent-leader',
          'agent-1',
          'shared',
          'read',
          'org-1'
        )
        expect(result.allowed).toBe(true)
      })

      it('should deny non-team member access to shared folder', async () => {
        const result = await service.validateAccess('agent-3', 'agent-1', 'shared', 'read', 'org-1')
        expect(result.allowed).toBe(false)
        expect(result.reason).toBeDefined()
      })
    })

    describe('Team folder - private scope', () => {
      it('should allow team member to read team private folder', async () => {
        const result = await service.validateAccess('agent-1', 'team-1', 'private', 'read', 'org-1')
        expect(result.allowed).toBe(true)
      })

      it('should allow team member to write to team private folder', async () => {
        const result = await service.validateAccess(
          'agent-1',
          'team-1',
          'private',
          'write',
          'org-1'
        )
        expect(result.allowed).toBe(true)
      })

      it('should deny non-team member access to team private folder', async () => {
        const result = await service.validateAccess('agent-3', 'team-1', 'private', 'read', 'org-1')
        expect(result.allowed).toBe(false)
        expect(result.reason).toBeDefined()
      })
    })

    describe('Team folder - shared scope', () => {
      it('should allow team member to read team shared folder', async () => {
        const result = await service.validateAccess('agent-1', 'team-1', 'shared', 'read', 'org-1')
        expect(result.allowed).toBe(true)
      })

      it('should allow team member to write to team shared folder', async () => {
        const result = await service.validateAccess('agent-1', 'team-1', 'shared', 'write', 'org-1')
        expect(result.allowed).toBe(true)
      })

      it('should allow any org member to read team shared folder', async () => {
        const result = await service.validateAccess('agent-3', 'team-1', 'shared', 'read', 'org-1')
        expect(result.allowed).toBe(true)
      })

      it('should deny non-team member write access to team shared folder', async () => {
        const result = await service.validateAccess('agent-3', 'team-1', 'shared', 'write', 'org-1')
        expect(result.allowed).toBe(false)
        expect(result.reason).toBeDefined()
      })

      it('should allow leadership to read team shared folder', async () => {
        const result = await service.validateAccess(
          'agent-leader',
          'team-1',
          'shared',
          'read',
          'org-1'
        )
        expect(result.allowed).toBe(true)
      })

      it('should deny cross-org access', async () => {
        const result = await service.validateAccess('agent-1', 'team-1', 'shared', 'read', 'org-2')
        expect(result.allowed).toBe(false)
        expect(result.reason).toContain('organization')
      })
    })

    describe('Other agent folder - shared scope', () => {
      it('should allow team member to read peer shared folder', async () => {
        const result = await service.validateAccess('agent-1', 'agent-2', 'shared', 'read', 'org-1')
        expect(result.allowed).toBe(true)
      })

      it('should deny team member write access to peer shared folder', async () => {
        const result = await service.validateAccess(
          'agent-1',
          'agent-2',
          'shared',
          'write',
          'org-1'
        )
        expect(result.allowed).toBe(false)
        expect(result.reason).toBeDefined()
      })

      it('should allow leadership to read any agent shared folder', async () => {
        const result = await service.validateAccess(
          'agent-leader',
          'agent-1',
          'shared',
          'read',
          'org-1'
        )
        expect(result.allowed).toBe(true)
      })

      it('should deny non-team member access to peer shared folder', async () => {
        const result = await service.validateAccess('agent-3', 'agent-1', 'shared', 'read', 'org-1')
        expect(result.allowed).toBe(false)
        expect(result.reason).toBeDefined()
      })
    })

    describe('Other team folder - shared scope', () => {
      it('should allow any org member to read other team shared folder', async () => {
        const result = await service.validateAccess('agent-1', 'team-2', 'shared', 'read', 'org-1')
        expect(result.allowed).toBe(true)
      })

      it('should deny non-team member write access to other team shared folder', async () => {
        const result = await service.validateAccess('agent-1', 'team-2', 'shared', 'write', 'org-1')
        expect(result.allowed).toBe(false)
        expect(result.reason).toBeDefined()
      })
    })
  })

  describe('folderExists', () => {
    it('should return true for existing folder', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)
      const result = await service.folderExists('org-1', 'agent-1')
      expect(result).toBe(true)
    })

    it('should return false for non-existent folder', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
      const result = await service.folderExists('org-1', 'agent-999')
      expect(result).toBe(false)
    })
  })

  describe('canCreateFolder', () => {
    it('should allow agent to create own folder', async () => {
      const result = await service.canCreateFolder('agent-1', 'agent-1', 'org-1')
      expect(result.allowed).toBe(true)
    })

    it('should allow agent to create team folder', async () => {
      const result = await service.canCreateFolder('agent-1', 'team-1', 'org-1')
      expect(result.allowed).toBe(true)
    })

    it('should deny agent creating other agent folder', async () => {
      const result = await service.canCreateFolder('agent-1', 'agent-2', 'org-1')
      expect(result.allowed).toBe(false)
      expect(result.reason).toBeDefined()
    })

    it('should deny agent creating other team folder', async () => {
      const result = await service.canCreateFolder('agent-1', 'team-2', 'org-1')
      expect(result.allowed).toBe(false)
      expect(result.reason).toBeDefined()
    })
  })

  describe('Edge cases', () => {
    it('should handle invalid agentId', async () => {
      const result = await service.validateAccess(
        'invalid-agent',
        'agent-1',
        'private',
        'read',
        'org-1'
      )
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('not found')
    })

    it('should handle invalid folderId format', async () => {
      const result = await service.validateAccess(
        'agent-1',
        'invalid-folder',
        'private',
        'read',
        'org-1'
      )
      expect(result.allowed).toBe(false)
      expect(result.reason).toBeDefined()
    })

    it('should handle agent without team', async () => {
      const agentNoTeam: Agent = {
        id: 'agent-no-team',
        name: 'Agent No Team',
        role: 'worker',
        seniorId: null,
        teamId: 'non-existent-team',
        organizationId: 'org-1',
        systemPrompt: 'Test prompt',
        tokenAllocation: 10000,
        tokenUsed: 0,
        status: 'active' as const,
        createdAt: new Date(),
        lastActiveAt: new Date()
      }
      agents.push(agentNoTeam)

      const result = await service.validateAccess(
        'agent-no-team',
        'team-1',
        'shared',
        'read',
        'org-1'
      )
      expect(result.allowed).toBe(true) // Can still read shared folders
    })
  })
})
