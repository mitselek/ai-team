# Task 03: Pub/Sub Inbound Processing (Issue #87)

## Context

Email MCP Server Phase 1: Implement Cloud Pub/Sub continuous polling with message routing by plus-addressing and PII redaction.

Reference: `.github/prompts/email-mcp-server.prompt.md` - Plus-addressing routing, inbound processing, redaction strategy.

Prerequisites: Issue #85 (Secrets), Issue #86 (Gmail client).

## Objective

Create production-ready Pub/Sub daemon with:

- Continuous polling of Gmail Pub/Sub messages (no fallback to direct polling)
- Message routing by plus-address (mitselek+route-key@gmail.com → RouteKey)
- PII redaction (email addresses, names, full message body never logged)
- Structured error handling with backoff
- Long-running process compatibility (graceful shutdown)

## Deliverables

### Files to Create

```
src/
  inbound/
    watch.ts          - Pub/Sub polling loop + message handler
    processor.ts      - Message → RouteKey + redaction
    parser.ts         - Parse Pub/Sub message format
    index.ts          - Exports + daemon entry

src/utils/
  redaction.ts        - PII redaction utilities

tests/
  route-parser.spec.ts     - Plus-addressing router tests
  redaction.spec.ts        - PII redaction tests
```

### Type Definitions

```typescript
// src/inbound/types.ts (or in respective files)

interface PubSubMessage {
  data: string // base64-encoded
  messageId: string
  publishTime: string
}

interface ProcessedMessage {
  messageId: string
  routeKey: string
  infoForAi: string // PII-redacted content
  timestamp: Date
}

interface RouteHandler {
  (msg: ProcessedMessage): Promise<void>
}

// PII Redaction
interface RedactionConfig {
  redactEmails: boolean
  redactNames: boolean
  redactPhones: boolean
  redactAddresses: boolean
}
```

### Parse Pub/Sub Message

```typescript
// src/inbound/parser.ts
// Gmail sends: { "message": { "data": "base64..." } }

function decodePubSubMessage(pubsubMessage: any): {
  messageId: string
  from: string
  to: string
  subject: string
  labels: string[]
} {
  // Base64 decode data
  // JSON parse gmail notifcation
  // Extract from Gmail API response headers
}
```

### Route by Plus-Address

```typescript
// src/inbound/processor.ts

function extractRouteKey(emailAddress: string): string {
  // mitselek+hr-hiring@gmail.com → "hr-hiring"
  // mitselek@gmail.com → "PostOffice" (default)
  // mitselek+@gmail.com → "PostOffice" (empty token)

  return routeKey
}

// Export test helper for unit tests
export { extractRouteKey }
```

### PII Redaction Rules

```typescript
// src/utils/redaction.ts

interface RedactionContext {
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  component: string
}

function redactEmailAddresses(text: string): string {
  // user@example.com → user@[redacted]
  // Preserve local part, redact domain
}

function redactPersonalNames(text: string): string {
  // "John Doe" patterns → "[redacted]"
  // Handle capitalization variations
}

function getRedactedForLogging(message: EmailMessage, context: RedactionContext): string {
  // Metadata safe: id, threadId, subject, snippet, labels, from
  // NEVER include: full bodyText, bodyHtml, attachments

  return `[REDACTED MESSAGE: ${message.id}]`
}

export { redactEmailAddresses, redactPersonalNames, getRedactedForLogging }
```

### Polling Loop

```typescript
// src/inbound/watch.ts

class PubSubDaemon {
  constructor(
    gmailClient: GmailClient,
    pubsubClient: PubSubClient,
    routeHandlers: Map<string, RouteHandler>,
    config: PubSubConfig
  )

  // Main entry point
  async start(): Promise<void> {
    // Watch Gmail labels → get Pub/Sub subscription
    // Poll subscription continuously
    // On message → parse → route → handle
    // On error → backoff + retry
  }

  async stop(): Promise<void> {
    // Clean shutdown
    // Acknowledge pending messages
    // Close connections
  }
}

// Usage in src/inbound/index.ts
export async function startPubSubDaemon(
  routeKey: string,
  handler: (msg: ProcessedMessage) => Promise<void>
): Promise<PubSubDaemon> {
  // Initialize with secrets
  // Register route handler
  // Start polling
  return daemon
}
```

## Testing Requirements

See `00-tests-arguments.md` - Route Parser & Redaction sections:

**Route Parser Tests** (`tests/route-parser.spec.ts`):

- mitselek+hr-hiring@gmail.com → "hr-hiring"
- mitselek@gmail.com → "PostOffice" (default)
- user+@gmail.com → "PostOffice" (empty token)
- Malformed addresses handled gracefully

**Redaction Tests** (`tests/redaction.spec.ts`):

- Email redaction preserves local part
- Name patterns redacted
- Full message body never logged
- Metadata (id, snippet) safe to log

**Success**: All routing and redaction tests pass, no PII in logs

## Reference Patterns

**Logging Pattern** (use logger.ts):

```typescript
import { useLogger } from '@/utils/logger'
const { info, warn, error } = useLogger('pub-sub-inbound')

// SAFE to log (metadata):
info('Message received', {
  messageId: msg.id,
  from: msg.from, // Safe: redacted in logs
  routeKey: routeKey,
  labels: msg.labels
})

// NEVER log:
// ❌ msg.bodyText
// ❌ msg.bodyHtml
// ❌ Full email addresses (use redactEmailAddresses)
// ❌ Personal names (use redactPersonalNames)

// Error with redaction:
const redacted = getRedactedForLogging(msg, {
  logLevel: 'error',
  component: 'route-handler'
})
error('Failed to process message', { messageId: msg.id })
```

**Backoff on Pub/Sub Errors**:

```typescript
// If subscription.pull() fails:
// Wait 100ms, retry
// Wait 200ms, retry
// Wait 400ms, retry
// Then skip to next polling cycle
```

**Plus-Addressing Examples** (from email-mcp-server.prompt.md):

- mitselek+hr-hiring@gmail.com → Interview responses
- mitselek+vault@gmail.com → Feature requests
- mitselek+tasks@gmail.com → Task assignments
- mitselek+support@gmail.com → External support tickets

## No Deliverables

- ❌ No direct polling fallback (Pub/Sub only)
- ❌ No attachment downloading (Phase 2)
- ❌ No message modification (Phase 2)
- ❌ No Gmail filters setup (manual admin step)

## Success Criteria

- ✅ PubSubDaemon class created
- ✅ Continuous polling loop implemented (no fallback)
- ✅ Plus-address extraction works for all cases
- ✅ Default route "PostOffice" for no plus-address
- ✅ PII redaction prevents email/name/body in logs
- ✅ Message metadata (id, snippet, labels) safe to log
- ✅ Backoff on subscription errors
- ✅ Graceful shutdown (stop() drains queue)
- ✅ All route-parser tests passing (100%)
- ✅ All redaction tests passing (100%)
- ✅ TypeScript strict mode passes
- ✅ ESLint passes with no warnings
- ✅ No hardcoded routes or credentials
- ✅ No console.log - use logger only

## Acceptance Test

```bash
# From project root
npm test -- tests/route-parser.spec.ts tests/redaction.spec.ts

# Should show:
# PASS tests/route-parser.spec.ts
#   extractRouteKey
#     ✓ extracts plus-address token
#     ✓ returns PostOffice for no plus-address
#     ✓ handles empty plus-address
#     ✓ handles malformed addresses
#
# PASS tests/redaction.spec.ts
#   redactEmailAddresses
#     ✓ redacts email domain
#     ✓ preserves local part
#     ✓ handles multiple addresses
#   redactPersonalNames
#     ✓ redacts common name patterns
#     ✓ handles case variations
#   getRedactedForLogging
#     ✓ never includes bodyText
#     ✓ never includes bodyHtml
#     ✓ includes safe metadata
```

## Technical Notes

- **Language**: TypeScript (strict mode)
- **Pub/Sub**: Use native Node.js + googleapis client
- **Polling interval**: 5-10 second polls (configurable)
- **Shutdown signal**: SIGTERM for graceful stop
- **Error strategy**: Log + backoff + retry (no crash)
- **PII strategy**: Whitelist metadata (not blacklist content)

## Phase Dependencies

- ⏭️ Waits for Issue #85 (needs Secrets)
- ⏭️ Waits for Issue #86 (needs Gmail client)
- ← Can run in parallel with Issue #88 (independent)
- ← Can run in parallel with Issue #89 (independent)

## Estimated Effort

4-5 hours

- 1h: Plus-address parser + unit tests
- 1h: PII redaction + tests
- 1.5h: Pub/Sub polling loop
- 1.5h: Message processor + route handler
- 0.5h: Graceful shutdown + error handling
