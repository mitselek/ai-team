import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateAgentName,
  suggestAlternativeNames,
  generateNameOptions
} from '../../../app/server/services/interview/name-generator'
import { agents } from '../../../app/server/data/agents'
import { LLMProvider } from '../../../app/server/services/llm/types'
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
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 50, input: 30, output: 20 },
        finishReason: 'stop'
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
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 50, input: 30, output: 20 },
        finishReason: 'stop'
      })

      const profile = createTestProfile()
      const name = await generateAgentName(profile, 'test-team-1', 'interviewer-1')

      expect(name).toBe('Jennifer')
    })

    it('should generate culturally diverse names', async () => {
      // Mock LLM to return diverse names
      mockGenerateCompletion.mockResolvedValue({
        content: 'Raj Patel\nYuki Tanaka\nAhmed Hassan',
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 50, input: 30, output: 20 },
        finishReason: 'stop'
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
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 50, input: 30, output: 20 },
        finishReason: 'stop'
      })

      const profile = createTestProfile()
      const name = await generateAgentName(profile, 'test-team-1', 'interviewer-1')

      // Should skip 'John Smith' and use 'Sarah Johnson'
      expect(name).toBe('Sarah Johnson')
    })

    it('should handle names with spaces in validation', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: "Maria Rodriguez\nJohn O'Brien\nJean-Pierre Martin",
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 50, input: 30, output: 20 },
        finishReason: 'stop'
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
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 50, input: 30, output: 20 },
        finishReason: 'stop'
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
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 50, input: 30, output: 20 },
        finishReason: 'stop'
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
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 50, input: 30, output: 20 },
        finishReason: 'stop'
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

  describe('generateNameOptions', () => {
    it('should return exactly 3 name options', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: `Name: Adrian - Rationale: Conveys reliability and steady presence
Name: Iris - Rationale: Represents clarity and commitment to insight
Name: Morgan - Rationale: Suggests strategic thinking and flexibility`,
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 100, input: 50, output: 50 },
        finishReason: 'stop'
      })

      const profile = createTestProfile()
      const options = await generateNameOptions(profile, 'test-team-1', 'interviewer-1')

      expect(options).toHaveLength(3)
    })

    it('should include name and rationale for each option', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: `Name: Adrian - Rationale: Conveys reliability and steady presence
Name: Iris - Rationale: Represents clarity and commitment to insight
Name: Morgan - Rationale: Suggests strategic thinking and flexibility`,
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 100, input: 50, output: 50 },
        finishReason: 'stop'
      })

      const profile = createTestProfile()
      const options = await generateNameOptions(profile, 'test-team-1', 'interviewer-1')

      options.forEach((option) => {
        expect(option.name).toBeTruthy()
        expect(typeof option.name).toBe('string')
        expect(option.rationale).toBeTruthy()
        expect(typeof option.rationale).toBe('string')
        expect(option.rationale.length).toBeGreaterThan(10)
      })
    })

    it('should generate unique names within the 3 options', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: `Name: John Smith - Rationale: Professional and approachable
Name: Sarah Chen - Rationale: Analytical and detail-oriented
Name: Michael Garcia - Rationale: Strategic and collaborative`,
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 100, input: 50, output: 50 },
        finishReason: 'stop'
      })

      const profile = createTestProfile()
      const options = await generateNameOptions(profile, 'test-team-1', 'interviewer-1')

      const names = options.map((o) => o.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(3)
    })

    it('should avoid existing team member names', async () => {
      agents.push({
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
      })

      mockGenerateCompletion.mockResolvedValue({
        content: `Name: Sarah Chen - Rationale: Analytical and detail-oriented
Name: Michael Garcia - Rationale: Strategic and collaborative
Name: Emily Johnson - Rationale: Creative and innovative`,
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 100, input: 50, output: 50 },
        finishReason: 'stop'
      })

      const profile = createTestProfile()
      const options = await generateNameOptions(profile, 'test-team-1', 'interviewer-1')

      const generatedNames = options.map((o) => o.name)
      expect(generatedNames).not.toContain('John Smith')
    })

    it('should handle LLM failures with fallback options', async () => {
      mockGenerateCompletion.mockRejectedValueOnce(new Error('LLM failure'))

      const profile = createTestProfile()
      const options = await generateNameOptions(profile, 'test-team-1', 'interviewer-1')

      expect(options).toHaveLength(3)
      options.forEach((option) => {
        expect(option.name).toBeTruthy()
        expect(option.rationale).toBeTruthy()
      })
    })

    it('should generate contextually appropriate rationales', async () => {
      const profile = {
        ...createTestProfile(),
        role: 'Senior Developer',
        personality: { traits: ['analytical', 'detail-oriented'], tone: 'professional' }
      }

      mockGenerateCompletion.mockResolvedValue({
        content: `Name: Adrian - Rationale: Strong analytical skills and attention to detail
Name: Morgan - Rationale: Strategic thinking with technical expertise
Name: Riley - Rationale: Professional demeanor and collaborative approach`,
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 100, input: 50, output: 50 },
        finishReason: 'stop'
      })

      const options = await generateNameOptions(profile, 'test-team-1', 'interviewer-1')

      options.forEach((option) => {
        expect(option.rationale.split(' ').length).toBeGreaterThan(3)
        expect(option.rationale).not.toContain('undefined')
        expect(option.rationale).not.toContain('null')
      })
    })

    it('should handle partial LLM responses by filling with fallbacks', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: `Name: Adrian - Rationale: Conveys reliability`,
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 50, input: 30, output: 20 },
        finishReason: 'stop'
      })

      const profile = createTestProfile()
      const options = await generateNameOptions(profile, 'test-team-1', 'interviewer-1')

      expect(options).toHaveLength(3)
      expect(options[0].name).toBe('Adrian')
      expect(options[1].name).toBeTruthy()
      expect(options[2].name).toBeTruthy()
    })

    it('should use appropriate temperature for creativity', async () => {
      mockGenerateCompletion.mockResolvedValue({
        content: `Name: Adrian - Rationale: Professional and reliable
Name: Morgan - Rationale: Strategic and flexible
Name: Casey - Rationale: Analytical and thorough`,
        provider: LLMProvider.ANTHROPIC,
        model: 'claude-haiku-4',
        tokensUsed: { total: 100, input: 50, output: 50 },
        finishReason: 'stop'
      })

      const profile = createTestProfile()
      await generateNameOptions(profile, 'test-team-1', 'interviewer-1')

      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          agentId: 'interviewer-1',
          temperature: 0.8,
          maxTokens: 400
        })
      )
    })
  })
})
