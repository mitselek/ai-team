import { v4 as uuidv4 } from 'uuid'
import { agents } from '../../data/agents'
import { createLogger } from '../../utils/logger'
import { getProviderConfig, getModelForRole, getProviderPriority } from './config'
import type { LLMServiceOptions, LLMResponse } from './types'
import { LLMProvider, LLMServiceError } from './types'
import { generateCompletionAnthropic } from './anthropic'
import { generateCompletionOpenAI } from './openai'
import { generateCompletionGoogle } from './google'

const logger = createLogger('llm-service')

export async function generateCompletion(
  prompt: string,
  options: LLMServiceOptions
): Promise<LLMResponse> {
  const correlationId = options.correlationId || uuidv4()
  const log = logger.child({ correlationId, agentId: options.agentId })

  log.info(
    {
      promptLength: prompt.length,
      provider: options.provider,
      model: options.model
    },
    'Generating LLM completion'
  )

  try {
    // Provider selection logic
    const providers = options.provider ? [options.provider] : getProviderPriority()

    let lastError: Error | null = null

    // Try each provider in priority order
    for (const provider of providers) {
      try {
        const providerConfig = getProviderConfig(provider)
        if (!providerConfig.apiKey) {
          log.warn({ provider }, 'Provider has no API key, skipping')
          continue
        }

        // Get model for agent's role
        const agent = agents.find((a) => a.id === options.agentId)
        if (!agent) {
          throw new Error(`Agent with id ${options.agentId} not found.`)
        }
        const model =
          options.model ||
          (agent ? getModelForRole(agent.role, provider) : providerConfig.defaultModel)

        // Call provider-specific function
        let response: LLMResponse
        switch (provider) {
          case LLMProvider.ANTHROPIC:
            response = await generateCompletionAnthropic(prompt, {
              ...options,
              model,
              correlationId
            })
            break
          case LLMProvider.OPENAI:
            response = await generateCompletionOpenAI(prompt, {
              ...options,
              model,
              correlationId
            })
            break
          case LLMProvider.GOOGLE:
            response = await generateCompletionGoogle(prompt, {
              ...options,
              model,
              correlationId
            })
            break
          default:
            throw new Error(`Unknown provider: ${provider}`)
        }

        // Update agent token usage
        if (agent) {
          agent.tokenUsed += response.tokensUsed.total
          agent.lastActiveAt = new Date()

          const remaining = agent.tokenAllocation - agent.tokenUsed
          const percentRemaining = (remaining / agent.tokenAllocation) * 100

          log.info(
            {
              agentId: agent.id,
              tokensUsed: response.tokensUsed.total,
              totalUsed: agent.tokenUsed,
              remaining,
              percentRemaining: `${percentRemaining.toFixed(1)}%`
            },
            'Agent token usage updated'
          )

          // Warn if low on tokens
          if (percentRemaining < 10) {
            log.warn(
              {
                agentId: agent.id,
                remaining,
                allocation: agent.tokenAllocation
              },
              'Agent token allocation nearly exhausted'
            )
          }
        }

        log.info(
          {
            provider: response.provider,
            model: response.model,
            tokensUsed: response.tokensUsed.total,
            finishReason: response.finishReason
          },
          'LLM completion generated successfully'
        )

        return response
      } catch (error) {
        lastError = error as Error
        log.warn(
          {
            provider,
            error: (error as Error).message
          },
          'Provider failed, trying next'
        )
        // Continue to next provider
      }
    }

    // All providers failed
    throw new LLMServiceError(
      'All LLM providers failed',
      options.provider || LLMProvider.ANTHROPIC,
      'ALL_PROVIDERS_FAILED',
      false,
      lastError
    )
  } catch (error) {
    log.error({ error }, 'LLM completion failed')
    throw error
  }
}

// Re-export types for convenience
export * from './types'
