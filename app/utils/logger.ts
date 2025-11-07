/**
 * Client-side structured logging wrapper.
 * Avoids direct console usage; provides consistent interface with context.
 *
 * Usage:
 *   import { logger } from '@/utils/logger'
 *   logger.warn({ agentId, taskId }, 'Task delegation timeout')
 *   logger.error({ orgId, error }, 'Failed to create organization')
 */

interface LogContext {
  [key: string]: unknown
}

function formatMessage (ctx: LogContext | undefined, msg: string): string {
  if (!ctx) return msg
  const ctxStr = JSON.stringify(ctx)
  return `${msg} | ${ctxStr}`
}

export const logger = {
  /**
   * Log a warning (user-visible or degraded state).
   */
  warn (ctxOrMsg: LogContext | string, msg?: string) {
    if (typeof ctxOrMsg === 'string') {
      console.warn(`[WARN] ${ctxOrMsg}`)
    } else {
      console.warn(`[WARN] ${formatMessage(ctxOrMsg, msg || '')}`)
    }
  },

  /**
   * Log an error (failure or exception).
   */
  error (ctxOrMsg: LogContext | string, msg?: string) {
    if (typeof ctxOrMsg === 'string') {
      console.error(`[ERROR] ${ctxOrMsg}`)
    } else {
      console.error(`[ERROR] ${formatMessage(ctxOrMsg, msg || '')}`)
    }
  },

  /**
   * Log info (for development/debug builds only; no-op in production).
   */
  info (ctxOrMsg: LogContext | string, msg?: string) {
    if (import.meta.env.DEV) {
      if (typeof ctxOrMsg === 'string') {
        console.warn(`[INFO] ${ctxOrMsg}`)
      } else {
        console.warn(`[INFO] ${formatMessage(ctxOrMsg, msg || '')}`)
      }
    }
  }
}
