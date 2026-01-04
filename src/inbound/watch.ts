/**
 * Pub/Sub daemon for continuous Gmail label watching
 * Polls subscription for new messages and routes them
 */

import { createLogger } from '../../app/server/utils/logger'
import { extractRouteKey } from './route'
import { processPubSubMessage, type ProcessedMessage, type PubSubMessage } from './parser'

const logger = createLogger('pub-sub-daemon')

/**
 * Handler function for processed messages
 */
export type RouteHandler = (msg: ProcessedMessage) => Promise<void>

/**
 * Pub/Sub daemon configuration
 */
export interface PubSubDaemonConfig {
  routeHandlers: Map<string, RouteHandler>
  pollingIntervalMs?: number
  maxRetries?: number
}

/**
 * Pub/Sub daemon for continuous message polling
 */
export class PubSubDaemon {
  private routeHandlers: Map<string, RouteHandler>
  private pollingIntervalMs: number
  private maxRetries: number
  private running = false
  private pollingTask: Promise<void> | null = null

  constructor(config: PubSubDaemonConfig) {
    this.routeHandlers = config.routeHandlers
    this.pollingIntervalMs = config.pollingIntervalMs ?? 5000
    this.maxRetries = config.maxRetries ?? 3
  }

  /**
   * Start the daemon polling loop
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('Daemon already running')
      return
    }

    this.running = true
    logger.info(
      {
        pollingIntervalMs: this.pollingIntervalMs,
        maxRetries: this.maxRetries,
        routeHandlers: this.routeHandlers.size
      },
      'Starting Pub/Sub daemon'
    )

    // Start polling loop without awaiting (long-running)
    this.pollingTask = this.pollLoop()
  }

  /**
   * Stop the daemon gracefully
   */
  async stop(): Promise<void> {
    if (!this.running) {
      logger.warn('Daemon not running')
      return
    }

    logger.info('Stopping Pub/Sub daemon')
    this.running = false

    // Wait for current polling cycle to complete
    if (this.pollingTask) {
      try {
        await this.pollingTask
      } catch (err) {
        logger.error({ error: String(err) }, 'Error during shutdown')
      }
    }

    logger.info('Pub/Sub daemon stopped')
  }

  /**
   * Main polling loop
   */
  private async pollLoop(): Promise<void> {
    while (this.running) {
      try {
        // Poll for new messages from Gmail
        // In real implementation, this would use Pub/Sub client
        // For now, we use Gmail client to watch labels
        await this.pollOnce()

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, this.pollingIntervalMs))
      } catch (err) {
        logger.error({ error: String(err) }, 'Polling loop error')
        // Continue polling despite errors
      }
    }
  }

  /**
   * Single poll iteration
   */
  private async pollOnce(): Promise<void> {
    // In Phase 2, this will use actual Pub/Sub client
    // For Phase 1, we acknowledge the watch is registered
    logger.debug({ status: 'ready' }, 'Poll cycle')
  }

  /**
   * Process a received Pub/Sub message
   */
  async processMessage(pubsubMessage: PubSubMessage): Promise<void> {
    try {
      // Parse message and extract route key
      const processedMsg = processPubSubMessage(pubsubMessage, extractRouteKey)

      logger.info(
        {
          messageId: processedMsg.messageId,
          routeKey: processedMsg.routeKey,
          emailAddress: processedMsg.emailAddress
        },
        'Message received'
      )

      // Find handler for route
      const handler = this.routeHandlers.get(processedMsg.routeKey)
      if (!handler) {
        logger.warn({ routeKey: processedMsg.routeKey }, 'No handler for route')
        return
      }

      // Call handler
      await handler(processedMsg)

      logger.info(
        {
          messageId: processedMsg.messageId,
          routeKey: processedMsg.routeKey
        },
        'Message processed'
      )
    } catch (err) {
      logger.error(
        {
          messageId: pubsubMessage.messageId,
          error: String(err)
        },
        'Failed to process message'
      )
    }
  }
}

/**
 * Start Pub/Sub daemon with route handler
 */
export async function startPubSubDaemon(
  routeHandlers: Map<string, RouteHandler>
): Promise<PubSubDaemon> {
  const daemon = new PubSubDaemon({
    routeHandlers
  })

  await daemon.start()

  return daemon
}
