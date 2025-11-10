# F006: LLM Provider Integration

## Status

Planning

## Objective

Create a robust LLM service layer that enables agents to communicate with multiple LLM providers (Anthropic, OpenAI, Google) with token tracking, error handling, and future MCP tool integration support. This is the cognitive foundation that allows agents to process tasks and make decisions.

## Scope

### In Scope (Phase 1: Basic LLM Integration)

- Multi-provider abstraction (Anthropic, OpenAI, Google)
- Unified interface for generating completions
- Token counting and budget tracking
- Provider selection with fallback logic
- Configuration from environment variables
- Error handling and retry logic
- Rate limiting per provider
- Structured logging with correlation IDs
- Basic conversation context management

### Out of Scope (Future Phases)

- **Phase 2**: MCP client integration (tool discovery and invocation)
- **Phase 3**: Streaming responses
- **Phase 4**: Function calling / tool use
- **Phase 5**: Conversation memory and context compression
- **Phase 6**: Multi-turn conversation management
- **Phase 7**: Prompt templates and optimization

## Dependencies

### Required (Complete)

- F001 Agent System (Agent type, token fields)
- Environment variables configured (.env with API keys)
- Logger utility (server/utils/logger.ts)

### Uses

- `types/index.ts` (Agent interface)
- `server/utils/logger.ts` (structured logging)
- `.env` (NUXT_ANTHROPIC_API_KEY, NUXT_OPENAI_API_KEY, NUXT_GOOGLE_API_KEY)

## Architecture

### High-Level Design

```text
┌─────────────────────────────────────────────┐
│  Agent Execution Layer (Future)             │
│  - Reads tasks                              │
│  - Calls LLM service                        │
│  - Updates agent.tokenUsed                  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  LLM Service Layer (F006 Phase 1)           │
│  - generateCompletion(prompt, options)      │
│  - Provider selection and fallback          │
│  - Token counting                           │
│  - Error handling and retries               │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Provider Clients (Anthropic/OpenAI/Google) │
│  - API calls via official SDKs              │
│  - Response normalization                   │
│  - Provider-specific error handling         │
└─────────────────────────────────────────────┘
```

### Future MCP Integration (Phase 2)

```text
┌─────────────────────────────────────────────┐
│  LLM Service with MCP Tools (Phase 2)       │
│  - Discover available MCP servers           │
│  - Query tool schemas                       │
│  - Parse tool calls from LLM responses      │
│  - Execute tools via MCP protocol           │
│  - Include tool results in conversation     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  MCP Tool Servers (separate processes)      │
│  - mcp-server-kali-pentest                  │
│  - mcp-server-email-gmail                   │
│  - mcp-server-github                        │
│  - Custom Toolsmith-created tools           │
└─────────────────────────────────────────────┘
```

## Implementation Tasks

### Task 1: LLM Service Core

**File:** `server/services/llm.ts`

**Responsibilities:**

- Provider abstraction with unified interface
- Token accounting integration
- Error handling and retries
- Provider selection logic

### Task 2: Provider Clients

**Files:**

- `server/services/llm/anthropic.ts`
- `server/services/llm/openai.ts`
- `server/services/llm/google.ts`

**Responsibilities:**

- API calls using official SDKs
- Response normalization to common format
- Provider-specific error handling
- Token counting (input + output)

### Task 3: Configuration

**File:** `server/services/llm/config.ts`

**Responsibilities:**

- Load API keys from environment
- Provider priority and fallback rules
- Model selection by agent role
- Rate limiting configuration

### Task 4: Types

**File:** `server/services/llm/types.ts`

**Responsibilities:**

- Request/response interfaces
- Provider enum
- Model configuration types
- Error types

## Technical Specification

### Core Interface

```typescript
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

enum LLMProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GOOGLE = 'google'
}

// Main service function
async function generateCompletion(prompt: string, options: LLMServiceOptions): Promise<LLMResponse>
```

### Provider Configuration

```typescript
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

// Load from environment
const config = {
  providers: {
    anthropic: {
      apiKey: process.env.NUXT_ANTHROPIC_API_KEY,
      defaultModel: 'claude-3-5-sonnet-20241022',
      maxRetries: 3,
      timeout: 60000
    },
    openai: {
      apiKey: process.env.NUXT_OPENAI_API_KEY,
      defaultModel: 'gpt-4-turbo-preview',
      maxRetries: 3,
      timeout: 60000
    },
    google: {
      apiKey: process.env.NUXT_GOOGLE_API_KEY,
      defaultModel: 'gemini-pro',
      maxRetries: 3,
      timeout: 60000
    }
  },
  // Priority order for fallback
  providerPriority: ['anthropic', 'openai', 'google']
}
```

### Token Tracking Integration

```typescript
// After successful completion
import { agents } from '../data/agents'

const agent = agents.find((a) => a.id === options.agentId)
if (agent) {
  agent.tokenUsed += response.tokensUsed.total
  agent.lastActiveAt = new Date()

  // Log if approaching limit
  const remaining = agent.tokenAllocation - agent.tokenUsed
  if (remaining < agent.tokenAllocation * 0.1) {
    logger.warn('Agent approaching token limit', {
      agentId: agent.id,
      remaining,
      allocation: agent.tokenAllocation
    })
  }
}
```

### Error Handling

```typescript
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

// Retry logic
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  provider: LLMProvider
): Promise<T> {
  let lastError: Error
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (!isRetryable(error) || attempt === maxRetries) {
        throw new LLMServiceError(
          `Failed after ${attempt} attempts`,
          provider,
          'MAX_RETRIES_EXCEEDED',
          false,
          error
        )
      }
      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 1000)
    }
  }
  throw lastError!
}
```

## Acceptance Criteria

### Functionality

- [ ] Service can generate completions from all three providers
- [ ] Provider fallback works when primary provider fails
- [ ] Token counting is accurate (within 5% of actual)
- [ ] Agent tokenUsed is updated after each completion
- [ ] Errors are properly categorized (retryable vs fatal)
- [ ] Rate limiting prevents API abuse
- [ ] Configuration loads from environment variables
- [ ] Correlation IDs flow through all operations

### Error Handling

- [ ] Invalid API keys return clear error messages
- [ ] Network errors trigger retry logic
- [ ] Rate limit errors wait and retry
- [ ] Malformed responses are handled gracefully
- [ ] Timeout errors don't hang the service
- [ ] Provider unavailable triggers fallback

### Code Quality

- [ ] TypeScript strict mode passes
- [ ] All functions have proper type signatures
- [ ] Structured logging with correlation IDs
- [ ] Error handling with try-catch
- [ ] Relative imports only
- [ ] Follows existing patterns (logger, error handling)
- [ ] No hardcoded API keys or secrets

### Testing

- [ ] Unit tests for each provider client
- [ ] Integration test with mock LLM responses
- [ ] Error handling tests (retries, fallback)
- [ ] Token counting accuracy tests
- [ ] Configuration loading tests

## Expected Output

```text
server/services/llm/
├── index.ts              # Main service export (~150 lines)
├── types.ts              # TypeScript interfaces (~80 lines)
├── config.ts             # Configuration loading (~100 lines)
├── anthropic.ts          # Anthropic client (~120 lines)
├── openai.ts             # OpenAI client (~120 lines)
├── google.ts             # Google client (~120 lines)
└── utils.ts              # Retry, token counting (~80 lines)

tests/services/llm/
├── anthropic.spec.ts     # Anthropic tests (~150 lines)
├── openai.spec.ts        # OpenAI tests (~150 lines)
├── google.spec.ts        # Google tests (~150 lines)
├── integration.spec.ts   # Full service tests (~200 lines)
└── config.spec.ts        # Config tests (~100 lines)
```

Total: ~1,500 lines across 12 files

## Execution Plan

### Step 1: Planning (15 mins)

- Review provider SDK documentation (Anthropic, OpenAI, Google)
- Design unified response format
- Plan error handling strategy
- Sketch token tracking integration

### Step 2: Types and Config (20 mins)

- Create types.ts with all interfaces
- Create config.ts with environment loading
- Write config tests

### Step 3: Provider Clients (60 mins - Gemini per provider)

- Implement Anthropic client with tests
- Implement OpenAI client with tests
- Implement Google client with tests
- Each client independently testable

### Step 4: Main Service (30 mins)

- Implement index.ts with provider selection
- Add retry and fallback logic
- Integrate token tracking
- Write integration tests

### Step 5: Testing (30 mins)

- Run all unit tests
- Run integration tests
- Test with real API keys (small prompts)
- Verify token counting accuracy

### Step 6: Documentation (15 mins)

- Add JSDoc comments to public functions
- Update README with usage examples
- Document environment variables
- Add troubleshooting guide

## Success Metrics

- All tests pass (npm test)
- Can generate completions from all providers
- Token tracking updates agents correctly
- Error handling is robust (no crashes)
- Fallback logic works when provider fails
- Logging provides clear debugging information
- Ready for agent execution engine (F007)

## Notes

### Provider SDK Installation

```bash
npm install @anthropic-ai/sdk openai @google/generative-ai
npm install -D @types/node
```

### Model Selection by Role

```typescript
const modelByRole = {
  // Cheap models for simple tasks
  worker: {
    anthropic: 'claude-3-haiku-20240307',
    openai: 'gpt-3.5-turbo',
    google: 'gemini-pro'
  },
  // Expensive models for complex tasks
  manager: {
    anthropic: 'claude-3-5-sonnet-20241022',
    openai: 'gpt-4-turbo-preview',
    google: 'gemini-pro'
  },
  // Most capable for critical decisions
  director: {
    anthropic: 'claude-3-opus-20240229',
    openai: 'gpt-4',
    google: 'gemini-pro'
  }
}
```

### Token Counting

Each provider has different tokenization:

- **Anthropic**: Uses Claude tokenizer (included in SDK)
- **OpenAI**: tiktoken library (npm install tiktoken)
- **Google**: Approximate (4 chars ≈ 1 token)

For MVP, use approximate counting. Refine later.

### Rate Limiting

Implement client-side rate limiting to prevent API errors:

```typescript
class RateLimiter {
  private requests: number[] = []
  private tokens: number[] = []

  async waitIfNeeded(tokensUsed: number): Promise<void> {
    // Remove old entries (older than 1 minute)
    const now = Date.now()
    this.requests = this.requests.filter((t) => now - t < 60000)
    this.tokens = this.tokens.filter((t) => now - t < 60000)

    // Check limits
    if (this.requests.length >= config.requestsPerMinute) {
      await sleep(60000 - (now - this.requests[0]))
    }

    // Track this request
    this.requests.push(now)
    this.tokens.push(now)
  }
}
```

### Future MCP Integration (Phase 2)

When adding MCP tool support:

1. Discover available MCP servers from config
2. Query tool schemas on startup
3. Include tool schemas in LLM prompts
4. Parse tool calls from LLM responses (JSON format)
5. Execute tools via MCP client (stdio transport)
6. Include tool results in next LLM call

This keeps Phase 1 simple while designing for Phase 2.

## Gemini Grade Prediction

Expected: **B+** (moderate complexity with external APIs)

Potential issues:

- Provider SDK quirks (each has different patterns)
- Token counting accuracy (different tokenizers)
- Error handling edge cases (need thorough testing)
- Rate limiting complexity (may need refinement)

Manual review recommended for:

- API key handling (no leaks in logs)
- Token counting accuracy (compare with actual)
- Error messages (user-friendly, no sensitive data)
- Retry logic (doesn't infinite loop)
