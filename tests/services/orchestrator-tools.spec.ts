import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ToolRegistry, createToolRegistry } from '../../app/server/services/orchestrator'
import type { ToolExecutor, ExecutionContext } from '../../app/server/services/orchestrator'

describe('ToolRegistry - Issue #45', () => {
  let toolRegistry: ToolRegistry
  let mockExecutor: ToolExecutor
  let mockContext: ExecutionContext

  beforeEach(() => {
    toolRegistry = createToolRegistry()

    mockContext = {
      agentId: 'agent-1',
      organizationId: 'org-1',
      correlationId: 'test-correlation-id'
    }

    mockExecutor = {
      execute: vi.fn().mockResolvedValue({ success: true })
    }
  })

  describe('Tool Registration', () => {
    it('should register a tool successfully', () => {
      toolRegistry.register('test_tool', mockExecutor)

      const executor = toolRegistry.getExecutor('test_tool')
      expect(executor).toBe(mockExecutor)
    })

    it('should register multiple tools', () => {
      const executor1 = { execute: vi.fn() }
      const executor2 = { execute: vi.fn() }

      toolRegistry.register('tool_1', executor1)
      toolRegistry.register('tool_2', executor2)

      expect(toolRegistry.getExecutor('tool_1')).toBe(executor1)
      expect(toolRegistry.getExecutor('tool_2')).toBe(executor2)
    })

    it('should overwrite existing tool with same name', () => {
      const executor1 = { execute: vi.fn() }
      const executor2 = { execute: vi.fn() }

      toolRegistry.register('test_tool', executor1)
      toolRegistry.register('test_tool', executor2)

      expect(toolRegistry.getExecutor('test_tool')).toBe(executor2)
    })

    it('should handle empty tool names', () => {
      expect(() => {
        toolRegistry.register('', mockExecutor)
      }).toThrow('Tool name cannot be empty')
    })
  })

  describe('Tool Discovery', () => {
    it('should return undefined for non-existent tool', () => {
      const executor = toolRegistry.getExecutor('non_existent')
      expect(executor).toBeUndefined()
    })

    it('should list all registered tools', () => {
      toolRegistry.register('tool_1', mockExecutor)
      toolRegistry.register('tool_2', mockExecutor)
      toolRegistry.register('tool_3', mockExecutor)

      const tools = toolRegistry.listTools()
      expect(tools).toHaveLength(3)
      expect(tools).toContain('tool_1')
      expect(tools).toContain('tool_2')
      expect(tools).toContain('tool_3')
    })

    it('should return empty array when no tools registered', () => {
      const tools = toolRegistry.listTools()
      expect(tools).toEqual([])
    })

    it('should list tools in alphabetical order', () => {
      toolRegistry.register('zebra', mockExecutor)
      toolRegistry.register('apple', mockExecutor)
      toolRegistry.register('banana', mockExecutor)

      const tools = toolRegistry.listTools()
      expect(tools).toEqual(['apple', 'banana', 'zebra'])
    })
  })

  describe('Tool Execution', () => {
    it('should execute a registered tool', async () => {
      const testExecutor = {
        execute: vi.fn().mockResolvedValue({ result: 'success' })
      }

      toolRegistry.register('test_tool', testExecutor)

      const params = { agentId: 'agent-1', param: 'value' }
      const result = await toolRegistry.executeTool('test_tool', params, mockContext)

      expect(testExecutor.execute).toHaveBeenCalledWith(params, mockContext)
      expect(result).toEqual({ result: 'success' })
    })

    it('should throw error for unknown tool', async () => {
      await expect(
        toolRegistry.executeTool('unknown_tool', { agentId: 'agent-1' }, mockContext)
      ).rejects.toThrow('Tool unknown_tool not found')
    })

    it('should pass parameters correctly to executor', async () => {
      const testExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }

      toolRegistry.register('test_tool', testExecutor)

      const params = {
        agentId: 'agent-1',
        path: '/test/path',
        content: 'test content'
      }

      await toolRegistry.executeTool('test_tool', params, mockContext)

      expect(testExecutor.execute).toHaveBeenCalledWith(params, mockContext)
    })

    it('should pass execution context correctly', async () => {
      const testExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }

      toolRegistry.register('test_tool', testExecutor)

      const context: ExecutionContext = {
        agentId: 'agent-2',
        organizationId: 'org-2',
        correlationId: 'correlation-123'
      }

      const params = { agentId: 'agent-2' }
      await toolRegistry.executeTool('test_tool', params, context)

      expect(testExecutor.execute).toHaveBeenCalledWith(params, context)
    })

    it('should propagate executor errors', async () => {
      const testExecutor = {
        execute: vi.fn().mockRejectedValue(new Error('Execution failed'))
      }

      toolRegistry.register('test_tool', testExecutor)

      await expect(
        toolRegistry.executeTool('test_tool', { agentId: 'agent-1' }, mockContext)
      ).rejects.toThrow('Execution failed')
    })
  })

  describe('Tool Unregistration', () => {
    it('should unregister a tool', () => {
      toolRegistry.register('test_tool', mockExecutor)
      expect(toolRegistry.getExecutor('test_tool')).toBe(mockExecutor)

      toolRegistry.unregister('test_tool')
      expect(toolRegistry.getExecutor('test_tool')).toBeUndefined()
    })

    it('should handle unregistering non-existent tool gracefully', () => {
      expect(() => {
        toolRegistry.unregister('non_existent')
      }).not.toThrow()
    })

    it('should remove tool from list after unregistration', () => {
      toolRegistry.register('tool_1', mockExecutor)
      toolRegistry.register('tool_2', mockExecutor)

      toolRegistry.unregister('tool_1')

      const tools = toolRegistry.listTools()
      expect(tools).toEqual(['tool_2'])
    })
  })

  describe('Tool Information', () => {
    it('should check if tool exists', () => {
      toolRegistry.register('test_tool', mockExecutor)

      expect(toolRegistry.has('test_tool')).toBe(true)
      expect(toolRegistry.has('non_existent')).toBe(false)
    })

    it('should get tool count', () => {
      expect(toolRegistry.count()).toBe(0)

      toolRegistry.register('tool_1', mockExecutor)
      expect(toolRegistry.count()).toBe(1)

      toolRegistry.register('tool_2', mockExecutor)
      expect(toolRegistry.count()).toBe(2)

      toolRegistry.unregister('tool_1')
      expect(toolRegistry.count()).toBe(1)
    })
  })

  describe('Filesystem Tools Integration', () => {
    it('should register all filesystem tools', () => {
      const fileExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }

      toolRegistry.register('read_file', fileExecutor)
      toolRegistry.register('write_file', fileExecutor)
      toolRegistry.register('delete_file', fileExecutor)
      toolRegistry.register('list_files', fileExecutor)
      toolRegistry.register('get_file_info', fileExecutor)

      const tools = toolRegistry.listTools()
      expect(tools).toContain('read_file')
      expect(tools).toContain('write_file')
      expect(tools).toContain('delete_file')
      expect(tools).toContain('list_files')
      expect(tools).toContain('get_file_info')
      expect(tools).toHaveLength(5)
    })

    it('should execute read_file tool', async () => {
      const fileExecutor = {
        execute: vi.fn().mockResolvedValue({
          content: 'file content',
          metadata: { size: 12 }
        })
      }

      toolRegistry.register('read_file', fileExecutor)

      const result = await toolRegistry.executeTool(
        'read_file',
        { agentId: 'agent-1', path: '/test/file.md' },
        mockContext
      )

      expect(result).toHaveProperty('content', 'file content')
      expect(fileExecutor.execute).toHaveBeenCalled()
    })

    it('should execute write_file tool', async () => {
      const fileExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true })
      }

      toolRegistry.register('write_file', fileExecutor)

      await toolRegistry.executeTool(
        'write_file',
        { agentId: 'agent-1', path: '/test/file.md', content: 'new content' },
        mockContext
      )

      expect(fileExecutor.execute).toHaveBeenCalledWith(
        { agentId: 'agent-1', path: '/test/file.md', content: 'new content' },
        mockContext
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle executor throwing synchronous error', async () => {
      const badExecutor = {
        execute: vi.fn().mockImplementation(() => {
          throw new Error('Sync error')
        })
      }

      toolRegistry.register('bad_tool', badExecutor)

      await expect(
        toolRegistry.executeTool('bad_tool', { agentId: 'agent-1' }, mockContext)
      ).rejects.toThrow('Sync error')
    })

    it('should handle executor throwing async error', async () => {
      const badExecutor = {
        execute: vi.fn().mockRejectedValue(new Error('Async error'))
      }

      toolRegistry.register('bad_tool', badExecutor)

      await expect(
        toolRegistry.executeTool('bad_tool', { agentId: 'agent-1' }, mockContext)
      ).rejects.toThrow('Async error')
    })

    it('should provide clear error message for missing tool', async () => {
      await expect(
        toolRegistry.executeTool('missing', { agentId: 'agent-1' }, mockContext)
      ).rejects.toThrow('Tool missing not found')
    })
  })
})
