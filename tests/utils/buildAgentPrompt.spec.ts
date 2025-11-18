import { describe, it, expect, beforeEach } from 'vitest'
import { buildSystemPrompt } from '../../app/server/utils/buildAgentPrompt'
import { agents } from '../../app/server/data/agents'
import { teams } from '../../app/server/data/teams'
import type { Agent, Team } from '../../types'

describe('System Prompt Builder - buildSystemPrompt', () => {
  beforeEach(() => {
    agents.length = 0
    teams.length = 0
  })

  describe('template variable substitution', () => {
    it('should substitute agent_name', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Development',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice Johnson',
        role: 'Senior Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'You are a helpful assistant.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      expect(result).toContain('Alice Johnson')
      expect(result).toContain('You are: **Alice Johnson**')
    })

    it('should substitute agent_role', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Test',
        role: 'Backend Engineer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Custom prompt.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      expect(result).toContain('Backend Engineer')
      expect(result).toContain('Role: **Backend Engineer**')
    })

    it('should substitute agent_team with team name lookup', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Frontend Development',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Test',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Custom prompt.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      expect(result).toContain('Frontend Development')
      expect(result).toContain('Team: **Frontend Development**')
    })

    it('should substitute senior_name and senior_id with lookup', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const senior: Agent = {
        id: 'agent-senior',
        name: 'Bob Manager',
        role: 'Team Lead',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Manager prompt.',
        tokenAllocation: 2000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: 'agent-senior',
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Custom prompt.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(senior, agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      expect(result).toContain('Bob Manager')
      expect(result).toContain('agent-senior')
      expect(result).toContain('Your Manager/Senior: **Bob Manager** (ID: agent-senior)')
    })

    it('should substitute current_workload', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Custom prompt.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 3
      }

      agents.push(agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      expect(result).toContain('3/5 tasks')
      expect(result).toContain('Current Workload: **3/5 tasks**')
    })

    it('should substitute expertise_list', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Custom prompt.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expertise: ['TypeScript', 'React', 'Node.js']
      }

      agents.push(agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      expect(result).toContain('TypeScript, React, Node.js')
      expect(result).toContain('Your Expertise: **TypeScript, React, Node.js**')
    })
  })

  describe('handling missing optional fields', () => {
    it('should handle missing seniorId gracefully', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null, // No senior
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Custom prompt.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      expect(result).toContain('None')
      expect(result).toContain('Your Manager/Senior: **None**')
    })

    it('should handle missing currentWorkload (defaults to 0)', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Custom prompt.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
        // no currentWorkload
      }

      agents.push(agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      expect(result).toContain('0/5 tasks')
      expect(result).toContain('Current Workload: **0/5 tasks**')
    })

    it('should handle missing expertise (defaults to "Not specified")', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Custom prompt.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
        // no expertise
      }

      agents.push(agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      expect(result).toContain('Not specified')
      expect(result).toContain('Your Expertise: **Not specified**')
    })

    it('should handle empty expertise array', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Custom prompt.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expertise: []
      }

      agents.push(agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      expect(result).toContain('Not specified')
    })
  })

  describe('prompt merging', () => {
    it('should merge custom prompt with organizational context', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'You are a helpful coding assistant.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      // Should contain custom prompt
      expect(result).toContain('You are a helpful coding assistant.')

      // Should contain organizational context sections
      expect(result).toContain('YOUR ORGANIZATIONAL CONTEXT')
      expect(result).toContain('YOUR COLLEAGUES')
      expect(result).toContain('DELEGATION PRINCIPLES')

      // Custom prompt should come first
      expect(result.indexOf('You are a helpful coding assistant.')).toBeLessThan(
        result.indexOf('YOUR ORGANIZATIONAL CONTEXT')
      )
    })

    it('should work with minimal custom prompt', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Hello.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, 'Hello.')

      expect(result).toContain('Hello.')
      expect(result).toContain('YOUR ORGANIZATIONAL CONTEXT')
    })
  })

  describe('various agent configurations', () => {
    it('should work for agent with full profile', async () => {
      const team: Team = {
        id: 'team-dev',
        name: 'Development Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 10000,
        type: 'custom'
      }

      const senior: Agent = {
        id: 'agent-senior',
        name: 'Senior Lead',
        role: 'Tech Lead',
        seniorId: null,
        teamId: 'team-dev',
        organizationId: 'org-1',
        systemPrompt: 'Lead prompt.',
        tokenAllocation: 2000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice Johnson',
        role: 'Senior Developer',
        seniorId: 'agent-senior',
        teamId: 'team-dev',
        organizationId: 'org-1',
        systemPrompt: 'You are an expert TypeScript developer.',
        tokenAllocation: 1000,
        tokenUsed: 250,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 4,
        expertise: ['TypeScript', 'React', 'Testing']
      }

      agents.push(senior, agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      // All fields present
      expect(result).toContain('Alice Johnson')
      expect(result).toContain('Senior Developer')
      expect(result).toContain('Development Team')
      expect(result).toContain('Senior Lead')
      expect(result).toContain('agent-senior')
      expect(result).toContain('4/5 tasks')
      expect(result).toContain('TypeScript, React, Testing')
      expect(result).toContain('You are an expert TypeScript developer.')
    })

    it('should work for agent with minimal profile', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Bob',
        role: 'Intern',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'You are learning.',
        tokenAllocation: 500,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      // Should handle gracefully
      expect(result).toContain('Bob')
      expect(result).toContain('Intern')
      expect(result).toContain('Team')
      expect(result).toContain('None') // No senior
      expect(result).toContain('0/5 tasks') // No workload
      expect(result).toContain('Not specified') // No expertise
    })
  })

  describe('error cases', () => {
    it('should throw error if team not found', async () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'nonexistent-team',
        organizationId: 'org-1',
        systemPrompt: 'Custom prompt.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(agent)

      await expect(buildSystemPrompt(agent, agent.systemPrompt)).rejects.toThrow(
        'Team nonexistent-team not found'
      )
    })

    it('should handle senior not found (still renders with "Unknown")', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: 'nonexistent-senior',
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Custom prompt.',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(agent)
      teams.push(team)

      const result = await buildSystemPrompt(agent, agent.systemPrompt)

      expect(result).toContain('Unknown')
      expect(result).toContain('nonexistent-senior')
    })
  })
})
