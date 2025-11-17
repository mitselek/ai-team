import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createToolRegistry,
  getAvailableTools,
  validateToolAccess,
  getToolDefinition
} from '../../app/server/services/orchestrator'
import type {
  ToolRegistry,
  ToolExecutor,
  ExecutionContext
} from '../../app/server/services/orchestrator'
import type { Organization, Team, Agent } from '@@/types'
import { ToolRegistry as MCPToolRegistry } from '../../app/server/services/mcp/tool-registry'
import { registerAllTools } from '../../app/server/services/mcp/register-tools'

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
      // Registry starts with 5 pre-registered filesystem tools
      const initialTools = toolRegistry.listTools()
      expect(initialTools).toHaveLength(5)

      toolRegistry.register('tool_1', mockExecutor)
      toolRegistry.register('tool_2', mockExecutor)
      toolRegistry.register('tool_3', mockExecutor)

      const tools = toolRegistry.listTools()
      expect(tools).toHaveLength(8) // 5 pre-registered + 3 new
      expect(tools).toContain('tool_1')
      expect(tools).toContain('tool_2')
      expect(tools).toContain('tool_3')
    })

    it('should start with pre-registered filesystem tools', () => {
      const tools = toolRegistry.listTools()
      expect(tools).toHaveLength(5)
      expect(tools).toEqual([
        'delete_file',
        'get_file_info',
        'list_files',
        'read_file',
        'write_file'
      ])
    })

    it('should list tools in alphabetical order', () => {
      toolRegistry.register('zebra', mockExecutor)
      toolRegistry.register('apple', mockExecutor)
      toolRegistry.register('banana', mockExecutor)

      const tools = toolRegistry.listTools()
      // Should contain all new tools plus pre-registered ones
      expect(tools).toContain('apple')
      expect(tools).toContain('banana')
      expect(tools).toContain('zebra')
      // Alphabetically first should be 'apple' (before 'delete_file')
      expect(tools[0]).toBe('apple')
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
      // Should have 5 pre-registered + tool_2
      expect(tools).toHaveLength(6)
      expect(tools).toContain('tool_2')
      expect(tools).not.toContain('tool_1')
    })
  })

  describe('Tool Information', () => {
    it('should check if tool exists', () => {
      toolRegistry.register('test_tool', mockExecutor)

      expect(toolRegistry.has('test_tool')).toBe(true)
      expect(toolRegistry.has('non_existent')).toBe(false)
    })

    it('should get tool count', () => {
      // Registry now starts with 5 pre-registered filesystem tools
      const initialCount = toolRegistry.count()
      expect(initialCount).toBe(5)

      toolRegistry.register('tool_1', mockExecutor)
      expect(toolRegistry.count()).toBe(initialCount + 1)

      toolRegistry.register('tool_2', mockExecutor)
      expect(toolRegistry.count()).toBe(initialCount + 2)

      toolRegistry.unregister('tool_1')
      expect(toolRegistry.count()).toBe(initialCount + 1)
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

// Issue #51 - Tool Validation Tests
describe('Orchestrator Tool Validation - Whitelist Pattern', () => {
  // Initialize Tool Registry before tests
  beforeEach(() => {
    const registry = MCPToolRegistry.getInstance()
    registry.clear()
    registerAllTools()
  })

  // Sample data with whitelists
  const sampleOrg: Organization = {
    id: 'org-test',
    name: 'Test Org',
    createdAt: new Date('2025-01-01'),
    githubRepoUrl: 'https://github.com/test/test-org',
    tokenPool: 10000000,
    rootAgentId: 'agent-root',
    toolWhitelist: ['read_file', 'write_file', 'delete_file', 'list_files', 'get_file_info']
  }

  const sampleAgent: Agent = {
    id: 'agent-test',
    name: 'Test Agent',
    role: 'developer',
    organizationId: 'org-test',
    seniorId: null,
    teamId: 'team-test',
    systemPrompt: 'Test agent',
    tokenAllocation: 100000,
    tokenUsed: 0,
    status: 'active',
    createdAt: new Date('2025-01-01'),
    lastActiveAt: new Date('2025-01-01')
  }

  describe('getAvailableTools', () => {
    it('should return all org tools when no agent/team whitelists', () => {
      const available = getAvailableTools(sampleOrg, sampleAgent)

      expect(available).toHaveLength(5)
      expect(available.map((t) => t.name)).toEqual([
        'read_file',
        'write_file',
        'delete_file',
        'list_files',
        'get_file_info'
      ])
    })

    it('should restrict tools based on agent whitelist', () => {
      const agentWithWhitelist: Agent = {
        ...sampleAgent,
        toolWhitelist: ['read_file', 'list_files', 'get_file_info']
      }

      const available = getAvailableTools(sampleOrg, agentWithWhitelist)

      expect(available).toHaveLength(3)
      expect(available.map((t) => t.name)).toEqual(['read_file', 'list_files', 'get_file_info'])
      expect(available.map((t) => t.name)).not.toContain('delete_file')
      expect(available.map((t) => t.name)).not.toContain('write_file')
    })

    it('should restrict tools based on team whitelist', () => {
      const team: Team = {
        id: 'team-test',
        name: 'Test Team',
        organizationId: 'org-test',
        leaderId: null,
        tokenAllocation: 1000000,
        type: 'custom',
        toolWhitelist: ['read_file', 'write_file', 'list_files', 'get_file_info']
      }

      const available = getAvailableTools(sampleOrg, sampleAgent, team)

      expect(available).toHaveLength(4)
      expect(available.map((t) => t.name)).not.toContain('delete_file')
    })

    it('should use intersection of org, team, and agent whitelists', () => {
      const team: Team = {
        id: 'team-test',
        name: 'Test Team',
        organizationId: 'org-test',
        leaderId: null,
        tokenAllocation: 1000000,
        type: 'custom',
        toolWhitelist: ['read_file', 'write_file', 'list_files', 'get_file_info']
      }

      const agentWithWhitelist: Agent = {
        ...sampleAgent,
        toolWhitelist: ['read_file', 'list_files', 'get_file_info']
      }

      const available = getAvailableTools(sampleOrg, agentWithWhitelist, team)

      expect(available).toHaveLength(3)
      expect(available.map((t) => t.name)).toEqual(['read_file', 'list_files', 'get_file_info'])
    })

    it('should return all tools when org has no whitelist', () => {
      const orgWithoutWhitelist: Organization = {
        ...sampleOrg,
        toolWhitelist: undefined
      }

      const available = getAvailableTools(orgWithoutWhitelist, sampleAgent)

      // Should return all 10 registered tools
      expect(available.length).toBeGreaterThan(5)
    })

    it('should handle whitelist with non-existent tool names', () => {
      const agentWithWhitelist: Agent = {
        ...sampleAgent,
        toolWhitelist: ['read_file', 'non_existent_tool', 'another_fake_tool']
      }

      const available = getAvailableTools(sampleOrg, agentWithWhitelist)

      // Should only return read_file (intersection with org whitelist, non-existent tools ignored)
      expect(available).toHaveLength(1)
      expect(available[0].name).toBe('read_file')
    })
  })

  describe('validateToolAccess', () => {
    it('should return true for accessible tool', () => {
      const canAccess = validateToolAccess('read_file', sampleOrg, sampleAgent)

      expect(canAccess).toBe(true)
    })

    it('should return false for tool not in agent whitelist', () => {
      const agentWithWhitelist: Agent = {
        ...sampleAgent,
        toolWhitelist: ['read_file', 'list_files']
      }

      const canAccess = validateToolAccess('delete_file', sampleOrg, agentWithWhitelist)

      expect(canAccess).toBe(false)
    })

    it('should return false for non-existent tool', () => {
      const canAccess = validateToolAccess('fake_tool', sampleOrg, sampleAgent)

      expect(canAccess).toBe(false)
    })

    it('should respect team whitelist', () => {
      const team: Team = {
        id: 'team-test',
        name: 'Test Team',
        organizationId: 'org-test',
        leaderId: null,
        tokenAllocation: 1000000,
        type: 'custom',
        toolWhitelist: ['read_file', 'list_files', 'get_file_info']
      }

      const canAccess = validateToolAccess('write_file', sampleOrg, sampleAgent, team)

      expect(canAccess).toBe(false)
    })
  })

  describe('getToolDefinition', () => {
    it('should return tool definition by name from registry', () => {
      const tool = getToolDefinition('read_file', sampleOrg)

      expect(tool).toBeDefined()
      expect(tool!.name).toBe('read_file')
      expect(tool!.description).toBeTruthy()
    })

    it('should return undefined for non-existent tool', () => {
      const tool = getToolDefinition('fake_tool', sampleOrg)

      expect(tool).toBeUndefined()
    })

    it('should return tool definition even when org has no whitelist', () => {
      const orgWithoutWhitelist: Organization = {
        ...sampleOrg,
        toolWhitelist: undefined
      }

      const tool = getToolDefinition('read_file', orgWithoutWhitelist)

      expect(tool).toBeDefined()
      expect(tool!.name).toBe('read_file')
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle HR team with restricted delete access', () => {
      const hrTeam: Team = {
        id: 'team-hr',
        name: 'HR Team',
        organizationId: 'org-test',
        leaderId: null,
        tokenAllocation: 1000000,
        type: 'hr',
        toolWhitelist: ['read_file', 'write_file', 'list_files', 'get_file_info'] // No delete
      }

      const hrAgent: Agent = {
        ...sampleAgent,
        id: 'agent-hr',
        name: 'Marcus'
      }

      const available = getAvailableTools(sampleOrg, hrAgent, hrTeam)

      expect(available.map((t) => t.name)).toContain('read_file')
      expect(available.map((t) => t.name)).toContain('write_file')
      expect(available.map((t) => t.name)).not.toContain('delete_file')
    })

    it('should handle junior developer with read-only access', () => {
      const juniorAgent: Agent = {
        ...sampleAgent,
        id: 'agent-junior',
        name: 'Junior Dev',
        toolWhitelist: ['read_file', 'list_files', 'get_file_info'] // Read-only
      }

      const available = getAvailableTools(sampleOrg, juniorAgent)

      expect(available.map((t) => t.name)).toEqual(['read_file', 'list_files', 'get_file_info'])
    })

    it('should handle leadership team with full access', () => {
      const leadershipTeam: Team = {
        id: 'team-leadership',
        name: 'Leadership',
        organizationId: 'org-test',
        leaderId: null,
        tokenAllocation: 2000000,
        type: 'custom'
        // No toolWhitelist = inherits org whitelist (full access within org)
      }

      const leaderAgent: Agent = {
        ...sampleAgent,
        id: 'agent-leader',
        name: 'Team Lead'
        // No toolWhitelist = inherits team/org whitelist
      }

      const available = getAvailableTools(sampleOrg, leaderAgent, leadershipTeam)

      expect(available).toHaveLength(5) // All org tools available
    })
  })
})
