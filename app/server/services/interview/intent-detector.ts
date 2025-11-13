// server/services/interview/intent-detector.ts

import { createLogger } from '../../utils/logger'

const logger = createLogger('interview:intent-detector')

/**
 * Result of intent detection analysis
 */
export interface IntentDetectionResult {
  detected: boolean
  confidence: number
  matchedPatterns: string[]
}

/**
 * Recruitment intent patterns to match against user messages
 */
const RECRUITMENT_PATTERNS = [
  // Direct hiring expressions
  /\b(hire|hiring|recruit|recruiting)\b/i,

  // Need/want expressions with agent/person/role keywords
  /\b(need|want|looking\s+for|searching\s+for).*(agent|person|developer|engineer|specialist|someone|somebody)/i,

  // Job/role descriptions
  /\b(we\s+need|looking\s+to\s+add|seeking).*(someone|agent).*who\s+can\b/i,

  // Position/role mentions
  /\b(new\s+position|open\s+position|fill\s+a\s+role|add\s+to\s+(our\s+)?team)/i,

  // Help finding/building team
  /\b(help\s+(me|us)\s+(find|get|recruit)|build\s+(our|the)\s+team)/i,

  // Agent-specific mentions
  /\b(need|create|add|want)\s+(a|an)?\s*agent/i
]

/**
 * Detect recruitment intent in a user message
 *
 * Uses pattern matching to identify if the user is expressing
 * interest in hiring/recruiting a new agent or team member.
 *
 * @param message - User's message to analyze
 * @returns Intent detection result with confidence score
 */
export function detectRecruitmentIntent(message: string): IntentDetectionResult {
  const log = logger.child({ messageLength: message.length })

  log.debug(
    { messagePreview: message.substring(0, 100) },
    'Analyzing message for recruitment intent'
  )

  const normalizedMessage = message.toLowerCase().trim()
  const matchedPatterns: string[] = []

  // Check each pattern
  for (const pattern of RECRUITMENT_PATTERNS) {
    if (pattern.test(normalizedMessage)) {
      matchedPatterns.push(pattern.source)
    }
  }

  const detected = matchedPatterns.length > 0

  // Calculate confidence based on number of matches
  // More matches = higher confidence
  const confidence = detected ? Math.min(0.5 + matchedPatterns.length * 0.2, 1.0) : 0.0

  const result: IntentDetectionResult = {
    detected,
    confidence,
    matchedPatterns
  }

  log.info(
    {
      detected,
      confidence,
      matchCount: matchedPatterns.length
    },
    'Intent detection completed'
  )

  return result
}

/**
 * Check if message is too short or generic to reliably detect intent
 */
export function isMessageTooVague(message: string): boolean {
  const trimmed = message.trim()

  // Too short (less than 10 characters)
  if (trimmed.length < 10) {
    return true
  }

  // Single word responses
  if (!trimmed.includes(' ')) {
    return true
  }

  // Common greetings/pleasantries
  const vaguePhrases = [
    /^(hi|hello|hey|greetings)[\s!.]*$/i,
    /^(yes|yeah|yep|sure|ok|okay)[\s!.]*$/i,
    /^(thanks|thank you)[\s!.]*$/i,
    /^(how are you|what's up)[\s!.?]*$/i
  ]

  return vaguePhrases.some((pattern) => pattern.test(trimmed))
}
