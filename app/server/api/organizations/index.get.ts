import { defineEventHandler } from 'h3'
import { createLogger } from '../../utils/logger'
import { organizations } from '../../data/organizations'

const logger = createLogger('api.organizations.get')

export default defineEventHandler(() => {
  logger.info('Fetching all organizations')

  // In a real application, you would fetch this from a database.
  // For now, we just return the in-memory array.

  return {
    status: 200,
    body: organizations
  }
})
