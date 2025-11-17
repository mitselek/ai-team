import { createLogger } from '../utils/logger'
import { listOrganizations } from '../services/persistence/filesystem'
import { createInitialOrganization } from '../services/bootstrap/create-initial-org'
import { loadExistingOrganizations } from '../services/bootstrap/load-organizations'
import { registerAllTools } from '../services/mcp/register-tools'

const log = createLogger('bootstrap')

export default defineNitroPlugin(async () => {
  log.info('Bootstrap plugin starting...')

  try {
    // Initialize Tool Registry with all MCP tool definitions
    log.info('Initializing Tool Registry')
    registerAllTools()
    log.info('Tool Registry initialized with all tool definitions')

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
