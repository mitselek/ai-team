import { describe, it, expect } from 'vitest'
import type { Agent } from '../../types'

describe('Agent Type - F074 Roster Extensions', () => {
  describe('currentWorkload field', () => {
    it('should accept agent without currentWorkload (backward compatible)', () => {
      const agent: Agent = {
        id: 'test-agent-1',
        name: 'Test Agent',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'You are a helpful agent',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      expect(agent).toBeDefined()
      expect(agent.currentWorkload).toBeUndefined()
    })

    it('should accept agent with currentWorkload as number', () => {
      const agent: Agent = {
        id: 'test-agent-2',
        name: 'Test Agent',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'You are a helpful agent',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 3
      }

      expect(agent).toBeDefined()
      expect(agent.currentWorkload).toBe(3)
    })

    it('should accept valid workload range (0-5)', () => {
      const validWorkloads = [0, 1, 2, 3, 4, 5]

      validWorkloads.forEach((workload) => {
        const agent: Agent = {
          id: `test-agent-${workload}`,
          name: 'Test Agent',
          role: 'Developer',
          seniorId: null,
          teamId: 'team-1',
          organizationId: 'org-1',
          systemPrompt: 'You are a helpful agent',
          tokenAllocation: 1000,
          tokenUsed: 0,
          status: 'active',
          createdAt: new Date(),
          lastActiveAt: new Date(),
          currentWorkload: workload
        }

        expect(agent.currentWorkload).toBe(workload)
      })
    })
  })

  describe('expertise field', () => {
    it('should accept agent without expertise (backward compatible)', () => {
      const agent: Agent = {
        id: 'test-agent-1',
        name: 'Test Agent',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'You are a helpful agent',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      expect(agent).toBeDefined()
      expect(agent.expertise).toBeUndefined()
    })

    it('should accept agent with expertise as string array', () => {
      const agent: Agent = {
        id: 'test-agent-2',
        name: 'Test Agent',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'You are a helpful agent',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expertise: ['TypeScript', 'Vue', 'Testing']
      }

      expect(agent).toBeDefined()
      expect(agent.expertise).toEqual(['TypeScript', 'Vue', 'Testing'])
      expect(Array.isArray(agent.expertise)).toBe(true)
    })

    it('should accept empty expertise array', () => {
      const agent: Agent = {
        id: 'test-agent-3',
        name: 'Test Agent',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'You are a helpful agent',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expertise: []
      }

      expect(agent).toBeDefined()
      expect(agent.expertise).toEqual([])
      expect(Array.isArray(agent.expertise)).toBe(true)
    })

    it('should accept multiple expertise domains', () => {
      const agent: Agent = {
        id: 'test-agent-4',
        name: 'Test Agent',
        role: 'Full Stack Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'You are a helpful agent',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        expertise: ['Frontend', 'Backend', 'React', 'Node.js', 'TypeScript', 'PostgreSQL']
      }

      expect(agent).toBeDefined()
      expect(agent.expertise).toHaveLength(6)
      expect(agent.expertise).toContain('Frontend')
      expect(agent.expertise).toContain('PostgreSQL')
    })
  })

  describe('combined fields', () => {
    it('should accept agent with both currentWorkload and expertise', () => {
      const agent: Agent = {
        id: 'test-agent-full',
        name: 'Senior Developer',
        role: 'Lead Developer',
        seniorId: 'manager-1',
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'You are a senior developer',
        tokenAllocation: 2000,
        tokenUsed: 500,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        currentWorkload: 4,
        expertise: ['Architecture', 'Mentoring', 'Code Review', 'TypeScript']
      }

      expect(agent).toBeDefined()
      expect(agent.currentWorkload).toBe(4)
      expect(agent.expertise).toEqual(['Architecture', 'Mentoring', 'Code Review', 'TypeScript'])
    })

    it('should maintain backward compatibility with existing agent objects', () => {
      // Existing agents without new fields should still work
      const existingAgent: Agent = {
        id: 'existing-agent',
        name: 'Existing Agent',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Original prompt',
        tokenAllocation: 1000,
        tokenUsed: 100,
        status: 'active',
        createdAt: new Date('2025-01-01'),
        lastActiveAt: new Date('2025-01-15'),
        maxFiles: 500,
        storageQuotaMB: 50,
        toolWhitelist: ['read_file', 'write_file']
      }

      expect(existingAgent).toBeDefined()
      expect(existingAgent.currentWorkload).toBeUndefined()
      expect(existingAgent.expertise).toBeUndefined()
      // Existing optional fields still work
      expect(existingAgent.maxFiles).toBe(500)
      expect(existingAgent.toolWhitelist).toEqual(['read_file', 'write_file'])
    })
  })
})
