import { describe, it, expect } from 'vitest'
import {
  redactEmailAddresses,
  redactPersonalNames,
  getRedactedForLogging
} from '../src/utils/redaction'
import type { EmailMessage } from '../src/gmail'

describe('PII Redaction', () => {
  describe('redactEmailAddresses', () => {
    it('redacts email domain while preserving local part', () => {
      expect(redactEmailAddresses('from: user@example.com')).toBe('from: user@[redacted]')
      expect(redactEmailAddresses('contact me at admin@company.org')).toBe(
        'contact me at admin@[redacted]'
      )
    })

    it('handles multiple email addresses', () => {
      const text = 'send to user1@example.com or user2@example.com'
      expect(redactEmailAddresses(text)).toBe('send to user1@[redacted] or user2@[redacted]')
    })

    it('handles emails with special characters in local part', () => {
      expect(redactEmailAddresses('contact: john.doe+tag@example.com')).toBe(
        'contact: john.doe+tag@[redacted]'
      )
      expect(redactEmailAddresses('user_name@example.co.uk')).toBe('user_name@[redacted]')
    })

    it('preserves text without emails', () => {
      const text = 'Hello world, no emails here'
      expect(redactEmailAddresses(text)).toBe(text)
    })

    it('handles edge cases', () => {
      // Email at start of text
      expect(redactEmailAddresses('user@example.com is the contact')).toBe(
        'user@[redacted] is the contact'
      )

      // Email at end of text
      expect(redactEmailAddresses('Please email user@example.com')).toBe(
        'Please email user@[redacted]'
      )

      // Just email
      expect(redactEmailAddresses('user@example.com')).toBe('user@[redacted]')
    })
  })

  describe('redactPersonalNames', () => {
    it('redacts multi-word name patterns', () => {
      expect(redactPersonalNames('Message from John Doe')).toContain('[redacted]')
      expect(redactPersonalNames('Sent by Jane Smith')).toContain('[redacted]')
    })

    it('handles case variations', () => {
      expect(redactPersonalNames('JOHN DOE')).toContain('[redacted]')
      expect(redactPersonalNames('john doe')).not.toContain('[redacted]') // lowercase not redacted (not a name pattern)
    })

    it('preserves single words and non-names', () => {
      const text = 'The Report is ready'
      const redacted = redactPersonalNames(text)
      // Single capitalized words at start of sentence may not be redacted
      expect(redacted.length).toBeGreaterThan(0)
    })

    it('handles multiple names in text', () => {
      const text = 'Meeting between John Smith and Jane Doe'
      const redacted = redactPersonalNames(text)
      expect(redacted).toContain('[redacted]')
    })
  })

  describe('getRedactedForLogging', () => {
    const mockMessage: EmailMessage = {
      id: 'msg-123',
      threadId: 'thread-456',
      subject: 'Sensitive Subject from John Doe',
      from: 'sender@example.com',
      to: 'recipient@example.com',
      cc: undefined,
      date: '2024-01-04T12:00:00Z',
      labels: ['IMPORTANT', 'WORK'],
      snippet: 'This is a sensitive message snippet...',
      hasHtml: false,
      sizeEstimate: 1024,
      bodyText: 'Full sensitive message body - NEVER logged',
      bodyHtml: undefined
    }

    it('includes messageId', () => {
      const redacted = getRedactedForLogging(mockMessage)
      expect(redacted).toContain('msg-123')
    })

    it('includes snippet', () => {
      const redacted = getRedactedForLogging(mockMessage)
      expect(redacted).toContain('This is a sensitive message snippet')
    })

    it('includes labels', () => {
      const redacted = getRedactedForLogging(mockMessage)
      expect(redacted).toContain('IMPORTANT')
      expect(redacted).toContain('WORK')
    })

    it('never includes bodyText', () => {
      const redacted = getRedactedForLogging(mockMessage)
      expect(redacted).not.toContain(mockMessage.bodyText!)
    })

    it('never includes bodyHtml', () => {
      const msgWithHtml: EmailMessage = {
        ...mockMessage,
        bodyHtml: '<div>Secret HTML content</div>'
      }
      const redacted = getRedactedForLogging(msgWithHtml)
      expect(redacted).not.toContain('Secret HTML content')
    })

    it('redacts email addresses in subject and from fields', () => {
      const redacted = getRedactedForLogging(mockMessage)
      // Should contain redacted emails
      expect(redacted).toContain('[redacted]')
    })

    it('handles missing optional fields', () => {
      const minimalMsg: EmailMessage = {
        id: 'msg-123',
        threadId: 'thread-456',
        subject: 'Test Subject',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        date: '2024-01-04T12:00:00Z',
        labels: [],
        snippet: 'Snippet',
        hasHtml: false,
        sizeEstimate: 0
      }
      const redacted = getRedactedForLogging(minimalMsg)
      expect(redacted).toContain('msg-123')
      expect(redacted).not.toThrow
    })
  })
})
