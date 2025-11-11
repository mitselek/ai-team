# Task: Implement POST /api/interview/start Endpoint

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create the API endpoint `POST /api/interview/start` that initializes a new HR interview session.

**Purpose**: Start a new interview workflow by creating a session and generating the first greeting/question.

**Input**:

- `teamId` (string, required) - Team for which the interview is being conducted
- `interviewerId` (string, required) - Agent ID of the interviewer

**Output** (201 Created):

```typescript
{
  sessionId: string
  greeting: string
  firstQuestion: string
  status: 'active'
  createdAt: Date
}
```

**Service Function**: Call `startInterview(teamId, interviewerId)` from `app/server/services/interview/workflow.ts`

**Error Scenarios**:

- 400 Bad Request: Missing teamId or interviewerId, malformed JSON
- 404 Not Found: Interviewer agent not found, team not found
- 500 Internal Server Error: Service layer throws unexpected error

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **app/server/services/interview/** - Service layer is complete, only import and use functions
- **Constitution principles** - Follow Type Safety First, Observable Development, API-First Design

### MUST USE

- **Relative imports only** - No `~` aliases. Use `../../utils/logger`, `../../services/interview/workflow`, etc.
- **Type-only imports** - For types/interfaces use `import type { ... }` from service layer
- **h3 utilities** - `defineEventHandler`, `readBody`, `setResponseStatus` from 'h3'
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

export interface InterviewMessage {
  id: string
  speaker: 'interviewer' | 'candidate'
  message: string
  timestamp: Date
  metadata?: {
    state?: InterviewState
    clarityScore?: number
    needsFollowUp?: boolean
  }
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

- `app/server/api/agents/index.post.ts` - API structure, validation, error handling, status codes
- Use `startInterview` from `app/server/services/interview/workflow.ts`

## Implementation Guidance

### Request Validation

```typescript
// Parse body
let body: { teamId?: string; interviewerId?: string }
try {
  body = await readBody(event)
} catch (error) {
  log.error({ error }, 'Failed to parse request body')
  setResponseStatus(event, 400)
  return { error: 'Invalid request body' }
}

// Validate required fields
const requiredFields = ['teamId', 'interviewerId']
const missingFields = requiredFields.filter((field) => !body[field])

if (missingFields.length > 0) {
  log.warn({ missingFields }, 'Missing required fields')
  setResponseStatus(event, 400)
  return { error: `Missing required fields: ${missingFields.join(', ')}` }
}
```

### Service Call

```typescript
try {
  const session = await startInterview(body.teamId!, body.interviewerId!)

  // Extract greeting and first question from transcript
  const greeting = session.transcript.find((m) => m.speaker === 'interviewer')?.message || ''
  const firstQuestion = session.transcript[session.transcript.length - 1]?.message || ''

  log.info({ sessionId: session.id }, 'Interview started successfully')

  setResponseStatus(event, 201)
  return {
    sessionId: session.id,
    greeting,
    firstQuestion,
    status: session.status,
    createdAt: session.createdAt
  }
} catch (error: any) {
  // Handle specific errors
  if (error.message?.includes('not found')) {
    log.warn({ error: error.message }, 'Resource not found')
    setResponseStatus(event, 404)
    return { error: error.message }
  }

  log.error({ error }, 'Failed to start interview')
  setResponseStatus(event, 500)
  return { error: 'Internal Server Error' }
}
```

### Logging Pattern

```typescript
const correlationId = newCorrelationId()
const log = logger.child({ correlationId })

log.info('Received request to start interview')
// ... operation ...
log.info({ sessionId }, 'Interview started successfully')
```

## Expected Output

Create the following file:

- `app/server/api/interview/start.post.ts`

## Validation Checklist

Before finishing, verify:

- [ ] All imports use relative paths (`../../`)
- [ ] Type imports use `import type { }` syntax
- [ ] Required fields validated (teamId, interviewerId)
- [ ] Correct HTTP status codes (201, 400, 404, 500)
- [ ] Structured logging with correlationId
- [ ] Error handling with try-catch
- [ ] Follows pattern from `app/server/api/agents/index.post.ts`
- [ ] Returns sessionId, greeting, firstQuestion, status, createdAt on success
- [ ] Distinguishes 404 (not found) from 500 (server error)

## Time Estimate

8 minutes
