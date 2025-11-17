import { describe, it, expect } from 'vitest'
import type { MCPTool, Organization, Team, Agent } from '@@/types'
import type { LLMServiceOptions, LLMResponse, ToolCall } from '../../app/server/services/llm/types'

describe('MCP Tool Type Definitions', () => {
  describe('MCPTool Interface', () => {
    it('should accept valid MCP tool definition', () => {
      const tool: MCPTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' }
          },
          required: ['param1']
        }
      }

      expect(tool.name).toBe('test_tool')
      expect(tool.inputSchema.type).toBe('object')
    })
  })

  describe('Organization with Tool Whitelist', () => {
    it('should accept organization with toolWhitelist array', () => {
      const org: Partial<Organization> = {
        id: 'org-test',
        name: 'Test Org',
        toolWhitelist: ['read_file', 'write_file', 'delete_file']
      }

      expect(org.toolWhitelist).toHaveLength(3)
      expect(org.toolWhitelist).toContain('read_file')
    })

    it('should accept organization without toolWhitelist (optional field)', () => {
      const org: Partial<Organization> = {
        id: 'org-test',
        name: 'Test Org'
        // toolWhitelist is optional (defaults to all tools)
      }

      expect(org.toolWhitelist).toBeUndefined()
    })
  })

  describe('Team with Tool Whitelist', () => {
    it('should accept team with toolWhitelist', () => {
      const team: Partial<Team> = {
        id: 'team-test',
        name: 'Test Team',
        toolWhitelist: ['read_file', 'write_file']
      }

      expect(team.toolWhitelist).toContain('read_file')
    })

    it('should accept team without toolWhitelist (optional field)', () => {
      const team: Partial<Team> = {
        id: 'team-test',
        name: 'Test Team'
        // toolWhitelist is optional (inherits from org)
      }

      expect(team.toolWhitelist).toBeUndefined()
    })
  })

  describe('Agent with Tool Whitelist', () => {
    it('should accept agent with toolWhitelist', () => {
      const agent: Partial<Agent> = {
        id: 'agent-test',
        name: 'Test Agent',
        toolWhitelist: ['read_file']
      }

      expect(agent.toolWhitelist).toContain('read_file')
    })

    it('should accept agent without toolWhitelist (optional field)', () => {
      const agent: Partial<Agent> = {
        id: 'agent-test',
        name: 'Test Agent'
        // toolWhitelist is optional (inherits from team/org)
      }

      expect(agent.toolWhitelist).toBeUndefined()
    })
  })

  describe('LLM Service Types', () => {
    it('should accept LLMServiceOptions with tools', () => {
      const options: Partial<LLMServiceOptions> = {
        model: 'claude-sonnet-4',
        tools: [
          {
            name: 'read_file',
            description: 'Read file',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        ]
      }

      expect(options.tools).toHaveLength(1)
    })

    it('should accept LLMServiceOptions without tools (optional)', () => {
      const options: Partial<LLMServiceOptions> = {
        model: 'claude-sonnet-4'
        // tools is optional
      }

      expect(options.tools).toBeUndefined()
    })

    it('should accept ToolCall with required fields', () => {
      const toolCall: ToolCall = {
        id: 'call_123',
        name: 'read_file',
        arguments: { path: '/test.txt', agentId: 'agent-1' }
      }

      expect(toolCall.id).toBe('call_123')
      expect(toolCall.name).toBe('read_file')
    })

    it('should accept LLMResponse with toolCalls', () => {
      const response: Partial<LLMResponse> = {
        content: 'I need to read a file',
        toolCalls: [
          {
            id: 'call_123',
            name: 'read_file',
            arguments: { path: '/test.txt', agentId: 'agent-1' }
          }
        ]
      }

      expect(response.toolCalls).toHaveLength(1)
    })

    it('should accept LLMResponse without toolCalls (final text response)', () => {
      const response: Partial<LLMResponse> = {
        content: 'Here is your answer'
        // toolCalls is optional (undefined = final response)
      }

      expect(response.toolCalls).toBeUndefined()
    })
  })
})
