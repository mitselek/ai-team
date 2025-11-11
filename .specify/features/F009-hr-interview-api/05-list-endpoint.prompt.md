# Task: Implement GET /api/interviews Endpoint

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create the API endpoint `GET /api/interviews` that retrieves a list of interview sessions filtered by team ID.

**Purpose**: List all interview sessions for a specific team.

**Input**:

- `teamId` (string, required query parameter) - Team ID to filter sessions

**Output** (200 OK):

```typescript
InterviewSession[]  // Array of sessions
```

**Service Function**: Call `getSessionsByTeam(teamId)` from `app/server/services/interview/session.ts`

**Error Scenarios**:

- 400 Bad Request: Missing teamId query parameter
- 404 Not Found: Team not found (optional validation)
- 500 Internal Server Error: Service layer throws unexpected error

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **app/server/services/interview/** - Service layer is complete, only import and use functions
- **Constitution principles** - Follow Type Safety First, Observable Development, API-First Design

### MUST USE

- **Relative imports only** - Use `../../utils/logger`, `../../services/interview/session`
- **Type-only imports** - For types/interfaces use `import type { InterviewSession }`
- **h3 utilities** - `defineEventHandler`, `getQuery`, `setResponseStatus` from 'h3'
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
- Use `getSessionsByTeam` from `app/server/services/interview/session.ts`

## Implementation Guidance

### Extract Query Parameters

```typescript
const query = getQuery(event)
const teamId = query.teamId as string | undefined

if (!teamId) {
  log.warn('teamId query parameter missing')
  setResponseStatus(event, 400)
  return { error: 'teamId query parameter required' }
}
```

### Service Call

```typescript
try {
  const sessions = getSessionsByTeam(teamId)

  log.info({ teamId, count: sessions.length }, 'Sessions retrieved successfully')

  return sessions
} catch (error: any) {
  if (error.message?.includes('not found')) {
    log.warn({ error: error.message }, 'Resource not found')
    setResponseStatus(event, 404)
    return { error: error.message }
  }

  log.error({ error, teamId }, 'Failed to retrieve sessions')
  setResponseStatus(event, 500)
  return { error: 'Internal Server Error' }
}
```

## Expected Output

Create the following file:

- `app/server/api/interviews.get.ts`

## Validation Checklist

Before finishing, verify:

- [ ] All imports use relative paths (`../../`)
- [ ] Type imports use `import type { }` syntax
- [ ] teamId extracted from query parameters with `getQuery`
- [ ] Required teamId parameter validated
- [ ] Correct HTTP status codes (200, 400, 404, 500)
- [ ] Structured logging with correlationId
- [ ] Error handling with try-catch
- [ ] Returns array of InterviewSession objects on success
- [ ] Returns error object on failure
- [ ] Logs count of sessions retrieved

## Time Estimate

5 minutes
