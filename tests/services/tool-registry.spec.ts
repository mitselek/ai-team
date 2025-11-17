import { describe, it, expect, beforeEach } from 'vitest'
import { ToolRegistry } from '../../app/server/services/mcp/tool-registry'
import type { MCPTool } from '@@/types'

describe('ToolRegistry', () => {
  let registry: ToolRegistry

  beforeEach(() => {
    registry = ToolRegistry.getInstance()
    registry.clear() // Clear registry before each test
  })

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = ToolRegistry.getInstance()
      const instance2 = ToolRegistry.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('registerTool', () => {
    const sampleTool: MCPTool = {
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

    it('should register a tool successfully', () => {
      registry.registerTool('test_tool', sampleTool)

      expect(registry.hasTool('test_tool')).toBe(true)
    })

    it('should throw error when registering duplicate tool', () => {
      registry.registerTool('test_tool', sampleTool)

      expect(() => registry.registerTool('test_tool', sampleTool)).toThrow(
        "Tool 'test_tool' is already registered"
      )
    })

    it('should throw error when tool name mismatch', () => {
      const mismatchTool: MCPTool = {
        ...sampleTool,
        name: 'different_name'
      }

      expect(() => registry.registerTool('test_tool', mismatchTool)).toThrow(
        "Tool name mismatch: key='test_tool' but tool.name='different_name'"
      )
    })
  })

  describe('getTool', () => {
    const sampleTool: MCPTool = {
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

    it('should return registered tool', () => {
      registry.registerTool('test_tool', sampleTool)

      const result = registry.getTool('test_tool')

      expect(result).toEqual(sampleTool)
    })

    it('should return undefined for non-existent tool', () => {
      const result = registry.getTool('non_existent')

      expect(result).toBeUndefined()
    })
  })

  describe('getAllToolNames', () => {
    it('should return empty array when no tools registered', () => {
      expect(registry.getAllToolNames()).toEqual([])
    })

    it('should return all registered tool names', () => {
      const tool1: MCPTool = {
        name: 'tool1',
        description: 'Tool 1',
        inputSchema: { type: 'object', properties: {}, required: [] }
      }

      const tool2: MCPTool = {
        name: 'tool2',
        description: 'Tool 2',
        inputSchema: { type: 'object', properties: {}, required: [] }
      }

      registry.registerTool('tool1', tool1)
      registry.registerTool('tool2', tool2)

      const names = registry.getAllToolNames()

      expect(names).toHaveLength(2)
      expect(names).toContain('tool1')
      expect(names).toContain('tool2')
    })
  })

  describe('getAllTools', () => {
    it('should return empty array when no tools registered', () => {
      expect(registry.getAllTools()).toEqual([])
    })

    it('should return all registered tools', () => {
      const tool1: MCPTool = {
        name: 'tool1',
        description: 'Tool 1',
        inputSchema: { type: 'object', properties: {}, required: [] }
      }

      const tool2: MCPTool = {
        name: 'tool2',
        description: 'Tool 2',
        inputSchema: { type: 'object', properties: {}, required: [] }
      }

      registry.registerTool('tool1', tool1)
      registry.registerTool('tool2', tool2)

      const tools = registry.getAllTools()

      expect(tools).toHaveLength(2)
      expect(tools).toContainEqual(tool1)
      expect(tools).toContainEqual(tool2)
    })
  })

  describe('hasTool', () => {
    const sampleTool: MCPTool = {
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: {
        type: 'object',
        properties: {},
        required: []
      }
    }

    it('should return true for registered tool', () => {
      registry.registerTool('test_tool', sampleTool)

      expect(registry.hasTool('test_tool')).toBe(true)
    })

    it('should return false for non-existent tool', () => {
      expect(registry.hasTool('non_existent')).toBe(false)
    })
  })

  describe('clear', () => {
    it('should remove all registered tools', () => {
      const tool: MCPTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }

      registry.registerTool('test_tool', tool)
      expect(registry.getAllToolNames()).toHaveLength(1)

      registry.clear()

      expect(registry.getAllToolNames()).toHaveLength(0)
      expect(registry.hasTool('test_tool')).toBe(false)
    })
  })
})
