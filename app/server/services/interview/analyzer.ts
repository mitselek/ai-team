// server/services/interview/analyzer.ts

import { createLogger } from '../../utils/logger'
import { generateCompletion } from '../llm'
import type { InterviewSession, AnalysisResult } from './types'
import { updateProfile } from './session'
import { INTERVIEW_CONFIG } from './questions'

const logger = createLogger('interview:analyzer')

/**
 * Analyze a candidate's response to extract key information
 */
export async function analyzeResponse(
  session: InterviewSession,
  response: string
): Promise<AnalysisResult> {
  const log = logger.child({ sessionId: session.id })

  log.info({ responseLength: response.length }, 'Analyzing candidate response')

  // Get the last question that was asked
  const lastQuestion =
    session.transcript.length >= 2 ? session.transcript[session.transcript.length - 2].message : ''

  const prompt = `Analyze this interview response and extract key information.

Question: "${lastQuestion}"
Response: "${response}"

Analyze the response and provide:
1. Key information mentioned (skills, preferences, traits, specific details)
2. Clarity score (1-10, where 10 is very clear and specific)
3. Whether a follow-up question is needed (true/false)
4. If follow-up needed, explain why

Respond in valid JSON format only:
{
  "keyInfo": ["item1", "item2", "item3"],
  "clarityScore": 8,
  "needsFollowUp": false,
  "followUpReason": ""
}`

  try {
    const llmResponse = await generateCompletion(prompt, {
      agentId: session.interviewerId,
      temperature: 0.3,
      maxTokens: 300
    })

    // Parse JSON response
    const content = llmResponse.content.trim()
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : content

    let analysis: AnalysisResult
    try {
      analysis = JSON.parse(jsonStr) as AnalysisResult
    } catch (parseError) {
      log.warn({ parseError }, 'Failed to parse analysis JSON, using defaults')
      analysis = {
        keyInfo: [],
        clarityScore: 5,
        needsFollowUp: false,
        followUpReason: ''
      }
    }

    // Validate analysis structure
    if (!Array.isArray(analysis.keyInfo)) {
      analysis.keyInfo = []
    }
    if (typeof analysis.clarityScore !== 'number') {
      analysis.clarityScore = 5
    }
    if (typeof analysis.needsFollowUp !== 'boolean') {
      analysis.needsFollowUp = false
    }

    log.info(
      {
        keyInfoCount: analysis.keyInfo.length,
        clarityScore: analysis.clarityScore,
        needsFollowUp: analysis.needsFollowUp
      },
      'Response analyzed successfully'
    )

    // Update candidate profile with extracted information
    updateCandidateProfile(session, analysis.keyInfo, session.currentState)

    return analysis
  } catch (error) {
    log.error({ error }, 'Failed to analyze response')

    // Return default analysis on error
    return {
      keyInfo: [],
      clarityScore: 5,
      needsFollowUp: false,
      followUpReason: ''
    }
  }
}

/**
 * Update candidate profile based on extracted key information
 */
function updateCandidateProfile(
  session: InterviewSession,
  keyInfo: string[],
  state: InterviewSession['currentState']
): void {
  const log = logger.child({ sessionId: session.id, state })

  if (keyInfo.length === 0) {
    return
  }

  const updates: {
    role?: string
    expertise?: string[]
    preferences?: InterviewSession['candidateProfile']['preferences']
    personality?: InterviewSession['candidateProfile']['personality']
  } = {}

  // Extract information based on current state
  switch (state) {
    case 'greet':
    case 'ask_role':
      // Looking for role information
      updates.role = extractRole(keyInfo, session.candidateProfile.role)
      break

    case 'ask_expertise':
      // Looking for skills and expertise
      updates.expertise = [
        ...session.candidateProfile.expertise,
        ...extractExpertise(keyInfo)
      ].filter((e, i, arr) => arr.indexOf(e) === i) // Deduplicate
      break

    case 'ask_preferences':
      // Looking for work preferences
      const prefUpdates = extractPreferences(keyInfo, session.candidateProfile.preferences)
      if (Object.keys(prefUpdates).length > 0) {
        updates.preferences = {
          ...session.candidateProfile.preferences,
          ...prefUpdates
        }
      }
      break

    case 'follow_up':
      // Could be any type of information, try to extract all
      if (!session.candidateProfile.role) {
        updates.role = extractRole(keyInfo, '')
      }
      const newExpertise = extractExpertise(keyInfo)
      if (newExpertise.length > 0) {
        updates.expertise = [...session.candidateProfile.expertise, ...newExpertise].filter(
          (e, i, arr) => arr.indexOf(e) === i
        )
      }
      const newPreferences = extractPreferences(keyInfo, session.candidateProfile.preferences)
      if (Object.keys(newPreferences).length > 0) {
        updates.preferences = {
          ...session.candidateProfile.preferences,
          ...newPreferences
        }
      }
      break
  }

  // Extract personality traits from any response
  const traits = extractPersonalityTraits(keyInfo)
  if (traits.length > 0) {
    updates.personality = {
      ...session.candidateProfile.personality,
      traits: [...session.candidateProfile.personality.traits, ...traits].filter(
        (t, i, arr) => arr.indexOf(t) === i
      )
    }
  }

  // Apply updates if any
  if (Object.keys(updates).length > 0) {
    updateProfile(session.id, updates)
    log.debug({ updates }, 'Candidate profile updated from analysis')
  }
}

/**
 * Extract role from key information
 */
function extractRole(keyInfo: string[], currentRole: string): string {
  if (currentRole) {
    return currentRole
  }

  const roleKeywords = [
    'developer',
    'engineer',
    'designer',
    'manager',
    'director',
    'analyst',
    'architect',
    'lead',
    'senior',
    'junior',
    'frontend',
    'backend',
    'fullstack',
    'devops',
    'qa',
    'tester',
    'product',
    'project'
  ]

  for (const info of keyInfo) {
    const lower = info.toLowerCase()
    for (const keyword of roleKeywords) {
      if (lower.includes(keyword)) {
        return info
      }
    }
  }

  return currentRole
}

/**
 * Extract expertise and skills
 */
function extractExpertise(keyInfo: string[]): string[] {
  const expertise: string[] = []

  const expertiseKeywords = [
    'experience',
    'expertise',
    'skilled',
    'proficient',
    'knowledge',
    'specialized',
    'good at',
    'excel',
    'strong'
  ]

  for (const info of keyInfo) {
    const lower = info.toLowerCase()
    const hasExpertiseKeyword = expertiseKeywords.some((kw) => lower.includes(kw))

    if (
      hasExpertiseKeyword ||
      lower.length < 50 // Short items are likely specific skills
    ) {
      expertise.push(info)
    }
  }

  return expertise
}

/**
 * Extract work preferences
 */
function extractPreferences(
  keyInfo: string[],
  current: InterviewSession['candidateProfile']['preferences']
): Partial<InterviewSession['candidateProfile']['preferences']> {
  const updates: Partial<InterviewSession['candidateProfile']['preferences']> = {}

  for (const info of keyInfo) {
    const lower = info.toLowerCase()

    // Communication style
    if (
      !current.communicationStyle &&
      (lower.includes('communication') ||
        lower.includes('written') ||
        lower.includes('verbal') ||
        lower.includes('async') ||
        lower.includes('sync'))
    ) {
      updates.communicationStyle = info
    }

    // Autonomy level
    if (
      !current.autonomyLevel &&
      (lower.includes('autonomy') ||
        lower.includes('independent') ||
        lower.includes('guidance') ||
        lower.includes('supervision') ||
        lower.includes('freedom'))
    ) {
      updates.autonomyLevel = info
    }

    // Working hours
    if (
      !current.workingHours &&
      (lower.includes('hours') ||
        lower.includes('schedule') ||
        lower.includes('availability') ||
        lower.includes('timezone'))
    ) {
      updates.workingHours = info
    }
  }

  return updates
}

/**
 * Extract personality traits
 */
function extractPersonalityTraits(keyInfo: string[]): string[] {
  const traits: string[] = []

  const personalityKeywords = [
    'detail-oriented',
    'collaborative',
    'independent',
    'creative',
    'analytical',
    'methodical',
    'flexible',
    'adaptable',
    'proactive',
    'patient',
    'thorough',
    'efficient',
    'careful',
    'precise',
    'innovative'
  ]

  for (const info of keyInfo) {
    const lower = info.toLowerCase()
    for (const keyword of personalityKeywords) {
      if (lower.includes(keyword)) {
        traits.push(keyword)
      }
    }
  }

  return traits
}

/**
 * Determine if response needs follow-up
 */
export function needsFollowUp(analysis: AnalysisResult): boolean {
  // Follow up if clarity score is below threshold
  if (analysis.clarityScore < INTERVIEW_CONFIG.followUpThreshold) {
    return true
  }

  // Follow up if LLM explicitly recommends it
  if (analysis.needsFollowUp) {
    return true
  }

  // Follow up if very little information was extracted
  if (analysis.keyInfo.length < 2 && analysis.clarityScore < 8) {
    return true
  }

  return false
}
