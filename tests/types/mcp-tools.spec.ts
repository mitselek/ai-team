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

  describe('Organization with Tools', () => {
    it('should accept organization with tools array', () => {
      const org: Partial<Organization> = {
        id: 'org-test',
        name: 'Test Org',
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

      expect(org.tools).toHaveLength(1)
      expect(org.tools![0].name).toBe('read_file')
    })

    it('should accept organization without tools (optional field)', () => {
      const org: Partial<Organization> = {
        id: 'org-test',
        name: 'Test Org'
        // tools is optional
      }

      expect(org.tools).toBeUndefined()
    })
  })

  describe('Team with Tool Blacklist', () => {
    it('should accept team with toolBlacklist', () => {
      const team: Partial<Team> = {
        id: 'team-test',
        name: 'Test Team',
        toolBlacklist: ['delete_file', 'write_file']
      }

      expect(team.toolBlacklist).toContain('delete_file')
    })

    it('should accept team without toolBlacklist (optional field)', () => {
      const team: Partial<Team> = {
        id: 'team-test',
        name: 'Test Team'
        // toolBlacklist is optional
      }

      expect(team.toolBlacklist).toBeUndefined()
    })
  })

  describe('Agent with Tool Blacklist', () => {
    it('should accept agent with toolBlacklist', () => {
      const agent: Partial<Agent> = {
        id: 'agent-test',
        name: 'Test Agent',
        toolBlacklist: ['delete_file']
      }

      expect(agent.toolBlacklist).toContain('delete_file')
    })

    it('should accept agent without toolBlacklist (optional field)', () => {
      const agent: Partial<Agent> = {
        id: 'agent-test',
        name: 'Test Agent'
        // toolBlacklist is optional
      }

      expect(agent.toolBlacklist).toBeUndefined()
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
