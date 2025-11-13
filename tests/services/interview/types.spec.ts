import { describe, it, expect } from 'vitest'
import type { HRRecommendation } from '../../../app/server/services/interview/types'

describe('HRRecommendation interface', () => {
  describe('teamAssignment field', () => {
    it('should allow HRRecommendation without teamAssignment (backward compatibility)', () => {
      const recommendation: HRRecommendation = {
        systemPrompt: 'Test prompt',
        suggestedNames: ['Alice', 'Bob'],
        feedback: 'Great candidate'
      }

      expect(recommendation).toBeDefined()
      expect(recommendation.teamAssignment).toBeUndefined()
    })

    it('should allow HRRecommendation with complete teamAssignment', () => {
      const recommendation: HRRecommendation = {
        systemPrompt: 'Test prompt',
        suggestedNames: ['Alice', 'Bob'],
        feedback: 'Great candidate',
        teamAssignment: {
          teamId: 'team-123',
          teamName: 'Library Team',
          rationale: 'Perfect fit for MCP expertise'
        }
      }

      expect(recommendation).toBeDefined()
      expect(recommendation.teamAssignment).toBeDefined()
      expect(recommendation.teamAssignment?.teamId).toBe('team-123')
      expect(recommendation.teamAssignment?.teamName).toBe('Library Team')
      expect(recommendation.teamAssignment?.rationale).toBe('Perfect fit for MCP expertise')
    })

    it('should have teamId as string in teamAssignment', () => {
      const recommendation: HRRecommendation = {
        systemPrompt: 'Test prompt',
        suggestedNames: ['Alice'],
        feedback: 'Good',
        teamAssignment: {
          teamId: 'team-456',
          teamName: 'Development',
          rationale: 'Backend specialist'
        }
      }

      expect(typeof recommendation.teamAssignment?.teamId).toBe('string')
    })

    it('should have teamName as string in teamAssignment', () => {
      const recommendation: HRRecommendation = {
        systemPrompt: 'Test prompt',
        suggestedNames: ['Alice'],
        feedback: 'Good',
        teamAssignment: {
          teamId: 'team-456',
          teamName: 'Development',
          rationale: 'Backend specialist'
        }
      }

      expect(typeof recommendation.teamAssignment?.teamName).toBe('string')
    })

    it('should have rationale as string in teamAssignment', () => {
      const recommendation: HRRecommendation = {
        systemPrompt: 'Test prompt',
        suggestedNames: ['Alice'],
        feedback: 'Good',
        teamAssignment: {
          teamId: 'team-456',
          teamName: 'Development',
          rationale: 'Backend specialist'
        }
      }

      expect(typeof recommendation.teamAssignment?.rationale).toBe('string')
    })

    it('should allow optional speakerLLM field', () => {
      const recommendation: HRRecommendation = {
        systemPrompt: 'Test prompt',
        suggestedNames: ['Alice'],
        feedback: 'Good',
        speakerLLM: 'anthropic:sonnet-4.5',
        teamAssignment: {
          teamId: 'team-789',
          teamName: 'HR Team',
          rationale: 'Recruitment specialist'
        }
      }

      expect(recommendation.speakerLLM).toBe('anthropic:sonnet-4.5')
    })
  })

  describe('JSON parsing', () => {
    it('should parse JSON with teamAssignment correctly', () => {
      const json = JSON.stringify({
        systemPrompt: 'You are an expert',
        suggestedNames: ['Charlie', 'David'],
        feedback: 'Excellent technical skills',
        teamAssignment: {
          teamId: 'team-lib-001',
          teamName: 'Library Team',
          rationale: 'Strong MCP server development background'
        }
      })

      const parsed = JSON.parse(json) as HRRecommendation

      expect(parsed.systemPrompt).toBe('You are an expert')
      expect(parsed.suggestedNames).toEqual(['Charlie', 'David'])
      expect(parsed.feedback).toBe('Excellent technical skills')
      expect(parsed.teamAssignment).toBeDefined()
      expect(parsed.teamAssignment?.teamId).toBe('team-lib-001')
      expect(parsed.teamAssignment?.teamName).toBe('Library Team')
      expect(parsed.teamAssignment?.rationale).toBe('Strong MCP server development background')
    })

    it('should parse JSON without teamAssignment correctly', () => {
      const json = JSON.stringify({
        systemPrompt: 'You are a helper',
        suggestedNames: ['Eve'],
        feedback: 'Good communication skills'
      })

      const parsed = JSON.parse(json) as HRRecommendation

      expect(parsed.systemPrompt).toBe('You are a helper')
      expect(parsed.suggestedNames).toEqual(['Eve'])
      expect(parsed.feedback).toBe('Good communication skills')
      expect(parsed.teamAssignment).toBeUndefined()
    })
  })
})
