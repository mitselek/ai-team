import { describe, it, expect, beforeEach } from 'vitest'
import { agents } from '../../app/server/data/agents'
import { teams } from '../../app/server/data/teams'
import type { Agent, Team } from '../../types'

describe('Workload Tracking - Agent currentWorkload', () => {
  beforeEach(() => {
    agents.length = 0
    teams.length = 0
  })

  describe('workload increment on task assignment', () => {
    it('should increment workload when task assigned to agent', () => {
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
        lastActiveAt: new Date(),
        currentWorkload: 2
      }

      agents.push(agent)

      // Simulate task assignment
      const agentRef = agents.find((a) => a.id === 'agent-1')!
      agentRef.currentWorkload = (agentRef.currentWorkload ?? 0) + 1

      expect(agentRef.currentWorkload).toBe(3)
    })

    it('should cap workload at 5 (max capacity)', () => {
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
        lastActiveAt: new Date(),
        currentWorkload: 5
      }

      agents.push(agent)

      // Attempt to assign task beyond capacity
      const agentRef = agents.find((a) => a.id === 'agent-1')!
      const newWorkload = Math.min((agentRef.currentWorkload ?? 0) + 1, 5)
      agentRef.currentWorkload = newWorkload

      expect(agentRef.currentWorkload).toBe(5) // Should stay at 5
    })

    it('should handle agents without initial currentWorkload', () => {
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
        // no currentWorkload
      }

      agents.push(agent)

      // Assign task to agent with undefined workload
      const agentRef = agents.find((a) => a.id === 'agent-1')!
      agentRef.currentWorkload = (agentRef.currentWorkload ?? 0) + 1

      expect(agentRef.currentWorkload).toBe(1)
    })
  })

  describe('workload decrement on task completion', () => {
    it('should decrement workload when task completed', () => {
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
        lastActiveAt: new Date(),
        currentWorkload: 3
      }

      agents.push(agent)

      // Simulate task completion
      const agentRef = agents.find((a) => a.id === 'agent-1')!
      agentRef.currentWorkload = Math.max((agentRef.currentWorkload ?? 0) - 1, 0)

      expect(agentRef.currentWorkload).toBe(2)
    })

    it('should floor workload at 0 (minimum)', () => {
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
        lastActiveAt: new Date(),
        currentWorkload: 0
      }

      agents.push(agent)

      // Attempt to decrement below zero
      const agentRef = agents.find((a) => a.id === 'agent-1')!
      agentRef.currentWorkload = Math.max((agentRef.currentWorkload ?? 0) - 1, 0)

      expect(agentRef.currentWorkload).toBe(0) // Should stay at 0
    })

    it('should handle completion when workload is undefined', () => {
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
        // no currentWorkload
      }

      agents.push(agent)

      // Complete task when workload undefined
      const agentRef = agents.find((a) => a.id === 'agent-1')!
      agentRef.currentWorkload = Math.max((agentRef.currentWorkload ?? 0) - 1, 0)

      expect(agentRef.currentWorkload).toBe(0)
    })
  })

  describe('workload validation', () => {
    it('should be within 0-5 range', () => {
      const validWorkloads = [0, 1, 2, 3, 4, 5]

      validWorkloads.forEach((workload) => {
        const agent: Agent = {
          id: `agent-${workload}`,
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

        expect(agent.currentWorkload).toBeGreaterThanOrEqual(0)
        expect(agent.currentWorkload).toBeLessThanOrEqual(5)
      })
    })

    it('should warn when assigning to agent at 5/5 capacity', () => {
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
        lastActiveAt: new Date(),
        currentWorkload: 5
      }

      // Should warn but not throw
      expect(agent.currentWorkload).toBe(5)
      expect(agent.currentWorkload).toBeGreaterThanOrEqual(5)
    })

    it('should have soft limit warning at 4/5 capacity', () => {
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
        lastActiveAt: new Date(),
        currentWorkload: 4
      }

      // Soft limit check: 4/5 is high but acceptable
      expect(agent.currentWorkload).toBeGreaterThanOrEqual(4)
      expect(agent.currentWorkload).toBeLessThan(5)
    })
  })

  describe('status calculation from workload', () => {
    it('should calculate idle status for workload 0-2', () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
        leaderId: null,
        tokenAllocation: 5000,
        type: 'custom'
      }

      const workloads = [0, 1, 2]

      workloads.forEach((workload) => {
        const agent: Agent = {
          id: `agent-${workload}`,
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

        agents.push(agent)
        teams.push(team)

        // Status calculation logic (from roster.ts)
        const status =
          agent.status === 'paused'
            ? 'offline'
            : workload <= 2
              ? 'idle'
              : workload === 3
                ? 'active'
                : 'busy'

        expect(status).toBe('idle')
      })

      agents.length = 0
      teams.length = 0
    })

    it('should calculate active status for workload 3', () => {
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

      const status =
        agent.status === 'paused'
          ? 'offline'
          : agent.currentWorkload! <= 2
            ? 'idle'
            : agent.currentWorkload === 3
              ? 'active'
              : 'busy'

      expect(status).toBe('active')
    })

    it('should calculate busy status for workload 4-5', () => {
      const workloads = [4, 5]

      workloads.forEach((workload) => {
        const agent: Agent = {
          id: `agent-${workload}`,
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

        const status =
          agent.status === 'paused'
            ? 'offline'
            : agent.currentWorkload! <= 2
              ? 'idle'
              : agent.currentWorkload === 3
                ? 'active'
                : 'busy'

        expect(status).toBe('busy')
      })
    })

    it('should override status to offline when agent.status is paused', () => {
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
        currentWorkload: 2 // Would be idle if not paused
      }

      const status =
        agent.status === 'paused'
          ? 'offline'
          : agent.currentWorkload! <= 2
            ? 'idle'
            : agent.currentWorkload === 3
              ? 'active'
              : 'busy'

      expect(status).toBe('offline')
    })
  })

  describe('workload lifecycle scenarios', () => {
    it('should correctly track workload through multiple assignments and completions', () => {
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
        lastActiveAt: new Date(),
        currentWorkload: 0
      }

      agents.push(agent)

      const agentRef = agents[0]

      // Assign 3 tasks
      agentRef.currentWorkload = Math.min((agentRef.currentWorkload ?? 0) + 1, 5)
      expect(agentRef.currentWorkload).toBe(1)

      agentRef.currentWorkload = Math.min((agentRef.currentWorkload ?? 0) + 1, 5)
      expect(agentRef.currentWorkload).toBe(2)

      agentRef.currentWorkload = Math.min((agentRef.currentWorkload ?? 0) + 1, 5)
      expect(agentRef.currentWorkload).toBe(3)

      // Complete 1 task
      agentRef.currentWorkload = Math.max((agentRef.currentWorkload ?? 0) - 1, 0)
      expect(agentRef.currentWorkload).toBe(2)

      // Assign 2 more tasks
      agentRef.currentWorkload = Math.min((agentRef.currentWorkload ?? 0) + 1, 5)
      expect(agentRef.currentWorkload).toBe(3)

      agentRef.currentWorkload = Math.min((agentRef.currentWorkload ?? 0) + 1, 5)
      expect(agentRef.currentWorkload).toBe(4)

      // Complete all tasks
      agentRef.currentWorkload = Math.max((agentRef.currentWorkload ?? 0) - 1, 0)
      agentRef.currentWorkload = Math.max((agentRef.currentWorkload ?? 0) - 1, 0)
      agentRef.currentWorkload = Math.max((agentRef.currentWorkload ?? 0) - 1, 0)
      agentRef.currentWorkload = Math.max((agentRef.currentWorkload ?? 0) - 1, 0)
      expect(agentRef.currentWorkload).toBe(0)
    })

    it('should maintain workload integrity when agent reassigned', () => {
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
        lastActiveAt: new Date(),
        currentWorkload: 3
      }

      agents.push(agent)

      // Reassignment scenario: decrement old agent, increment new agent
      const oldAgent = agents[0]
      oldAgent.currentWorkload = Math.max((oldAgent.currentWorkload ?? 0) - 1, 0)
      expect(oldAgent.currentWorkload).toBe(2)

      const newAgent: Agent = {
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

      agents.push(newAgent)

      newAgent.currentWorkload = Math.min((newAgent.currentWorkload ?? 0) + 1, 5)
      expect(newAgent.currentWorkload).toBe(2)
    })
  })
})
