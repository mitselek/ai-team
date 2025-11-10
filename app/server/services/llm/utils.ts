import { createLogger } from '../../utils/logger'
import type { LLMProvider } from './types'
import { LLMServiceError } from './types'

const logger = createLogger('llm-utils')

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof LLMServiceError) {
    return error.isRetryable
  }
  return false
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  provider: LLMProvider
): Promise<T> {
  let lastError: Error | null = null
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (isRetryableError(error)) {
        const delay = 2 ** i * 1000
        logger.warn(
          { attempt: i + 1, maxRetries, error: lastError.message },
          `Retryable error encountered for ${provider}. Retrying in ${delay}ms...`
        )
        await sleep(delay)
      } else {
        logger.error(
          { error: lastError.message },
          `Non-retryable error encountered for ${provider}. Aborting.`
        )
        throw error
      }
    }
  }
  throw new LLMServiceError(
    `Failed after ${maxRetries} retries for provider ${provider}.`,
    provider,
    'MAX_RETRIES_EXCEEDED',
    false,
    lastError
  )
}

// This is a very basic token estimator.
// A more accurate one would use a proper tokenizer library.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
