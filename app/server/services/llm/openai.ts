import OpenAI from 'openai'
import { createLogger } from '../../utils/logger'
import type { LLMServiceOptions, LLMResponse } from './types'
import { LLMProvider, LLMServiceError } from './types'
import { getProviderConfig } from './config'
import { withRetry } from './utils'

const logger = createLogger('llm-openai')

export async function generateCompletionOpenAI(
  prompt: string,
  options: LLMServiceOptions
): Promise<LLMResponse> {
  const config = getProviderConfig(LLMProvider.OPENAI)
  const log = logger.child({ correlationId: options.correlationId })

  const client = new OpenAI({ apiKey: config.apiKey })

  const execute = async (): Promise<LLMResponse> => {
    try {
      log.info(
        {
          model: options.model || config.defaultModel,
          maxTokens: options.maxTokens || 4096
        },
        'Calling OpenAI API'
      )

      const response = await client.chat.completions.create({
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

      const content = response.choices[0]?.message?.content || ''
      const usage = response.usage

      const tokensUsed = {
        input: usage?.prompt_tokens || 0,
        output: usage?.completion_tokens || 0,
        total: usage?.total_tokens || 0
      }

      log.info(
        {
          tokensUsed: tokensUsed.total,
          finishReason: response.choices[0]?.finish_reason
        },
        'OpenAI API call successful'
      )

      return {
        content,
        provider: LLMProvider.OPENAI,
        model: response.model,
        tokensUsed,
        finishReason: response.choices[0]?.finish_reason === 'stop' ? 'stop' : 'length',
        metadata: {
          id: response.id,
          finishReason: response.choices[0]?.finish_reason
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error({ error: errorMessage }, 'OpenAI API call failed')

      let status = 'UNKNOWN'
      if (error && typeof error === 'object' && 'status' in error) {
        status = String((error as { status: unknown }).status)
      }

      const isRetryable = status === '429' || Number(status) >= 500
      throw new LLMServiceError(errorMessage, LLMProvider.OPENAI, status, isRetryable, error)
    }
  }

  return withRetry(execute, config.maxRetries, LLMProvider.OPENAI)
}
