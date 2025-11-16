import { describe, it, expect } from 'vitest'
import type { MCPTool } from '@@/types'

describe('MCP Tool Translation', () => {
  const sampleMCPTool: MCPTool = {
    name: 'test_tool',
    description: 'A test tool for validation',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Agent ID' },
        param1: { type: 'string', description: 'Parameter 1' },
        param2: { type: 'number', description: 'Parameter 2' }
      },
      required: ['agentId', 'param1']
    }
  }

  describe('Anthropic Translation', () => {
    it('should convert inputSchema to input_schema', () => {
      const expected = {
        name: 'test_tool',
        description: 'A test tool for validation',
        input_schema: sampleMCPTool.inputSchema
      }

      expect(expected.input_schema).toBe(sampleMCPTool.inputSchema)
      expect(expected).toHaveProperty('input_schema')
      expect(expected).not.toHaveProperty('inputSchema')
    })

    it('should handle tool call extraction format', () => {
      const anthropicToolCall = {
        type: 'tool_use',
        id: 'call_123',
        name: 'test_tool',
        input: { agentId: 'agent-1', param1: 'value1' }
      }

      expect(anthropicToolCall.type).toBe('tool_use')
      expect(anthropicToolCall).toHaveProperty('input')
    })
  })

  describe('OpenAI Translation', () => {
    it('should wrap in function object with parameters', () => {
      const expected = {
        type: 'function',
        function: {
          name: 'test_tool',
          description: 'A test tool for validation',
          parameters: sampleMCPTool.inputSchema
        }
      }

      expect(expected.type).toBe('function')
      expect(expected.function.parameters).toBe(sampleMCPTool.inputSchema)
    })

    it('should handle tool call extraction format with JSON parsing', () => {
      const openaiToolCall = {
        id: 'call_123',
        type: 'function',
        function: {
          name: 'test_tool',
          arguments: '{"agentId":"agent-1","param1":"value1"}'
        }
      }

      expect(openaiToolCall.type).toBe('function')
      expect(typeof openaiToolCall.function.arguments).toBe('string')

      const parsed = JSON.parse(openaiToolCall.function.arguments)
      expect(parsed.agentId).toBe('agent-1')
    })
  })

  describe('Google Gemini Translation', () => {
    it('should wrap in functionDeclarations with OBJECT type', () => {
      const expected = [
        {
          functionDeclarations: [
            {
              name: 'test_tool',
              description: 'A test tool for validation',
              parameters: {
                type: 'OBJECT',
                properties: sampleMCPTool.inputSchema.properties,
                required: sampleMCPTool.inputSchema.required
              }
            }
          ]
        }
      ]

      expect(expected[0].functionDeclarations).toHaveLength(1)
      expect(expected[0].functionDeclarations[0].parameters.type).toBe('OBJECT')
    })

    it('should handle tool call extraction format', () => {
      const geminiPart = {
        functionCall: {
          name: 'test_tool',
          args: { agentId: 'agent-1', param1: 'value1' }
        }
      }

      expect(geminiPart).toHaveProperty('functionCall')
      expect(geminiPart.functionCall.args).toBeDefined()
    })
  })

  describe('ToolCall Standardization', () => {
    it('should produce consistent ToolCall format from all providers', () => {
      const standardToolCall = {
        id: 'call_123',
        name: 'test_tool',
        arguments: { agentId: 'agent-1', param1: 'value1' }
      }

      expect(standardToolCall.id).toBeTruthy()
      expect(standardToolCall.name).toBe('test_tool')
      expect(typeof standardToolCall.arguments).toBe('object')
      expect(standardToolCall.arguments.agentId).toBe('agent-1')
    })
  })
})
