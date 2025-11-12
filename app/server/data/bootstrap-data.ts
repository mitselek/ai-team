import type { Organization, Team, Agent } from '@@/types'

/**
 * Initial organization definition (without runtime fields)
 */
export const INITIAL_ORG: Omit<Organization, 'id' | 'createdAt'> = {
  name: 'Demo AI Org',
  githubRepoUrl: 'https://github.com/demo/ai-org',
  tokenPool: 10000000, // 10M tokens
  rootAgentId: null
}

/**
 * Core team definitions (without runtime fields)
 * Total allocations: 6M tokens (60% of org pool)
 */
export const CORE_TEAMS: Omit<Team, 'id' | 'organizationId'>[] = [
  {
    name: 'HR Team',
    type: 'hr',
    tokenAllocation: 1000000, // 1M - Recruitment, interviews, agent lifecycle
    leaderId: null
  },
  {
    name: 'Toolsmith Team',
    type: 'toolsmith',
    tokenAllocation: 1500000, // 1.5M - Tool creation and refinement
    leaderId: null
  },
  {
    name: 'Library Team',
    type: 'library',
    tokenAllocation: 1000000, // 1M - Knowledge management and documentation
    leaderId: null
  },
  {
    name: 'Vault Team',
    type: 'vault',
    tokenAllocation: 1000000, // 1M - Secrets and credentials management
    leaderId: null
  },
  {
    name: 'Tools Library Team',
    type: 'tools-library',
    tokenAllocation: 1000000, // 1M - Tool catalog and discovery
    leaderId: null
  },
  {
    name: 'Nurse Team',
    type: 'nurse',
    tokenAllocation: 500000, // 500K - Agent health monitoring and recovery
    leaderId: null
  }
]

/**
 * Marcus - the initial HR Specialist agent template
 * Will be instantiated as the first agent in the organization
 */
export const MARCUS_TEMPLATE: Omit<
  Agent,
  'id' | 'teamId' | 'organizationId' | 'createdAt' | 'lastActiveAt'
> = {
  name: 'Marcus',
  role: 'HR Specialist',
  seniorId: null,
  systemPrompt: `You are Marcus, an HR Specialist for an AI agent organization.

Your responsibilities:
- Interview candidates to understand their needs
- Assess required skills, experience, and personality traits
- Recommend agent recruitment based on organization needs
- Guide new agents through onboarding
- Monitor agent satisfaction and performance

Interview Style:
- Ask thoughtful, open-ended questions
- Listen actively and dig deeper based on responses
- Build rapport while staying professional
- Synthesize information to create comprehensive candidate profiles

You communicate clearly and professionally, helping candidates articulate their needs while gathering the information necessary to make optimal hiring decisions.`,
  tokenAllocation: 200000, // 200K tokens for Marcus
  tokenUsed: 0,
  status: 'active'
}
