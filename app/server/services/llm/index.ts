import { v4 as uuidv4 } from 'uuid'
import { agents } from '../../data/agents'
import { createLogger } from '../../utils/logger'
import {
  getProviderConfig,
  getModelForRole,
  getProviderPriority,
  getModelForTask,
  resolveModelId
} from './config'
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

  // Model selection with priority:
  // 1. Explicit override (provider + model in options)
  // 2. Task-based mapping (agentRole + taskType)
  // 3. Role default (agentRole + taskType='default')
  // 4. Provider default (providerPriority[0].defaultModel)

  let selectedProvider: LLMProvider
  let selectedModel: string

  if (options.provider && options.model) {
    // 1. Explicit override
    selectedProvider = options.provider
    selectedModel = resolveModelId(options.provider, options.model)
    log.info(
      { provider: selectedProvider, model: selectedModel, reason: 'explicit-override' },
      'Model selected via explicit override'
    )
  } else if (options.agentRole && options.taskType) {
    // 2. Task-based mapping
    const taskModel = getModelForTask(options.agentRole, options.taskType)
    if (taskModel) {
      selectedProvider = taskModel.provider
      selectedModel = taskModel.modelId
      log.info(
        {
          provider: selectedProvider,
          model: selectedModel,
          agentRole: options.agentRole,
          taskType: options.taskType,
          reason: 'task-based-mapping'
        },
        'Model selected via task-based mapping'
      )
    } else {
      // Fallback to provider priority
      const providers = getProviderPriority()
      selectedProvider = providers[0]
      const providerConfig = getProviderConfig(selectedProvider)
      selectedModel = resolveModelId(selectedProvider, providerConfig.defaultModel)
      log.warn(
        {
          provider: selectedProvider,
          model: selectedModel,
          agentRole: options.agentRole,
          taskType: options.taskType,
          reason: 'fallback-no-mapping'
        },
        'No task mapping found, falling back to provider default'
      )
    }
  } else if (options.agentRole) {
    // 3. Role default (task='default')
    const taskModel = getModelForTask(options.agentRole, 'default')
    if (taskModel) {
      selectedProvider = taskModel.provider
      selectedModel = taskModel.modelId
      log.info(
        {
          provider: selectedProvider,
          model: selectedModel,
          agentRole: options.agentRole,
          reason: 'role-default'
        },
        'Model selected via role default'
      )
    } else {
      // Fallback to old system
      const agent = agents.find((a) => a.id === options.agentId)
      if (agent) {
        const providers = options.provider ? [options.provider] : getProviderPriority()
        selectedProvider = providers[0]
        selectedModel = getModelForRole(agent.role, selectedProvider)
        log.info(
          {
            provider: selectedProvider,
            model: selectedModel,
            agentRole: options.agentRole,
            reason: 'backward-compat'
          },
          'Model selected via backward compatibility path'
        )
      } else {
        // Last resort: provider priority
        const providers = getProviderPriority()
        selectedProvider = providers[0]
        const providerConfig = getProviderConfig(selectedProvider)
        selectedModel = resolveModelId(selectedProvider, providerConfig.defaultModel)
        log.warn(
          { provider: selectedProvider, model: selectedModel, reason: 'fallback-no-agent' },
          'Agent not found, falling back to provider default'
        )
      }
    }
  } else {
    // 4. Provider default
    const providers = options.provider ? [options.provider] : getProviderPriority()
    selectedProvider = providers[0]
    const providerConfig = getProviderConfig(selectedProvider)
    selectedModel = resolveModelId(selectedProvider, providerConfig.defaultModel)
    log.info(
      { provider: selectedProvider, model: selectedModel, reason: 'provider-default' },
      'Model selected via provider default'
    )
  }

  log.info(
    {
      promptLength: prompt.length,
      provider: selectedProvider,
      model: selectedModel,
      agentRole: options.agentRole,
      taskType: options.taskType
    },
    'Generating LLM completion'
  )

  try {
    const providerConfig = getProviderConfig(selectedProvider)
    if (!providerConfig.apiKey) {
      throw new LLMServiceError(
        `Provider ${selectedProvider} has no API key configured`,
        selectedProvider,
        'NO_API_KEY',
        false
      )
    }

    // Call provider-specific function - FAIL FAST, NO FALLBACK
    let response: LLMResponse
    switch (selectedProvider) {
      case LLMProvider.ANTHROPIC:
        response = await generateCompletionAnthropic(prompt, {
          ...options,
          model: selectedModel,
          correlationId
        })
        break
      case LLMProvider.OPENAI:
        response = await generateCompletionOpenAI(prompt, {
          ...options,
          model: selectedModel,
          correlationId
        })
        break
      case LLMProvider.GOOGLE:
        response = await generateCompletionGoogle(prompt, {
          ...options,
          model: selectedModel,
          correlationId
        })
        break
      default:
        throw new Error(`Unknown provider: ${selectedProvider}`)
    }

    // Update agent token usage
    const agent = agents.find((a) => a.id === options.agentId)
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
    log.error(
      {
        error,
        provider: selectedProvider,
        model: selectedModel
      },
      'LLM completion failed'
    )

    // Fail-fast: throw error with provider/model context
    if (error instanceof LLMServiceError) {
      throw error
    }

    throw new LLMServiceError(
      `LLM generation failed: ${selectedProvider} (${selectedModel})`,
      selectedProvider,
      'GENERATION_ERROR',
      false,
      error
    )
  }
}

// Re-export types for convenience
export * from './types'
