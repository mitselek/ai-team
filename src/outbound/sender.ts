/**
 * Email sending with automatic retry and error handling
 */

import { GmailClient, type SendRequest } from '../gmail'
import { ExponentialBackoff, type BackoffConfig } from '../utils/backoff'

/**
 * Result of email send operation
 */
export interface SendResult {
  ok: boolean
  messageId?: string
  error?: {
    type: 'validation' | 'auth' | 'rate_limit' | 'server' | 'unknown'
    message: string
    retryable: boolean
    retryAfterMs?: number
  }
}

/**
 * Options for email sender
 */
export interface SendOptions extends BackoffConfig {
  // Inherits: maxRetries, initialDelayMs, maxDelayMs, jitterFraction
}

/**
 * Email sender with exponential backoff for retries
 */
export class EmailSender {
  private gmailClient: GmailClient
  private backoffConfig: SendOptions

  constructor(gmailClient: GmailClient, options?: SendOptions) {
    this.gmailClient = gmailClient
    this.backoffConfig = options ?? {}
  }

  /**
   * Send an email with automatic retry on rate limit/server errors
   */
  async send(request: SendRequest): Promise<SendResult> {
    // Validate required fields
    if (!request.to || !request.subject) {
      return {
        ok: false,
        error: {
          type: 'validation',
          message: 'Missing required fields: to and subject',
          retryable: false
        }
      }
    }

    // Attempt send with backoff on retryable errors
    const backoff = new ExponentialBackoff(this.backoffConfig)

    for (let attempt = 0; attempt <= backoff['maxRetries']; attempt++) {
      try {
        const result = await this.gmailClient.sendEmail(request)

        if (result.ok) {
          return {
            ok: true,
            messageId: result.value
          }
        }

        // Gmail client returned an error
        if (!result.ok) {
          const error = result.error as Error & { status?: number; code?: string }
          const classified = this.classifyError(error, attempt)!

          // If not retryable, return immediately
          if (!classified.retryable) {
            return { ok: false, error: classified }
          }

          // If this is the last attempt, return the error
          if (!backoff.shouldRetry(attempt)) {
            return { ok: false, error: classified }
          }

          // Sleep before retry
          await backoff.sleep(attempt)
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        const classified = this.classifyError(error, attempt)!

        if (!classified.retryable) {
          return { ok: false, error: classified }
        }

        if (!backoff.shouldRetry(attempt)) {
          return { ok: false, error: classified }
        }

        await backoff.sleep(attempt)
      }
    }

    // Should never reach here, but provide a fallback
    return {
      ok: false,
      error: {
        type: 'unknown',
        message: 'Email send failed after all retries',
        retryable: false
      }
    }
  }

  /**
   * Classify error and determine if retryable
   */
  private classifyError(
    error: Error & { status?: number; code?: string },
    attemptNumber: number
  ): Exclude<SendResult['error'], undefined> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = error.status || (error as any).statusCode

    // Rate limit (429)
    if (status === 429) {
      return {
        type: 'rate_limit',
        message: 'Rate limited by Gmail API',
        retryable: true,
        retryAfterMs: (attemptNumber + 1) * 1000 // Rough estimate
      }
    }

    // Server errors (5xx)
    if (status && status >= 500) {
      return {
        type: 'server',
        message: `Gmail server error (${status})`,
        retryable: true
      }
    }

    // Auth errors (401, 403)
    if (status === 401 || status === 403) {
      return {
        type: 'auth',
        message: 'Authentication failed. Check credentials.',
        retryable: false
      }
    }

    // Default to unknown non-retryable
    return {
      type: 'unknown',
      message: error.message || 'Unknown error',
      retryable: false
    }
  }

  /**
   * Format send result for LLM display
   */
  static formatErrorForLLM(result: SendResult): string {
    if (result.ok) {
      return `Email sent successfully (messageId: ${result.messageId})`
    }

    const { error } = result
    if (!error) {
      return 'Email send failed with unknown error'
    }

    if (error.type === 'validation') {
      return `Validation error: ${error.message}`
    }

    if (error.type === 'auth') {
      return `Authentication error: ${error.message}`
    }

    if (error.type === 'rate_limit') {
      const retrySeconds = error.retryAfterMs ? Math.ceil(error.retryAfterMs / 1000) : '60'
      return `Rate limited. Please retry in ${retrySeconds} seconds.`
    }

    if (error.type === 'server') {
      return `Gmail server error: ${error.message}. Retry available.`
    }

    return `Error: ${error.message}`
  }
}
