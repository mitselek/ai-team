// server/services/interview/questions.ts

import { createLogger } from '../../utils/logger'
import { generateCompletion } from '../llm'
import type { InterviewSession } from './types'
import { formatTranscript } from './session'

const logger = createLogger('interview:questions')

/**
 * Interview configuration constants
 */
export const INTERVIEW_CONFIG = {
  maxQuestions: 12,
  minQuestions: 8,
  followUpThreshold: 6, // Clarity score below 6 triggers follow-up
  consultTimeout: 300000, // 5 minutes
  sessionTimeout: 1800000, // 30 minutes
  defaultTokenAllocation: {
    worker: 100000,
    manager: 200000,
    director: 300000
  }
}

/**
 * Generate the next question based on interview state and context
 */
export async function generateNextQuestion(session: InterviewSession): Promise<string | null> {
  const log = logger.child({ sessionId: session.id, state: session.currentState })

  log.info('Generating next interview question')

  // Check if we've reached max questions
  if (session.transcript.length >= INTERVIEW_CONFIG.maxQuestions * 2) {
    log.info('Maximum questions reached, moving to consultation')
    return null
  }

  // Build context from transcript
  const transcript = formatTranscript(session)
  const profile = session.candidateProfile

  // Generate prompt based on current state
  const prompt = buildQuestionPrompt(session.currentState, transcript, profile)

  try {
    const response = await generateCompletion(prompt, {
      agentId: session.interviewerId,
      temperature: 0.7,
      maxTokens: 200
    })

    const content = response.content?.trim() || ''

    // Check if LLM indicates interview is complete
    if (content.includes('INTERVIEW_COMPLETE') || content.includes('COMPLETE')) {
      log.info('LLM indicates interview is complete')
      return null
    }

    log.info(
      {
        questionLength: content.length,
        tokensUsed: response.tokensUsed.total
      },
      'Question generated successfully'
    )

    return content
  } catch (error) {
    log.error({ error }, 'Failed to generate question')
    throw error
  }
}

/**
 * Build the LLM prompt for question generation
 */
function buildQuestionPrompt(
  state: InterviewSession['currentState'],
  transcript: string,
  profile: InterviewSession['candidateProfile']
): string {
  const baseContext = `You are an HR interviewer conducting an onboarding interview for a new team member.
Keep your questions natural, conversational, and ask ONE question at a time.

Interview progress:
${transcript || '(No messages yet)'}

Candidate profile so far:
- Role: ${profile.role || 'Unknown'}
- Expertise: ${profile.expertise.join(', ') || 'None collected'}
- Communication style: ${profile.preferences.communicationStyle || 'Unknown'}
- Autonomy level: ${profile.preferences.autonomyLevel || 'Unknown'}
- Personality traits: ${profile.personality.traits.join(', ') || 'None identified'}
`

  switch (state) {
    case 'greet':
      return `${baseContext}

You are starting the interview. Greet the candidate warmly and introduce yourself.
Ask them what role they will be taking on the team.`

    case 'ask_role':
      return `${baseContext}

The candidate has introduced themselves. Ask about their role if not already clear,
or ask about their areas of expertise within that role.`

    case 'ask_expertise':
      return `${baseContext}

You've learned about their role. Now ask about specific expertise, skills, or
areas they excel in. Keep it focused and relevant to their role.`

    case 'ask_preferences':
      return `${baseContext}

You've collected expertise information. Now ask about their work preferences:
- How they prefer to communicate
- Their preferred level of autonomy
- Any working style preferences

Choose ONE aspect to ask about now.`

    case 'follow_up':
      return `${baseContext}

The candidate's last response needs clarification or elaboration.
Ask a natural follow-up question to get more specific information.`

    default:
      return `${baseContext}

Continue the interview naturally. Ask the next most relevant question based on
what you've learned so far. If you feel you have enough information to create
a comprehensive agent profile, respond with just "INTERVIEW_COMPLETE".`
  }
}

/**
 * Generate a greeting message
 */
export function generateGreeting(interviewerName: string, teamName: string): string {
  return `Hello! I'm ${interviewerName} from the ${teamName}. Welcome to the interview process. I'll be asking you a few questions to help us understand your role and preferences. Let's get started!`
}

/**
 * Generate a follow-up question based on unclear response
 */
export async function generateFollowUpQuestion(
  session: InterviewSession,
  reason: string
): Promise<string> {
  const log = logger.child({ sessionId: session.id })

  log.info({ reason }, 'Generating follow-up question')

  const lastResponse = session.transcript[session.transcript.length - 1]?.message || ''
  const lastQuestion = session.transcript[session.transcript.length - 2]?.message || ''

  const prompt = `You are an HR interviewer. The candidate's response needs clarification.

Previous question: "${lastQuestion}"
Candidate's response: "${lastResponse}"
Reason for follow-up: ${reason}

Generate a polite, natural follow-up question to get clearer information.
Keep it brief and specific.`

  try {
    const response = await generateCompletion(prompt, {
      agentId: session.interviewerId,
      temperature: 0.7,
      maxTokens: 150
    })

    log.info('Follow-up question generated')
    return response.content.trim()
  } catch (error) {
    log.error({ error }, 'Failed to generate follow-up question')
    throw error
  }
}

/**
 * Check if we have minimum required information
 */
export function hasMinimumInformation(session: InterviewSession): boolean {
  const profile = session.candidateProfile

  // Must have role and at least some expertise
  if (!profile.role || profile.expertise.length === 0) {
    return false
  }

  // Must have at least one preference
  if (
    !profile.preferences.communicationStyle &&
    !profile.preferences.autonomyLevel &&
    !profile.preferences.workingHours
  ) {
    return false
  }

  // Must have minimum number of exchanges
  const messageCount = session.transcript.length
  if (messageCount < INTERVIEW_CONFIG.minQuestions * 2) {
    return false
  }

  return true
}

/**
 * Determine if interview should continue or move to consultation
 */
export function shouldContinueInterview(session: InterviewSession): boolean {
  // Check session timeout
  const elapsed = new Date().getTime() - session.createdAt.getTime()
  if (elapsed > INTERVIEW_CONFIG.sessionTimeout) {
    logger.warn({ sessionId: session.id }, 'Interview session timeout reached')
    return false
  }

  // Check max questions
  if (session.transcript.length >= INTERVIEW_CONFIG.maxQuestions * 2) {
    logger.info({ sessionId: session.id }, 'Maximum questions reached')
    return false
  }

  // Check minimum information
  if (hasMinimumInformation(session)) {
    logger.info({ sessionId: session.id }, 'Minimum information collected')
    return false
  }

  return true
}
