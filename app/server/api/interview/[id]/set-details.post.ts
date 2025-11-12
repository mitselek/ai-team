import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { getSession } from '~/server/services/interview/session'
import { setAgentDetails } from '~/server/services/interview/workflow'
import { createLogger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const log = createLogger('api:interview:set-details')
  const interviewId = getRouterParam(event, 'id')

  // Validate interviewId
  if (!interviewId) {
    log.warn('Validation failed: interviewId is required')
    throw createError({
      statusCode: 400,
      data: { error: 'interviewId is required' }
    })
  }

  // Read and validate body
  const body = await readBody(event)

  if (!body.name) {
    log.warn('Validation failed: name is required')
    throw createError({
      statusCode: 400,
      data: { error: 'name is required' }
    })
  }

  if (!body.gender) {
    log.warn('Validation failed: gender is required')
    throw createError({
      statusCode: 400,
      data: { error: 'gender is required' }
    })
  }

  const validGenders = ['male', 'female', 'non-binary', 'other']
  if (!validGenders.includes(body.gender)) {
    log.warn({ gender: body.gender }, 'Validation failed: invalid gender')
    throw createError({
      statusCode: 400,
      data: { error: 'gender must be one of: male, female, non-binary, other' }
    })
  }

  log.info(
    { interviewId, name: body.name, gender: body.gender },
    'Processing request to set agent details'
  )

  try {
    const session = getSession(interviewId)
    if (!session) {
      log.warn({ interviewId }, 'Interview session not found')
      throw createError({
        statusCode: 404,
        data: { error: `Interview session ${interviewId} not found` }
      })
    }

    if (session.currentState !== 'assign_details') {
      log.warn(
        { interviewId, currentState: session.currentState },
        'Validation failed: Cannot set details in current state'
      )
      throw createError({
        statusCode: 400,
        data: { error: `Cannot set details in state '${session.currentState}'` }
      })
    }

    const { agentId } = await setAgentDetails(interviewId, body.name, body.gender)

    log.info({ interviewId, agentId }, 'Agent details set and agent created successfully')
    return { success: true, agentId }
  } catch (error: unknown) {
    // Re-throw H3Errors
    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      throw error
    }

    log.error({ error }, 'Failed to set agent details')
    throw createError({
      statusCode: 500,
      data: { error: 'An internal error occurred' }
    })
  }
})
