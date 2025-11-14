import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createToolRegistry,
  SecurityError,
  validateAgentIdentity
} from '../../app/server/services/orchestrator'
import type { ToolExecutor, ExecutionContext } from '../../app/server/services/orchestrator'

describe('Identity Validation - Issue #46 (Security-Critical)', () => {
  let mockExecutor: ToolExecutor
  let executionContext: ExecutionContext

  beforeEach(() => {
    mockExecutor = {
      execute: vi.fn().mockResolvedValue({ success: true })
    }

    executionContext = {
      agentId: 'agent-1',
      organizationId: 'org-1',
      correlationId: 'test-correlation-id'
    }
  })

  describe('validateAgentIdentity()', () => {
    it('should pass when claimed agentId matches execution context', () => {
      expect(() => {
        validateAgentIdentity('agent-1', executionContext, 'read_file')
      }).not.toThrow()
    })

    it('should throw SecurityError on identity mismatch', () => {
      expect(() => {
        validateAgentIdentity('agent-2', executionContext, 'read_file')
      }).toThrow(SecurityError)
    })

    it('should throw SecurityError with descriptive message', () => {
      expect(() => {
        validateAgentIdentity('agent-2', executionContext, 'read_file')
      }).toThrow('Agent ID mismatch - potential impersonation attempt')
    })

    it('should include security context in error', () => {
      try {
        validateAgentIdentity('agent-2', executionContext, 'write_file')
        expect.fail('Should have thrown SecurityError')
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityError)
        if (error instanceof SecurityError) {
          expect(error.claimedAgentId).toBe('agent-2')
          expect(error.actualAgentId).toBe('agent-1')
          expect(error.toolName).toBe('write_file')
          expect(error.correlationId).toBe('test-correlation-id')
        }
      }
    })

    it('should handle undefined claimed agentId', () => {
      expect(() => {
        validateAgentIdentity(undefined, executionContext, 'read_file')
      }).toThrow(SecurityError)
    })

    it('should handle empty string claimed agentId', () => {
      expect(() => {
        validateAgentIdentity('', executionContext, 'read_file')
      }).toThrow(SecurityError)
    })

    it('should be case-sensitive for agent IDs', () => {
      expect(() => {
        validateAgentIdentity('Agent-1', executionContext, 'read_file')
      }).toThrow(SecurityError)
    })
  })

  describe('SecurityError', () => {
    it('should be an instance of Error', () => {
      const error = new SecurityError(
        'Test error',
        'claimed-id',
        'actual-id',
        'test_tool',
        'correlation-123'
      )
      expect(error).toBeInstanceOf(Error)
    })

    it('should have correct error name', () => {
      const error = new SecurityError('Test', 'claimed', 'actual', 'tool', 'corr')
      expect(error.name).toBe('SecurityError')
    })

    it('should preserve all security context', () => {
      const error = new SecurityError(
        'Mismatch detected',
        'agent-bad',
        'agent-good',
        'delete_file',
        'corr-456'
      )

      expect(error.message).toBe('Mismatch detected')
      expect(error.claimedAgentId).toBe('agent-bad')
      expect(error.actualAgentId).toBe('agent-good')
      expect(error.toolName).toBe('delete_file')
      expect(error.correlationId).toBe('corr-456')
    })
  })

  describe('Tool Registry with Identity Validation', () => {
    it('should execute tool when agentId matches context', async () => {
      const toolRegistry = createToolRegistry()
      toolRegistry.register('test_tool', mockExecutor)

      const params = { agentId: 'agent-1', data: 'test' }

      await toolRegistry.executeTool('test_tool', params, executionContext)

      expect(mockExecutor.execute).toHaveBeenCalledWith(params, executionContext)
    })

    it('should reject tool execution on agentId mismatch', async () => {
      const toolRegistry = createToolRegistry()
      toolRegistry.register('test_tool', mockExecutor)

      const params = { agentId: 'agent-2', data: 'test' }

      await expect(toolRegistry.executeTool('test_tool', params, executionContext)).rejects.toThrow(
        SecurityError
      )

      expect(mockExecutor.execute).not.toHaveBeenCalled()
    })

    it('should validate identity before checking tool existence', async () => {
      const toolRegistry = createToolRegistry()
      // Don't register any tool

      const params = { agentId: 'agent-2', data: 'test' }

      // Should fail on identity first, not "tool not found"
      await expect(
        toolRegistry.executeTool('non_existent', params, executionContext)
      ).rejects.toThrow(SecurityError)
    })

    it('should validate all filesystem tools', async () => {
      const toolRegistry = createToolRegistry()
      toolRegistry.register('read_file', mockExecutor)
      toolRegistry.register('write_file', mockExecutor)
      toolRegistry.register('delete_file', mockExecutor)

      const validParams = { agentId: 'agent-1', path: '/test/file.md' }
      const invalidParams = { agentId: 'agent-999', path: '/test/file.md' }

      // Valid identity should work for all tools
      await expect(
        toolRegistry.executeTool('read_file', validParams, executionContext)
      ).resolves.toBeDefined()
      await expect(
        toolRegistry.executeTool(
          'write_file',
          { ...validParams, content: 'test' },
          executionContext
        )
      ).resolves.toBeDefined()
      await expect(
        toolRegistry.executeTool('delete_file', validParams, executionContext)
      ).resolves.toBeDefined()

      // Invalid identity should fail for all tools
      await expect(
        toolRegistry.executeTool('read_file', invalidParams, executionContext)
      ).rejects.toThrow(SecurityError)
      await expect(
        toolRegistry.executeTool(
          'write_file',
          { ...invalidParams, content: 'test' },
          executionContext
        )
      ).rejects.toThrow(SecurityError)
      await expect(
        toolRegistry.executeTool('delete_file', invalidParams, executionContext)
      ).rejects.toThrow(SecurityError)
    })
  })

  describe('Multi-Agent Scenarios', () => {
    it('should handle multiple agents correctly', async () => {
      const toolRegistry = createToolRegistry()
      toolRegistry.register('test_tool', mockExecutor)

      const agent1Context: ExecutionContext = {
        agentId: 'agent-1',
        organizationId: 'org-1',
        correlationId: 'corr-1'
      }

      const agent2Context: ExecutionContext = {
        agentId: 'agent-2',
        organizationId: 'org-1',
        correlationId: 'corr-2'
      }

      // Agent 1 with correct ID
      await expect(
        toolRegistry.executeTool('test_tool', { agentId: 'agent-1' }, agent1Context)
      ).resolves.toBeDefined()

      // Agent 2 with correct ID
      await expect(
        toolRegistry.executeTool('test_tool', { agentId: 'agent-2' }, agent2Context)
      ).resolves.toBeDefined()

      // Agent 1 trying to impersonate Agent 2
      await expect(
        toolRegistry.executeTool('test_tool', { agentId: 'agent-2' }, agent1Context)
      ).rejects.toThrow(SecurityError)

      // Agent 2 trying to impersonate Agent 1
      await expect(
        toolRegistry.executeTool('test_tool', { agentId: 'agent-1' }, agent2Context)
      ).rejects.toThrow(SecurityError)
    })

    it('should not have false positives in concurrent execution', async () => {
      const toolRegistry = createToolRegistry()
      toolRegistry.register('test_tool', mockExecutor)

      const contexts = [
        { agentId: 'agent-1', organizationId: 'org-1', correlationId: 'c1' },
        { agentId: 'agent-2', organizationId: 'org-1', correlationId: 'c2' },
        { agentId: 'agent-3', organizationId: 'org-1', correlationId: 'c3' }
      ]

      // All agents execute with correct IDs simultaneously
      const promises = contexts.map((ctx) =>
        toolRegistry.executeTool('test_tool', { agentId: ctx.agentId }, ctx)
      )

      await expect(Promise.all(promises)).resolves.toBeDefined()
      expect(mockExecutor.execute).toHaveBeenCalledTimes(3)
    })
  })

  describe('Security Logging', () => {
    it('should log security violations with ERROR level', () => {
      const logSpy = vi.spyOn(console, 'error')

      try {
        validateAgentIdentity('agent-bad', executionContext, 'sensitive_tool')
      } catch {
        // Expected to throw
      }

      // Verify error was logged (logger writes to console in test environment)
      expect(logSpy).toHaveBeenCalled()
    })

    it('should include full context in security logs', () => {
      const error = new SecurityError(
        'Impersonation detected',
        'agent-attacker',
        'agent-victim',
        'delete_file',
        'corr-789'
      )

      expect(error.claimedAgentId).toBe('agent-attacker')
      expect(error.actualAgentId).toBe('agent-victim')
      expect(error.toolName).toBe('delete_file')
      expect(error.correlationId).toBe('corr-789')
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing agentId in params', async () => {
      const toolRegistry = createToolRegistry()
      toolRegistry.register('test_tool', mockExecutor)

      const params = { data: 'test' } // No agentId

      await expect(toolRegistry.executeTool('test_tool', params, executionContext)).rejects.toThrow(
        SecurityError
      )
    })

    it('should handle null agentId in params', async () => {
      const toolRegistry = createToolRegistry()
      toolRegistry.register('test_tool', mockExecutor)

      const params = { agentId: null, data: 'test' }

      await expect(toolRegistry.executeTool('test_tool', params, executionContext)).rejects.toThrow(
        SecurityError
      )
    })

    it('should handle numeric agentId attempting string match', async () => {
      const toolRegistry = createToolRegistry()
      toolRegistry.register('test_tool', mockExecutor)

      const params = { agentId: 1, data: 'test' }
      const context = { ...executionContext, agentId: '1' }

      await expect(toolRegistry.executeTool('test_tool', params, context)).rejects.toThrow(
        SecurityError
      )
    })

    it('should prevent whitespace manipulation', async () => {
      const toolRegistry = createToolRegistry()
      toolRegistry.register('test_tool', mockExecutor)

      const params = { agentId: ' agent-1 ', data: 'test' }

      await expect(toolRegistry.executeTool('test_tool', params, executionContext)).rejects.toThrow(
        SecurityError
      )
    })
  })
})
