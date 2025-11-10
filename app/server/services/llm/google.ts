import { GoogleGenerativeAI } from '@google/generative-ai'
import { createLogger } from '../../utils/logger'
import type { LLMServiceOptions, LLMResponse } from './types'
import { LLMProvider, LLMServiceError } from './types'
import { getProviderConfig } from './config'
import { withRetry, estimateTokens } from './utils'

const logger = createLogger('llm-google')

export async function generateCompletionGoogle(
  prompt: string,
  options: LLMServiceOptions
): Promise<LLMResponse> {
  const config = getProviderConfig(LLMProvider.GOOGLE)
  const log = logger.child({ correlationId: options.correlationId })

  const genAI = new GoogleGenerativeAI(config.apiKey)

  const execute = async (): Promise<LLMResponse> => {
    try {
      const modelName = options.model || config.defaultModel
      log.info(
        {
          model: modelName,
          maxTokens: options.maxTokens || 4096
        },
        'Calling Google Generative AI API'
      )

      const model = genAI.getGenerativeModel({ model: modelName })

      const result = await model.generateContent(prompt)
      const response = await result.response
      const content = response.text()

      // Google's API doesn't provide token usage directly in the response object.
      // We'll use our estimation utility.
      const tokensUsed = {
        input: estimateTokens(prompt),
        output: estimateTokens(content),
        total: estimateTokens(prompt) + estimateTokens(content)
      }

      const finishReason = response.candidates?.[0]?.finishReason || 'STOP'

      log.info(
        {
          tokensUsed: tokensUsed.total,
          finishReason
        },
        'Google API call successful'
      )

      return {
        content,
        provider: LLMProvider.GOOGLE,
        model: modelName,
        tokensUsed,
        finishReason: finishReason === 'STOP' ? 'stop' : 'length',
        metadata: {
          finishReason,
          safetyRatings: response.candidates?.[0]?.safetyRatings
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error({ error: errorMessage }, 'Google API call failed')

      // This is a simplification. Google's errors are more complex.
      const isRetryable = errorMessage.includes('503') || errorMessage.includes('429')
      throw new LLMServiceError(errorMessage, LLMProvider.GOOGLE, 'UNKNOWN', isRetryable, error)
    }
  }

  return withRetry(execute, config.maxRetries, LLMProvider.GOOGLE)
}
