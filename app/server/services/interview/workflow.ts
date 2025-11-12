// server/services/interview/workflow.ts

import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '../../utils/logger'
import { agents } from '../../data/agents'
import { teams } from '../../data/teams'
import type { Agent } from '@@/types'
import type { InterviewSession } from './types'
import {
  createSession,
  getSession,
  addMessage,
  updateState,
  updateProfile,
  completeSession
} from './session'
import { generateNextQuestion, generateGreeting } from './questions'
import { analyzeResponse } from './analyzer'
import { consultHRSpecialist } from './hr-specialist'
import { generateSystemPrompt } from './prompt-builder'
import { generateAgentName } from './name-generator'
import { INTERVIEW_CONFIG } from './questions'
import {
  shouldTransitionState,
  getNextState,
  incrementExchangeCounter,
  resetExchangeCounter,
  isStateBlocked
} from './state-machine'

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

  // Check if current state is blocked (doesn't accept user responses)
  if (isStateBlocked(session)) {
    throw new Error(
      `Cannot respond in state '${session.currentState}'. This state uses dedicated approval endpoints.`
    )
  }

  // Add response to transcript
  addMessage(sessionId, 'requester', response)

  // Increment exchange counter for state machine
  incrementExchangeCounter(session)

  // Analyze response (extract data only, no flow control)
  const analysis = await analyzeResponse(session, response)

  log.info(
    {
      clarityScore: analysis.clarityScore,
      keyInfoCount: analysis.keyInfo.length,
      currentState: session.currentState,
      exchanges: session.exchangesInCurrentState
    },
    'Response analyzed'
  )

  // Check if state should transition (formal logic, not LLM judgment)
  if (shouldTransitionState(session)) {
    const nextState = getNextState(session)

    if (!nextState || nextState === 'complete') {
      // Interview complete
      return await finalizeInterview(sessionId)
    }

    log.info({ sessionId, oldState: session.currentState, nextState }, 'Transitioning state')

    // Update to next state and reset counter
    updateState(sessionId, nextState)
    resetExchangeCounter(session)

    const nextQuestion = await generateNextQuestion(session)
    if (nextQuestion) {
      addMessage(sessionId, 'interviewer', nextQuestion)
    }

    return {
      nextQuestion: nextQuestion || '',
      complete: false
    }
  }

  // Continue in current state - generate next question
  const nextQuestion = await generateNextQuestion(session)

  if (!nextQuestion) {
    // No more questions, finalize
    return await finalizeInterview(sessionId)
  }

  addMessage(sessionId, 'interviewer', nextQuestion)

  return {
    nextQuestion,
    complete: false
  }
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

/**
 * Approve the generated system prompt
 */
export function approvePrompt(sessionId: string): void {
  const log = logger.child({ sessionId })

  log.info('Approving system prompt')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  if (session.currentState !== 'review_prompt') {
    throw new Error(`Cannot approve prompt in state '${session.currentState}'`)
  }

  // Transition to test conversation
  updateState(sessionId, 'test_conversation')
  resetExchangeCounter(session)

  log.info({ newState: 'test_conversation' }, 'Prompt approved, moved to test conversation')
}

/**
 * Reject the generated system prompt
 */
export function rejectPrompt(sessionId: string): void {
  const log = logger.child({ sessionId })

  log.info('Rejecting system prompt')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  if (session.currentState !== 'review_prompt') {
    throw new Error(`Cannot reject prompt in state '${session.currentState}'`)
  }

  // Transition back to finalize to regenerate prompt
  updateState(sessionId, 'finalize')

  log.info({ newState: 'finalize' }, 'Prompt rejected, moved back to finalize')
}

/**
 * Edit the generated system prompt
 */
export async function editPrompt(sessionId: string, newPrompt: string): Promise<void> {
  const log = logger.child({ sessionId })

  log.info('Editing system prompt')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  if (session.currentState !== 'review_prompt') {
    throw new Error(`Cannot edit prompt in state '${session.currentState}'`)
  }

  // Update the prompt in the agent draft
  if (session.agentDraft) {
    session.agentDraft.draftPrompt = newPrompt
  } else {
    // This case should ideally not happen in this state, but handle defensively
    await updateProfile(sessionId, { systemPrompt: newPrompt })
  }

  // Save session changes
  const { saveInterview } = await import('../persistence/filesystem')
  await saveInterview(session)

  log.info('System prompt updated successfully')
}

/**
 * Send a test message to the draft agent
 */
export async function sendTestMessage(
  sessionId: string,
  message: string,
  correlationId?: string
): Promise<{ response: string; historyLength: number }> {
  const log = logger.child({ sessionId, correlationId })

  log.info('Sending test message to draft agent')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  if (session.currentState !== 'test_conversation') {
    throw new Error(
      `Cannot send test message in state '${session.currentState}'. Must be in 'test_conversation' state.`
    )
  }

  if (!session.agentDraft?.draftPrompt) {
    throw new Error('No draft prompt available for testing')
  }

  // Dynamically import to avoid circular dependencies
  const { generateCompletion } = await import('../llm')
  const { saveInterview } = await import('../persistence/filesystem')

  // Build conversation context for the LLM
  const messages = [
    { role: 'system', content: session.agentDraft.draftPrompt },
    ...(session.testConversationHistory || []).map((msg) => ({
      role: msg.speaker === 'requester' ? 'user' : 'assistant',
      content: msg.message
    })),
    { role: 'user', content: message }
  ]

  // The 'generateCompletion' function expects a string prompt.
  // We need to format the messages array into a string.
  // This is a simplified representation; a more robust solution might be needed
  // depending on the LLM provider's expected format.
  const prompt = messages
    .map((m) => {
      if (m.role === 'system') {
        return `${m.content}\n\n` // System prompts often are presented first
      }
      return `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    })
    .join('\n')

  try {
    const response = await generateCompletion(prompt, {
      agentId: session.interviewerId, // Track token usage against the interviewer
      temperature: 0.7,
      maxTokens: 1500 // Increased from 1000 to allow complete test responses
    })

    const agentResponse = response.content.trim()

    // Initialize history if it doesn't exist
    if (!session.testConversationHistory) {
      session.testConversationHistory = []
    }

    // Add user message to history
    session.testConversationHistory.push({
      id: uuidv4(),
      speaker: 'requester',
      message,
      timestamp: new Date()
    })

    // Add agent response to history
    session.testConversationHistory.push({
      id: uuidv4(),
      speaker: 'interviewer', // 'interviewer' acts as the draft agent here
      message: agentResponse,
      timestamp: new Date()
    })

    await saveInterview(session)

    log.info(
      { historyLength: session.testConversationHistory.length },
      'Test message processed successfully'
    )

    return {
      response: agentResponse,
      historyLength: session.testConversationHistory.length
    }
  } catch (error) {
    log.error({ error }, 'Failed to process test message')
    throw new Error('Failed to get response from LLM during test conversation')
  }
}

/**
 * Clear test conversation history
 */
export async function clearTestHistory(sessionId: string): Promise<void> {
  const log = logger.child({ sessionId })

  log.info('Clearing test conversation history')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  if (session.currentState !== 'test_conversation') {
    throw new Error(
      `Cannot clear test history in state '${session.currentState}'. Must be in 'test_conversation' state.`
    )
  }

  session.testConversationHistory = []

  const { saveInterview } = await import('../persistence/filesystem')
  await saveInterview(session)

  log.info('Test conversation history cleared successfully')
}

/**
 * Approve the agent after successful test conversation
 */
export function approveAgent(sessionId: string): void {
  const log = logger.child({ sessionId })

  log.info('Approving agent after test conversation')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  if (session.currentState !== 'test_conversation') {
    throw new Error(`Cannot approve agent in state '${session.currentState}'`)
  }

  // Transition to assign_details
  updateState(sessionId, 'assign_details')
  resetExchangeCounter(session)

  log.info({ newState: 'assign_details' }, 'Agent approved, moved to assign details')
}

/**
 * Reject the agent after a test conversation and return to prompt review
 */
export function rejectAgent(sessionId: string): void {
  const log = logger.child({ sessionId })

  log.info('Rejecting agent, returning to prompt review')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  if (session.currentState !== 'test_conversation') {
    throw new Error(`Cannot reject agent in state '${session.currentState}'`)
  }

  // Clear test conversation history (start fresh)
  session.testConversationHistory = []

  // Transition back to review_prompt
  updateState(sessionId, 'review_prompt')

  log.info({ newState: 'review_prompt' }, 'Agent rejected, moved back to review prompt')
}

/**
 * Set agent name and gender, create the final agent
 */
export async function setAgentDetails(
  sessionId: string,
  name: string,
  gender: 'male' | 'female' | 'non-binary' | 'other'
): Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any
  agentId: string
}> {
  const log = logger.child({ sessionId })

  log.info({ name, gender }, 'Setting agent details and creating final agent')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  if (session.currentState !== 'assign_details') {
    throw new Error(`Cannot set details in state '${session.currentState}'`)
  }

  if (!session.agentDraft) {
    throw new Error('Agent draft not found - cannot create agent')
  }

  // Update agent draft with final details
  session.agentDraft.finalName = name
  session.agentDraft.gender = gender

  // Create the final agent
  const newAgent = await createAgentFromProfile(session, name, session.agentDraft.draftPrompt)

  // Transition to complete
  updateState(sessionId, 'complete')
  completeSession(sessionId)

  log.info({ agentId: newAgent.id, name, gender }, 'Agent created successfully')

  return { session, agentId: newAgent.id }
}
