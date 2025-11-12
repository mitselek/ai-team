// server/services/interview/session.ts

import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '../../utils/logger'
import { saveInterview } from '../persistence/filesystem'
import type {
  InterviewSession,
  InterviewState,
  InterviewMessage,
  InterviewSpeaker,
  InterviewMessageMetadata,
  CandidateProfile
} from './types'

const logger = createLogger('interview:session')

/**
 * In-memory storage for interview sessions (MVP).
 * TODO: Replace with GitHub-backed persistence.
 */
export const interviewSessions: InterviewSession[] = []

/**
 * Create a new interview session
 */
export function createSession(teamId: string, interviewerId: string): InterviewSession {
  const candidateId = uuidv4()
  const session: InterviewSession = {
    id: uuidv4(),
    candidateId,
    teamId,
    interviewerId,
    status: 'active',
    currentState: 'greet',
    transcript: [],
    candidateProfile: {
      role: '',
      expertise: [],
      preferences: {
        communicationStyle: '',
        workingHours: '',
        autonomyLevel: ''
      },
      personality: {
        traits: [],
        tone: ''
      }
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    // State machine tracking
    stateHistory: ['greet'],
    exchangesInCurrentState: 0,
    topicsCovered: []
  }

  interviewSessions.push(session)

  logger.info(
    {
      sessionId: session.id,
      candidateId,
      teamId,
      interviewerId
    },
    'Interview session created'
  )

  // Persist to filesystem (fire-and-forget)
  saveInterview(session).catch((error: unknown) => {
    logger.error({ error, sessionId: session.id }, 'Failed to persist new interview session')
  })

  return session
}

/**
 * Get session by ID
 */
export function getSession(sessionId: string): InterviewSession | undefined {
  return interviewSessions.find((s) => s.id === sessionId)
}

/**
 * Get all sessions for a team
 */
export function getSessionsByTeam(teamId: string): InterviewSession[] {
  return interviewSessions.filter((s) => s.teamId === teamId)
}

/**
 * Get active sessions for an interviewer
 */
export function getActiveSessionsByInterviewer(interviewerId: string): InterviewSession[] {
  return interviewSessions.filter((s) => s.interviewerId === interviewerId && s.status === 'active')
}

/**
 * Add a message to the interview transcript
 */
export function addMessage(
  sessionId: string,
  speaker: InterviewSpeaker,
  message: string,
  metadata?: InterviewMessageMetadata
): InterviewMessage {
  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  const interviewMessage: InterviewMessage = {
    id: uuidv4(),
    speaker,
    message,
    timestamp: new Date(),
    metadata
  }

  session.transcript.push(interviewMessage)
  session.updatedAt = new Date()

  logger.debug(
    {
      sessionId,
      speaker,
      messageLength: message.length,
      messageId: interviewMessage.id
    },
    'Message added to transcript'
  )

  // Persist to filesystem (fire-and-forget)
  saveInterview(session).catch((error: unknown) => {
    logger.error({ error, sessionId }, 'Failed to persist interview after message')
  })

  return interviewMessage
}

/**
 * Update the interview state
 */
export function updateState(sessionId: string, newState: InterviewState): void {
  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  const oldState = session.currentState
  session.currentState = newState
  session.updatedAt = new Date()

  // Track state history
  const history = session.stateHistory || []
  history.push(newState)
  session.stateHistory = history

  logger.info(
    {
      sessionId,
      oldState,
      newState
    },
    'Interview state updated'
  )

  // Persist to filesystem (fire-and-forget)
  saveInterview(session).catch((error: unknown) => {
    logger.error({ error, sessionId }, 'Failed to persist interview state update')
  })
}

/**
 * Update the candidate profile
 */
export function updateProfile(sessionId: string, profile: Partial<CandidateProfile>): void {
  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  // Merge profile updates
  session.candidateProfile = {
    ...session.candidateProfile,
    ...profile,
    preferences: {
      ...session.candidateProfile.preferences,
      ...(profile.preferences || {})
    },
    personality: {
      ...session.candidateProfile.personality,
      ...(profile.personality || {})
    },
    expertise: profile.expertise || session.candidateProfile.expertise
  }

  session.updatedAt = new Date()

  logger.debug(
    {
      sessionId,
      profileUpdates: Object.keys(profile)
    },
    'Candidate profile updated'
  )

  // Persist to filesystem (fire-and-forget)
  saveInterview(session).catch((error: unknown) => {
    logger.error({ error, sessionId }, 'Failed to persist interview profile update')
  })
}

/**
 * Mark session as completed
 */
export function completeSession(sessionId: string): void {
  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  session.status = 'completed'
  session.currentState = 'complete'
  session.completedAt = new Date()
  session.updatedAt = new Date()

  logger.info(
    {
      sessionId,
      duration: session.completedAt.getTime() - session.createdAt.getTime(),
      messageCount: session.transcript.length
    },
    'Interview session completed'
  )

  // Persist to filesystem (fire-and-forget)
  saveInterview(session).catch((error: unknown) => {
    logger.error({ error, sessionId }, 'Failed to persist completed interview session')
  })
}

/**
 * Cancel a session
 */
export function cancelSession(sessionId: string): void {
  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  session.status = 'cancelled'
  session.updatedAt = new Date()

  logger.warn(
    {
      sessionId,
      currentState: session.currentState,
      messageCount: session.transcript.length
    },
    'Interview session cancelled'
  )

  // Persist to filesystem (fire-and-forget)
  saveInterview(session).catch((error: unknown) => {
    logger.error({ error, sessionId }, 'Failed to persist cancelled interview session')
  })
}

/**
 * Resume an interrupted session
 */
export function resumeSession(sessionId: string): void {
  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  if (session.status !== 'active') {
    session.status = 'active'
    session.updatedAt = new Date()

    logger.info(
      {
        sessionId,
        currentState: session.currentState
      },
      'Interview session resumed'
    )

    // Persist to filesystem (fire-and-forget)
    saveInterview(session).catch((error: unknown) => {
      logger.error({ error, sessionId }, 'Failed to persist resumed interview session')
    })
  }
}

/**
 * Format transcript for HR specialist review
 */
export function formatTranscript(session: InterviewSession): string {
  const lines = session.transcript.map((msg) => {
    const timestamp = msg.timestamp.toISOString().substring(11, 19)
    const speaker = msg.speaker === 'interviewer' ? 'Interviewer' : 'Requester'
    return `[${timestamp}] ${speaker}: ${msg.message}`
  })

  return lines.join('\n')
}

/**
 * Get the last requester response
 */
export function getLastCandidateResponse(sessionId: string): InterviewMessage | undefined {
  const session = getSession(sessionId)
  if (!session) {
    return undefined
  }

  // Find last message from requester
  for (let i = session.transcript.length - 1; i >= 0; i--) {
    if (session.transcript[i].speaker === 'requester') {
      return session.transcript[i]
    }
  }

  return undefined
}

/**
 * Get the last interviewer question
 */
export function getLastInterviewerQuestion(sessionId: string): InterviewMessage | undefined {
  const session = getSession(sessionId)
  if (!session) {
    return undefined
  }

  // Find last message from interviewer
  for (let i = session.transcript.length - 1; i >= 0; i--) {
    if (session.transcript[i].speaker === 'interviewer') {
      return session.transcript[i]
    }
  }

  return undefined
}
