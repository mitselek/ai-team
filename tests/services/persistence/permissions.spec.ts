import { describe, it, expect, beforeEach } from 'vitest'
import { PermissionService } from '../../../app/server/services/persistence/permissions'
import type { Agent, Team } from '../../../types'

describe('PermissionService - Issue #43', () => {
  let permissionService: PermissionService

  // Mock data
  const mockAgent1: Agent = {
    id: 'agent-1',
    name: 'Agent One',
    role: 'Developer',
    seniorId: null,
    teamId: 'team-1',
    organizationId: 'org-1',
    systemPrompt: 'test',
    tokenAllocation: 10000,
    tokenUsed: 0,
    status: 'active',
    createdAt: new Date(),
    lastActiveAt: new Date()
  }

  const mockAgent2: Agent = {
    id: 'agent-2',
    name: 'Agent Two',
    role: 'Designer',
    seniorId: null,
    teamId: 'team-1',
    organizationId: 'org-1',
    systemPrompt: 'test',
    tokenAllocation: 10000,
    tokenUsed: 0,
    status: 'active',
    createdAt: new Date(),
    lastActiveAt: new Date()
  }

  const mockAgent3: Agent = {
    id: 'agent-3',
    name: 'Agent Three',
    role: 'Manager',
    seniorId: null,
    teamId: 'team-2',
    organizationId: 'org-1',
    systemPrompt: 'test',
    tokenAllocation: 10000,
    tokenUsed: 0,
    status: 'active',
    createdAt: new Date(),
    lastActiveAt: new Date()
  }

  const mockTeam1: Team = {
    id: 'team-1',
    name: 'Development Team',
    organizationId: 'org-1',
    leaderId: 'agent-1',
    tokenAllocation: 50000,
    type: 'custom'
  }

  const mockTeam2: Team = {
    id: 'team-2',
    name: 'Library Team',
    organizationId: 'org-1',
    leaderId: 'agent-3',
    tokenAllocation: 30000,
    type: 'library'
  }

  const mockDataLoader = {
    loadAgent: async (agentId: string): Promise<Agent | null> => {
      if (agentId === 'agent-1') return mockAgent1
      if (agentId === 'agent-2') return mockAgent2
      if (agentId === 'agent-3') return mockAgent3
      return null
    },
    loadTeam: async (teamId: string): Promise<Team | null> => {
      if (teamId === 'team-1') return mockTeam1
      if (teamId === 'team-2') return mockTeam2
      return null
    }
  }

  beforeEach(() => {
    permissionService = new PermissionService(mockDataLoader)
  })

  describe('Agent Private Workspace', () => {
    it('should allow owner to read their private files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/agent-1/private/file.md',
        'read'
      )
      expect(allowed).toBe(true)
    })

    it('should allow owner to write their private files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/agent-1/private/file.md',
        'write'
      )
      expect(allowed).toBe(true)
    })

    it('should allow owner to delete their private files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/agent-1/private/file.md',
        'delete'
      )
      expect(allowed).toBe(true)
    })

    it('should deny other agents read access to private files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-2',
        '/agents/agent-1/private/file.md',
        'read'
      )
      expect(allowed).toBe(false)
    })

    it('should deny other agents write access to private files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-2',
        '/agents/agent-1/private/file.md',
        'write'
      )
      expect(allowed).toBe(false)
    })

    it('should deny other agents delete access to private files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-2',
        '/agents/agent-1/private/file.md',
        'delete'
      )
      expect(allowed).toBe(false)
    })
  })

  describe('Agent Shared Workspace', () => {
    it('should allow owner to read their shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/agent-1/shared/file.md',
        'read'
      )
      expect(allowed).toBe(true)
    })

    it('should allow owner to write their shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/agent-1/shared/file.md',
        'write'
      )
      expect(allowed).toBe(true)
    })

    it('should allow owner to delete their shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/agent-1/shared/file.md',
        'delete'
      )
      expect(allowed).toBe(true)
    })

    it('should allow same-org agents to read shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-2',
        '/agents/agent-1/shared/file.md',
        'read'
      )
      expect(allowed).toBe(true)
    })

    it('should deny same-org agents write access to shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-2',
        '/agents/agent-1/shared/file.md',
        'write'
      )
      expect(allowed).toBe(false)
    })

    it('should deny same-org agents delete access to shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-2',
        '/agents/agent-1/shared/file.md',
        'delete'
      )
      expect(allowed).toBe(false)
    })
  })

  describe('Team Private Workspace', () => {
    it('should allow team leader to read team private files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/teams/team-1/private/file.md',
        'read'
      )
      expect(allowed).toBe(true)
    })

    it('should allow team leader to write team private files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/teams/team-1/private/file.md',
        'write'
      )
      expect(allowed).toBe(true)
    })

    it('should allow team leader to delete team private files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/teams/team-1/private/file.md',
        'delete'
      )
      expect(allowed).toBe(true)
    })

    it('should allow team members to read team private files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-2',
        '/teams/team-1/private/file.md',
        'read'
      )
      expect(allowed).toBe(true)
    })

    it('should deny team members write access to team private files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-2',
        '/teams/team-1/private/file.md',
        'write'
      )
      expect(allowed).toBe(false)
    })

    it('should deny team members delete access to team private files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-2',
        '/teams/team-1/private/file.md',
        'delete'
      )
      expect(allowed).toBe(false)
    })

    it('should deny non-team members all access to team private files', async () => {
      const readAllowed = await permissionService.checkFileAccess(
        'agent-3',
        '/teams/team-1/private/file.md',
        'read'
      )
      const writeAllowed = await permissionService.checkFileAccess(
        'agent-3',
        '/teams/team-1/private/file.md',
        'write'
      )
      const deleteAllowed = await permissionService.checkFileAccess(
        'agent-3',
        '/teams/team-1/private/file.md',
        'delete'
      )

      expect(readAllowed).toBe(false)
      expect(writeAllowed).toBe(false)
      expect(deleteAllowed).toBe(false)
    })
  })

  describe('Team Shared Workspace', () => {
    it('should allow team leader to read team shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/teams/team-1/shared/file.md',
        'read'
      )
      expect(allowed).toBe(true)
    })

    it('should allow team leader to write team shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/teams/team-1/shared/file.md',
        'write'
      )
      expect(allowed).toBe(true)
    })

    it('should allow team leader to delete team shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/teams/team-1/shared/file.md',
        'delete'
      )
      expect(allowed).toBe(true)
    })

    it('should allow team members to read team shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-2',
        '/teams/team-1/shared/file.md',
        'read'
      )
      expect(allowed).toBe(true)
    })

    it('should allow team members to write team shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-2',
        '/teams/team-1/shared/file.md',
        'write'
      )
      expect(allowed).toBe(true)
    })

    it('should allow team members to delete team shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-2',
        '/teams/team-1/shared/file.md',
        'delete'
      )
      expect(allowed).toBe(true)
    })

    it('should allow same-org agents to read team shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-3',
        '/teams/team-1/shared/file.md',
        'read'
      )
      expect(allowed).toBe(true)
    })

    it('should deny non-team members write access to team shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-3',
        '/teams/team-1/shared/file.md',
        'write'
      )
      expect(allowed).toBe(false)
    })

    it('should deny non-team members delete access to team shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-3',
        '/teams/team-1/shared/file.md',
        'delete'
      )
      expect(allowed).toBe(false)
    })
  })

  describe('Library Team Special Case', () => {
    it('should allow all org agents to read library team shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/teams/team-2/shared/doc.pdf',
        'read'
      )
      expect(allowed).toBe(true)
    })

    it('should allow library team members to write shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-3',
        '/teams/team-2/shared/doc.pdf',
        'write'
      )
      expect(allowed).toBe(true)
    })

    it('should deny non-library members write access to library files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/teams/team-2/shared/doc.pdf',
        'write'
      )
      expect(allowed).toBe(false)
    })
  })

  describe('Path Parsing', () => {
    it('should correctly parse agent private path', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/agent-1/private/nested/folder/file.txt',
        'read'
      )
      expect(allowed).toBe(true)
    })

    it('should correctly parse agent shared path', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/agent-1/shared/document.pdf',
        'read'
      )
      expect(allowed).toBe(true)
    })

    it('should correctly parse team private path', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-1',
        '/teams/team-1/private/spec/design.md',
        'read'
      )
      expect(allowed).toBe(true)
    })

    it('should correctly parse team shared path', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-2',
        '/teams/team-1/shared/readme.md',
        'write'
      )
      expect(allowed).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should reject invalid path format', async () => {
      const result = await permissionService.checkFileAccess(
        'agent-1',
        '/invalid/path/structure',
        'read'
      )
      expect(result).toBe(false)
    })

    it('should reject path without workspace type', async () => {
      const result = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/agent-1/file.md',
        'read'
      )
      expect(result).toBe(false)
    })

    it('should handle non-existent agent gracefully', async () => {
      const result = await permissionService.checkFileAccess(
        'non-existent',
        '/agents/agent-1/private/file.md',
        'read'
      )
      expect(result).toBe(false)
    })

    it('should handle non-existent team gracefully', async () => {
      const result = await permissionService.checkFileAccess(
        'agent-1',
        '/teams/non-existent/private/file.md',
        'read'
      )
      expect(result).toBe(false)
    })

    it('should handle non-existent file owner gracefully', async () => {
      const result = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/non-existent/private/file.md',
        'read'
      )
      expect(result).toBe(false)
    })

    it('should reject empty path', async () => {
      const result = await permissionService.checkFileAccess('agent-1', '', 'read')
      expect(result).toBe(false)
    })

    it('should reject path with invalid workspace type', async () => {
      const result = await permissionService.checkFileAccess(
        'agent-1',
        '/agents/agent-1/invalid/file.md',
        'read'
      )
      expect(result).toBe(false)
    })
  })

  describe('Cross-Organization Access', () => {
    const mockAgentDifferentOrg: Agent = {
      id: 'agent-other',
      name: 'Other Agent',
      role: 'Developer',
      seniorId: null,
      teamId: 'team-other',
      organizationId: 'org-2',
      systemPrompt: 'test',
      tokenAllocation: 10000,
      tokenUsed: 0,
      status: 'active',
      createdAt: new Date(),
      lastActiveAt: new Date()
    }

    beforeEach(() => {
      const extendedDataLoader = {
        ...mockDataLoader,
        loadAgent: async (agentId: string): Promise<Agent | null> => {
          if (agentId === 'agent-other') return mockAgentDifferentOrg
          return mockDataLoader.loadAgent(agentId)
        }
      }
      permissionService = new PermissionService(extendedDataLoader)
    })

    it('should deny cross-org access to agent shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-other',
        '/agents/agent-1/shared/file.md',
        'read'
      )
      expect(allowed).toBe(false)
    })

    it('should deny cross-org access to team shared files', async () => {
      const allowed = await permissionService.checkFileAccess(
        'agent-other',
        '/teams/team-1/shared/file.md',
        'read'
      )
      expect(allowed).toBe(false)
    })
  })
})
