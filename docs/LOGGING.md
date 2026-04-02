# Logging and Observability Guide

This guide covers structured logging practices across the AI Team project, ensuring consistent observability, security, and operational clarity.

## Core Principles

Logging in this project follows the [Constitutional Requirements](../.specify/memory/constitution.md#IV-observable-development):

- **Structured logging**: All logs include context keys for correlation and debugging
- **Three-tier strategy**: Organization, team, and leaf-level logging for different audiences
- **PII protection**: Sensitive data is redacted at source; never logged in plaintext
- **No emojis**: Use text prefixes (`[INFO]`, `[WARN]`, `[ERROR]`) for clarity and grep-ability

## Three-Tier Logging Strategy

### Tier 1: Organization Level (Highest)

**Audience**: DevOps, system administrators, compliance teams

**Context keys**: `orgId`, `operationId`, `timestamp`

**What to log**: System health, deployments, critical errors affecting multiple teams

```typescript
logger.info(
  { orgId: '537ba67e-0e50-47f7-931d-360b547efe90', operationId: 'deploy-20260104' },
  '[System] Deployment started'
)
```

### Tier 2: Team Level (Medium)

**Audience**: Team leads, product managers, on-call engineers

**Context keys**: `orgId`, `teamId`, `taskId`, `timestamp`

**What to log**: Task delegation, team operations, resource allocation

```typescript
logger.info(
  {
    orgId: '537ba67e-0e50-47f7-931d-360b547efe90',
    teamId: 'dev-team-001',
    taskId: 'task-123'
  },
  '[Team] Task delegation scheduled'
)
```

### Tier 3: Leaf Level (Detailed)

**Audience**: Engineers, debuggers, developers

**Context keys**: `orgId`, `teamId`, `agentId`, `correlationId`, module-specific keys

**What to log**: Individual operation details, errors, state transitions

```typescript
logger.debug(
  {
    orgId: '537ba67e-0e50-47f7-931d-360b547efe90',
    teamId: 'dev-team-001',
    agentId: 'marcus-001',
    correlationId: 'corr-abc123',
    messageId: 'msg-456'
  },
  '[Agent] Processing email message'
)
```

## Standard Context Keys

Include these keys consistently when available:

| Key             | Type   | Purpose                                       | Always Include? |
| --------------- | ------ | --------------------------------------------- | --------------- |
| `orgId`         | string | Organization/workspace identifier             | Yes (Tier 1+)   |
| `teamId`        | string | Team identifier                               | Yes (Tier 2+)   |
| `agentId`       | string | AI agent identifier                           | When applicable |
| `userId`        | string | Human user identifier                         | When applicable |
| `taskId`        | string | Task/workflow identifier                      | When applicable |
| `correlationId` | string | Request correlation ID for tracing            | Yes (Tier 3)    |
| `operationId`   | string | Batch operation identifier                    | When applicable |
| `duration`      | number | Operation duration in milliseconds            | For timings     |
| `status`        | string | Result status (success, failed, timeout, ...) | For completions |
| `errorCode`     | string | Machine-readable error classification         | For errors      |

## Log Levels

### [INFO] - Informational

Normal operation, state transitions, significant events visible to operations teams.

```typescript
logger.info({ orgId, teamId }, '[Team] Interview scheduling completed')
```

### [WARN] - Warning

Degraded state, retry conditions, or non-critical issues that may need attention.

```typescript
logger.warn({ orgId, agentId }, '[Agent] Rate limit approaching, backing off')
```

### [ERROR] - Error

Failures that require investigation or user action.

```typescript
logger.error({ orgId, taskId, error: 'NETWORK_TIMEOUT' }, '[Task] Delegation failed')
```

### [DEBUG] - Debug

Detailed operational logs for developers troubleshooting specific issues.

```typescript
logger.debug({ correlationId, step: 1 }, '[Workflow] Processing step 1')
```

## Client-Side Logging (Frontend)

The [app/utils/logger.ts](../app/utils/logger.ts) provides a consistent interface avoiding direct `console` usage:

```typescript
import { logger } from '@/utils/logger'

// With context
logger.info({ agentId: 'marcus-001', taskId: 'task-123' }, 'Task delegation initiated')

// Without context
logger.warn('Interview timeout (check network)')

// Errors
logger.error({ error: 'AUTH_FAILED' }, 'Authentication failed')
```

**Output format** (with context):

```text
[INFO] Task delegation initiated | {"agentId":"marcus-001","taskId":"task-123"}
```

## Server-Side Logging (Backend)

Backend components use Pino structured logger with JSON output for log aggregation:

```typescript
import { logger } from '@/server/utils/logger'

// Structured format
logger.info(
  {
    orgId: ctx.org.id,
    teamId: ctx.team.id,
    taskId: req.body.taskId
  },
  'Task delegation request received'
)
```

**Output format** (JSON):

```json
{
  "level": 30,
  "time": "2024-01-15T10:30:45.123Z",
  "orgId": "537ba67e-0e50-47f7-931d-360b547efe90",
  "teamId": "dev-team-001",
  "taskId": "task-123",
  "msg": "Task delegation request received"
}
```

## PII Redaction

Never log sensitive personal or business data. Always redact:

- **Email addresses**: `user@example.com` → `user@[redacted]`
- **Full names**: `John Doe` → `[redacted]`
- **API keys/tokens**: Never log, redact at source
- **Message bodies**: Log only metadata (ID, snippet) not content
- **Financial data**: Amounts, card numbers → `[redacted]`

### Redaction Example

```typescript
// WRONG - exposes email
logger.info({ email: 'user@example.com' }, 'Email sent')

// WRONG - logs full message body
logger.info({ body: message.content }, 'Processing email')

// CORRECT - use safe metadata
import { getRedactedForLogging } from '@/utils/redaction'

logger.info(
  {
    messageId: message.id,
    snippet: message.snippet,
    from: getRedactedForLogging(message.from)
  },
  'Processing email'
)
```

### Email MCP Server Redaction

See [Email MCP README - Logging and Observability](../mcp-server-email/EMAIL_MCP_README.md#logging-and-observability) for component-specific redaction patterns.

## Error Logging Patterns

### Structured Error Logging

Always include error classification and context:

```typescript
try {
  const result = await operation()
} catch (error) {
  logger.error(
    {
      orgId,
      taskId,
      errorCode: 'OPERATION_FAILED',
      errorType: error.constructor.name,
      message: error.message,
      stack: error.stack // Only in development
    },
    '[Task] Operation failed'
  )
}
```

### Non-Retryable vs. Retryable Errors

Log the classification for operational clarity:

```typescript
// Retryable error
logger.warn({ orgId, agentId, attempt: 2, maxAttempts: 3 }, '[Agent] Request failed, retrying...')

// Non-retryable error
logger.error(
  { orgId, agentId, errorCode: 'AUTH_FAILED' },
  '[Agent] Authentication failed, will not retry'
)
```

## Performance and Timing Logs

Log operation timing for performance monitoring:

```typescript
const startTime = Date.now()
const result = await operation()
const duration = Date.now() - startTime

logger.info(
  {
    orgId,
    taskId,
    duration,
    status: result.success ? 'success' : 'failed'
  },
  '[Task] Delegation completed'
)
```

## Correlation IDs for Request Tracing

Use correlation IDs to trace requests through multiple services:

```typescript
// Request entry point
const correlationId = generateUUID()
logger.info({ correlationId, userId }, '[API] Request received')

// Pass through async calls
await processTask(taskId, correlationId)

// Final logging
logger.info({ correlationId, status: 'completed' }, '[API] Request processing finished')
```

## Log Aggregation

Structured logs enable effective aggregation:

### Example Queries

**Find all errors for an organization**:

```bash
grep "orgId.*537ba67e-0e50-47f7-931d-360b547efe90" logs/* | grep ERROR
```

**Trace a specific correlation ID**:

```bash
grep "correlationId.*corr-abc123" logs/* | sort
```

**Find all team operations**:

```bash
grep "teamId.*dev-team-001" logs/* | grep "\[Team\]"
```

## Component-Specific Logging

### Email MCP Server

See [mcp-server-kali-pentest/EMAIL_MCP_README.md - Logging and Observability](../mcp-server-email/EMAIL_MCP_README.md#logging-and-observability) for:

- Structured logging with Pino
- PII redaction for email operations
- Exponential backoff retry logging
- Daemon and polling logs

### Interview Workflow

See [agents/delegation.md](agents/delegation.md) for:

- Interview state transitions
- Agent communication logging
- Approval workflow logs

## Best Practices

### DO

- ✅ Include context keys for correlation
- ✅ Use structured logging (objects, not string concatenation)
- ✅ Classify errors with error codes
- ✅ Redact PII at source
- ✅ Log meaningful state transitions
- ✅ Use consistent prefixes (`[Component]`, `[Service]`)
- ✅ Include timing information for performance tracking

### DON'T

- ❌ Log full user names or email addresses in plaintext
- ❌ Use `console.log` directly (use `logger` utility)
- ❌ Include API keys or tokens in logs
- ❌ Log full message bodies or large data structures
- ❌ Use emojis or non-ASCII characters in logs
- ❌ Log without context keys
- ❌ Mix logging levels (use consistent INFO for operations, DEBUG for details)

## Testing and Debugging

### Enable Debug Logging

```bash
# Frontend
window.localStorage.setItem('logLevel', 'debug')

# Backend (environment variable)
export LOG_LEVEL=debug
npm run dev
```

### Capture Logs During Tests

```typescript
import { logger } from '@/utils/logger'

test('task delegation', () => {
  const logs: unknown[] = []
  const originalInfo = logger.info
  logger.info = (ctx: unknown, msg: string) => {
    logs.push({ ctx, msg })
  }

  // Test code...

  expect(logs).toContainEqual(
    expect.objectContaining({
      ctx: expect.objectContaining({ taskId: 'task-123' })
    })
  )

  logger.info = originalInfo
})
```

## Security Considerations

### Log File Access

- Restrict log file access to authorized personnel only
- Rotate logs daily and archive after 30 days
- Use encryption for archived logs

### Sensitive Data Policy

Never log:

- API keys, tokens, or refresh tokens
- Full email addresses or names
- Message bodies or attachments
- Credit card numbers or financial data
- Social Security numbers or government IDs

### Compliance

Logging practices comply with:

- GDPR (redaction of personal data)
- HIPAA (if health data present)
- SOC 2 (audit trails with context)

## Further Reading

- [Constitution - Observable Development](../.specify/memory/constitution.md#IV-observable-development)
- [Email MCP Server Logging](../mcp-server-email/EMAIL_MCP_README.md#logging-and-observability)
- [Pino Logger Documentation](https://getpino.io/)
- [Structured Logging Best Practices](https://www.kartar.net/2015/12/structured-logging/)
