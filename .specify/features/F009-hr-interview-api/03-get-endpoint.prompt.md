# Task: Implement GET /api/interview/[id] Endpoint

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create the API endpoint `GET /api/interview/[id]` that retrieves a complete interview session by ID.

**Purpose**: Fetch full session details including transcript, profile, and status.

**Input**:

- `id` (string, from URL path) - Session ID

**Output** (200 OK):

```typescript
InterviewSession // Full session object
```

**Service Function**: Call `getSession(sessionId)` from `app/server/services/interview/session.ts`

**Error Scenarios**:

- 404 Not Found: Session ID not found
- 400 Bad Request: Malformed session ID (if validation added)
- 500 Internal Server Error: Service layer throws unexpected error

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **app/server/services/interview/** - Service layer is complete, only import and use functions
- **Constitution principles** - Follow Type Safety First, Observable Development, API-First Design

### MUST USE

- **Relative imports only** - Use `../../utils/logger`, `../../services/interview/session`
- **Type-only imports** - For types/interfaces use `import type { InterviewSession }`
- **h3 utilities** - `defineEventHandler`, `getRouterParam`, `setResponseStatus` from 'h3'
- **Structured logging** - Import and use `createLogger`, `newCorrelationId` from `../../utils/logger`
- **Error handling** - Wrap operations in try-catch, log errors with context

## Type Definitions to Use

From `app/server/services/interview/types.ts`:

```typescript
export interface InterviewSession {
  id: string
  candidateId: string
  teamId: string
  interviewerId: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  currentState: InterviewState
  transcript: InterviewMessage[]
  candidateProfile: CandidateProfile
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  cancelledAt?: Date
  cancelReason?: string
}
```

## Reference Files

Follow the pattern from:

- `app/server/api/agents/index.post.ts` - API structure, error handling
- Use `getSession` from `app/server/services/interview/session.ts`

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

### Service Call

```typescript
try {
  const session = getSession(sessionId)

  if (!session) {
    log.warn({ sessionId }, 'Session not found')
    setResponseStatus(event, 404)
    return { error: 'Interview session not found' }
  }

  log.info({ sessionId, status: session.status }, 'Session retrieved successfully')

  return session
} catch (error: any) {
  log.error({ error, sessionId }, 'Failed to retrieve session')
  setResponseStatus(event, 500)
  return { error: 'Internal Server Error' }
}
```

## Expected Output

Create the following file:

- `app/server/api/interview/[id].get.ts`

## Validation Checklist

Before finishing, verify:

- [ ] All imports use relative paths (`../../`)
- [ ] Type imports use `import type { }` syntax
- [ ] Session ID extracted from URL path with `getRouterParam`
- [ ] Correct HTTP status codes (200, 404, 500)
- [ ] Structured logging with correlationId
- [ ] Error handling with try-catch
- [ ] Returns full InterviewSession object on success
- [ ] Returns error object on failure
- [ ] Logs session status when retrieved

## Time Estimate

5 minutes
