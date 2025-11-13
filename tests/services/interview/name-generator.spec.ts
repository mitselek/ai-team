import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateAgentName,
  suggestAlternativeNames
} from '../../../app/server/services/interview/name-generator'
import { agents } from '../../../app/server/data/agents'
import type { CandidateProfile } from '../../../app/server/services/interview/types'

// Mock the logger
vi.mock('../../../app/server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  })
}))

// Mock the LLM service
vi.mock('../../../app/server/services/llm', () => ({
  generateCompletion: vi.fn()
}))

import { generateCompletion } from '../../../app/server/services/llm'

const mockGenerateCompletion = vi.mocked(generateCompletion)

const createTestProfile = (): CandidateProfile => ({
  role: 'Software Engineer',
  expertise: ['TypeScript', 'Nuxt'],
  preferences: {
    communicationStyle: 'Direct',
    workingHours: 'Flexible',
    autonomyLevel: 'High'
  },
  personality: {
    traits: ['analytical', 'detail-oriented'],
    tone: 'professional'
  }
})

describe('Name Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear agents array
    agents.length = 0
  })

  describe('generateAgentName', () => {
    it('should generate traditional names with surnames', async () => {
      // Mock LLM to return traditional names
      mockGenerateCompletion.mockResolvedValue({
        content: 'John Smith\nSarah Johnson\nMichael Chen',
        speakerLLM: 'mock:model'
      })

      const profile = createTestProfile()
      const name = await generateAgentName(profile, 'test-team-1', 'interviewer-1')

      expect(name).toBe('John Smith')
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('traditional human names'),
        expect.objectContaining({
          agentId: 'interviewer-1',
          temperature: 0.9
        })
      )
    })

    it('should accept single first names', async () => {
      // Mock LLM to return a mix of names
      mockGenerateCompletion.mockResolvedValue({
        content: 'Jennifer\nDavid Garcia\nMaria Rodriguez',
        speakerLLM: 'mock:model'
      })

      const profile = createTestProfile()
      const name = await generateAgentName(profile, 'test-team-1', 'interviewer-1')

      expect(name).toBe('Jennifer')
    })

    it('should generate culturally diverse names', async () => {
      // Mock LLM to return diverse names
      mockGenerateCompletion.mockResolvedValue({
        content: 'Raj Patel\nYuki Tanaka\nAhmed Hassan',
        speakerLLM: 'mock:model'
      })

      const profile = createTestProfile()
      const name = await generateAgentName(profile, 'test-team-1', 'interviewer-1')

      expect(name).toBe('Raj Patel')
    })

    it('should avoid existing names', async () => {
      // Add existing agent
      agents.push({
        id: 'agent-1',
        name: 'John Smith',
        role: 'Developer',
        status: 'active',
        tokenAllocation: 10000,
        tokenUsed: 0,
        systemPrompt: 'Test prompt',
        teamId: 'test-team-1',
        seniorId: null,
        organizationId: 'org-1',
        createdAt: new Date(),
        lastActiveAt: new Date()
      })

      mockGenerateCompletion.mockResolvedValue({
        content: 'John Smith\nSarah Johnson\nMichael Chen',
        speakerLLM: 'mock:model'
      })

      const profile = createTestProfile()
      const name = await generateAgentName(profile, 'test-team-1', 'interviewer-1')

      // Should skip 'John Smith' and use 'Sarah Johnson'
      expect(name).toBe('Sarah Johnson')
    })

    it('should handle names with spaces in validation', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: "Maria Rodriguez\nJohn O'Brien\nJean-Pierre Martin",
        speakerLLM: 'mock:model'
      })

      const profile = createTestProfile()
      const name = await generateAgentName(profile, 'test-team-1', 'interviewer-1')

      // All names should be valid (spaces, hyphens, apostrophes)
      expect(['Maria Rodriguez', "John O'Brien", 'Jean-Pierre Martin']).toContain(name)
    })

    it('should use fallback names when LLM fails', async () => {
      mockGenerateCompletion.mockRejectedValue(new Error('LLM error'))

      const profile = createTestProfile()
      const name = await generateAgentName(profile, 'test-team-1', 'interviewer-1')

      // Should return a fallback name (may have surname ~70% of time)
      expect(name).toBeTruthy()
      expect(name.length).toBeGreaterThan(0)
      // Should start with a letter
      expect(/^[a-zA-Z]/.test(name)).toBe(true)
    })

    it('should generate unique names when all suggestions are taken', async () => {
      // Add existing agents with common names
      agents.push(
        {
          id: 'agent-1',
          name: 'John Smith',
          role: 'Developer',
          status: 'active',
          tokenAllocation: 10000,
          tokenUsed: 0,
          systemPrompt: 'Test',
          teamId: 'test-team-1',
          seniorId: null,
          organizationId: 'org-1',
          createdAt: new Date(),
          lastActiveAt: new Date()
        },
        {
          id: 'agent-2',
          name: 'Sarah Johnson',
          role: 'Developer',
          status: 'active',
          tokenAllocation: 10000,
          tokenUsed: 0,
          systemPrompt: 'Test',
          teamId: 'test-team-1',
          seniorId: null,
          organizationId: 'org-1',
          createdAt: new Date(),
          lastActiveAt: new Date()
        },
        {
          id: 'agent-3',
          name: 'Michael Chen',
          role: 'Developer',
          status: 'active',
          tokenAllocation: 10000,
          tokenUsed: 0,
          systemPrompt: 'Test',
          teamId: 'test-team-1',
          seniorId: null,
          organizationId: 'org-1',
          createdAt: new Date(),
          lastActiveAt: new Date()
        }
      )

      mockGenerateCompletion.mockResolvedValue({
        content: 'John Smith\nSarah Johnson\nMichael Chen',
        speakerLLM: 'mock:model'
      })

      const profile = createTestProfile()
      const name = await generateAgentName(profile, 'test-team-1', 'interviewer-1')

      // Should add a number to make it unique
      expect(name).toMatch(/^(John Smith|Sarah Johnson|Michael Chen) \d+$/)
    })
  })

  describe('suggestAlternativeNames', () => {
    it('should generate alternative names avoiding rejected name', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: 'David Garcia\nEmily Williams\nRaj Patel',
        speakerLLM: 'mock:model'
      })

      const profile = createTestProfile()
      const alternatives = await suggestAlternativeNames(
        profile,
        'test-team-1',
        'interviewer-1',
        'John Smith'
      )

      expect(alternatives).toHaveLength(3)
      expect(alternatives).toContain('David Garcia')
      expect(alternatives).not.toContain('John Smith')
    })

    it('should request traditional names in alternative suggestions', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: 'Jennifer Lee\nCarlos Martinez\nPriya Singh',
        speakerLLM: 'mock:model'
      })

      const profile = createTestProfile()
      await suggestAlternativeNames(profile, 'test-team-1', 'interviewer-1', 'Old Name')

      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('traditional human names'),
        expect.anything()
      )
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.stringContaining('Old Name'),
        expect.anything()
      )
    })
  })
})
