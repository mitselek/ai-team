import { describe, it, expect, beforeEach } from 'vitest'
import { createToolRegistry } from '../../app/server/services/orchestrator'
import type { ExecutionContext } from '../../app/server/services/orchestrator'
import { agents } from '../../app/server/data/agents'
import { teams } from '../../app/server/data/teams'
import type { Agent, Team } from '../../types'

describe('Orchestrator Integration - get_organization_roster', () => {
  let registry: ReturnType<typeof createToolRegistry>

  beforeEach(() => {
    // Clear test data
    agents.length = 0
    teams.length = 0

    // Create fresh registry
    registry = createToolRegistry()
  })

  describe('tool registration', () => {
    it('should register get_organization_roster tool', () => {
      expect(registry.has('get_organization_roster')).toBe(true)
    })

    it('should have executor for roster tool', () => {
      const executor = registry.getExecutor('get_organization_roster')
      expect(executor).toBeDefined()
      expect(executor?.execute).toBeInstanceOf(Function)
    })

    it('should list roster tool in available tools', () => {
      const tools = registry.listTools()
      expect(tools).toContain('get_organization_roster')
    })
  })

  describe('tool execution via orchestrator', () => {
    it('should execute roster tool with valid context', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Development',
        organizationId: 'org-1',
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
        lastActiveAt: new Date(),
        currentWorkload: 2,
        expertise: ['TypeScript']
      }

      const agent2: Agent = {
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
        currentWorkload: 4
      }

      agents.push(agent1, agent2)
      teams.push(team)

      const executor = registry.getExecutor('get_organization_roster')
      expect(executor).toBeDefined()

      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-correlation-id'
      }

      const result = await executor!.execute({}, context)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('agent_context')
      expect(result).toHaveProperty('colleagues')

      const roster = result as {
        agent_context: {
          id: string
          name: string
          team: string
          status: string
        }
        colleagues: Array<{ id: string; name: string }>
      }

      expect(roster.agent_context.id).toBe('agent-1')
      expect(roster.agent_context.name).toBe('Alice')
      expect(roster.colleagues).toHaveLength(1)
      expect(roster.colleagues[0].id).toBe('agent-2')
      expect(roster.colleagues[0].name).toBe('Bob')
    })

    it('should auto-inject agentId and organizationId from context', async () => {
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

      const executor = registry.getExecutor('get_organization_roster')
      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-id'
      }

      // Call without explicit params - should auto-inject from context
      const result = await executor!.execute({}, context)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('agent_context')

      const roster = result as { agent_context: { id: string } }
      expect(roster.agent_context.id).toBe('agent-1')
    })

    it('should execute with filter parameters', async () => {
      const team: Team = {
        id: 'team-1',
        name: 'Team',
        organizationId: 'org-1',
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
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 1,
        expertise: ['TypeScript']
      }

      const agent3: Agent = {
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
        currentWorkload: 5 // busy
      }

      agents.push(agent1, agent2, agent3)
      teams.push(team)

      const executor = registry.getExecutor('get_organization_roster')
      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-id'
      }

      // Test available filter (should exclude busy agent)
      const result = await executor!.execute({ filter: 'available' }, context)

      const roster = result as { colleagues: Array<{ id: string; currentWorkload: number }> }
      expect(roster.colleagues).toHaveLength(1)
      expect(roster.colleagues[0].id).toBe('agent-2')
    })
  })

  describe('data isolation', () => {
    it('should only return agents from same organization', async () => {
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
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      const agent3: Agent = {
        id: 'agent-3',
        name: 'Carol',
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

      agents.push(agent1, agent2, agent3)
      teams.push(team1, team2)

      const executor = registry.getExecutor('get_organization_roster')
      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-id'
      }

      const result = await executor!.execute({}, context)

      const roster = result as { colleagues: Array<{ id: string; name: string }> }

      // Should only see agent-2 (same org), not agent-3 (different org)
      expect(roster.colleagues).toHaveLength(1)
      expect(roster.colleagues[0].id).toBe('agent-2')
      expect(roster.colleagues.find((c) => c.id === 'agent-3')).toBeUndefined()
    })

    it('should not allow cross-organization access', async () => {
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

      const executor = registry.getExecutor('get_organization_roster')

      // Agent-1 trying to access org-2 data
      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-2', // Wrong org!
        correlationId: 'test-id'
      }

      const result = await executor!.execute({}, context)

      // Should return error - agent-1 not in org-2
      expect(result).toHaveProperty('error')
      const errorResult = result as { error: string }
      expect(errorResult.error).toContain('Agent agent-1 not found')
    })
  })

  describe('error handling', () => {
    it('should return error when agentId missing', async () => {
      const executor = registry.getExecutor('get_organization_roster')
      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-id'
      }

      // Pass empty params - should fail if context injection doesn't work
      const result = await executor!.execute(
        { agentId: undefined, organizationId: undefined },
        context
      )

      // Should succeed because of auto-injection, but agent doesn't exist
      expect(result).toHaveProperty('error')
      const errorResult = result as { error: string }
      expect(errorResult.error).toContain('not found')
    })

    it('should return error when agent not found', async () => {
      const executor = registry.getExecutor('get_organization_roster')
      const context: ExecutionContext = {
        agentId: 'nonexistent-agent',
        organizationId: 'org-1',
        correlationId: 'test-id'
      }

      const result = await executor!.execute({}, context)

      expect(result).toHaveProperty('error')
      const errorResult = result as { error: string }
      expect(errorResult.error).toContain('Agent nonexistent-agent not found')
    })

    it('should return error when team not found', async () => {
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

      const executor = registry.getExecutor('get_organization_roster')
      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-id'
      }

      const result = await executor!.execute({}, context)

      expect(result).toHaveProperty('error')
      const errorResult = result as { error: string }
      expect(errorResult.error).toContain('Team nonexistent-team not found')
    })

    it('should return error for by_expertise filter without expertise param', async () => {
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

      const executor = registry.getExecutor('get_organization_roster')
      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-id'
      }

      const result = await executor!.execute({ filter: 'by_expertise' }, context)

      expect(result).toHaveProperty('error')
      const errorResult = result as { error: string }
      expect(errorResult.error).toContain('expertise parameter required')
    })
  })

  describe('context passing', () => {
    it('should pass correlationId through execution chain', async () => {
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

      const executor = registry.getExecutor('get_organization_roster')
      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'unique-correlation-id'
      }

      // Should not throw, correlationId used internally for logging
      await expect(executor!.execute({}, context)).resolves.toBeDefined()
    })

    it('should handle missing optional parameters gracefully', async () => {
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

      const executor = registry.getExecutor('get_organization_roster')
      const context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'test-id'
      }

      // No filter, no expertise - should use defaults
      const result = await executor!.execute({}, context)

      expect(result).toBeDefined()
      expect(result).toHaveProperty('agent_context')
      expect(result).toHaveProperty('colleagues')
    })
  })
})
