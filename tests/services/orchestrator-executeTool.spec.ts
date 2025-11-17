import { describe, it, expect, beforeEach } from 'vitest'
import {
  createToolRegistry,
  PermissionError,
  type ToolExecutor,
  type ExecutionContext
} from '../../app/server/services/orchestrator'
import type { Organization, Agent, Team } from '@@/types'
import { ToolRegistry as MCPToolRegistry } from '../../app/server/services/mcp/tool-registry'
import { registerAllTools } from '../../app/server/services/mcp/register-tools'

describe('Orchestrator executeTool - Whitelist Pattern', () => {
  let registry: ReturnType<typeof createToolRegistry>
  let mockOrg: Organization
  let mockAgent: Agent
  let mockTeam: Team
  let context: ExecutionContext

  beforeEach(() => {
    // Initialize Tool Registry
    const mcpRegistry = MCPToolRegistry.getInstance()
    mcpRegistry.clear()
    registerAllTools()

    registry = createToolRegistry()

    mockOrg = {
      id: 'org-1',
      name: 'Test Org',
      githubRepoUrl: 'https://github.com/test/test',
      tokenPool: 1000000,
      rootAgentId: 'agent-1',
      createdAt: new Date(),
      toolWhitelist: ['read_file', 'write_file', 'custom_tool']
    }

    mockAgent = {
      id: 'agent-1',
      name: 'Test Agent',
      role: 'developer',
      status: 'active',
      tokenAllocation: 100000,
      tokenUsed: 0,
      systemPrompt: 'Test prompt',
      organizationId: 'org-1',
      teamId: 'team-1',
      seniorId: null,
      createdAt: new Date(),
      lastActiveAt: new Date()
    }

    mockTeam = {
      id: 'team-1',
      name: 'Test Team',
      type: 'library',
      organizationId: 'org-1',
      tokenAllocation: 500000,
      leaderId: null
    }

    context = {
      agentId: 'agent-1',
      organizationId: 'org-1',
      correlationId: 'test-correlation-id'
    }

    // Register mock executor
    const mockExecutor: ToolExecutor = {
      execute: async () => ({ success: true })
    }
    registry.register('read_file', mockExecutor)
    registry.register('write_file', mockExecutor)
    registry.register('custom_tool', mockExecutor)
  })

  describe('tool existence validation', () => {
    it('should throw PermissionError if tool not in organization tools', async () => {
      await expect(
        registry.executeTool('unknown_tool', { agentId: 'agent-1' }, context, mockOrg, mockAgent)
      ).rejects.toThrow(PermissionError)

      await expect(
        registry.executeTool('unknown_tool', { agentId: 'agent-1' }, context, mockOrg, mockAgent)
      ).rejects.toThrow("Tool 'unknown_tool' is not available in this organization")
    })

    it('should allow tool execution if tool exists in org', async () => {
      const result = await registry.executeTool(
        'custom_tool',
        { agentId: 'agent-1' },
        context,
        mockOrg,
        mockAgent
      )

      expect(result).toEqual({ success: true })
    })
  })

  describe('team whitelist validation', () => {
    it('should throw PermissionError if tool not in team whitelist', async () => {
      mockTeam.toolWhitelist = ['read_file'] // Only read_file allowed

      await expect(
        registry.executeTool(
          'write_file',
          { agentId: 'agent-1' },
          context,
          mockOrg,
          mockAgent,
          mockTeam
        )
      ).rejects.toThrow(PermissionError)

      await expect(
        registry.executeTool(
          'write_file',
          { agentId: 'agent-1' },
          context,
          mockOrg,
          mockAgent,
          mockTeam
        )
      ).rejects.toThrow('not enabled for your organization, team, or role')
    })

    it('should allow tool if in team whitelist', async () => {
      mockTeam.toolWhitelist = ['read_file']

      const result = await registry.executeTool(
        'read_file',
        { agentId: 'agent-1' },
        context,
        mockOrg,
        mockAgent,
        mockTeam
      )

      expect(result).toEqual({ success: true })
    })
  })

  describe('agent whitelist validation', () => {
    it('should throw PermissionError if tool not in agent whitelist', async () => {
      mockAgent.toolWhitelist = ['read_file'] // Only read_file allowed

      await expect(
        registry.executeTool('write_file', { agentId: 'agent-1' }, context, mockOrg, mockAgent)
      ).rejects.toThrow(PermissionError)

      await expect(
        registry.executeTool('write_file', { agentId: 'agent-1' }, context, mockOrg, mockAgent)
      ).rejects.toThrow('not enabled for your organization, team, or role')
    })

    it('should allow tool if in agent whitelist', async () => {
      mockAgent.toolWhitelist = ['read_file']

      const result = await registry.executeTool(
        'read_file',
        { agentId: 'agent-1' },
        context,
        mockOrg,
        mockAgent
      )

      expect(result).toEqual({ success: true })
    })
  })

  describe('combined whitelist validation', () => {
    it('should throw if tool not in intersection of whitelists', async () => {
      mockTeam.toolWhitelist = ['read_file', 'write_file']
      mockAgent.toolWhitelist = ['read_file'] // Only read_file in intersection

      await expect(
        registry.executeTool(
          'write_file',
          { agentId: 'agent-1' },
          context,
          mockOrg,
          mockAgent,
          mockTeam
        )
      ).rejects.toThrow('not enabled for your organization, team, or role')
    })

    it('should allow tool if in intersection of whitelists', async () => {
      mockTeam.toolWhitelist = ['read_file', 'write_file']
      mockAgent.toolWhitelist = ['read_file']

      const result = await registry.executeTool(
        'read_file',
        { agentId: 'agent-1' },
        context,
        mockOrg,
        mockAgent,
        mockTeam
      )

      expect(result).toEqual({ success: true })
    })
  })

  describe('backward compatibility', () => {
    it('should work without org/agent/team parameters (old behavior)', async () => {
      const result = await registry.executeTool('custom_tool', { agentId: 'agent-1' }, context)

      expect(result).toEqual({ success: true })
    })

    it('should skip validation if only org provided without agent', async () => {
      const result = await registry.executeTool(
        'custom_tool',
        { agentId: 'agent-1' },
        context,
        mockOrg
      )

      expect(result).toEqual({ success: true })
    })
  })

  describe('error messages - whitelist pattern', () => {
    it('should have specific error message for whitelist restriction', async () => {
      mockTeam.toolWhitelist = ['read_file'] // write_file not in whitelist

      try {
        await registry.executeTool(
          'write_file',
          { agentId: 'agent-1' },
          context,
          mockOrg,
          mockAgent,
          mockTeam
        )
        expect.fail('Should have thrown PermissionError')
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionError)
        expect((error as Error).message).toContain(
          'not enabled for your organization, team, or role'
        )
      }
    })

    it('should have specific error message for agent whitelist restriction', async () => {
      mockAgent.toolWhitelist = ['read_file'] // write_file not in whitelist

      try {
        await registry.executeTool(
          'write_file',
          { agentId: 'agent-1' },
          context,
          mockOrg,
          mockAgent
        )
        expect.fail('Should have thrown PermissionError')
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionError)
        expect((error as Error).message).toContain(
          'not enabled for your organization, team, or role'
        )
      }
    })

    it('should have error message for intersection restriction', async () => {
      mockTeam.toolWhitelist = ['read_file', 'write_file']
      mockAgent.toolWhitelist = ['read_file'] // write_file not in agent whitelist

      try {
        await registry.executeTool(
          'write_file',
          { agentId: 'agent-1' },
          context,
          mockOrg,
          mockAgent,
          mockTeam
        )
        expect.fail('Should have thrown PermissionError')
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionError)
        expect((error as Error).message).toContain(
          'not enabled for your organization, team, or role'
        )
      }
    })
  })
})
