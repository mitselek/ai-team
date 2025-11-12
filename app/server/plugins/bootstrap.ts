import { createLogger } from '../utils/logger'
import { listOrganizations } from '../services/persistence/filesystem'
import { createInitialOrganization } from '../services/bootstrap/create-initial-org'
import { loadExistingOrganizations } from '../services/bootstrap/load-organizations'

const log = createLogger('bootstrap')

export default defineNitroPlugin(async () => {
  log.info('Bootstrap plugin starting...')

  try {
    // Check if any organizations exist in filesystem
    const orgIds = await listOrganizations()

    if (orgIds.length === 0) {
      // No organizations found - create initial organization
      log.info('No organizations found, creating initial organization')
      await createInitialOrganization()
      log.info('Initial organization bootstrap complete')
    } else {
      // Organizations exist - load them into memory
      log.info({ count: orgIds.length }, 'Found organizations to load')
      const loadedCount = await loadExistingOrganizations()
      log.info({ loadedCount }, 'Existing organizations loaded')
    }

    log.info('Bootstrap plugin complete')
  } catch (error: unknown) {
    log.error({ error }, 'Bootstrap plugin failed')
    // Don't throw - allow server to start even if bootstrap fails
    // This prevents server crash loops in case of filesystem issues
  }
})
