/**
 * Exponential backoff utility with jitter for retryable operations
 * Prevents thundering herd and respects rate limits
 */

/**
 * Configuration for exponential backoff behavior
 */
export interface BackoffConfig {
  maxRetries?: number // default 3
  initialDelayMs?: number // default 100
  maxDelayMs?: number // default 10000
  jitterFraction?: number // default 0.2 (±20%)
}

/**
 * Exponential backoff calculator
 */
export class ExponentialBackoff {
  private maxRetries: number
  private initialDelayMs: number
  private maxDelayMs: number
  private jitterFraction: number

  constructor(config?: BackoffConfig) {
    this.maxRetries = config?.maxRetries ?? 3
    this.initialDelayMs = config?.initialDelayMs ?? 100
    this.maxDelayMs = config?.maxDelayMs ?? 10000
    this.jitterFraction = config?.jitterFraction ?? 0.2
  }

  /**
   * Calculate delay in milliseconds for a given attempt number
   * Formula: initialDelayMs * (2 ** attemptNumber), clamped to maxDelayMs, with jitter
   */
  getDelay(attemptNumber: number): number {
    if (attemptNumber < 0) {
      return 0
    }

    // Base delay: 2^attemptNumber * initialDelayMs
    const baseDelay = Math.pow(2, attemptNumber) * this.initialDelayMs
    const clampedDelay = Math.min(baseDelay, this.maxDelayMs)

    // Apply jitter: ±(jitterFraction * clampedDelay) * random [0, 1)
    const jitterAmount = this.jitterFraction * clampedDelay
    const jitteredDelay = clampedDelay + (Math.random() - 0.5) * 2 * jitterAmount

    return Math.max(0, Math.round(jitteredDelay))
  }

  /**
   * Check if should retry based on attempt number
   */
  shouldRetry(attemptNumber: number): boolean {
    return attemptNumber < this.maxRetries
  }

  /**
   * Sleep for the calculated delay
   */
  async sleep(attemptNumber: number): Promise<void> {
    const delayMs = this.getDelay(attemptNumber)
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

/**
 * Execute a function with exponential backoff on errors
 * Retries up to maxRetries times with increasing delay
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  config?: BackoffConfig
): Promise<T> {
  const backoff = new ExponentialBackoff(config)
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= backoff['maxRetries']; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (!backoff.shouldRetry(attempt)) {
        break
      }

      await backoff.sleep(attempt)
    }
  }

  throw lastError ?? new Error('Unknown error in withExponentialBackoff')
}
