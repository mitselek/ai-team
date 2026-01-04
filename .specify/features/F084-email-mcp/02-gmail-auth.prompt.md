# Task 02: Gmail API Wrapper & Auth (Issue #86)

## Context

Email MCP Server Phase 1: Implement Gmail API client with automatic OAuth2 token refresh and structured error handling.

Reference: `.github/prompts/email-mcp-server.prompt.md` - Gmail integration requirements, error handling strategy.

Prerequisite: Issue #85 (Secrets Management) must be complete.

## Objective

Create production-ready Gmail API wrapper with:

- Typed request/response structures
- Automatic OAuth2 token refresh (401 handling)
- Structured error logging with remediation hints
- Exponential backoff for rate limits (429) and server errors (5xx)
- Zero hardcoded credentials

## Deliverables

### Files to Create

```
src/
  gmail/
    client.ts         - GmailClient main class
    auth.ts           - OAuth2 token refresh logic
    types.ts          - Type definitions
    index.ts          - Exports

tests/
  gmail.spec.ts       - Unit tests with mocked API
```

### Type Definitions

```typescript
// src/gmail/types.ts

interface EmailEnvelope {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  cc?: string
  date: string
  labels: string[]
  snippet: string
}

interface EmailMessage extends EmailEnvelope {
  hasHtml: boolean
  sizeEstimate: number
  bodyText?: string
  bodyHtml?: string
}

interface SendRequest {
  to: string
  cc?: string
  bcc?: string
  subject: string
  text?: string
  html?: string
}

interface TokenRefreshRequest {
  refresh_token: string
  client_id: string
  client_secret: string
  grant_type: 'refresh_token'
}

interface TokenRefreshResponse {
  access_token: string
  expires_in: number
  token_type: 'Bearer'
}

// Result type for error handling
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

// Client initialization
interface GmailClientConfig {
  secretsProvider: SecretsProvider
  accessToken: string
  maxRetries?: number
}
```

### Class Interface

```typescript
// src/gmail/client.ts

class GmailClient {
  constructor(config: GmailClientConfig)

  // Read operations
  async readMessage(id: string): Promise<Result<EmailMessage>>
  async listMessages(
    query?: string,
    labelIds?: string[],
    maxResults?: number
  ): Promise<Result<EmailEnvelope[]>>

  // Write operations
  async sendEmail(request: SendRequest): Promise<Result<string>> // returns messageId
  async applyLabels(id: string, labels: string[]): Promise<Result<void>>

  // Watch/Stream
  async watchLabels(topic: string, subscription: string): Promise<Result<void>>
}
```

## Testing Requirements

See `00-tests-arguments.md` - Gmail Client section:

- readMessage() returns EmailMessage with all fields
- listMessages() respects filters and maxResults
- sendEmail() sends with correct fields
- applyLabels() applies multiple labels
- watchLabels() registers watch
- 401 errors trigger auto token refresh
- 429/5xx errors use exponential backoff
- Auth failures logged with structured context

**Test File**: `tests/gmail.spec.ts` (mocked API)

**Mock Strategy**: Mock fetch() responses for all Gmail API calls

**Success**: All tests pass, no real API calls made

## Reference Patterns

**Token Refresh** (use when 401 received):

```typescript
// src/gmail/auth.ts
async function refreshToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<Result<TokenRefreshResponse>> {
  // POST to https://oauth2.googleapis.com/token
  // Handle invalid_grant → return clear error
}
```

**Exponential Backoff** (use for 429/5xx):

```typescript
// Delegate to backoff.ts utility (created in Issue #88)
// But implement backoff logic here for now
// Delay: 100ms * 2^attempt ± 20% jitter
// Max 3 retries = ~700ms total
```

**Error Logging Pattern**:

```typescript
import { useLogger } from '@/utils/logger'
const { info, warn, error } = useLogger('gmail-client')

// On 401 + invalid_grant (token expired, cannot refresh):
error('Token refresh failed - invalid_grant', {
  tokenFamily: 'gmail-oauth2',
  action: 'manual-oauth-restart',
  issue: 86
})

// On 429 (rate limit):
warn('Rate limit reached, backing off', {
  delayMs: 200,
  attempt: 1
})

// On general error:
error('Failed to send email', {
  to: request.to,
  errorType: error.name,
  isRetryable: error.code === 'ECONNREFUSED'
})
```

**Gmail API Query Examples**:

- `from:user@example.com` - Filter by sender
- `is:unread` - Unread messages
- `label:hr-hiring` - Filter by label
- Combine: `from:user@example.com is:unread` - Multiple conditions

## No Deliverables

- ❌ No WebSocket/streaming (use Pub/Sub in Issue #87)
- ❌ No local caching (Pub/Sub handles polling)
- ❌ No OAuth bootstrap (handled in Issue #89)

## Success Criteria

- ✅ All type definitions match email-mcp-server.prompt.md
- ✅ readMessage() returns EmailMessage with content
- ✅ listMessages() supports query, labels, maxResults
- ✅ sendEmail() creates draft → sends → returns messageId
- ✅ applyLabels() applies multiple labels atomically
- ✅ watchLabels() calls Gmail watch API
- ✅ 401 auto-refreshes token + retries original request
- ✅ 401 invalid_grant logged with remediation hint
- ✅ 429/5xx use exponential backoff (max 3 retries)
- ✅ All errors logged with structured context (orgId, agentId, action)
- ✅ All tests passing (100%)
- ✅ TypeScript strict mode passes
- ✅ ESLint passes with no warnings
- ✅ No hardcoded credentials
- ✅ No console.log - use logger only

## Acceptance Test

```bash
# From project root
npm test -- tests/gmail.spec.ts

# Should show:
# PASS tests/gmail.spec.ts
#   GmailClient
#     readMessage
#       ✓ returns EmailMessage with all fields
#       ✓ handles 404 not found
#       ✓ handles 401 with token refresh
#     listMessages
#       ✓ respects maxResults limit
#       ✓ filters by query and labelIds
#     sendEmail
#       ✓ sends email with all fields
#       ✓ returns messageId on success
#     applyLabels
#       ✓ applies multiple labels
#     watchLabels
#       ✓ registers watch on topic/subscription
#     Error Handling
#       ✓ 429 uses exponential backoff
#       ✓ 5xx errors retry
#       ✓ 401 invalid_grant logs remediation
```

## Technical Notes

- **Language**: TypeScript (strict mode)
- **HTTP**: Use native fetch() (available in Node 18+)
- **Gmail API version**: v1 (only supported version)
- **Token refresh**: ONLY on 401, not proactively
- **Error structure**: Always include: errorType, isRetryable, remediation hint
- **Logging**: Use context format from codebase logger.ts

## Phase Dependencies

- ⏭️ Waits for Issue #85 (needs SecretsProvider)
- ← Blocks Issue #87 (Pub/Sub needs Gmail client)
- ← Blocks Issue #88 (Send tool needs Gmail client)

## Estimated Effort

3-4 hours

- 1h: Type definitions + client structure
- 1h: Core read/write methods
- 1h: Token refresh + error handling
- 1h: Tests + backoff logic
