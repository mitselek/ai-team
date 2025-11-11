import { createLogger } from '../../utils/logger'
import type { ProviderConfig } from './types'
import { LLMProvider } from './types'

const logger = createLogger('llm-config')

interface LLMConfig {
  providers: {
    anthropic: ProviderConfig
    openai: ProviderConfig
    google: ProviderConfig
  }
  providerPriority: LLMProvider[]
  modelByRole: Record<string, Record<LLMProvider, string>>
}

export function loadConfig(): LLMConfig {
  // Load from environment
  const config: LLMConfig = {
    providers: {
      anthropic: {
        apiKey: process.env.NUXT_ANTHROPIC_API_KEY || '',
        defaultModel: 'claude-3-haiku-20240307',
        maxRetries: 3,
        timeout: 60000,
        rateLimit: { requestsPerMinute: 50, tokensPerMinute: 40000 }
      },
      openai: {
        apiKey: process.env.NUXT_OPENAI_API_KEY || '',
        defaultModel: 'gpt-4-turbo-preview',
        maxRetries: 3,
        timeout: 60000,
        rateLimit: { requestsPerMinute: 50, tokensPerMinute: 40000 }
      },
      google: {
        apiKey: process.env.NUXT_GOOGLE_API_KEY || '',
        defaultModel: 'gemini-pro',
        maxRetries: 3,
        timeout: 60000,
        rateLimit: { requestsPerMinute: 60, tokensPerMinute: 50000 }
      }
    },
    providerPriority: [LLMProvider.ANTHROPIC, LLMProvider.OPENAI, LLMProvider.GOOGLE],
    modelByRole: {
      worker: {
        [LLMProvider.ANTHROPIC]: 'claude-3-haiku-20240307',
        [LLMProvider.OPENAI]: 'gpt-3.5-turbo',
        [LLMProvider.GOOGLE]: 'gemini-pro'
      },
      manager: {
        [LLMProvider.ANTHROPIC]: 'claude-3-haiku-20240307',
        [LLMProvider.OPENAI]: 'gpt-4-turbo-preview',
        [LLMProvider.GOOGLE]: 'gemini-pro'
      },
      director: {
        [LLMProvider.ANTHROPIC]: 'claude-3-haiku-20240307',
        [LLMProvider.OPENAI]: 'gpt-4',
        [LLMProvider.GOOGLE]: 'gemini-pro'
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
  return config.modelByRole[role]?.[provider] || config.providers[provider].defaultModel
}

export function getProviderPriority(): LLMProvider[] {
  const config = loadConfig()
  // Filter to only providers with API keys
  return config.providerPriority.filter((p) => config.providers[p].apiKey)
}
