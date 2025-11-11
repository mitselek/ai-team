# Task: Implement POST /api/interview/[id]/cancel Endpoint

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create the API endpoint `POST /api/interview/[id]/cancel` that cancels an active interview session.

**Purpose**: Cancel an interview mid-workflow with optional reason.

**Input**:

- `id` (string, from URL path) - Session ID
- `reason` (string, optional from body) - Cancellation reason

**Output** (200 OK):

```typescript
{
  success: true
  message: string
  sessionId: string
}
```

**Service Function**: Call `cancelInterview(sessionId, reason?)` from `app/server/services/interview/workflow.ts`

**Error Scenarios**:

- 404 Not Found: Session ID not found
- 400 Bad Request: Session already completed or cancelled
- 500 Internal Server Error: Service layer throws unexpected error

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **app/server/services/interview/** - Service layer is complete, only import and use functions
- **Constitution principles** - Follow Type Safety First, Observable Development, API-First Design

### MUST USE

- **Relative imports only** - Use `../../utils/logger`, `../../services/interview/workflow`, `../../services/interview/session`
- **Type-only imports** - For types/interfaces use `import type { }` syntax
- **h3 utilities** - `defineEventHandler`, `readBody`, `getRouterParam`, `setResponseStatus` from 'h3'
- **Structured logging** - Import and use `createLogger`, `newCorrelationId` from `../../utils/logger`
- **Error handling** - Wrap operations in try-catch, log errors with context

## Reference Files

Follow the pattern from:

- `app/server/api/agents/index.post.ts` - API structure, validation, error handling
- Use `cancelInterview` from `app/server/services/interview/workflow.ts`
- Use `getSession` from `app/server/services/interview/session.ts` to check status

## Implementation Guidance

### Extract Session ID from URL

```typescript
const sessionId = getRouterParam(event, 'id')

if (!sessionId) {
  log.warn('Session ID missing from URL')
  setResponseStatus(event, 400)
  return { error: 'Session ID required' }
}
```

### Request Body (Optional Reason)

```typescript
let body: { reason?: string } = {}
try {
  body = await readBody(event)
} catch (error) {
  // Body is optional, ignore parse errors
  log.debug('No body provided or failed to parse (reason is optional)')
}
```

### Service Call

```typescript
try {
  // Check if session exists
  const session = getSession(sessionId)
  if (!session) {
    log.warn({ sessionId }, 'Session not found')
    setResponseStatus(event, 404)
    return { error: 'Interview session not found' }
  }

  // Check if session can be cancelled
  if (session.status === 'completed') {
    log.warn({ sessionId }, 'Cannot cancel completed session')
    setResponseStatus(event, 400)
    return { error: 'Cannot cancel a completed interview' }
  }

  if (session.status === 'cancelled') {
    log.warn({ sessionId }, 'Session already cancelled')
    setResponseStatus(event, 400)
    return { error: 'Interview is already cancelled' }
  }

  // Cancel the session
  await cancelInterview(sessionId, body.reason)

  log.info({ sessionId, reason: body.reason }, 'Interview cancelled successfully')

  return {
    success: true,
    message: 'Interview cancelled successfully',
    sessionId
  }
} catch (error: any) {
  if (error.message?.includes('not found')) {
    log.warn({ error: error.message }, 'Resource not found')
    setResponseStatus(event, 404)
    return { error: error.message }
  }

  log.error({ error, sessionId }, 'Failed to cancel interview')
  setResponseStatus(event, 500)
  return { error: 'Internal Server Error' }
}
```

## Expected Output

Create the following file:

- `app/server/api/interview/[id]/cancel.post.ts`

## Validation Checklist

Before finishing, verify:

- [ ] All imports use relative paths (`../../`)
- [ ] Type imports use `import type { }` syntax
- [ ] Session ID extracted from URL path with `getRouterParam`
- [ ] Reason is optional (body parse failure is acceptable)
- [ ] Session existence checked before cancelling
- [ ] Session status checked (cannot cancel if completed/cancelled)
- [ ] Correct HTTP status codes (200, 400, 404, 500)
- [ ] Structured logging with correlationId
- [ ] Error handling with try-catch
- [ ] Returns success object with message and sessionId
- [ ] Logs cancellation reason when provided

## Time Estimate

5 minutes
