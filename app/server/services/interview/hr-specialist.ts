// server/services/interview/hr-specialist.ts

import { v4 as uuidv4 } from 'uuid'
import { createLogger } from '../../utils/logger'
import { agents } from '../../data/agents'
import { tasks } from '../../data/tasks'
import { generateCompletion } from '../llm'
import { loadTeams } from '../persistence/filesystem'
import type { InterviewSession, HRRecommendation } from './types'
import { formatTranscript } from './session'
import { INTERVIEW_CONFIG } from './questions'
import type { Task } from '@@/types'

const logger = createLogger('interview:hr-specialist')

/**
 * Get available teams for an organization with simplified metadata for HR analysis
 */
export async function getAvailableTeams(organizationId: string): Promise<
  Array<{
    id: string
    name: string
    type: string
    description: string
  }>
> {
  const teams = await loadTeams(organizationId)
  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    type: team.type,
    description: team.description || 'No description'
  }))
}

/**
 * Consult HR Specialist (Director) for system prompt and name suggestions
 */
export async function consultHRSpecialist(session: InterviewSession): Promise<HRRecommendation> {
  const log = logger.child({ sessionId: session.id })

  log.info('Starting HR specialist consultation')

  // Find HR Specialist (Director level in HR team)
  const hrSpecialist = findHRSpecialist()

  if (!hrSpecialist) {
    log.warn('No HR Specialist found, generating recommendation directly')
    return await generateDirectRecommendation(session)
  }

  // Format interview data for Director review
  const transcript = formatTranscript(session)
  const profile = session.candidateProfile

  // Create consultation task
  const task = createConsultationTask(session, hrSpecialist.id, transcript, profile)

  log.info(
    {
      taskId: task.id,
      specialistId: hrSpecialist.id,
      specialistName: hrSpecialist.name
    },
    'Consultation task created'
  )

  // In MVP, we simulate Director review with LLM
  // In production, this would wait for actual Director agent to complete task
  const recommendation = await simulateDirectorReview(session, hrSpecialist.id)

  // Mark task as completed
  task.status = 'completed'
  task.completedAt = new Date()
  task.result = JSON.stringify(recommendation)

  log.info(
    {
      taskId: task.id,
      namesCount: recommendation.suggestedNames.length
    },
    'HR specialist consultation completed'
  )

  return recommendation
}

/**
 * Find HR Specialist agent (Director in HR team)
 */
function findHRSpecialist() {
  // Look for director role in HR team
  const specialist = agents.find(
    (a) =>
      (a.role.toLowerCase().includes('director') || a.role.toLowerCase().includes('specialist')) &&
      a.status === 'active'
  )

  return specialist
}

/**
 * Create consultation task for HR Specialist
 */
function createConsultationTask(
  session: InterviewSession,
  specialistId: string,
  transcript: string,
  profile: InterviewSession['candidateProfile']
): Task {
  const task: Task = {
    id: uuidv4(),
    title: `Review interview for ${profile.role}`,
    description: `Interview Transcript:
${transcript}

Candidate Profile:
- Role: ${profile.role}
- Expertise: ${profile.expertise.join(', ')}
- Communication Style: ${profile.preferences.communicationStyle}
- Autonomy Level: ${profile.preferences.autonomyLevel}
- Personality Traits: ${profile.personality.traits.join(', ')}

Please provide:
1. A comprehensive system prompt for this agent
2. Three creative name suggestions
3. Any additional feedback or recommendations`,
    assignedToId: specialistId,
    createdById: session.interviewerId,
    organizationId: agents.find((a) => a.id === specialistId)?.organizationId || 'org-1',
    status: 'pending',
    priority: 'high',
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null
  }

  tasks.push(task)

  return task
}

/**
 * Simulate Director review using LLM (MVP implementation)
 * TODO: Replace with actual Director agent task completion
 */
async function simulateDirectorReview(
  session: InterviewSession,
  specialistId: string
): Promise<HRRecommendation> {
  const log = logger.child({ sessionId: session.id, specialistId })

  log.info('Simulating Director review with LLM')

  const transcript = formatTranscript(session)
  const profile = session.candidateProfile

  const prompt = `You are an experienced HR Director reviewing an interview for a new team member.

Interview Transcript:
${transcript}

Candidate Profile:
- Role: ${profile.role}
- Expertise: ${profile.expertise.join(', ')}
- Communication Style: ${profile.preferences.communicationStyle || 'Not specified'}
- Autonomy Level: ${profile.preferences.autonomyLevel || 'Not specified'}
- Personality Traits: ${profile.personality.traits.join(', ') || 'Not specified'}

Your task:
1. Generate a comprehensive, professional system prompt for this agent
   - Include their role, expertise, personality, and preferences
   - Set clear responsibilities and boundaries
   - Provide decision-making guidelines

2. Suggest 3 creative, professional names that fit their personality and role

3. Provide brief feedback or recommendations

Respond in JSON format:
{
  "systemPrompt": "...",
  "suggestedNames": ["Name1", "Name2", "Name3"],
  "feedback": "..."
}`

  try {
    const response = await generateCompletion(prompt, {
      agentId: specialistId,
      agentRole: 'director',
      taskType: 'final-report',
      temperature: 0.7,
      maxTokens: 2048 // Increased from 1000 to allow complete recommendations
    })

    // Parse JSON response
    const content = response.content.trim()
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : content

    const recommendation = JSON.parse(jsonStr) as HRRecommendation

    // Validate recommendation structure
    if (!recommendation.systemPrompt) {
      throw new Error('Missing system prompt in recommendation')
    }
    if (
      !Array.isArray(recommendation.suggestedNames) ||
      recommendation.suggestedNames.length === 0
    ) {
      recommendation.suggestedNames = ['Alex', 'Jordan', 'Morgan'] // Fallback names
    }
    if (!recommendation.feedback) {
      recommendation.feedback = 'Profile looks good. Agent is ready for onboarding.'
    }

    // Capture model info
    recommendation.speakerLLM = `${response.provider}:${response.model}`

    log.info('Director review completed successfully')

    return recommendation
  } catch (error) {
    log.error({ error }, 'Failed to simulate Director review')
    throw new Error('HR specialist consultation failed')
  }
}

/**
 * Generate recommendation directly without HR Specialist (fallback)
 */
async function generateDirectRecommendation(session: InterviewSession): Promise<HRRecommendation> {
  const log = logger.child({ sessionId: session.id })

  log.warn('Generating recommendation without HR Specialist')

  const profile = session.candidateProfile

  // Generate basic system prompt
  const systemPrompt = `You are a ${profile.role} agent.

Your expertise: ${profile.expertise.join(', ')}

Your responsibilities:
- Complete assigned tasks
- Communicate progress regularly
- Ask for help when stuck
- Maintain quality standards

Your constraints:
- Track token usage
- Escalate when uncertain
- Follow team policies`

  // Generate basic names based on role
  const baseName = profile.role.split(' ')[0] || 'Agent'
  const suggestedNames = [baseName, `${baseName}Bot`, `${baseName}AI`]

  return {
    systemPrompt,
    suggestedNames,
    feedback: 'Generated automatically without HR Specialist review.'
  }
}

/**
 * Wait for HR Specialist task completion (for future implementation)
 */
export async function waitForTaskCompletion(
  taskId: string,
  timeout: number = INTERVIEW_CONFIG.consultTimeout
): Promise<Task> {
  const log = logger.child({ taskId })

  log.info({ timeout }, 'Waiting for task completion')

  const startTime = Date.now()

  // Poll for task completion
  while (Date.now() - startTime < timeout) {
    const task = tasks.find((t) => t.id === taskId)

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    if (task.status === 'completed') {
      log.info('Task completed')
      return task
    }

    if (task.status === 'cancelled') {
      throw new Error(`Task ${taskId} was cancelled`)
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }

  throw new Error(`Task ${taskId} completion timeout after ${timeout}ms`)
}

/**
 * Parse HR recommendation from completed task result
 */
export function parseHRRecommendation(task: Task): HRRecommendation {
  if (!task.result) {
    throw new Error('Task has no result')
  }

  try {
    const recommendation = JSON.parse(task.result) as HRRecommendation
    return recommendation
  } catch (error) {
    throw new Error('Failed to parse HR recommendation from task result')
  }
}
