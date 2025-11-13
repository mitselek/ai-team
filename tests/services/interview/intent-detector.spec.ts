// tests/services/interview/intent-detector.spec.ts

import { describe, it, expect } from 'vitest'
import {
  detectRecruitmentIntent,
  isMessageTooVague
} from '../../../app/server/services/interview/intent-detector'

describe('Intent Detector', () => {
  describe('detectRecruitmentIntent', () => {
    it('should detect direct hiring intent', () => {
      const messages = [
        'I want to hire a developer',
        'We need to recruit someone',
        'Looking to hire an engineer',
        "We're hiring for a new position"
      ]

      messages.forEach((message) => {
        const result = detectRecruitmentIntent(message)
        expect(result.detected).toBe(true)
        expect(result.confidence).toBeGreaterThan(0)
        expect(result.matchedPatterns.length).toBeGreaterThan(0)
      })
    })

    it('should detect "need" expressions with agent/person mentions', () => {
      const messages = [
        'We need someone who can handle DevOps tasks',
        'I need an agent for data processing',
        'We need a new developer',
        'Looking for someone to manage the database'
      ]

      messages.forEach((message) => {
        const result = detectRecruitmentIntent(message)
        expect(result.detected).toBe(true)
      })
    })

    it('should detect position/role related phrases', () => {
      const messages = [
        'We have a new position to fill',
        'Need to fill a role on our team',
        'We have an open position',
        'Looking to add to our team'
      ]

      messages.forEach((message) => {
        const result = detectRecruitmentIntent(message)
        expect(result.detected).toBe(true)
      })
    })

    it('should detect agent-specific recruitment', () => {
      const messages = [
        'I need an agent who can write code',
        'Want to create an agent for testing',
        'Can you help me add an agent to the team?'
      ]

      messages.forEach((message) => {
        const result = detectRecruitmentIntent(message)
        expect(result.detected).toBe(true)
      })
    })

    it('should NOT detect intent in general conversation', () => {
      const messages = [
        "What's the status of our current projects?",
        'How is the team doing?',
        'Can you give me an update?',
        'Tell me about the organization',
        'Hello, how are you?'
      ]

      messages.forEach((message) => {
        const result = detectRecruitmentIntent(message)
        expect(result.detected).toBe(false)
        expect(result.confidence).toBe(0)
      })
    })

    it('should return higher confidence for multiple pattern matches', () => {
      const simpleMessage = 'I want to hire someone'
      const complexMessage = 'We need to hire and recruit a new agent for an open position'

      const simpleResult = detectRecruitmentIntent(simpleMessage)
      const complexResult = detectRecruitmentIntent(complexMessage)

      expect(complexResult.confidence).toBeGreaterThan(simpleResult.confidence)
    })

    it('should handle case insensitivity', () => {
      const messages = ['I WANT TO HIRE SOMEONE', 'we need to recruit', 'LoOkInG tO hIrE']

      messages.forEach((message) => {
        const result = detectRecruitmentIntent(message)
        expect(result.detected).toBe(true)
      })
    })

    it('should handle edge cases', () => {
      // Empty string
      let result = detectRecruitmentIntent('')
      expect(result.detected).toBe(false)

      // Only whitespace
      result = detectRecruitmentIntent('   ')
      expect(result.detected).toBe(false)

      // Very long message with intent
      const longMessage =
        'Let me tell you about our situation. ' +
        'We have been growing rapidly and now we need to hire a developer ' +
        'who can help us scale our infrastructure. This is urgent.'
      result = detectRecruitmentIntent(longMessage)
      expect(result.detected).toBe(true)
    })
  })

  describe('isMessageTooVague', () => {
    it('should identify very short messages as vague', () => {
      expect(isMessageTooVague('hi')).toBe(true)
      expect(isMessageTooVague('yes')).toBe(true)
      expect(isMessageTooVague('ok')).toBe(true)
    })

    it('should identify single words as vague', () => {
      expect(isMessageTooVague('hello')).toBe(true)
      expect(isMessageTooVague('sure')).toBe(true)
    })

    it('should identify common greetings as vague', () => {
      expect(isMessageTooVague('Hello!')).toBe(true)
      expect(isMessageTooVague('Hi there')).toBe(true)
      expect(isMessageTooVague('Hey')).toBe(true)
    })

    it('should identify simple affirmatives as vague', () => {
      expect(isMessageTooVague('yes')).toBe(true)
      expect(isMessageTooVague('yeah')).toBe(true)
      expect(isMessageTooVague('okay')).toBe(true)
    })

    it('should NOT identify substantive messages as vague', () => {
      expect(isMessageTooVague('I want to hire a developer')).toBe(false)
      expect(isMessageTooVague('Tell me about your team')).toBe(false)
      expect(isMessageTooVague('What can you help me with?')).toBe(false)
    })

    it('should handle whitespace', () => {
      expect(isMessageTooVague('  hi  ')).toBe(true)
      expect(isMessageTooVague('  I need help with something  ')).toBe(false)
    })
  })
})
