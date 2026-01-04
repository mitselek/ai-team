# Task 04: Outbound & MCP Tools (Issue #88)

## Context

Email MCP Server Phase 1: Implement email sending with MCP tools for LLMs + exponential backoff utility.

Reference: `.github/prompts/email-mcp-server.prompt.md` - Outbound requirements, MCP tool definitions.

Prerequisites: Issue #86 (Gmail client) for send functionality.

## Objective

Create production-ready outbound system with:

- Structured email sending with retry logic
- MCP tool definitions for LLM integration
- Reusable exponential backoff utility
- Support for to, cc, bcc, subject, text/html
- Structured error responses for LLM agents

## Deliverables

### Files to Create

```
src/
  outbound/
    sender.ts         - EmailSender class with backoff
    index.ts          - Exports

src/tools/
  index.ts            - MCP tool definitions (export send tool)

src/utils/
  backoff.ts          - Exponential backoff utility

tests/
  backoff.spec.ts     - Backoff timing + jitter tests
```

### Type Definitions

```typescript
// src/outbound/types.ts (or in sender.ts)

interface SendOptions {
  maxRetries?: number // default 3
  initialDelayMs?: number // default 100
  maxDelayMs?: number // default 10000
}

interface SendResult {
  ok: boolean
  messageId?: string
  error?: {
    type: 'validation' | 'auth' | 'rate_limit' | 'server' | 'unknown'
    message: string
    retryable: boolean
    retryAfterMs?: number
  }
}

// MCP Tool for LLM
interface MCPTool {
  name: 'send_email'
  description: string
  inputSchema: {
    type: 'object'
    properties: {
      to: { type: 'string'; description: '...' }
      cc?: { type: 'string'; description: '...' }
      bcc?: { type: 'string'; description: '...' }
      subject: { type: 'string'; description: '...' }
      text?: { type: 'string'; description: '...' }
      html?: { type: 'string'; description: '...' }
    }
    required: ['to', 'subject']
  }
}
```

### EmailSender Class

```typescript
// src/outbound/sender.ts

class EmailSender {
  constructor(gmailClient: GmailClient, options?: SendOptions)

  async send(request: SendRequest): Promise<SendResult> {
    // Validate request
    // Call gmailClient.sendEmail()
    // On 429/5xx: use exponential backoff
    // Return structured result (ok/error)
  }

  // Helper for LLM error messages
  static formatErrorForLLM(result: SendResult): string {
    // "Successfully sent to user@example.com (messageId: 123)"
    // Or: "Failed to send: rate limited. Retry in 60s"
  }
}

export { EmailSender }
```

### Exponential Backoff Utility

```typescript
// src/utils/backoff.ts

interface BackoffConfig {
  maxRetries?: number // default 3
  initialDelayMs?: number // default 100
  maxDelayMs?: number // default 10000
  jitter?: number // default 0.2 (±20%)
}

class ExponentialBackoff {
  constructor(config?: BackoffConfig)

  // Returns delay in ms for attempt N
  getDelay(attemptNumber: number): number {
    // delay = initialDelayMs * (2 ** attemptNumber)
    // clamped to maxDelayMs
    // with ±jitter% randomness
  }

  // Convenience: sleep then retry
  async sleep(attemptNumber: number): Promise<void> {
    // Calculate delay and await
  }

  // Check if should retry
  shouldRetry(attemptNumber: number): boolean {
    return attemptNumber < this.maxRetries
  }
}

// Higher-order function for retrying
async function withExponentialBackoff<T>(fn: () => Promise<T>, config?: BackoffConfig): Promise<T> {
  // Calls fn(), catches errors, retries with backoff
  // Throws after maxRetries exceeded
}

export { ExponentialBackoff, withExponentialBackoff }
```

### MCP Tool Definitions

```typescript
// src/tools/index.ts

export const SEND_EMAIL_TOOL = {
  name: 'send_email',
  description: 'Send an email from the managed Gmail address',
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Recipient email address'
      },
      cc: {
        type: 'string',
        description: 'CC recipient (optional, comma-separated for multiple)'
      },
      bcc: {
        type: 'string',
        description: 'BCC recipient (optional, comma-separated for multiple)'
      },
      subject: {
        type: 'string',
        description: 'Email subject line'
      },
      text: {
        type: 'string',
        description: 'Email body as plain text (optional if html provided)'
      },
      html: {
        type: 'string',
        description: 'Email body as HTML (optional, overrides text for display)'
      }
    },
    required: ['to', 'subject'],
    additionalProperties: false
  }
} as const

// Export tool handler
export async function executeSendEmailTool(input: any, sender: EmailSender): Promise<SendResult> {
  // Validate input against schema
  // Call sender.send()
  // Return result
}

export const MCP_TOOLS = [SEND_EMAIL_TOOL] as const
```

## Testing Requirements

See `00-tests-arguments.md` - Exponential Backoff section:

**Backoff Tests** (`tests/backoff.spec.ts`):

- Attempt 1: ~100ms delay
- Attempt 2: ~200ms delay (±jitter)
- Attempt 3: ~400ms delay (±jitter)
- Max 3 retries = ~700ms total
- Jitter is ±20% (reproducible with seed)

**Success**: All timing correct, jitter applied, max retries respected

## Reference Patterns

**Backoff Usage**:

```typescript
import { withExponentialBackoff } from '@/utils/backoff'

const result = await withExponentialBackoff(async () => gmailClient.sendEmail(request), {
  maxRetries: 3,
  initialDelayMs: 100
})
```

**Error Response for LLM**:

```typescript
// EmailSender.formatErrorForLLM()
if (result.ok) {
  return `Email sent successfully to ${request.to}\nMessage ID: ${result.messageId}`
}

const { error } = result
if (error.type === 'rate_limit' && error.retryAfterMs) {
  return `Rate limited. Please retry in ${Math.ceil(error.retryAfterMs / 1000)} seconds.`
}

return `Failed to send email: ${error.message}\nRetryable: ${error.retryable}`
```

**Logging Pattern** (use logger.ts):

```typescript
import { useLogger } from '@/utils/logger'
const { info, warn, error } = useLogger('outbound-sender')

warn('Retrying send with backoff', {
  to: request.to,
  attemptNumber: 2,
  delayMs: 200,
  reason: 'rate_limit'
})

error('Send failed after max retries', {
  to: request.to,
  totalAttempts: 3,
  totalTimeMs: 700,
  finalError: error.message
})
```

## No Deliverables

- ❌ No attachment sending (Phase 2)
- ❌ No draft saving (send immediately)
- ❌ No scheduling (Phase 2)
- ❌ No signature templates (Phase 2)

## Success Criteria

- ✅ EmailSender class created
- ✅ send() validates request (to + subject required)
- ✅ send() calls gmailClient.sendEmail()
- ✅ 429/5xx errors trigger exponential backoff
- ✅ Returns structured SendResult (ok/error)
- ✅ formatErrorForLLM() produces readable messages
- ✅ ExponentialBackoff calculates correct delays
- ✅ Jitter is ±20% (deterministic with seed for testing)
- ✅ withExponentialBackoff() retries and throws
- ✅ SEND_EMAIL_TOOL MCP definition complete
- ✅ executeSendEmailTool() validates input
- ✅ All backoff tests passing (100%)
- ✅ TypeScript strict mode passes
- ✅ ESLint passes with no warnings
- ✅ No console.log - use logger only

## Acceptance Test

```bash
# From project root
npm test -- tests/backoff.spec.ts

# Should show:
# PASS tests/backoff.spec.ts
#   ExponentialBackoff
#     getDelay
#       ✓ attempt 0: ~100ms
#       ✓ attempt 1: ~200ms with jitter
#       ✓ attempt 2: ~400ms with jitter
#       ✓ clamps to maxDelayMs
#     shouldRetry
#       ✓ returns true for attempt < maxRetries
#       ✓ returns false for attempt >= maxRetries
#   withExponentialBackoff
#     ✓ calls function once on success
#     ✓ retries on error
#     ✓ throws after maxRetries exceeded
```

## Technical Notes

- **Language**: TypeScript (strict mode)
- **No external retry libraries**: Use custom ExponentialBackoff
- **Jitter implementation**: `±(jitter * delay) * Math.random()`
- **Default delays**: 100ms, 200ms, 400ms (with jitter)
- **Error classification**: Check HTTP status code and error message
- **LLM errors**: Human-readable, actionable (include retry hints)
- **Logging**: Use context format from codebase logger.ts

## Phase Dependencies

- ⏭️ Waits for Issue #86 (needs Gmail client)
- ← Can run in parallel with Issue #87 (independent)
- ← Can run in parallel with Issue #89 (independent)

## Estimated Effort

3-4 hours

- 1h: ExponentialBackoff utility
- 1h: EmailSender + backoff integration
- 1h: MCP tool definitions + validation
- 0.5h: Tests + error formatting
