import type { MCPTool } from '@@/types'

export enum LLMProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GOOGLE = 'google'
}

export type TaskType =
  | 'generate-questions'
  | 'analyze-response'
  | 'final-report'
  | 'delegate-task'
  | 'budget-calculation'
  | 'default'

export interface ModelMapping {
  provider: LLMProvider
  model: string // Short name like 'haiku-4.5', 'flash'
}

export interface LLMServiceOptions {
  agentId: string // For token tracking
  agentRole?: string // NEW: Role for task lookup
  taskType?: TaskType // NEW: Specific task type
  provider?: LLMProvider // Default to config priority
  model?: string // Default to role-based selection
  temperature?: number // Default 0.7
  maxTokens?: number // Default 4096
  correlationId?: string // For logging

  /**
   * Optional MCP tools available to the LLM.
   * When provided, the LLM can request tool execution.
   */
  tools?: MCPTool[]
}

/**
 * Represents a tool call request from the LLM.
 * Standardized format across all providers.
 */
export interface ToolCall {
  /** Unique identifier for this tool call */
  id: string

  /** Name of the tool to execute */
  name: string

  /** Arguments to pass to the tool */
  arguments: Record<string, unknown>
}

export interface LLMResponse {
  content: string

  /**
   * Tool calls requested by the LLM.
   * Empty/undefined means final text response, no tools needed.
   */
  toolCalls?: ToolCall[]

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
  models: Record<string, string> // NEW: Short name → full model ID
  defaultModel: string // Now references models key
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
