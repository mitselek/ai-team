import pino from 'pino'
import type { Logger, LoggerOptions } from 'pino'

/**
 * Create a server logger with sensible defaults for Nitro.
 * Usage:
 *   const logger = createLogger('orchestrator')
 *   logger.info({ orgId, agentId, taskId }, 'delegation started')
 */
export function createLogger(name?: string): Logger {
  const isProd = process.env.NODE_ENV === 'production'

  const options: LoggerOptions = {
    name: name || 'server',
    level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
    base: {
      // Keep output minimal; enrich per-log with context
      pid: undefined,
      hostname: undefined
    }
  }

  // Don't use pino-pretty in Nitro server context - it causes stream errors
  // Just use basic pino with console output
  return pino(options)
}

/**
 * Helper to create a child logger with persistent fields.
 */
export function withContext(logger: Logger, ctx: Record<string, unknown>): Logger {
  return logger.child(ctx)
}

/**
 * Generate a correlation id for tracing a request/task flow.
 */
export function newCorrelationId(): string {
  // Node 18+ supports crypto.randomUUID
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? (crypto as unknown as { randomUUID: () => string }).randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}
