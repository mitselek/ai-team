// server/services/interview/name-generator.ts

import { createLogger } from '../../utils/logger'
import { generateCompletion } from '../llm'
import { agents } from '../../data/agents'
import type { CandidateProfile } from './types'

const logger = createLogger('interview:name-generator')

/**
 * Generate a creative agent name based on candidate profile
 */
export async function generateAgentName(
  profile: CandidateProfile,
  teamId: string,
  interviewerId: string
): Promise<string> {
  const log = logger.child({ teamId, role: profile.role })

  log.info('Generating agent name')

  // Get existing names in the team to avoid conflicts
  const existingNames = agents.filter((a) => a.teamId === teamId).map((a) => a.name)

  const prompt = buildNameGenerationPrompt(profile, existingNames)

  try {
    const response = await generateCompletion(prompt, {
      agentId: interviewerId,
      temperature: 0.9, // High creativity for name generation
      maxTokens: 200
    })

    // Extract names from response
    const names = extractNames(response.content)

    // Find first available name
    const availableName = names.find((name) => !existingNames.includes(name))

    if (!availableName) {
      // Fallback: use first generated name with a number suffix
      const baseName = names[0] || generateFallbackName(profile.role)
      const uniqueName = makeNameUnique(baseName, existingNames)

      log.warn(
        {
          generatedNames: names,
          existingNames: existingNames.length,
          fallbackName: uniqueName
        },
        'All generated names were taken, using fallback'
      )

      return uniqueName
    }

    log.info(
      {
        selectedName: availableName,
        alternativesCount: names.length - 1
      },
      'Agent name generated'
    )

    return availableName
  } catch (error) {
    log.error({ error }, 'Failed to generate agent name')

    // Fallback to role-based name
    const fallbackName = generateFallbackName(profile.role)
    const uniqueName = makeNameUnique(fallbackName, existingNames)

    log.warn({ fallbackName: uniqueName }, 'Using fallback name generation')

    return uniqueName
  }
}

/**
 * Build prompt for name generation
 */
function buildNameGenerationPrompt(profile: CandidateProfile, existingNames: string[]): string {
  const traitsDesc =
    profile.personality.traits.length > 0 ? profile.personality.traits.join(', ') : 'professional'
  const toneDesc = profile.personality.tone || 'balanced'

  return `Generate 3 professional, traditional human names for a new ${profile.role} agent.

Personality traits: ${traitsDesc}
Communication tone: ${toneDesc}
Role: ${profile.role}

Existing team member names (avoid these): ${existingNames.join(', ') || 'None'}

Requirements:
- Use traditional human first names (e.g., John, Sarah, Michael, Jennifer, David, Maria)
- Include a surname for most names (about 70% of the time) like Smith, Johnson, Chen, Garcia, Patel, Kim, etc.
- Some names can be just a first name (about 30% of the time)
- Names should be culturally diverse
- Names should feel professional and appropriate for a workplace
- Each name should be unique and distinct
- Avoid names that are too similar to existing ones

Examples: "John Smith", "Sarah Johnson", "Michael", "Jennifer Chen", "David"

Generate exactly 3 names, one per line. Do not include explanations or numbering.`
}

/**
 * Extract names from LLM response
 */
function extractNames(response: string): string[] {
  const lines = response
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const names: string[] = []

  for (const line of lines) {
    // Remove common prefixes and formatting
    let name = line
      .replace(/^\d+[\.\)]\s*/, '') // Remove "1. " or "1) "
      .replace(/^-\s*/, '') // Remove "- "
      .replace(/^[*]\s*/, '') // Remove "* "
      .trim()

    // Extract name if it contains additional description
    if (name.includes('-')) {
      name = name.split('-')[0].trim()
    }
    if (name.includes('(')) {
      name = name.split('(')[0].trim()
    }
    if (name.includes(':')) {
      name = name.split(':')[0].trim()
    }

    // Validate name
    if (isValidName(name)) {
      names.push(name)
    }

    // Stop after collecting 3 names
    if (names.length >= 3) {
      break
    }
  }

  return names
}

/**
 * Validate that a name is appropriate
 */
function isValidName(name: string): boolean {
  // Must have content
  if (!name || name.length === 0) {
    return false
  }

  // Must not be too long
  if (name.length > 50) {
    return false
  }

  // Must not contain special characters (except spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    return false
  }

  // Must start with a letter
  if (!/^[a-zA-Z]/.test(name)) {
    return false
  }

  return true
}

/**
 * Culturally diverse name pools
 */
const FIRST_NAMES = [
  'Alex',
  'Jordan',
  'Morgan',
  'Casey',
  'Taylor',
  'Riley',
  'Jamie',
  'John',
  'Sarah',
  'Michael',
  'Jennifer',
  'David',
  'Maria',
  'Robert',
  'Lisa',
  'James',
  'Emily',
  'Daniel',
  'Jessica',
  'Christopher',
  'Michelle',
  'Wei',
  'Yuki',
  'Raj',
  'Priya',
  'Ahmed',
  'Fatima',
  'Carlos',
  'Ana',
  'Omar',
  'Leila',
  'Hassan',
  'Amira',
  'Dmitri',
  'Natasha',
  'Ivan',
  'Olga'
]

const SURNAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Martinez',
  'Rodriguez',
  'Chen',
  'Wang',
  'Li',
  'Zhang',
  'Kim',
  'Park',
  'Lee',
  'Patel',
  'Singh',
  'Kumar',
  'Nguyen',
  'Tran',
  'Cohen',
  'Levine',
  'Müller',
  'Schmidt',
  'Rossi',
  'Ferrari',
  'Silva',
  'Santos',
  'Ivanov',
  'Petrov',
  'Hassan',
  'Ahmed',
  'Ali',
  'Ibrahim'
]

/**
 * Generate a fallback name based on role with optional surname
 */
function generateFallbackName(role: string): string {
  const roleLower = role.toLowerCase()

  // Map role to first name
  let firstName: string
  if (roleLower.includes('developer') || roleLower.includes('engineer')) {
    firstName = 'Alex'
  } else if (roleLower.includes('designer')) {
    firstName = 'Jordan'
  } else if (roleLower.includes('manager')) {
    firstName = 'Morgan'
  } else if (roleLower.includes('analyst')) {
    firstName = 'Casey'
  } else if (roleLower.includes('qa') || roleLower.includes('test')) {
    firstName = 'Taylor'
  } else {
    // Pick a random first name from the pool
    firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
  }

  // Add surname approximately 70% of the time
  if (Math.random() < 0.7) {
    const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)]
    return `${firstName} ${surname}`
  }

  return firstName
}

/**
 * Make a name unique by adding a numeric suffix if needed
 */
function makeNameUnique(baseName: string, existingNames: string[]): string {
  if (!existingNames.includes(baseName)) {
    return baseName
  }

  // Try adding numbers until we find an available name
  for (let i = 2; i <= 100; i++) {
    const candidateName = `${baseName} ${i}`
    if (!existingNames.includes(candidateName)) {
      return candidateName
    }
  }

  // Ultimate fallback with timestamp
  return `${baseName} ${Date.now()}`
}

/**
 * Suggest alternative names if initial name is rejected
 */
export async function suggestAlternativeNames(
  profile: CandidateProfile,
  teamId: string,
  interviewerId: string,
  rejectedName: string
): Promise<string[]> {
  const log = logger.child({ teamId, rejectedName })

  log.info('Generating alternative names')

  const existingNames = agents.filter((a) => a.teamId === teamId).map((a) => a.name)
  existingNames.push(rejectedName) // Also avoid the rejected name

  const prompt = `${buildNameGenerationPrompt(profile, existingNames)}

The name "${rejectedName}" was already rejected. Generate 3 completely different alternatives.`

  try {
    const response = await generateCompletion(prompt, {
      agentId: interviewerId,
      temperature: 0.95, // Even higher creativity for alternatives
      maxTokens: 200
    })

    const names = extractNames(response.content).filter((name) => !existingNames.includes(name))

    log.info({ alternativesCount: names.length }, 'Alternative names generated')

    return names
  } catch (error) {
    log.error({ error }, 'Failed to generate alternative names')
    return []
  }
}
