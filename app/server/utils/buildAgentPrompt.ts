import { readFile } from 'fs/promises'
import { join } from 'path'
import type { Agent } from '../../../types'
import { agents } from '../data/agents'
import { teams } from '../data/teams'

/**
 * Build agent system prompt by merging custom prompt with organizational context.
 *
 * F074: Agent Roster & Organizational Awareness
 * Phase 2: System Prompt Builder
 *
 * Loads organizational context template, fills variables from agent data,
 * and appends to agent's custom system prompt.
 *
 * @param agent - Agent to build prompt for
 * @param customPrompt - Agent's custom system prompt
 * @returns Complete system prompt (custom + organizational context)
 * @throws Error if team not found
 */
export async function buildSystemPrompt(agent: Agent, customPrompt: string): Promise<string> {
  // Load template from standard location
  const templatePath = join(process.cwd(), '.specify/templates/organizational-context.md')
  const template = await readFile(templatePath, 'utf-8')

  // Lookup team
  const team = teams.find((t) => t.id === agent.teamId)
  if (!team) {
    throw new Error(`Team ${agent.teamId} not found`)
  }

  // Lookup senior (optional)
  let seniorName = 'None'
  let seniorId = ''
  if (agent.seniorId) {
    const senior = agents.find((a) => a.id === agent.seniorId)
    seniorName = senior?.name ?? 'Unknown'
    seniorId = agent.seniorId
  }

  // Build expertise list
  const expertiseList =
    agent.expertise && agent.expertise.length > 0 ? agent.expertise.join(', ') : 'Not specified'

  // Current workload (just the number, template has "/5 tasks" literal)
  const currentWorkload = agent.currentWorkload ?? 0

  // Fill template variables
  let filled = template
    .replace(/{agent_name}/g, agent.name)
    .replace(/{agent_role}/g, agent.role)
    .replace(/{agent_team}/g, team.name)
    .replace(/{senior_name}/g, seniorName)
    .replace(/{senior_id}/g, seniorId)
    .replace(/{current_workload}/g, String(currentWorkload))
    .replace(/{expertise_list}/g, expertiseList)

  // Merge custom prompt + organizational context
  return `${customPrompt}\n\n${filled}`
}
