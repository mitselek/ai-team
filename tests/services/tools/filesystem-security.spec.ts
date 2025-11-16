import { describe, it, expect, beforeEach } from 'vitest'
import { checkAgentPathAccess } from '../../../app/server/services/tools/filesystem-tools'
import type { Agent, Team } from '../../../types'

describe('Filesystem Security - Path Access Control', () => {
  let marcusAgent: Agent
  let nexusAgent: Agent
  let hrTeam: Team
  let devTeam: Team

  beforeEach(() => {
    const orgId = '537ba67e-0e50-47f7-931d-360b547efe90'

    marcusAgent = {
      id: '72e10c47-68e4-46ee-a941-c35a3d541c0a',
      name: 'Marcus',
      role: 'HR Specialist',
      seniorId: null,
      organizationId: orgId,
      teamId: 'e001cf45-7d86-45b9-9b60-d8d7a24db40c', // HR team
      systemPrompt: 'Test prompt',
      tokenAllocation: 50000,
      tokenUsed: 0,
      status: 'active',
      createdAt: new Date(),
      lastActiveAt: new Date()
    }

    nexusAgent = {
      id: 'd3035ecd-92c1-4ea2-9061-281294986fc6',
      name: 'Nexus',
      role: 'Developer',
      seniorId: null,
      organizationId: orgId,
      teamId: '8c70fa0b-30d9-4b00-ba45-01c02b9afd20', // Development team
      systemPrompt: 'Test prompt',
      tokenAllocation: 50000,
      tokenUsed: 0,
      status: 'active',
      createdAt: new Date(),
      lastActiveAt: new Date()
    }

    hrTeam = {
      id: 'e001cf45-7d86-45b9-9b60-d8d7a24db40c',
      name: 'HR',
      description: 'HR Team',
      organizationId: orgId,
      leaderId: null,
      tokenAllocation: 100000,
      type: 'hr'
    }

    devTeam = {
      id: '8c70fa0b-30d9-4b00-ba45-01c02b9afd20',
      name: 'Development',
      description: 'Dev Team',
      organizationId: orgId,
      leaderId: null,
      tokenAllocation: 200000,
      type: 'custom'
    }
  })

  describe('Agent Private Directory Access', () => {
    it('agent can read own private directory', () => {
      const ownPrivatePath = `/agents/${marcusAgent.id}/private/my-notes.txt`
      const hasAccess = checkAgentPathAccess(ownPrivatePath, 'read', marcusAgent, hrTeam)
      expect(hasAccess).toBe(true)
    })

    it('agent can write to own private directory', () => {
      const ownPrivatePath = `/agents/${marcusAgent.id}/private/my-notes.txt`
      const hasAccess = checkAgentPathAccess(ownPrivatePath, 'write', marcusAgent, hrTeam)
      expect(hasAccess).toBe(true)
    })

    it('agent CANNOT read another agent private directory', () => {
      const otherPrivatePath = `/agents/${nexusAgent.id}/private/secret-notes.txt`
      const hasAccess = checkAgentPathAccess(otherPrivatePath, 'read', marcusAgent, hrTeam)
      expect(hasAccess).toBe(false)
    })

    it('agent CANNOT write to another agent private directory', () => {
      const otherPrivatePath = `/agents/${nexusAgent.id}/private/malicious.txt`
      const hasAccess = checkAgentPathAccess(otherPrivatePath, 'write', marcusAgent, hrTeam)
      expect(hasAccess).toBe(false)
    })
  })

  describe('Agent Shared Directory Access', () => {
    it('agent can read any agent shared directory', () => {
      const otherSharedPath = `/agents/${nexusAgent.id}/shared/public-doc.md`
      const hasAccess = checkAgentPathAccess(otherSharedPath, 'read', marcusAgent, hrTeam)
      expect(hasAccess).toBe(true)
    })

    it('agent can write to own shared directory', () => {
      const ownSharedPath = `/agents/${marcusAgent.id}/shared/my-doc.md`
      const hasAccess = checkAgentPathAccess(ownSharedPath, 'write', marcusAgent, hrTeam)
      expect(hasAccess).toBe(true)
    })

    it('agent CANNOT write to another agent shared directory', () => {
      const otherSharedPath = `/agents/${nexusAgent.id}/shared/unauthorized.md`
      const hasAccess = checkAgentPathAccess(otherSharedPath, 'write', marcusAgent, hrTeam)
      expect(hasAccess).toBe(false)
    })
  })

  describe('Team Directory Access', () => {
    it('team member can read team private directory', () => {
      const teamPrivatePath = `/teams/${hrTeam.id}/private/internal-docs.md`
      const hasAccess = checkAgentPathAccess(teamPrivatePath, 'read', marcusAgent, hrTeam)
      expect(hasAccess).toBe(true)
    })

    it('team member can write to team private directory', () => {
      const teamPrivatePath = `/teams/${hrTeam.id}/private/meeting-notes.md`
      const hasAccess = checkAgentPathAccess(teamPrivatePath, 'write', marcusAgent, hrTeam)
      expect(hasAccess).toBe(true)
    })

    it('non-member CANNOT read other team private directory', () => {
      const otherTeamPath = `/teams/${devTeam.id}/private/secret-project.md`
      const hasAccess = checkAgentPathAccess(otherTeamPath, 'read', marcusAgent, hrTeam)
      expect(hasAccess).toBe(false)
    })

    it('anyone can read team shared directory', () => {
      const teamSharedPath = `/teams/${devTeam.id}/shared/api-docs.md`
      const hasAccess = checkAgentPathAccess(teamSharedPath, 'read', marcusAgent, hrTeam)
      expect(hasAccess).toBe(true)
    })

    it('only team members can write to team shared directory', () => {
      const otherTeamSharedPath = `/teams/${devTeam.id}/shared/unauthorized.md`
      const hasAccess = checkAgentPathAccess(otherTeamSharedPath, 'write', marcusAgent, hrTeam)
      expect(hasAccess).toBe(false)
    })
  })

  describe('Organization Public Access', () => {
    it('all agents can read organization public files', () => {
      const publicPath = '/organization/public/company-policies.md'
      const hasAccess = checkAgentPathAccess(publicPath, 'read', marcusAgent, hrTeam)
      expect(hasAccess).toBe(true)
    })

    it('all agents can write to organization public files', () => {
      const publicPath = '/organization/public/shared-doc.md'
      const hasAccess = checkAgentPathAccess(publicPath, 'write', marcusAgent, hrTeam)
      expect(hasAccess).toBe(true)
    })
  })

  describe('Unauthorized Paths', () => {
    it('denies access to paths outside workspace structure', () => {
      const badPath = '/random/unauthorized/path.txt'
      const hasAccess = checkAgentPathAccess(badPath, 'read', marcusAgent, hrTeam)
      expect(hasAccess).toBe(false)
    })

    it('denies access to root organization path', () => {
      const rootPath = '/'
      const hasAccess = checkAgentPathAccess(rootPath, 'read', marcusAgent, hrTeam)
      expect(hasAccess).toBe(false)
    })
  })
})
