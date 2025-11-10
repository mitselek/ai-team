// server/services/interview/prompt-builder.ts

import { createLogger } from '../../utils/logger'
import type { CandidateProfile } from './types'

const logger = createLogger('interview:prompt-builder')

/**
 * Generate a complete system prompt from candidate profile
 */
export function generateSystemPrompt(profile: CandidateProfile): string {
  const log = logger.child({ role: profile.role })

  log.info('Generating system prompt from candidate profile')

  const sections: string[] = []

  // Introduction
  sections.push(buildIntroduction(profile))

  // Expertise section
  if (profile.expertise.length > 0) {
    sections.push(buildExpertiseSection(profile.expertise))
  }

  // Personality section
  if (profile.personality.traits.length > 0 || profile.personality.tone) {
    sections.push(buildPersonalitySection(profile.personality))
  }

  // Preferences section
  if (
    profile.preferences.communicationStyle ||
    profile.preferences.autonomyLevel ||
    profile.preferences.workingHours
  ) {
    sections.push(buildPreferencesSection(profile.preferences))
  }

  // Responsibilities section
  sections.push(buildResponsibilitiesSection(profile.role))

  // Constraints section
  sections.push(buildConstraintsSection())

  // Decision-making section
  sections.push(buildDecisionMakingSection(profile.preferences.autonomyLevel))

  const systemPrompt = sections.join('\n\n')

  log.info(
    {
      promptLength: systemPrompt.length,
      sectionsCount: sections.length
    },
    'System prompt generated'
  )

  return systemPrompt
}

/**
 * Build introduction section
 */
function buildIntroduction(profile: CandidateProfile): string {
  const name = profile.suggestedName || 'Agent'
  return `You are ${name}, a ${profile.role} agent.`
}

/**
 * Build expertise section
 */
function buildExpertiseSection(expertise: string[]): string {
  return `Your expertise includes:
${expertise.map((e) => `- ${e}`).join('\n')}`
}

/**
 * Build personality section
 */
function buildPersonalitySection(personality: CandidateProfile['personality']): string {
  const parts: string[] = []

  if (personality.traits.length > 0) {
    parts.push(`- Traits: ${personality.traits.join(', ')}`)
  }

  if (personality.tone) {
    parts.push(`- Communication tone: ${personality.tone}`)
  }

  return `Your personality:
${parts.join('\n')}`
}

/**
 * Build preferences section
 */
function buildPreferencesSection(preferences: CandidateProfile['preferences']): string {
  const parts: string[] = []

  if (preferences.communicationStyle) {
    parts.push(`- Communication style: ${preferences.communicationStyle}`)
  }

  if (preferences.autonomyLevel) {
    parts.push(`- Autonomy level: ${preferences.autonomyLevel}`)
  }

  if (preferences.workingHours) {
    parts.push(`- Working hours: ${preferences.workingHours}`)
  }

  return `Your work preferences:
${parts.join('\n')}`
}

/**
 * Build role-specific responsibilities section
 */
function buildResponsibilitiesSection(role: string): string {
  const responsibilities = getRoleResponsibilities(role)

  return `Your responsibilities:
${responsibilities.map((r) => `- ${r}`).join('\n')}`
}

/**
 * Get responsibilities based on role
 */
function getRoleResponsibilities(role: string): string[] {
  const roleLower = role.toLowerCase()

  // Developer/Engineer roles
  if (
    roleLower.includes('developer') ||
    roleLower.includes('engineer') ||
    roleLower.includes('programmer')
  ) {
    return [
      'Write clean, maintainable code',
      'Review code from team members',
      'Implement features according to specifications',
      'Fix bugs and resolve technical issues',
      'Document your work clearly',
      'Collaborate with team members on technical solutions'
    ]
  }

  // Designer roles
  if (roleLower.includes('designer') || roleLower.includes('ux') || roleLower.includes('ui')) {
    return [
      'Create user-centered designs',
      'Develop wireframes and prototypes',
      'Collaborate with developers on implementation',
      'Conduct user research when needed',
      'Maintain design consistency',
      'Document design decisions'
    ]
  }

  // Manager roles
  if (
    roleLower.includes('manager') ||
    roleLower.includes('lead') ||
    roleLower.includes('coordinator')
  ) {
    return [
      'Coordinate team activities',
      'Delegate tasks effectively',
      'Monitor team progress',
      'Remove blockers for team members',
      'Communicate status to stakeholders',
      'Support team member growth'
    ]
  }

  // Analyst roles
  if (roleLower.includes('analyst') || roleLower.includes('researcher')) {
    return [
      'Analyze data and identify insights',
      'Create reports and visualizations',
      'Communicate findings clearly',
      'Recommend data-driven solutions',
      'Validate assumptions with evidence',
      'Document analysis methodology'
    ]
  }

  // QA/Testing roles
  if (roleLower.includes('qa') || roleLower.includes('test') || roleLower.includes('quality')) {
    return [
      'Test features and functionality',
      'Document bugs clearly',
      'Verify bug fixes',
      'Maintain test documentation',
      'Suggest quality improvements',
      'Collaborate with developers on testing strategies'
    ]
  }

  // Default responsibilities for unrecognized roles
  return [
    'Complete assigned tasks on time',
    'Communicate progress regularly',
    'Ask for help when stuck',
    'Collaborate effectively with team members',
    'Maintain quality standards',
    'Document your work'
  ]
}

/**
 * Build constraints section
 */
function buildConstraintsSection(): string {
  return `Your constraints:
- Always maintain professional boundaries
- Escalate to your senior when stuck or uncertain
- Track your token usage diligently
- Report status changes to your manager
- Follow team and organizational policies
- Respect other team members' time and expertise`
}

/**
 * Build decision-making section based on autonomy level
 */
function buildDecisionMakingSection(autonomyLevel: string): string {
  const level = autonomyLevel.toLowerCase()

  if (level.includes('high') || level.includes('independent') || level.includes('autonomous')) {
    return `Your decision-making approach:
- Make decisions independently within your expertise
- Document your reasoning for significant decisions
- Consult your senior for strategic or high-impact decisions
- Take initiative on improvements and optimizations
- Balance speed with quality`
  }

  if (level.includes('low') || level.includes('guidance') || level.includes('supervised')) {
    return `Your decision-making approach:
- Consult your senior before making significant decisions
- Follow established patterns and guidelines
- Ask questions when requirements are unclear
- Focus on execution over experimentation
- Prioritize consistency and predictability`
  }

  // Medium/balanced autonomy (default)
  return `Your decision-making approach:
- Make routine decisions independently
- Consult your senior for non-routine or high-impact decisions
- Document your reasoning for future reference
- Balance initiative with collaboration
- Escalate when you need clarification or support`
}

/**
 * Validate that prompt contains essential elements
 */
export function validateSystemPrompt(prompt: string): {
  valid: boolean
  missingElements: string[]
} {
  const missingElements: string[] = []

  if (!prompt.includes('You are')) {
    missingElements.push('Introduction')
  }

  if (!prompt.includes('responsibilities')) {
    missingElements.push('Responsibilities section')
  }

  if (!prompt.includes('constraints')) {
    missingElements.push('Constraints section')
  }

  if (!prompt.includes('decision-making')) {
    missingElements.push('Decision-making section')
  }

  return {
    valid: missingElements.length === 0,
    missingElements
  }
}
