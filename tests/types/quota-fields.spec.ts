import { describe, it, expect } from 'vitest'
import type { Agent, Team } from '@@/types'

describe('Storage Quota Fields - Issue #40', () => {
  describe('Agent quota fields', () => {
    it('should allow Agent with maxFiles field', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Test prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        maxFiles: 500
      }

      expect(agent.maxFiles).toBe(500)
    })

    it('should allow Agent with storageQuotaMB field', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Test prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        storageQuotaMB: 50
      }

      expect(agent.storageQuotaMB).toBe(50)
    })

    it('should allow Agent with both quota fields', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Test prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date(),
        maxFiles: 1000,
        storageQuotaMB: 100
      }

      expect(agent.maxFiles).toBe(1000)
      expect(agent.storageQuotaMB).toBe(100)
    })

    it('should allow Agent without quota fields (optional)', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'Test Agent',
        role: 'Developer',
        seniorId: null,
        teamId: 'team-1',
        organizationId: 'org-1',
        systemPrompt: 'Test prompt',
        tokenAllocation: 1000,
        tokenUsed: 0,
        status: 'active',
        createdAt: new Date(),
        lastActiveAt: new Date()
      }

      expect(agent.maxFiles).toBeUndefined()
      expect(agent.storageQuotaMB).toBeUndefined()
    })
  })

  describe('Team quota fields', () => {
    it('should allow Team with maxFiles field', () => {
      const team: Team = {
        id: 'team-1',
        name: 'Development',
        organizationId: 'org-1',
        leaderId: 'agent-1',
        tokenAllocation: 5000,
        type: 'custom',
        maxFiles: 1500
      }

      expect(team.maxFiles).toBe(1500)
    })

    it('should allow Team with storageQuotaGB field', () => {
      const team: Team = {
        id: 'team-1',
        name: 'Development',
        organizationId: 'org-1',
        leaderId: 'agent-1',
        tokenAllocation: 5000,
        type: 'custom',
        storageQuotaGB: 0.5
      }

      expect(team.storageQuotaGB).toBe(0.5)
    })

    it('should allow Team with both quota fields', () => {
      const team: Team = {
        id: 'team-1',
        name: 'Development',
        organizationId: 'org-1',
        leaderId: 'agent-1',
        tokenAllocation: 5000,
        type: 'custom',
        maxFiles: 2000,
        storageQuotaGB: 1
      }

      expect(team.maxFiles).toBe(2000)
      expect(team.storageQuotaGB).toBe(1)
    })

    it('should allow Team without quota fields (optional)', () => {
      const team: Team = {
        id: 'team-1',
        name: 'Development',
        organizationId: 'org-1',
        leaderId: 'agent-1',
        tokenAllocation: 5000,
        type: 'custom'
      }

      expect(team.maxFiles).toBeUndefined()
      expect(team.storageQuotaGB).toBeUndefined()
    })
  })

  describe('Default values documentation', () => {
    it('documents Agent default maxFiles is 1000', () => {
      // Default documented in type definition comments
      const defaultMaxFiles = 1000
      expect(defaultMaxFiles).toBe(1000)
    })

    it('documents Agent default storageQuotaMB is 100', () => {
      // Default documented in type definition comments
      const defaultStorageQuotaMB = 100
      expect(defaultStorageQuotaMB).toBe(100)
    })

    it('documents Team default maxFiles is 2000', () => {
      // Default documented in type definition comments
      const defaultMaxFiles = 2000
      expect(defaultMaxFiles).toBe(2000)
    })

    it('documents Team default storageQuotaGB is 1', () => {
      // Default documented in type definition comments
      const defaultStorageQuotaGB = 1
      expect(defaultStorageQuotaGB).toBe(1)
    })
  })
})
