import { createLogger } from '../../utils/logger'
import type { ProviderConfig, TaskType, ModelMapping } from './types'
import { LLMProvider } from './types'

const logger = createLogger('llm-config')

interface LLMConfig {
  providers: {
    anthropic: ProviderConfig
    openai: ProviderConfig
    google: ProviderConfig
  }
  roleModelMappings: Record<string, Partial<Record<TaskType, ModelMapping>>> // NEW - Partial allows optional task types
  modelByRole: Record<string, Record<LLMProvider, string>> // KEEP for backward compat
  providerPriority: LLMProvider[]
}

export function loadConfig(): LLMConfig {
  // Load from environment
  const config: LLMConfig = {
    providers: {
      anthropic: {
        apiKey: process.env.NUXT_ANTHROPIC_API_KEY || '',
        models: {
          // Tested models (Phase 9)
          'haiku-4.5': 'claude-haiku-4-5-20251001',
          'sonnet-4.5': 'claude-sonnet-4-5-20250929',
          'opus-4.1': 'claude-opus-4-1-20250805'
        },
        defaultModel: 'haiku-4.5',
        maxRetries: 3,
        timeout: 60000,
        rateLimit: { requestsPerMinute: 50, tokensPerMinute: 40000 }
      },
      google: {
        apiKey: process.env.NUXT_GOOGLE_API_KEY || '',
        models: {
          // Tested models (Phase 9)
          flash: 'gemini-2.5-flash',
          'flash-lite': 'gemini-2.5-flash-lite',
          pro: 'gemini-2.5-pro'
        },
        defaultModel: 'flash',
        maxRetries: 3,
        timeout: 60000,
        rateLimit: { requestsPerMinute: 60, tokensPerMinute: 50000 }
      },
      openai: {
        apiKey: process.env.NUXT_OPENAI_API_KEY || '',
        models: {
          'gpt-4': 'gpt-4-turbo-preview',
          'gpt-3.5': 'gpt-3.5-turbo'
        },
        defaultModel: 'gpt-4',
        maxRetries: 3,
        timeout: 60000,
        rateLimit: { requestsPerMinute: 50, tokensPerMinute: 40000 }
      }
    },
    providerPriority: [LLMProvider.ANTHROPIC],
    roleModelMappings: {
      interviewer: {
        'generate-questions': { provider: LLMProvider.ANTHROPIC, model: 'haiku-4.5' },
        'analyze-response': { provider: LLMProvider.GOOGLE, model: 'flash' },
        'final-report': { provider: LLMProvider.ANTHROPIC, model: 'sonnet-4.5' },
        default: { provider: LLMProvider.GOOGLE, model: 'flash' }
      },
      worker: {
        default: { provider: LLMProvider.ANTHROPIC, model: 'haiku-4.5' }
      },
      manager: {
        default: { provider: LLMProvider.GOOGLE, model: 'flash' }
      },
      director: {
        default: { provider: LLMProvider.GOOGLE, model: 'pro' }
      }
    },
    modelByRole: {
      worker: {
        [LLMProvider.ANTHROPIC]: 'claude-3-haiku-20240307',
        [LLMProvider.OPENAI]: 'gpt-3.5-turbo',
        [LLMProvider.GOOGLE]: 'gemini-1.5-flash'
      },
      manager: {
        [LLMProvider.ANTHROPIC]: 'claude-3-haiku-20240307',
        [LLMProvider.OPENAI]: 'gpt-4-turbo-preview',
        [LLMProvider.GOOGLE]: 'gemini-1.5-flash'
      },
      director: {
        [LLMProvider.ANTHROPIC]: 'claude-3-haiku-20240307',
        [LLMProvider.OPENAI]: 'gpt-4',
        [LLMProvider.GOOGLE]: 'gemini-1.5-pro'
      }
    }
  }

  // Validate at least one provider has API key
  const hasValidProvider = Object.values(config.providers).some((p) => p.apiKey)
  if (!hasValidProvider) {
    logger.error('No LLM provider API keys configured')
    throw new Error('At least one LLM provider API key must be set in environment')
  }

  logger.info(
    {
      availableProviders: Object.entries(config.providers)
        .filter(([, p]) => p.apiKey)
        .map(([name]) => name)
    },
    'LLM configuration loaded'
  )

  return config
}

export function getProviderConfig(provider: LLMProvider): ProviderConfig {
  const config = loadConfig()
  return config.providers[provider]
}

export function getModelForRole(role: string, provider: LLMProvider): string {
  const config = loadConfig()

  // Try new system first (task='default')
  const taskModel = getModelForTask(role, 'default')
  if (taskModel && taskModel.provider === provider) {
    return taskModel.modelId
  }

  // Fallback to old modelByRole
  const oldModel = config.modelByRole[role]?.[provider]
  if (oldModel) return oldModel

  // Last resort: provider default
  const providerConfig = config.providers[provider]
  return providerConfig.models[providerConfig.defaultModel] || providerConfig.defaultModel
}

export function getProviderPriority(): LLMProvider[] {
  const config = loadConfig()
  // Filter to only providers with API keys
  return config.providerPriority.filter((p) => config.providers[p].apiKey)
}

/**
 * Get model for a specific role and task combination
 */
export function getModelForTask(
  role: string,
  taskType: TaskType = 'default'
): { provider: LLMProvider; modelId: string } | null {
  const config = loadConfig()

  // Look up role + task mapping
  const mapping = config.roleModelMappings[role]?.[taskType]
  if (!mapping) {
    logger.warn({ role, taskType }, 'No model mapping found for role+task')
    return null
  }

  // Resolve short model name to full model ID
  const providerConfig = config.providers[mapping.provider]
  const modelId = providerConfig.models[mapping.model]

  if (!modelId) {
    logger.error({ role, taskType, mapping }, 'Model not found in provider config')
    return null
  }

  return {
    provider: mapping.provider,
    modelId
  }
}

/**
 * Resolve a model name (short or full) to full model ID
 */
export function resolveModelId(provider: LLMProvider, modelName: string): string {
  const config = loadConfig()
  const providerConfig = config.providers[provider]

  // If it's a short name, resolve it
  if (providerConfig.models[modelName]) {
    return providerConfig.models[modelName]
  }

  // Otherwise assume it's already a full model ID
  return modelName
}
