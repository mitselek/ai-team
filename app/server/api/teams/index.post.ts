import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { v4 as uuidv4 } from 'uuid'
import { createLogger, newCorrelationId } from '../../utils/logger'
import type { Team } from '@@/types'
import { teams } from '../../data/teams'

const logger = createLogger('api.teams.post')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  log.info('Received request to create a new team')

  let body: Partial<Team>
  try {
    body = await readBody<Partial<Team>>(event)
  } catch (error) {
    log.error({ error }, 'Failed to parse request body')
    setResponseStatus(event, 400)
    return { error: 'Invalid request body' }
  }

  // Validate required fields
  const requiredFields: (keyof Team)[] = ['name', 'organizationId', 'type']
  const missingFields = requiredFields.filter((field) => !body[field])

  if (missingFields.length > 0) {
    log.warn({ missingFields }, 'Missing required fields')
    setResponseStatus(event, 400)
    return { error: `Missing required fields: ${missingFields.join(', ')}` }
  }

  const validTeamTypes = ['hr', 'toolsmith', 'library', 'vault', 'tools-library', 'nurse', 'custom']
  if (!validTeamTypes.includes(body.type!)) {
    log.warn({ type: body.type }, 'Invalid team type provided')
    setResponseStatus(event, 400)
    return { error: 'Invalid team type' }
  }

  try {
    const newTeam: Team = {
      id: uuidv4(),
      name: body.name!,
      organizationId: body.organizationId!,
      type: body.type!,
      leaderId: body.leaderId ?? null,
      tokenAllocation: body.tokenAllocation ?? 0
    }

    teams.push(newTeam)

    log.info({ teamId: newTeam.id }, 'Successfully created new team')

    setResponseStatus(event, 201)
    return newTeam
  } catch (error) {
    log.error({ error }, 'An unexpected error occurred while creating the team')
    setResponseStatus(event, 500)
    return { error: 'Internal Server Error' }
  }
})
