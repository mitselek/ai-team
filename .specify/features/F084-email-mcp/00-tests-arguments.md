# F084 Test Arguments: Email MCP Server

Comprehensive test requirements for Email MCP Server implementation.

## Unit Test Coverage

### 1. Secrets Management (tests/secrets.spec.ts)

**Test Cases**:

- LocalDevProvider reads from env vars
  - GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
  - Returns correct values
  - Handles missing vars gracefully

- VaultProvider stub
  - Throws NotImplementedError on any call
  - Clear error message indicating future feature

- SecretsProvider contract
  - All implementations have required methods
  - Methods return `Promise<string>`

**Success**: All env var reads correct, stub works, interface satisfied

### 2. Gmail Client (tests/gmail.spec.ts)

**Test Cases**:

- readMessage(id: string)
  - Returns EmailMessage with all fields
  - Handles 404 (not found)
  - Handles 401 (auth error) with structured logging

- listMessages(query?, labelIds?, maxResults?)
  - Returns EmailEnvelope[] array
  - Respects maxResults limit
  - Filters by query and labels correctly

- sendEmail(request: SendRequest)
  - Sends with to, cc, bcc, subject, text, html
  - Returns message ID on success
  - Handles missing optional fields
  - Returns error on send failure

- applyLabels(id, labels)
  - Applies multiple labels to message
  - Handles empty label list
  - Returns success or error

- watchLabels(topic, subscription)
  - Registers Gmail watch
  - Returns or error on failure

**Token Refresh**:

- Auto-refresh on 401
  - Calls refresh with refresh token
  - Gets new access token
  - Retries original request
  - Logs structured warning on invalid_grant

**Error Handling**:

- 429 (rate limit): exponential backoff
- 5xx errors: exponential backoff with jitter
- Network errors: clear error message
- Auth failures: structured log + actionable remediation

**Success**: All methods working, token refresh automatic, errors handled

### 3. Plus-Addressing Router (tests/route-parser.spec.ts)

**Test Cases**:

- Parse plus-addressing
  - <mitselek+hr-hiring@gmail.com> → RouteKey = "hr-hiring"
  - <mitselek@gmail.com> → RouteKey = "PostOffice" (default)
  - <user+@gmail.com> → RouteKey = "PostOffice" (empty token)
  - No + sign → RouteKey = "PostOffice"

- Malformed addresses
  - Missing domain → handled
  - No @ sign → handled
  - Extra + signs → first token used

**Success**: All routing cases correct

### 4. PII Redaction (tests/redaction.spec.ts)

**Test Cases**:

- Redact email addresses
  - "from: <user@example.com>" → "from: user@[redacted]"
  - Multiple addresses in one line
  - Edge cases (local-only, special chars)

- Redact names
  - "Name: John Doe" → "Name: [redacted]"
  - Handles caps, lowercase

- Never redact
  - Never log tokens
  - Never log full message body
  - Metadata OK (messageId, snippet are safe)

**Success**: All PII redacted, metadata safe

### 5. Exponential Backoff (tests/backoff.spec.ts)

**Test Cases**:

- Timing correctness
  - Attempt 1: ~100ms
  - Attempt 2: ~200ms (±jitter)
  - Attempt 3: ~400ms (±jitter)

- Max retries
  - Stops after 3 attempts
  - Total time ~700ms

- Jitter application
  - ±20% randomness on each delay
  - Prevents thundering herd

**Success**: Timing correct, jitter applied

## Integration Test Structure (tests/integration.spec.ts)

**Note**: No live API calls (all mocked)

- Pub/Sub message flow simulation
  - Mock message arrives → processor → labeling
  - End-to-end handler verification

- Send + receive flow
  - Mock send request → returns ID
  - Mock message received → labeled correctly

**Success**: Mock flows work, no live calls

## Type Validation

All types from Phase 1 requirements must be present:

```typescript
EmailEnvelope = {id, threadId, subject, from, to, cc?, date, labels, snippet}
EmailMessage = EmailEnvelope + {hasHtml, sizeEstimate, bodyText?, bodyHtml?}
SendRequest = {to, cc?, bcc?, subject, text?, html?}
Result<T, E> = {ok: true, value: T} | {ok: false, error: E}
RouteKey = string
```

## Success Criteria for All Tests

- ✅ All test files created
- ✅ All tests passing (100%)
- ✅ No live API calls
- ✅ Mocked Gmail responses realistic
- ✅ Error cases tested
- ✅ Edge cases covered
- ✅ Coverage > 80% for core utilities
