import { defineEventHandler, readBody } from 'h3'
import { createLogger, newCorrelationId } from '../../utils/logger'
import type { Organization } from '../../../types'
import { organizations } from '../../data/organizations'

const logger = createLogger('api.organizations.post')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  log.info('Received request to create a new organization')

  let body: Partial<Organization>
  try {
    body = await readBody<Partial<Organization>>(event)
  } catch (error) {
    log.error({ error }, 'Failed to parse request body')
    return {
      status: 400,
      body: { error: 'Invalid request body' }
    }
  }

  // Input validation
  if (!body.name || !body.githubRepoUrl) {
    log.warn({ body }, 'Missing required fields')
    return {
      status: 400,
      body: { error: 'Missing required fields: name, githubRepoUrl' }
    }
  }

  try {
    const newOrganization: Organization = {
      id: newCorrelationId(), // Using correlationId for simplicity
      name: body.name,
      githubRepoUrl: body.githubRepoUrl,
      tokenPool: body.tokenPool || 1000000, // Default value
      createdAt: new Date(),
      rootAgentId: null
    }

    organizations.push(newOrganization)

    log.info({ orgId: newOrganization.id }, 'Successfully created new organization')

    return {
      status: 201,
      body: newOrganization
    }
  } catch (error) {
    log.error({ error }, 'An unexpected error occurred while creating the organization')
    return {
      status: 500,
      body: { error: 'Internal Server Error' }
    }
  }
})
