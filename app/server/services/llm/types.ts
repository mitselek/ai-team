export enum LLMProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GOOGLE = 'google'
}

export interface LLMServiceOptions {
  agentId: string // For token tracking
  provider?: LLMProvider // Default to config priority
  model?: string // Default to role-based selection
  temperature?: number // Default 0.7
  maxTokens?: number // Default 4096
  correlationId?: string // For logging
}

export interface LLMResponse {
  content: string
  provider: LLMProvider
  model: string
  tokensUsed: {
    input: number
    output: number
    total: number
  }
  finishReason: 'stop' | 'length' | 'error'
  metadata?: Record<string, unknown>
}

export interface ProviderConfig {
  apiKey: string
  baseUrl?: string
  defaultModel: string
  maxRetries: number
  timeout: number
  rateLimit: {
    requestsPerMinute: number
    tokensPerMinute: number
  }
}

export class LLMServiceError extends Error {
  constructor(
    message: string,
    public provider: LLMProvider,
    public code: string,
    public isRetryable: boolean,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'LLMServiceError'
  }
}
