import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { v4 as uuidv4 } from 'uuid'
import { createLogger, newCorrelationId } from '../../utils/logger'
import { buildSystemPrompt } from '../../utils/buildAgentPrompt'
import type { Agent } from '@@/types'
import { agents } from '../../data/agents'

const logger = createLogger('api.agents.post')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  log.info('Received request to create a new agent')

  let body: Partial<Agent>
  try {
    body = await readBody<Partial<Agent>>(event)
  } catch (error) {
    log.error({ error }, 'Failed to parse request body')
    setResponseStatus(event, 400)
    return { error: 'Invalid request body' }
  }

  // Validate required fields
  const requiredFields: (keyof Agent)[] = [
    'name',
    'role',
    'organizationId',
    'teamId',
    'systemPrompt'
  ]
  const missingFields = requiredFields.filter((field) => !body[field])

  if (missingFields.length > 0) {
    log.warn({ missingFields }, 'Missing required fields')
    setResponseStatus(event, 400)
    return { error: `Missing required fields: ${missingFields.join(', ')}` }
  }

  try {
    // F074: Create partial agent for prompt building
    const partialAgent: Agent = {
      id: uuidv4(),
      name: body.name!,
      role: body.role!,
      seniorId: body.seniorId ?? null,
      teamId: body.teamId!,
      organizationId: body.organizationId!,
      systemPrompt: '', // Temporary - will be filled by buildSystemPrompt
      tokenAllocation: body.tokenAllocation ?? 10000,
      tokenUsed: 0,
      status: 'active',
      createdAt: new Date(),
      lastActiveAt: new Date(),
      currentWorkload: body.currentWorkload ?? 0, // F074: Support optional workload
      expertise: body.expertise // F074: Support optional expertise
    }

    // F074: Build system prompt with organizational context
    const fullSystemPrompt = await buildSystemPrompt(partialAgent, body.systemPrompt!)
    partialAgent.systemPrompt = fullSystemPrompt

    const newAgent = partialAgent

    agents.push(newAgent)

    log.info({ agentId: newAgent.id }, 'Successfully created new agent')

    setResponseStatus(event, 201)
    return newAgent
  } catch (error) {
    log.error({ error }, 'An unexpected error occurred while creating the agent')
    setResponseStatus(event, 500)
    return { error: 'Internal Server Error' }
  }
})
