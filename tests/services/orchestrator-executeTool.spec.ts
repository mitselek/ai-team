import { describe, it, expect, beforeEach } from 'vitest'
import {
  createToolRegistry,
  PermissionError,
  type ToolExecutor,
  type ExecutionContext
} from '../../app/server/services/orchestrator'
import type { Organization, Agent, Team } from '@@/types'

describe('Orchestrator executeTool - Issue #54', () => {
  let registry: ReturnType<typeof createToolRegistry>
  let mockOrg: Organization
  let mockAgent: Agent
  let mockTeam: Team
  let context: ExecutionContext

  beforeEach(() => {
    registry = createToolRegistry()

    mockOrg = {
      id: 'org-1',
      name: 'Test Org',
      githubRepoUrl: 'https://github.com/test/test',
      tokenPool: 1000000,
      rootAgentId: 'agent-1',
      createdAt: new Date(),
      tools: [
        {
          name: 'read_file',
          description: 'Read a file',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: { type: 'string' },
              path: { type: 'string' }
            },
            required: ['agentId', 'path']
          }
        },
        {
          name: 'write_file',
          description: 'Write a file',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: { type: 'string' },
              path: { type: 'string' },
              content: { type: 'string' }
            },
            required: ['agentId', 'path', 'content']
          }
        },
        {
          name: 'custom_tool',
          description: 'Custom tool',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: { type: 'string' }
            },
            required: ['agentId']
          }
        }
      ]
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

  describe('team blacklist validation', () => {
    it('should throw PermissionError if tool in team blacklist', async () => {
      mockTeam.toolBlacklist = ['write_file']

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
      ).rejects.toThrow("Tool 'write_file' is restricted for your team")
    })

    it('should allow tool if not in team blacklist', async () => {
      mockTeam.toolBlacklist = ['write_file']

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

  describe('agent blacklist validation', () => {
    it('should throw PermissionError if tool in agent blacklist', async () => {
      mockAgent.toolBlacklist = ['write_file']

      await expect(
        registry.executeTool('write_file', { agentId: 'agent-1' }, context, mockOrg, mockAgent)
      ).rejects.toThrow(PermissionError)

      await expect(
        registry.executeTool('write_file', { agentId: 'agent-1' }, context, mockOrg, mockAgent)
      ).rejects.toThrow("Tool 'write_file' is restricted for your role")
    })

    it('should allow tool if not in agent blacklist', async () => {
      mockAgent.toolBlacklist = ['write_file']

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

  describe('combined blacklist validation', () => {
    it('should throw with combined message if tool in both blacklists', async () => {
      mockTeam.toolBlacklist = ['write_file']
      mockAgent.toolBlacklist = ['write_file']

      await expect(
        registry.executeTool(
          'write_file',
          { agentId: 'agent-1' },
          context,
          mockOrg,
          mockAgent,
          mockTeam
        )
      ).rejects.toThrow("Tool 'write_file' is restricted for your role and team")
    })

    it('should allow tool if not in any blacklist', async () => {
      mockTeam.toolBlacklist = ['write_file']
      mockAgent.toolBlacklist = ['custom_tool']

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

  describe('error messages - Issue #54 requirement', () => {
    it('should have specific error message for team restriction', async () => {
      mockTeam.toolBlacklist = ['write_file']

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
        expect((error as Error).message).toContain('restricted for your team')
      }
    })

    it('should have specific error message for role restriction', async () => {
      mockAgent.toolBlacklist = ['write_file']

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
        expect((error as Error).message).toContain('restricted for your role')
      }
    })

    it('should have combined error message for both restrictions', async () => {
      mockTeam.toolBlacklist = ['write_file']
      mockAgent.toolBlacklist = ['write_file']

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
        expect((error as Error).message).toContain('restricted for your role and team')
      }
    })
  })
})
