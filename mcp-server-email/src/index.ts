/**
 * Email MCP Server Daemon Entry Point
 * Starts the long-running daemon that processes incoming emails via Pub/Sub
 */

import { createSecretsProvider } from './secrets/index.js'
import { GmailClient } from './gmail/client.js'
import { EmailSender } from './outbound/sender.js'
import { PubSubDaemon } from './inbound/watch.js'

// Simple logger for daemon
const logger = {
  info: (msg: string) => console.warn(`[INFO] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`)
}

/**
 * Daemon configuration
 */
interface DaemonConfig {
  maxMessages?: number
  pollingIntervalMs?: number
}

/**
 * Graceful shutdown handler
 */
class DaemonManager {
  private daemon: PubSubDaemon | null = null
  private isShuttingDown = false

  async start(config: DaemonConfig): Promise<void> {
    logger.info('[Daemon] Starting Email MCP Server daemon')

    try {
      // Initialize secrets
      const secretsProvider = createSecretsProvider('local')
      logger.info('[Daemon] Secrets provider initialized')

      // Get required credentials
      const clientId = await secretsProvider.get('GMAIL_CLIENT_ID')
      const clientSecret = await secretsProvider.get('GMAIL_CLIENT_SECRET')
      const refreshToken = await secretsProvider.get('GMAIL_REFRESH_TOKEN')
      const gmailAddress = await secretsProvider.get('GMAIL_ADDRESS')

      if (!clientId || !clientSecret || !refreshToken || !gmailAddress) {
        throw new Error(
          'Missing required environment variables: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_ADDRESS'
        )
      }

      logger.info('[Daemon] Gmail credentials loaded')

      // Initialize Gmail client
      const gmailClient = new GmailClient({
        secretsProvider,
        accessToken: refreshToken,
        maxRetries: 3
      })

      logger.info('[Daemon] Gmail client initialized')

      // Email sender will be used via MCP tools (initialized for completeness)
      new EmailSender(gmailClient)
      logger.info('[Daemon] Email sender initialized')

      // Initialize Pub/Sub daemon
      this.daemon = new PubSubDaemon({
        routeHandlers: new Map(),
        pollingIntervalMs: config.pollingIntervalMs ?? 5000,
        maxRetries: 3
      })

      logger.info('[Daemon] Pub/Sub daemon initialized')
      logger.info('[Daemon] Ready to process emails')
      logger.info('[Daemon] Press Ctrl+C to stop')

      // Start the daemon
      await this.daemon.start()
    } catch (error) {
      logger.error('[Daemon] Failed to start daemon')
      logger.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }

  async stop(): Promise<void> {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    logger.info('[Daemon] Shutting down gracefully...')

    if (this.daemon) {
      await this.daemon.stop()
      logger.info('[Daemon] Pub/Sub daemon stopped')
    }

    logger.info('[Daemon] Shutdown complete')
    process.exit(0)
  }
}

/**
 * Start the daemon
 */
async function main(): Promise<void> {
  const manager = new DaemonManager()

  // Register shutdown handlers
  process.on('SIGTERM', () => manager.stop())
  process.on('SIGINT', () => manager.stop())

  // Get config from environment
  await manager.start({
    maxMessages: parseInt(process.env.PUBSUB_MAX_MESSAGES || '10', 10),
    pollingIntervalMs: parseInt(process.env.PUBSUB_POLLING_INTERVAL_MS || '5000', 10)
  })
}

// Start if running directly
if (import.meta.main) {
  main().catch((error: Error) => {
    console.error('[FATAL]', error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}

// Export for testing
export { DaemonManager }
