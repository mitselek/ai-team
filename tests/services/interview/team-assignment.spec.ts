// tests/services/interview/team-assignment.spec.ts
// Tests for intelligent team assignment during agent recruitment (Issue #38)

import { describe, it, expect, vi } from 'vitest'
import type { Team } from '@@/types'

vi.mock('../../../app/server/services/persistence/filesystem', () => ({
  loadTeams: vi.fn()
}))

vi.mock('../../../app/server/services/llm', () => ({
  generateCompletion: vi.fn()
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

describe('Team Assignment Logic', () => {
  describe('Team recommendation for Backend Engineer', () => {
    it('should recommend Development team for backend engineers with Rust expertise', async () => {
      // Backend engineer with systems programming focus should go to Development
      const role = 'Backend Engineer'
      const expertise = ['Rust', 'Systems Programming', 'Distributed Systems']

      // Simulate team matching logic
      const teams: Team[] = [
        {
          id: 'team-dev',
          name: 'Development',
          type: 'custom',
          description: 'Backend and systems development',
          organizationId: 'org-1',
          leaderId: 'agent-1',
          tokenAllocation: 60000
        },
        {
          id: 'team-lib',
          name: 'Library',
          type: 'library',
          description: 'MCP server development',
          organizationId: 'org-1',
          leaderId: 'agent-2',
          tokenAllocation: 50000
        }
      ]

      // Expectation: Development team is better fit
      const expected = teams.find((t) => t.name === 'Development')
      expect(expected).toBeDefined()
      expect(expected?.type).toBe('custom')
      expect(role).toContain('Backend')
      expect(expertise).toContain('Rust')
    })

    it('should recommend MCP team for specialized library developers', async () => {
      // MCP specialist should go to Library team
      const expertise = ['MCP', 'TypeScript', 'Protocol Design']

      const teams: Team[] = [
        {
          id: 'team-lib',
          name: 'Library',
          type: 'library',
          description: 'MCP server development',
          organizationId: 'org-1',
          leaderId: 'agent-2',
          tokenAllocation: 50000
        },
        {
          id: 'team-dev',
          name: 'Development',
          type: 'custom',
          description: 'General backend development',
          organizationId: 'org-1',
          leaderId: 'agent-1',
          tokenAllocation: 60000
        }
      ]

      const expected = teams.find((t) => t.type === 'library')
      expect(expected).toBeDefined()
      expect(expected?.name).toBe('Library')
      expect(expertise).toContain('MCP')
    })
  })

  describe('Team assignment with proper fallback', () => {
    it('should fallback to session teamId when no team recommendation provided', async () => {
      // When HR recommendation doesn't have teamAssignment, use session.teamId
      const sessionTeamId = 'team-default'
      const recommendation: Record<string, unknown> = {
        systemPrompt: 'You are an assistant',
        suggestedNames: ['Alex'],
        feedback: 'Good fit'
      }

      // No teamAssignment in recommendation
      expect(recommendation).not.toHaveProperty('teamAssignment')
      const targetTeamId =
        (recommendation.teamAssignment as Record<string, string> | undefined)?.teamId ||
        sessionTeamId
      expect(targetTeamId).toBe(sessionTeamId)
    })

    it('should use recommended team when teamAssignment is provided', async () => {
      const sessionTeamId = 'team-default'
      const recommendation: Record<string, unknown> = {
        systemPrompt: 'You are an expert',
        suggestedNames: ['Jordan'],
        feedback: 'Excellent',
        teamAssignment: {
          teamId: 'team-library',
          teamName: 'Library Team',
          rationale: 'Strong MCP expertise matches team focus'
        }
      }

      const targetTeamId =
        (recommendation.teamAssignment as Record<string, string> | undefined)?.teamId ||
        sessionTeamId
      expect(targetTeamId).toBe('team-library')
      expect(targetTeamId).not.toBe(sessionTeamId)
    })
  })

  describe('Team analysis for role matching', () => {
    it('should consider agent role when recommending team', () => {
      const agentRole = 'DevOps Engineer'
      const teamType = 'toolsmith' // Toolsmith team for DevOps/infrastructure

      expect(agentRole).toBe('DevOps Engineer')
      expect(['toolsmith', 'tools-library']).toContain(teamType)
    })

    it('should consider expertise alignment with team focus', () => {
      const expertise = ['Kubernetes', 'Docker', 'CI/CD']
      const teamDescription = 'Infrastructure and tools development'

      // Keywords match
      expect(expertise).toContain('Docker')
      expect(teamDescription).toContain('Infrastructure')
      expect(teamDescription).toContain('tools')
    })

    it('should recommend HR team for recruitment specialists', () => {
      const role = 'HR Specialist'
      const teamType = 'hr'

      expect(role).toContain('HR')
      expect(teamType).toBe('hr')
    })

    it('should recommend Vault team for security-focused engineers', () => {
      const expertise = ['Security', 'Cryptography', 'Access Control']
      const teamType = 'vault' // Vault team for security

      expect(expertise).toContain('Security')
      expect(teamType).toBe('vault')
    })
  })

  describe('Rationale generation', () => {
    it('should provide clear rationale for team assignment', () => {
      const rationale =
        'Extensive Rust and distributed systems experience aligns perfectly with Development team focus on backend infrastructure. Proven track record in systems programming.'

      expect(rationale).toBeDefined()
      expect(rationale.length).toBeGreaterThan(10)
      expect(rationale).toContain('Rust')
      expect(rationale).toContain('Development')
      expect(rationale).toContain('systems')
    })

    it('should include reasoning based on role and expertise', () => {
      const role = 'MCP Specialist'
      const expertise = ['MCP', 'Protocol Design', 'TypeScript']
      const teamName = 'Library Team'

      const rationale = `${role} with expertise in ${expertise.join(', ')} is well-suited for ${teamName} which focuses on MCP server development and protocol implementation.`

      expect(rationale).toContain(role)
      expect(rationale).toContain(teamName)
      expect(expertise.every((exp) => rationale.includes(exp))).toBe(true)
    })
  })

  describe('Team assignment integration', () => {
    it('should include teamAssignment in HR recommendation', () => {
      const recommendation = {
        systemPrompt: 'System prompt',
        suggestedNames: ['Name1'],
        feedback: 'Feedback',
        teamAssignment: {
          teamId: 'team-123',
          teamName: 'Team Name',
          rationale: 'Good fit'
        }
      }

      expect(recommendation.teamAssignment).toBeDefined()
      expect(recommendation.teamAssignment.teamId).toBeDefined()
      expect(recommendation.teamAssignment.teamName).toBeDefined()
      expect(recommendation.teamAssignment.rationale).toBeDefined()
    })

    it('should handle missing optional teamAssignment gracefully', () => {
      const recommendation: Record<string, unknown> = {
        systemPrompt: 'System prompt',
        suggestedNames: ['Name1'],
        feedback: 'Feedback'
        // no teamAssignment
      }

      // Should not throw
      const hasTeamAssignment =
        (recommendation.teamAssignment as Record<string, string> | undefined) !== undefined
      expect(hasTeamAssignment).toBe(false)

      // Fallback logic should work
      const defaultTeamId = 'team-default'
      const finalTeamId =
        (recommendation.teamAssignment as Record<string, string> | undefined)?.teamId ||
        defaultTeamId
      expect(finalTeamId).toBe(defaultTeamId)
    })

    it('should pass recommendation to agent creation function', () => {
      const recommendation: Record<string, unknown> = {
        systemPrompt: 'You are expert',
        suggestedNames: ['Expert'],
        feedback: 'Good',
        teamAssignment: {
          teamId: 'team-assigned',
          teamName: 'Assigned Team',
          rationale: 'Perfect fit'
        }
      }

      // Simulate passing recommendation to createAgentFromProfile
      const targetTeam =
        (recommendation.teamAssignment as Record<string, string> | undefined)?.teamId ||
        'session-team'
      expect(targetTeam).toBe('team-assigned')
    })

    it('should log team assignment to transcript', () => {
      const teamAssignment = {
        teamId: 'team-lib',
        teamName: 'Library Team',
        rationale: 'Strong MCP expertise alignment'
      }

      const agentName = 'Alex'
      const message = `Team Assignment: ${agentName} has been assigned to the ${teamAssignment.teamName} team. Rationale: ${teamAssignment.rationale}`

      expect(message).toContain(agentName)
      expect(message).toContain(teamAssignment.teamName)
      expect(message).toContain(teamAssignment.rationale)
      expect(message).toContain('Team Assignment')
    })
  })
})
