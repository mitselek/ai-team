import { mcpRegistry } from '../services/mcp-client'
import { mcpServers } from '../utils/mcp-config'
import { createLogger } from '../utils/logger'

const logger = createLogger('mcp-init')

/**
 * Initialize MCP servers on Nuxt startup
 */
export default defineNitroPlugin(async () => {
  logger.info({}, 'Starting MCP initialization')

  try {
    logger.info({ serverConfig: mcpServers.email }, 'Registering email MCP server')

    // Register email MCP server
    await mcpRegistry.registerServer('email', mcpServers.email)

    logger.info({}, 'Email MCP server registered successfully')

    // Get the registered server and log its tools
    const emailServer = mcpRegistry.getServer('email')
    if (emailServer) {
      const tools = emailServer.getTools()
      logger.info({ toolCount: tools.length, tools }, 'Email tools loaded')
    } else {
      logger.error({}, 'Email server not found in registry after registration')
    }

    logger.info({}, 'All MCP servers initialized successfully')
  } catch (error) {
    logger.error(
      { error: String(error), stack: error instanceof Error ? error.stack : undefined },
      'Failed to initialize MCP servers'
    )
    // Continue anyway - MCP is optional for basic functionality
  }

  // Cleanup on shutdown
  process.on('SIGTERM', async () => {
    logger.info({}, 'Shutting down MCP servers')
    await mcpRegistry.disconnectAll()
  })
})
