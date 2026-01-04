/**
 * PII redaction utilities for safe logging
 * Prevents sensitive information from appearing in logs
 */

import type { EmailMessage } from '../gmail'

/**
 * Redact email domain but preserve local part
 * user@example.com → user@[redacted]
 */
export function redactEmailAddresses(text: string): string {
  // Match email pattern: word@domain.ext and word@domain
  return text.replace(/([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+)/g, '$1@[redacted]')
}

/**
 * Redact personal names (capitalized words patterns)
 * "Name: John Doe" → "Name: [redacted]"
 * Heuristic: sequences of capitalized words or all-caps words between boundaries
 */
export function redactPersonalNames(text: string): string {
  // Match patterns like "John Doe", "Jane Smith", or "JOHN DOE"
  // Capitalized word followed by space and another capitalized word
  // OR all-caps words (like JOHN DOE)
  return text.replace(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|[A-Z]+(?:\s+[A-Z]+)+)\b/g, (match) => {
    // Don't redact single capitalized words that are likely not names
    // Allow: sentence starts, acronyms, single words after specific keywords
    if (/^[A-Z]$/.test(match) || match.length === 1) {
      return match
    }

    // Check if this looks like a name (multiple capitalized words or multiple all-caps words)
    if (match.includes(' ')) {
      return '[redacted]'
    }

    return match
  })
}

/**
 * Get redacted representation of message for logging
 * Never includes: bodyText, bodyHtml, attachments
 * Safe to include: id, threadId, subject, snippet, labels, from
 */
export function getRedactedForLogging(message: EmailMessage): string {
  const parts = [
    `messageId=${message.id}`,
    `subject=${redactEmailAddresses(message.subject)}`,
    `from=${redactEmailAddresses(message.from)}`,
    `labels=${message.labels.join(',')}`,
    `snippet=${message.snippet.substring(0, 50)}`
  ]

  return `[MESSAGE: ${parts.join('; ')}]`
}
