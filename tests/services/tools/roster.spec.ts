import { describe, it, expect, beforeEach } from 'vitest'
import { getRosterTool } from '../../../app/server/services/tools/roster'
import { agents } from '../../../app/server/data/agents'
import { teams } from '../../../app/server/data/teams'
import type { Agent, Team } from '../../../types'

interface ColleagueInfo {
  id: string
  name: string
  role: string
  team: string
  seniorId: string | null
  expertise: string[]
  status: string
  current_workload: number
  workload_capacity: number
}

describe('Roster Tool - get_organization_roster', () => {
  beforeEach(() => {
    // Clear test data
    agents.length = 0
    teams.length = 0
  })

  describe('agent context', () => {
    it('should return requesting agent context', async () => {
      const requestingAgent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-dev',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 2,
        expertise: ['TypeScript', 'Vue']
      }

      const team: Team = {
        id: 'team-dev',
        name: 'Development',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      agents.push(requestingAgent)
      teams.push(team)

      const result = await getRosterTool('agent-1', 'org-1', {})

      expect(result.agent_context).toBeDefined()
      expect(result.agent_context.id).toBe('agent-1')
      expect(result.agent_context.name).toBe('Alice')
      expect(result.agent_context.role).toBe('Developer')
      expect(result.agent_context.team).toBe('Development')
      expect(result.agent_context.current_workload).toBe(2)
      expect(result.agent_context.workload_capacity).toBe(5)
      expect(result.agent_context.expertise).toEqual(['TypeScript', 'Vue'])
      expect(result.agent_context.status).toBe('idle') // 0-2 = idle
    })

    it('should calculate status as idle for workload 0-2', async () => {
      const workloads = [0, 1, 2]

      for (const workload of workloads) {
        agents.length = 0
        teams.length = 0

        const agent: Agent = {
          id: 'agent-1',
          name: 'Test',
          role: 'Developer',
          seniorId: null,
          teamId: 'team-1',
          organizationId: 'org-1',
          systemPrompt: 'prompt',
          tokenAllocation: 1000,
          tokenUsed: 0,
          status: 'active',
          createdAt: new Date(),
          lastActiveAt: new Date(),
          currentWorkload: workload
        }

        const team: Team = {
          id: 'team-1',
          name: 'Team',
          organizationId: 'org-1',
          leaderId: null,
          tokenAllocation: 5000,
          type: 'custom'
        }

        agents.push(agent)
        teams.push(team)

        const result = await getRosterTool('agent-1', 'org-1', {})
        expect(result.agent_context.status).toBe('idle')
      }
    })

    it('should calculate status as active for workload 3', async () => {
      agents.length = 0
      teams.length = 0

      const agent: Agent = {
        id: 'agent-1',
        name: 'Test',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 3
      }

      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      agents.push(agent)
      teams.push(team)

      const result = await getRosterTool('agent-1', 'org-1', {})
      expect(result.agent_context.status).toBe('active')
    })

    it('should calculate status as busy for workload 4-5', async () => {
      const workloads = [4, 5]

      for (const workload of workloads) {
        agents.length = 0
        teams.length = 0

        const agent: Agent = {
          id: 'agent-1',
          name: 'Test',
          role: 'Developer',
          seniorId: null,
          teamId: 'team-1',
          organizationId: 'org-1',
          systemPrompt: 'prompt',
          tokenAllocation: 1000,
          tokenUsed: 0,
          status: 'active',
          createdAt: new Date(),
          lastActiveAt: new Date(),
          currentWorkload: workload
        }

        const team: Team = {
          id: 'team-1',
          name: 'Team',
          organizationId: 'org-1',
          leaderId: null,
          tokenAllocation: 5000,
          type: 'custom'
        }

        agents.push(agent)
        teams.push(team)

        const result = await getRosterTool('agent-1', 'org-1', {})
        expect(result.agent_context.status).toBe('busy')
      }
    })

    it('should show offline status for paused agents', async () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'paused',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 1
      }

      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      agents.push(agent)
      teams.push(team)

      const result = await getRosterTool('agent-1', 'org-1', {})
      expect(result.agent_context.status).toBe('offline')
    })
  })

  describe('filter: all', () => {
    it('should return all colleagues in organization (excluding self)', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Development',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const requestingAgent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 2,
        expertise: ['TypeScript']
      }

      const colleague1: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Designer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 3,
        expertise: ['Figma']
      }

      const colleague2: Agent = {
        id: 'agent-3',
        name: 'Carol',
        role: 'Manager',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 5
      }

      agents.push(requestingAgent, colleague1, colleague2)
      teams.push(team)

      const result = await getRosterTool('agent-1', 'org-1', { filter: 'all' })

      expect(result.colleagues).toHaveLength(2)
      expect(result.colleagues.find((c: ColleagueInfo) => c.id === 'agent-2')).toBeDefined()
      expect(result.colleagues.find((c: ColleagueInfo) => c.id === 'agent-3')).toBeDefined()
      expect(result.colleagues.find((c: ColleagueInfo) => c.id === 'agent-1')).toBeUndefined() // self excluded
    })

    it('should return empty colleagues for single agent org', async () => {
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
        name: 'Solo',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(agent)
      teams.push(team)

      const result = await getRosterTool('agent-1', 'org-1', {})

      expect(result.colleagues).toEqual([])
    })

    it('should not include agents from other organizations', async () => {
      const team1: Team = {
        id: 'team-1',
        name: 'Team 1',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const team2: Team = {
        id: 'team-2',
        name: 'Team 2',
        organizationId: 'org-2',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const agent1: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      const agent2: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-2',
        organizationId: 'org-2',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(agent1, agent2)
      teams.push(team1, team2)

      const result = await getRosterTool('agent-1', 'org-1', {})

      expect(result.colleagues).toEqual([])
    })
  })

  describe('filter: my_team', () => {
    it('should return only team members', async () => {
      const team1: Team = {
        id: 'team-dev',
        name: 'Development',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const team2: Team = {
        id: 'team-design',
        name: 'Design',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const requestingAgent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-dev',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      const teammate: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-dev',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      const otherTeamAgent: Agent = {
        id: 'agent-3',
        name: 'Carol',
        role: 'Designer',
        seniorId: null,
        teamId: 'team-design',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(requestingAgent, teammate, otherTeamAgent)
      teams.push(team1, team2)

      const result = await getRosterTool('agent-1', 'org-1', { filter: 'my_team' })

      expect(result.colleagues).toHaveLength(1)
      expect(result.colleagues[0].id).toBe('agent-2')
      expect(result.colleagues[0].name).toBe('Bob')
    })
  })

  describe('filter: available', () => {
    it('should return only non-busy agents (workload < 4)', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const requestingAgent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 2
      }

      const available1: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 1
      }

      const available2: Agent = {
        id: 'agent-3',
        name: 'Carol',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 3
      }

      const busy1: Agent = {
        id: 'agent-4',
        name: 'Dave',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 4
      }

      const busy2: Agent = {
        id: 'agent-5',
        name: 'Eve',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 5
      }

      agents.push(requestingAgent, available1, available2, busy1, busy2)
      teams.push(team)

      const result = await getRosterTool('agent-1', 'org-1', { filter: 'available' })

      expect(result.colleagues).toHaveLength(2)
      expect(result.colleagues.find((c: ColleagueInfo) => c.id === 'agent-2')).toBeDefined()
      expect(result.colleagues.find((c: ColleagueInfo) => c.id === 'agent-3')).toBeDefined()
      expect(result.colleagues.find((c: ColleagueInfo) => c.id === 'agent-4')).toBeUndefined()
      expect(result.colleagues.find((c: ColleagueInfo) => c.id === 'agent-5')).toBeUndefined()
    })

    it('should exclude paused agents from available', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const requestingAgent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      const paused: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'paused',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 1
      }

      agents.push(requestingAgent, paused)
      teams.push(team)

      const result = await getRosterTool('agent-1', 'org-1', { filter: 'available' })

      expect(result.colleagues).toEqual([])
    })
  })

  describe('filter: by_expertise', () => {
    it('should return agents with matching expertise', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const requestingAgent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expertise: ['TypeScript']
      }

      const match1: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expertise: ['React', 'TypeScript', 'Node.js']
      }

      const match2: Agent = {
        id: 'agent-3',
        name: 'Carol',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expertise: ['typescript', 'Vue'] // case insensitive
      }

      const noMatch: Agent = {
        id: 'agent-4',
        name: 'Dave',
        role: 'Designer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expertise: ['Figma', 'Design']
      }

      agents.push(requestingAgent, match1, match2, noMatch)
      teams.push(team)

      const result = await getRosterTool('agent-1', 'org-1', {
        filter: 'by_expertise',
        expertise: 'TypeScript'
      })

      expect(result.colleagues).toHaveLength(2)
      expect(result.colleagues.find((c: ColleagueInfo) => c.id === 'agent-2')).toBeDefined()
      expect(result.colleagues.find((c: ColleagueInfo) => c.id === 'agent-3')).toBeDefined()
      expect(result.colleagues.find((c: ColleagueInfo) => c.id === 'agent-4')).toBeUndefined()
    })

    it('should handle agents without expertise field', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const requestingAgent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      const noExpertise: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
        // no expertise field
      }

      agents.push(requestingAgent, noExpertise)
      teams.push(team)

      const result = await getRosterTool('agent-1', 'org-1', {
        filter: 'by_expertise',
        expertise: 'TypeScript'
      })

      expect(result.colleagues).toEqual([])
    })
  })

  describe('colleague formatting', () => {
    it('should format colleague data correctly', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Development',
        organizationId: 'org-1',
        leaderId: 'agent-senior',
        tokenAllocation: 5000,
        type: 'custom'
      }

      const requestingAgent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Junior Developer',
        seniorId: 'agent-senior',
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      const colleague: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Senior Developer',
        seniorId: 'agent-lead',
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 2000,
        tokenUsed: 500,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 4,
        expertise: ['Architecture', 'Mentoring']
      }

      agents.push(requestingAgent, colleague)
      teams.push(team)

      const result = await getRosterTool('agent-1', 'org-1', {})

      expect(result.colleagues).toHaveLength(1)
      const c = result.colleagues[0]

      expect(c.id).toBe('agent-2')
      expect(c.name).toBe('Bob')
      expect(c.role).toBe('Senior Developer')
      expect(c.team).toBe('Development')
      expect(c.seniorId).toBe('agent-lead')
      expect(c.expertise).toEqual(['Architecture', 'Mentoring'])
      expect(c.status).toBe('busy') // workload 4 = busy
      expect(c.current_workload).toBe(4)
      expect(c.workload_capacity).toBe(5)
    })

    it('should handle missing optional fields gracefully', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const requestingAgent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      const colleague: Agent = {
        id: 'agent-2',
        name: 'Bob',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
        // no currentWorkload, no expertise
      }

      agents.push(requestingAgent, colleague)
      teams.push(team)

      const result = await getRosterTool('agent-1', 'org-1', {})

      expect(result.colleagues).toHaveLength(1)
      const c = result.colleagues[0]

      expect(c.current_workload).toBe(0) // defaults to 0
      expect(c.expertise).toEqual([]) // defaults to empty array
      expect(c.status).toBe('idle') // 0 workload = idle
    })
  })

  describe('error cases', () => {
    it('should throw error if requesting agent not found', async () => {
      await expect(getRosterTool('nonexistent-agent', 'org-1', {})).rejects.toThrow(
        'Agent nonexistent-agent not found'
      )
    })

    it('should throw error if team not found', async () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Alice',
        role: 'Developer',
        seniorId: null,
        teamId: 'nonexistent-team',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(agent)

      await expect(getRosterTool('agent-1', 'org-1', {})).rejects.toThrow(
        'Team nonexistent-team not found'
      )
    })

    it('should throw error for by_expertise filter without expertise parameter', async () => {
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
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      agents.push(agent)
      teams.push(team)

      await expect(getRosterTool('agent-1', 'org-1', { filter: 'by_expertise' })).rejects.toThrow(
        'expertise parameter required when filter is by_expertise'
      )
    })
  })
})
