import Anthropic from '@anthropic-ai/sdk'
import { createLogger } from '../../utils/logger'
import type { LLMServiceOptions, LLMResponse } from './types'
import { LLMProvider, LLMServiceError } from './types'
import { getProviderConfig } from './config'
import { withRetry } from './utils'

const logger = createLogger('llm-anthropic')

export async function generateCompletionAnthropic(
  prompt: string,
  options: LLMServiceOptions
): Promise<LLMResponse> {
  const config = getProviderConfig(LLMProvider.ANTHROPIC)
  const log = logger.child({ correlationId: options.correlationId })

  const client = new Anthropic({ apiKey: config.apiKey })

  const execute = async (): Promise<LLMResponse> => {
    try {
      log.info(
        {
          model: options.model || config.defaultModel,
          maxTokens: options.maxTokens || 4096
        },
        'Calling Anthropic API'
      )

      const response = await client.messages.create({
        model: options.model || config.defaultModel,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature ?? 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const content = response.content[0]?.type === 'text' ? response.content[0].text : ''

      const tokensUsed = {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens
      }

      log.info(
        {
          tokensUsed: tokensUsed.total,
          finishReason: response.stop_reason
        },
        'Anthropic API call successful'
      )

      return {
        content,
        provider: LLMProvider.ANTHROPIC,
        model: response.model,
        tokensUsed,
        finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'length',
        metadata: {
          id: response.id,
          stopReason: response.stop_reason
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error({ error: errorMessage }, 'Anthropic API call failed')

      let status = 'UNKNOWN'
      if (error && typeof error === 'object' && 'status' in error) {
        status = String((error as { status: unknown }).status)
      }

      // Classify error
      const isRetryable = status === '429' || Number(status) >= 500
      throw new LLMServiceError(errorMessage, LLMProvider.ANTHROPIC, status, isRetryable, error)
    }
  }

  return withRetry(execute, config.maxRetries, LLMProvider.ANTHROPIC)
}
