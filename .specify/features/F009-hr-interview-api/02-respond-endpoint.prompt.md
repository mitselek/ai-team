# Task: Implement POST /api/interview/[id]/respond Endpoint

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create the API endpoint `POST /api/interview/[id]/respond` that processes a candidate response and continues the interview workflow.

**Purpose**: Submit candidate response, analyze it, and get the next interview question or completion status.

**Input**:

- `id` (string, from URL path) - Session ID
- `response` (string, required from body) - Candidate's answer

**Output** (200 OK - continuing):

```typescript
{
  nextQuestion: string
  complete: false
  currentState: InterviewState
}
```

**Output** (200 OK - completed):

```typescript
{
  nextQuestion: null
  complete: true
  profile: CandidateProfile
  systemPrompt: string
  suggestedName: string
}
```

**Service Function**: Call `processCandidateResponse(sessionId, response)` from `app/server/services/interview/workflow.ts`

**Error Scenarios**:

- 400 Bad Request: Missing/empty response, session not active, malformed JSON
- 404 Not Found: Session ID not found
- 500 Internal Server Error: Service layer throws unexpected error

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **app/server/services/interview/** - Service layer is complete, only import and use functions
- **Constitution principles** - Follow Type Safety First, Observable Development, API-First Design

### MUST USE

- **Relative imports only** - Use `../../utils/logger`, `../../services/interview/workflow`, `../../services/interview/session`
- **Type-only imports** - For types/interfaces use `import type { ... }`
- **h3 utilities** - `defineEventHandler`, `readBody`, `getRouterParam`, `setResponseStatus` from 'h3'
- **Structured logging** - Import and use `createLogger`, `newCorrelationId` from `../../utils/logger`
- **Error handling** - Wrap operations in try-catch, log errors with context

## Type Definitions to Use

From `app/server/services/interview/types.ts`:

```typescript
export interface CandidateProfile {
  role?: string
  expertise: string[]
  preferences: CandidatePreferences
  personality: CandidatePersonality
  systemPrompt?: string
  suggestedName?: string
}

export interface CandidatePreferences {
  communicationStyle: string
  workingHours: string
  autonomyLevel: 'high' | 'medium' | 'low'
}

export interface CandidatePersonality {
  traits: string[]
  tone: string
}

export type InterviewState =
  | 'greet'
  | 'ask_role'
  | 'ask_expertise'
  | 'ask_preferences'
  | 'follow_up'
  | 'consult_hr'
  | 'awaiting_review'
  | 'finalize'
  | 'complete'
```

## Reference Files

Follow the pattern from:

- `app/server/api/agents/index.post.ts` - API structure, validation, error handling
- Use `processCandidateResponse` from `app/server/services/interview/workflow.ts`
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

### Request Validation

```typescript
let body: { response?: string }
try {
  body = await readBody(event)
} catch (error) {
  log.error({ error }, 'Failed to parse request body')
  setResponseStatus(event, 400)
  return { error: 'Invalid request body' }
}

if (!body.response || body.response.trim() === '') {
  log.warn('Empty response provided')
  setResponseStatus(event, 400)
  return { error: 'Response text required' }
}
```

### Service Call

```typescript
try {
  // Check if session exists and is active
  const session = getSession(sessionId)
  if (!session) {
    log.warn({ sessionId }, 'Session not found')
    setResponseStatus(event, 404)
    return { error: 'Interview session not found' }
  }

  if (session.status !== 'active') {
    log.warn({ sessionId, status: session.status }, 'Session not active')
    setResponseStatus(event, 400)
    return { error: 'Interview session is not active' }
  }

  // Process response
  const result = await processCandidateResponse(sessionId, body.response!)

  log.info({ sessionId, complete: result.complete }, 'Response processed successfully')

  return {
    nextQuestion: result.nextQuestion,
    complete: result.complete,
    ...(result.complete
      ? {
          profile: session.candidateProfile,
          systemPrompt: session.candidateProfile.systemPrompt,
          suggestedName: session.candidateProfile.suggestedName
        }
      : {
          currentState: session.currentState
        })
  }
} catch (error: any) {
  if (error.message?.includes('not found')) {
    log.warn({ error: error.message }, 'Resource not found')
    setResponseStatus(event, 404)
    return { error: error.message }
  }

  log.error({ error }, 'Failed to process response')
  setResponseStatus(event, 500)
  return { error: 'Internal Server Error' }
}
```

## Expected Output

Create the following file:

- `app/server/api/interview/[id]/respond.post.ts`

## Validation Checklist

Before finishing, verify:

- [ ] All imports use relative paths (`../../`)
- [ ] Type imports use `import type { }` syntax
- [ ] Session ID extracted from URL path with `getRouterParam`
- [ ] Required fields validated (response, non-empty)
- [ ] Session existence checked before processing
- [ ] Session status checked (must be 'active')
- [ ] Correct HTTP status codes (200, 400, 404, 500)
- [ ] Structured logging with correlationId
- [ ] Error handling with try-catch
- [ ] Returns different response shape based on `complete` flag
- [ ] Includes profile/systemPrompt/suggestedName when complete
- [ ] Includes currentState when continuing

## Time Estimate

10 minutes
