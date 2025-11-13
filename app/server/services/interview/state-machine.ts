// server/services/interview/state-machine.ts

import { createLogger } from '../../utils/logger'
import type { InterviewSession, InterviewState } from './types'

const logger = createLogger('interview:state-machine')

/**
 * State machine configuration
 */
type StateKey =
  | 'greet'
  | 'ask_role'
  | 'ask_expertise'
  | 'ask_preferences'
  | 'nameSelection'
  | 'follow_up'
  | 'finalize'
  | 'review_prompt'
  | 'test_conversation'
  | 'assign_details'

const STATE_CONFIG: Record<
  StateKey,
  {
    maxExchanges: number
    nextState: InterviewState | null
    topic: string
    isBlocked?: boolean // If true, state doesn't accept user responses
  }
> = {
  greet: {
    maxExchanges: 1,
    nextState: 'ask_role' as InterviewState,
    topic: 'greeting'
  },
  ask_role: {
    maxExchanges: 2,
    nextState: 'ask_expertise' as InterviewState,
    topic: 'role'
  },
  ask_expertise: {
    maxExchanges: 2,
    nextState: 'ask_preferences' as InterviewState,
    topic: 'expertise'
  },
  ask_preferences: {
    maxExchanges: 3, // Communication, autonomy, working hours
    nextState: 'nameSelection' as InterviewState,
    topic: 'preferences'
  },
  nameSelection: {
    maxExchanges: 1,
    nextState: 'finalize' as InterviewState,
    topic: 'name_selection'
  },
  follow_up: {
    maxExchanges: 1,
    nextState: null, // Returns to previous state
    topic: 'follow_up'
  },
  finalize: {
    maxExchanges: 0, // No user input accepted
    nextState: 'review_prompt' as InterviewState,
    topic: 'finalization',
    isBlocked: true // Async processing, no responses allowed
  },
  review_prompt: {
    maxExchanges: 0, // Uses approval API, not /respond endpoint
    nextState: 'test_conversation' as InterviewState,
    topic: 'prompt_review',
    isBlocked: true // Uses dedicated approval endpoints
  },
  test_conversation: {
    maxExchanges: 10, // Allow multiple test messages
    nextState: 'assign_details' as InterviewState,
    topic: 'agent_testing'
  },
  assign_details: {
    maxExchanges: 0, // Uses details API, not /respond endpoint
    nextState: 'complete' as InterviewState,
    topic: 'agent_details',
    isBlocked: true // Uses dedicated details endpoint
  }
}

/**
 * Determine if current state should transition to next state
 */
export function shouldTransitionState(session: InterviewSession): boolean {
  const state = session.currentState as StateKey
  const config = STATE_CONFIG[state as keyof typeof STATE_CONFIG]
  if (!config) {
    return false
  }

  const exchanges = session.exchangesInCurrentState || 0

  // Check if we've exceeded max exchanges for this state
  if (exchanges >= config.maxExchanges) {
    logger.info(
      {
        sessionId: session.id,
        currentState: session.currentState,
        exchanges,
        maxExchanges: config.maxExchanges
      },
      'Max exchanges reached for state'
    )
    return true
  }

  // Check if topic has already been covered (prevents loops)
  const topicsCovered = session.topicsCovered || []
  if (config.topic !== 'follow_up' && topicsCovered.includes(config.topic)) {
    const occurrences = topicsCovered.filter((t) => t === config.topic).length
    if (occurrences >= config.maxExchanges) {
      logger.warn(
        {
          sessionId: session.id,
          topic: config.topic,
          occurrences
        },
        'Topic covered too many times, forcing transition'
      )
      return true
    }
  }

  return false
}

/**
 * Get next state in the interview flow
 */
export function getNextState(session: InterviewSession): InterviewState | null {
  const state = session.currentState as StateKey
  const config = STATE_CONFIG[state as keyof typeof STATE_CONFIG]
  if (!config) {
    logger.warn({ sessionId: session.id, currentState: session.currentState }, 'Unknown state')
    return null
  }

  // Special handling for follow_up state - return to previous state's next
  if (session.currentState === 'follow_up') {
    const stateHistory = session.stateHistory || []
    const previousState = stateHistory[stateHistory.length - 2] as StateKey
    const prevConfig = STATE_CONFIG[previousState as keyof typeof STATE_CONFIG]
    return prevConfig?.nextState || null
  }

  return config.nextState
}

/**
 * Check if current state is blocked (doesn't accept user responses)
 */
export function isStateBlocked(session: InterviewSession): boolean {
  const state = session.currentState as StateKey
  const config = STATE_CONFIG[state as keyof typeof STATE_CONFIG]
  return config?.isBlocked === true
}

/**
 * Increment exchange counter for current state
 */
export function incrementExchangeCounter(session: InterviewSession): void {
  const current = session.exchangesInCurrentState || 0
  session.exchangesInCurrentState = current + 1

  // Track topic coverage
  const state = session.currentState as StateKey
  const config = STATE_CONFIG[state as keyof typeof STATE_CONFIG]
  if (config && config.topic !== 'follow_up') {
    const topics = session.topicsCovered || []
    topics.push(config.topic)
    session.topicsCovered = topics
  }
}

/**
 * Reset exchange counter when transitioning states
 */
export function resetExchangeCounter(session: InterviewSession): void {
  session.exchangesInCurrentState = 0
}

/**
 * Check if a topic has been adequately covered
 */
export function isTopicCovered(session: InterviewSession, topic: string): boolean {
  const topics = session.topicsCovered || []
  const occurrences = topics.filter((t) => t === topic).length
  const config = Object.values(STATE_CONFIG).find((c) => c.topic === topic)

  return config ? occurrences >= config.maxExchanges : false
}

/**
 * Get topics that still need to be covered
 */
export function getRemainingTopics(session: InterviewSession): string[] {
  const allTopics = ['role', 'expertise', 'preferences']

  return allTopics.filter((topic) => !isTopicCovered(session, topic))
}
