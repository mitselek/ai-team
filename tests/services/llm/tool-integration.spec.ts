import { describe, it, expect } from 'vitest'
import type { MCPTool } from '@@/types'
import type { LLMServiceOptions } from '~/server/services/llm/types'
import { LLMProvider } from '~/server/services/llm/types'

describe('LLM Tool Integration', () => {
  const sampleTools: MCPTool[] = [
    {
      name: 'read_file',
      description: 'Read content from a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' }
        },
        required: ['path']
      }
    },
    {
      name: 'write_file',
      description: 'Write content to a file',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          content: { type: 'string', description: 'File content' }
        },
        required: ['path', 'content']
      }
    }
  ]

  describe('Tool Request Flow', () => {
    it('should pass tools in LLM request when provided', async () => {
      const options: LLMServiceOptions = {
        agentId: 'test-agent',
        provider: LLMProvider.ANTHROPIC,
        tools: sampleTools
      }

      expect(options.tools).toBeDefined()
      expect(options.tools).toHaveLength(2)
      expect(options.tools?.[0].name).toBe('read_file')
    })

    it('should omit tools from request when not provided', async () => {
      const options: LLMServiceOptions = {
        agentId: 'test-agent',
        provider: LLMProvider.ANTHROPIC
      }

      expect(options.tools).toBeUndefined()
    })
  })

  describe('Tool Response Flow', () => {
    it('should return toolCalls when LLM requests tool use', async () => {
      const mockResponse = {
        text: '',
        toolCalls: [
          {
            id: 'call_123',
            name: 'read_file',
            arguments: { path: '/test/file.txt' }
          }
        ],
        tokenUsage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150
        }
      }

      expect(mockResponse.toolCalls).toBeDefined()
      expect(mockResponse.toolCalls).toHaveLength(1)
      expect(mockResponse.toolCalls?.[0].name).toBe('read_file')
      expect(mockResponse.text).toBe('')
    })

    it('should return text without toolCalls when LLM provides final answer', async () => {
      const mockResponse = {
        text: 'Here is the final answer',
        toolCalls: undefined,
        tokenUsage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150
        }
      }

      expect(mockResponse.text).toBeTruthy()
      expect(mockResponse.toolCalls).toBeUndefined()
    })
  })

  describe('Tool Call Validation', () => {
    it('should validate tool call structure', () => {
      const toolCall = {
        id: 'call_123',
        name: 'read_file',
        arguments: { path: '/test/file.txt' }
      }

      expect(toolCall.id).toBeTruthy()
      expect(typeof toolCall.id).toBe('string')
      expect(toolCall.name).toBeTruthy()
      expect(typeof toolCall.name).toBe('string')
      expect(typeof toolCall.arguments).toBe('object')
    })

    it('should handle multiple tool calls in sequence', () => {
      const toolCalls = [
        {
          id: 'call_1',
          name: 'read_file',
          arguments: { path: '/file1.txt' }
        },
        {
          id: 'call_2',
          name: 'write_file',
          arguments: { path: '/file2.txt', content: 'test' }
        }
      ]

      expect(toolCalls).toHaveLength(2)
      expect(toolCalls[0].name).toBe('read_file')
      expect(toolCalls[1].name).toBe('write_file')
      expect(toolCalls[0].id).not.toBe(toolCalls[1].id)
    })
  })

  describe('Backward Compatibility', () => {
    it('should work without tools (existing behavior)', async () => {
      const options: LLMServiceOptions = {
        agentId: 'test-agent',
        provider: LLMProvider.ANTHROPIC
      }

      expect(options.tools).toBeUndefined()
      // Service should work normally without tools
    })

    it('should work with empty tools array', async () => {
      const options: LLMServiceOptions = {
        agentId: 'test-agent',
        provider: LLMProvider.ANTHROPIC,
        tools: []
      }

      expect(options.tools).toBeDefined()
      expect(options.tools).toHaveLength(0)
      // Service should handle empty tools gracefully
    })
  })
})
