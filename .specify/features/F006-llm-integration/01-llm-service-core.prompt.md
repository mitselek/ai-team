# Development Task Prompt for Gemini CLI

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create an LLM service layer that provides a unified interface for communicating with multiple LLM providers (Anthropic, OpenAI, Google). This service will enable agents to generate completions, track token usage, and handle errors gracefully with retry logic and provider fallback.

**Phase 1 Scope**: Basic LLM integration with token tracking (no MCP tools yet)

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **Constitution principles** - Read .specify/memory/constitution.md and follow all 12 principles
- **Existing test patterns** - Match the style in tests/api/organizations.spec.ts and tests/services/orchestrator.spec.ts

### MUST USE

- **Relative imports only** - No `~` aliases. Use `../../types`, `../../server/utils/logger`, etc.
- **Type-only imports** - For types/interfaces use `import type { ... }` not `import { ... }`
- **Existing patterns** - Reference similar files as examples (listed below)
- **All required fields** - Every object must include ALL fields from its interface
- **Structured logging** - Import and use `createLogger` from server/utils/logger
- **Error handling** - Wrap operations in try-catch, log errors with context
- **Environment variables** - Use process.env for API keys, never hardcode secrets

## Type Definitions to Use

```typescript
// From types/index.ts (read-only reference)
interface Agent {
  id: string
  name: string
  role: string
  seniorId: string | null
  teamId: string
  organizationId: string
  systemPrompt: string
  tokenAllocation: number
  tokenUsed: number
  status: AgentStatus
  createdAt: Date
  lastActiveAt: Date
}

type AgentStatus = 'active' | 'bored' | 'stuck' | 'paused'

// New types to create in server/services/llm/types.ts
enum LLMProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GOOGLE = 'google'
}

interface LLMServiceOptions {
  agentId: string // For token tracking
  provider?: LLMProvider // Default to config priority
  model?: string // Default to role-based selection
  temperature?: number // Default 0.7
  maxTokens?: number // Default 4096
  correlationId?: string // For logging
}

interface LLMResponse {
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

interface ProviderConfig {
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

class LLMServiceError extends Error {
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
```

## Reference Files

Look at these existing files for patterns to follow:

- `server/utils/logger.ts` - Structured logging pattern with correlation IDs
- `server/data/agents.ts` - Data access pattern (you'll update agent.tokenUsed here)
- `app/composables/useAgent.ts` - Error handling and state updates
- `tests/services/orchestrator.spec.ts` - Service testing pattern with mocks

## Expected Output

Create the following files:

### Core Service Files

1. **server/services/llm/types.ts** (~100 lines)
   - Export all LLM-related types and interfaces
   - LLMProvider enum
   - LLMServiceOptions, LLMResponse, ProviderConfig interfaces
   - LLMServiceError class

2. **server/services/llm/config.ts** (~120 lines)
   - Load provider configurations from environment variables
   - Provider priority order (anthropic → openai → google)
   - Model selection by agent role
   - Validate required API keys on load
   - Export getProviderConfig(), getModelForRole(), getProviderPriority()

3. **server/services/llm/utils.ts** (~100 lines)
   - Retry logic with exponential backoff
   - Rate limiting helper
   - Token estimation (approximate for MVP)
   - Error classification (retryable vs fatal)
   - Export: withRetry(), estimateTokens(), isRetryableError(), sleep()

4. **server/services/llm/anthropic.ts** (~150 lines)
   - Anthropic API client using @anthropic-ai/sdk
   - generateCompletion function matching LLMResponse format
   - Token counting from API response
   - Error handling specific to Anthropic errors
   - Export: generateCompletionAnthropic()

5. **server/services/llm/openai.ts** (~150 lines)
   - OpenAI API client using openai package
   - generateCompletion function matching LLMResponse format
   - Token counting from API response
   - Error handling specific to OpenAI errors
   - Export: generateCompletionOpenAI()

6. **server/services/llm/google.ts** (~150 lines)
   - Google Generative AI client using @google/generative-ai
   - generateCompletion function matching LLMResponse format
   - Token counting (approximate for Gemini)
   - Error handling specific to Google errors
   - Export: generateCompletionGoogle()

7. **server/services/llm/index.ts** (~200 lines)
   - Main service entry point
   - generateCompletion(prompt, options) - main public function
   - Provider selection logic (use options.provider or config priority)
   - Fallback to next provider on failure
   - Token tracking integration (update agent.tokenUsed)
   - Structured logging throughout
   - Export: generateCompletion (main function), LLMServiceError, types

### File Structure

```
server/services/llm/
├── index.ts              # Main service export
├── types.ts              # TypeScript interfaces
├── config.ts             # Configuration loading
├── anthropic.ts          # Anthropic client
├── openai.ts             # OpenAI client
├── google.ts             # Google client
└── utils.ts              # Retry, token counting
```

## Implementation Requirements

### Configuration Loading (config.ts)

```typescript
import { createLogger } from '../../utils/logger'

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
        defaultModel: 'claude-3-5-sonnet-20241022',
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
        [LLMProvider.ANTHROPIC]: 'claude-3-5-sonnet-20241022',
        [LLMProvider.OPENAI]: 'gpt-4-turbo-preview',
        [LLMProvider.GOOGLE]: 'gemini-pro'
      },
      director: {
        [LLMProvider.ANTHROPIC]: 'claude-3-opus-20240229',
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

  logger.info('LLM configuration loaded', {
    availableProviders: Object.entries(config.providers)
      .filter(([, p]) => p.apiKey)
      .map(([name]) => name)
  })

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
```

### Token Tracking Integration (index.ts)

```typescript
import { agents } from '../../data/agents'
import { createLogger } from '../../utils/logger'

const logger = createLogger('llm-service')

export async function generateCompletion(
  prompt: string,
  options: LLMServiceOptions
): Promise<LLMResponse> {
  const correlationId = options.correlationId || newCorrelationId()
  const log = logger.child({ correlationId, agentId: options.agentId })

  log.info('Generating LLM completion', {
    promptLength: prompt.length,
    provider: options.provider,
    model: options.model
  })

  try {
    // Provider selection logic
    const providers = options.provider ? [options.provider] : getProviderPriority()

    let lastError: Error | null = null

    // Try each provider in priority order
    for (const provider of providers) {
      try {
        const providerConfig = getProviderConfig(provider)
        if (!providerConfig.apiKey) {
          log.warn('Provider has no API key, skipping', { provider })
          continue
        }

        // Get model for agent's role
        const agent = agents.find((a) => a.id === options.agentId)
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

          log.info('Agent token usage updated', {
            agentId: agent.id,
            tokensUsed: response.tokensUsed.total,
            totalUsed: agent.tokenUsed,
            remaining,
            percentRemaining: percentRemaining.toFixed(1)
          })

          // Warn if low on tokens
          if (percentRemaining < 10) {
            log.warn('Agent token allocation nearly exhausted', {
              agentId: agent.id,
              remaining,
              allocation: agent.tokenAllocation
            })
          }
        }

        log.info('LLM completion generated successfully', {
          provider: response.provider,
          model: response.model,
          tokensUsed: response.tokensUsed.total,
          finishReason: response.finishReason
        })

        return response
      } catch (error) {
        lastError = error as Error
        log.warn('Provider failed, trying next', {
          provider,
          error: (error as Error).message
        })
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
    log.error('LLM completion failed', { error })
    throw error
  }
}
```

### Provider Client Pattern (anthropic.ts example)

```typescript
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
      log.info('Calling Anthropic API', {
        model: options.model || config.defaultModel,
        maxTokens: options.maxTokens || 4096
      })

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

      log.info('Anthropic API call successful', {
        tokensUsed: tokensUsed.total,
        finishReason: response.stop_reason
      })

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
    } catch (error: any) {
      log.error('Anthropic API call failed', { error: error.message })

      // Classify error
      const isRetryable = error.status === 429 || error.status >= 500
      throw new LLMServiceError(
        error.message,
        LLMProvider.ANTHROPIC,
        error.status?.toString() || 'UNKNOWN',
        isRetryable,
        error
      )
    }
  }

  return withRetry(execute, config.maxRetries, LLMProvider.ANTHROPIC)
}
```

## Validation Checklist

Before finishing, verify:

- [ ] All imports use relative paths (../../)
- [ ] Type imports use `import type { }` syntax (for TypeScript types/interfaces)
- [ ] All type fields are present (no missing required fields)
- [ ] Structured logging used (createLogger, correlationId)
- [ ] Error handling with try-catch
- [ ] Follows patterns from reference files
- [ ] No modifications to types/index.ts
- [ ] TypeScript strict mode compatible
- [ ] No hardcoded API keys (use process.env)
- [ ] No emojis in code or logs (use text prefixes like [ERROR], [INFO])
- [ ] Provider SDKs imported correctly (@anthropic-ai/sdk, openai, @google/generative-ai)
- [ ] Token tracking updates agent.tokenUsed
- [ ] All providers follow same interface pattern

## Success Criteria

- [ ] Files created at specified paths
- [ ] No type errors when running: `npm run typecheck`
- [ ] No lint errors when running: `npm run lint`
- [ ] Can generate completion from each provider (when API key present)
- [ ] Token usage tracked correctly in agents array
- [ ] Provider fallback works when primary fails
- [ ] Errors are properly classified and logged
- [ ] Configuration loads from environment variables

## Notes

- This is Phase 1 (basic LLM integration) - no MCP tools yet
- If you see inconsistencies, note them but don't fix them
- Stay within the scope defined above
- Use uuid v4 for correlation IDs: `import { v4 as uuidv4 } from 'uuid'`
- Provider SDKs need to be installed: `npm install @anthropic-ai/sdk openai @google/generative-ai`

## Package Dependencies Required

Before running, install these packages:

```bash
npm install @anthropic-ai/sdk openai @google/generative-ai
npm install -D @types/node
```

## Output Formatting (MANDATORY)

All output (status, reasoning, steps) MUST be cleanly formatted:

- Use blank lines to separate conceptual blocks
- One sentence or bullet per line for lists / steps
- No run-on paragraphs longer than 3 sentences
- Begin major phases with a clear heading like: `== Planning ==`, `== Implementation ==`
- Use fenced code blocks for any commands or code

  ```bash
  npm run typecheck
  npm run lint
  npm test -- --run
  ```

- Wrap lines at ~100 characters; insert newlines rather than overflowing
- Explicit progress structure:
  - Action: <what is being done>
  - Result: <observed outcome>
  - Next: <next planned step>
- Do not compress multiple unrelated actions into a single line
- Avoid trailing spaces, avoid inline JSON unless necessary

Failure to follow these formatting rules reduces readability; prioritize structured, line-separated output.
