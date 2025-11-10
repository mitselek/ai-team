// server/services/interview/workflow.ts

import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '../../utils/logger'
import { agents } from '../../data/agents'
import { teams } from '../../data/teams'
import type { Agent } from '@@/types'
import type { InterviewSession, InterviewState } from './types'
import {
  createSession,
  getSession,
  addMessage,
  updateState,
  updateProfile,
  completeSession
} from './session'
import {
  generateNextQuestion,
  generateGreeting,
  generateFollowUpQuestion,
  shouldContinueInterview
} from './questions'
import { analyzeResponse, needsFollowUp } from './analyzer'
import { consultHRSpecialist } from './hr-specialist'
import { generateSystemPrompt } from './prompt-builder'
import { generateAgentName } from './name-generator'
import { INTERVIEW_CONFIG } from './questions'

const logger = createLogger('interview:workflow')

/**
 * Start a new interview workflow
 */
export async function startInterview(
  teamId: string,
  interviewerId: string
): Promise<InterviewSession> {
  const log = logger.child({ teamId, interviewerId })

  log.info('Starting new interview workflow')

  // Validate interviewer exists
  const interviewer = agents.find((a) => a.id === interviewerId)
  if (!interviewer) {
    throw new Error(`Interviewer agent ${interviewerId} not found`)
  }

  // Validate team exists
  const team = teams.find((t) => t.id === teamId)
  if (!team) {
    throw new Error(`Team ${teamId} not found`)
  }

  // Create new session
  const session = createSession(teamId, interviewerId)

  // Send greeting
  const greeting = generateGreeting(interviewer.name, team.name)
  addMessage(session.id, 'interviewer', greeting)

  // Generate first question
  updateState(session.id, 'ask_role')
  const firstQuestion = await generateNextQuestion(session)

  if (firstQuestion) {
    addMessage(session.id, 'interviewer', firstQuestion)
  }

  log.info(
    {
      sessionId: session.id,
      teamName: team.name,
      interviewerName: interviewer.name
    },
    'Interview started successfully'
  )

  return session
}

/**
 * Process candidate response and continue interview
 */
export async function processCandidateResponse(
  sessionId: string,
  response: string
): Promise<{
  nextQuestion: string | null
  complete: boolean
}> {
  const log = logger.child({ sessionId })

  log.info({ responseLength: response.length }, 'Processing candidate response')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  if (session.status !== 'active') {
    throw new Error(`Interview session ${sessionId} is not active`)
  }

  // Add response to transcript
  addMessage(sessionId, 'candidate', response)

  // Analyze response
  const analysis = await analyzeResponse(session, response)

  log.info(
    {
      clarityScore: analysis.clarityScore,
      keyInfoCount: analysis.keyInfo.length,
      needsFollowUp: analysis.needsFollowUp
    },
    'Response analyzed'
  )

  // Check if follow-up is needed
  if (needsFollowUp(analysis)) {
    updateState(sessionId, 'follow_up')
    const followUpQuestion = await generateFollowUpQuestion(session, analysis.followUpReason)
    addMessage(sessionId, 'interviewer', followUpQuestion)

    return {
      nextQuestion: followUpQuestion,
      complete: false
    }
  }

  // Determine next state
  const nextState = determineNextState(session)

  // Check if interview should continue
  if (!shouldContinueInterview(session) || nextState === 'consult_hr') {
    // Move to HR consultation
    return await finalizeInterview(sessionId)
  }

  // Update state and generate next question
  updateState(sessionId, nextState)
  const nextQuestion = await generateNextQuestion(session)

  if (!nextQuestion) {
    // LLM indicates interview is complete
    return await finalizeInterview(sessionId)
  }

  addMessage(sessionId, 'interviewer', nextQuestion)

  return {
    nextQuestion,
    complete: false
  }
}

/**
 * Determine the next interview state based on current progress
 */
function determineNextState(session: InterviewSession): InterviewState {
  const profile = session.candidateProfile

  // If no role yet, ask about role
  if (!profile.role) {
    return 'ask_role'
  }

  // If no expertise, ask about expertise
  if (profile.expertise.length === 0) {
    return 'ask_expertise'
  }

  // If no preferences, ask about preferences
  if (
    !profile.preferences.communicationStyle &&
    !profile.preferences.autonomyLevel &&
    !profile.preferences.workingHours
  ) {
    return 'ask_preferences'
  }

  // Check if we have enough information
  const messageCount = session.transcript.length
  if (messageCount >= INTERVIEW_CONFIG.minQuestions * 2) {
    return 'consult_hr'
  }

  // Continue with preferences or general questions
  return 'ask_preferences'
}

/**
 * Finalize interview: consult HR, generate prompt, create agent
 */
async function finalizeInterview(sessionId: string): Promise<{
  nextQuestion: string | null
  complete: boolean
}> {
  const log = logger.child({ sessionId })

  log.info('Finalizing interview')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  // Update state
  updateState(sessionId, 'consult_hr')

  // Inform candidate
  const consultMessage =
    "Thank you for your responses! I'm going to consult with our HR Director to finalize your configuration. This will just take a moment..."
  addMessage(sessionId, 'interviewer', consultMessage)

  try {
    // Consult HR Specialist
    updateState(sessionId, 'awaiting_review')
    const recommendation = await consultHRSpecialist(session)

    // Update profile with system prompt and suggested name
    updateProfile(sessionId, {
      systemPrompt: recommendation.systemPrompt,
      suggestedName: recommendation.suggestedNames[0]
    })

    // Generate final agent name (may differ from suggested)
    updateState(sessionId, 'finalize')
    const agentName = await generateAgentName(
      session.candidateProfile,
      session.teamId,
      session.interviewerId
    )

    // Use custom system prompt or generate one
    const systemPrompt =
      session.candidateProfile.systemPrompt || generateSystemPrompt(session.candidateProfile)

    // Create the agent
    const newAgent = await createAgentFromProfile(session, agentName, systemPrompt)

    // Complete session
    completeSession(sessionId)

    // Send welcome message
    const welcomeMessage = `Welcome aboard, ${newAgent.name}! You're now part of our team. Your manager and team members are here to support you. Feel free to start working on assigned tasks, and don't hesitate to ask questions. Good luck!`
    addMessage(sessionId, 'interviewer', welcomeMessage)

    log.info(
      {
        agentId: newAgent.id,
        agentName: newAgent.name,
        role: newAgent.role
      },
      'Interview completed, agent created'
    )

    return {
      nextQuestion: welcomeMessage,
      complete: true
    }
  } catch (error) {
    log.error({ error }, 'Failed to finalize interview')
    throw new Error('Interview finalization failed')
  }
}

/**
 * Create agent from interview profile
 */
async function createAgentFromProfile(
  session: InterviewSession,
  name: string,
  systemPrompt: string
): Promise<Agent> {
  const log = logger.child({ sessionId: session.id, agentName: name })

  log.info('Creating agent from interview profile')

  const team = teams.find((t) => t.id === session.teamId)
  if (!team) {
    throw new Error(`Team ${session.teamId} not found`)
  }

  const interviewer = agents.find((a) => a.id === session.interviewerId)
  if (!interviewer) {
    throw new Error(`Interviewer ${session.interviewerId} not found`)
  }

  // Determine token allocation based on role
  const tokenAllocation = getTokenAllocation(session.candidateProfile.role)

  // Create new agent
  const newAgent: Agent = {
    id: uuidv4(),
    name,
    role: session.candidateProfile.role,
    status: 'active',
    tokenAllocation,
    tokenUsed: 0,
    systemPrompt,
    teamId: session.teamId,
    seniorId: interviewer.seniorId || interviewer.id, // Report to interviewer's senior or interviewer
    organizationId: team.organizationId,
    createdAt: new Date(),
    lastActiveAt: new Date()
  }

  agents.push(newAgent)

  log.info(
    {
      agentId: newAgent.id,
      agentName: newAgent.name,
      role: newAgent.role,
      tokenAllocation
    },
    'Agent created successfully'
  )

  return newAgent
}

/**
 * Get token allocation based on role
 */
function getTokenAllocation(role: string): number {
  const roleLower = role.toLowerCase()

  if (roleLower.includes('director')) {
    return INTERVIEW_CONFIG.defaultTokenAllocation.director
  }

  if (roleLower.includes('manager') || roleLower.includes('lead')) {
    return INTERVIEW_CONFIG.defaultTokenAllocation.manager
  }

  return INTERVIEW_CONFIG.defaultTokenAllocation.worker
}

/**
 * Cancel an ongoing interview
 */
export function cancelInterview(sessionId: string, reason?: string): void {
  const log = logger.child({ sessionId })

  log.info({ reason }, 'Cancelling interview')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  // Add cancellation message
  if (reason) {
    addMessage(
      sessionId,
      'interviewer',
      `This interview has been cancelled: ${reason}. Please contact HR if you have questions.`
    )
  }

  // Update session status (cancelSession is called from session.ts)
  const sessionModule = require('./session')
  sessionModule.cancelSession(sessionId)

  log.info('Interview cancelled')
}

/**
 * Resume a paused interview
 */
export async function resumeInterview(sessionId: string): Promise<InterviewSession> {
  const log = logger.child({ sessionId })

  log.info('Resuming interview')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  // Resume session (resumeSession is called from session.ts)
  const sessionModule = require('./session')
  sessionModule.resumeSession(sessionId)

  // Send resume message
  addMessage(sessionId, 'interviewer', "Welcome back! Let's continue where we left off.")

  // Generate next question based on current state
  const nextQuestion = await generateNextQuestion(session)
  if (nextQuestion) {
    addMessage(sessionId, 'interviewer', nextQuestion)
  }

  log.info('Interview resumed')

  return session
}
