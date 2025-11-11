# F009: HR Interview API Endpoints

**Status**: Ready for Execution
**Dependencies**: F008 (HR Interview Workflow service layer - ✅ Complete)
**Estimated Effort**: 45 minutes (5 endpoints + tests + docs)
**Priority**: High (Phase 1 of API+UI rollout)

## Objectives

Expose F008 HR Interview Workflow service layer through REST API endpoints, enabling:

- Programmatic interview creation and management
- Postman/curl testing of interview workflow
- Foundation for UI development (Phase 2)
- Integration with agent execution engine

## Scope

### In Scope

1. **5 REST API Endpoints**:
   - `POST /api/interview/start` - Initialize new interview session
   - `POST /api/interview/[id]/respond` - Submit candidate response
   - `GET /api/interview/[id]` - Retrieve session details
   - `POST /api/interview/[id]/cancel` - Cancel interview
   - `GET /api/interviews` - List interviews by team

2. **Integration Tests**:
   - Full workflow test: start → respond → complete
   - Error handling tests
   - Validation tests

3. **API Documentation**:
   - Request/response schemas
   - Example curl commands
   - Error codes and messages

### Out of Scope

- Authentication/authorization (TODO for future)
- Rate limiting (document in opportunities.md)
- WebSocket support (polling acceptable for MVP)
- UI components (Phase 2, separate feature)

## Technical Constraints

### MUST Follow

1. **Existing API Pattern**: Follow structure in `app/server/api/agents/index.post.ts`
2. **Type Safety**: TypeScript strict mode, use types from service layer
3. **Observable Development**: Structured logging with correlationId
4. **Error Handling**: Consistent error responses (follow existing pattern)
5. **Test-First**: Integration tests covering critical paths

### DO NOT MODIFY

- `types/index.ts` - Use existing types only
- `app/server/services/interview/*` - Service layer is complete, only import/use

### Service Layer Integration

All endpoints call existing F008 services:

- `app/server/services/interview/workflow.ts` - Main orchestration
- `app/server/services/interview/session.ts` - Session management
- Use existing `import type` pattern for types

## Execution Plan

### Task Breakdown

**Task 1: Test Generation** (Specification-driven)

- Input: `00-tests-arguments.md`
- Output: `tests/api/interview.spec.ts`
- Template: `.github/prompts/test-generation.prompt.md`

**Task 2: POST /api/interview/start:**

- File: `app/server/api/interview/start.post.ts`
- Calls: `startInterview(teamId, interviewerId)` from workflow
- Returns: `{ sessionId, greeting, firstQuestion }`

**Task 3: POST /api/interview/[id]/respond:**

- File: `app/server/api/interview/[id]/respond.post.ts`
- Calls: `processCandidateResponse(sessionId, response)` from workflow
- Returns: `{ nextQuestion, complete, profile? }`

**Task 4: GET /api/interview/[id]:**

- File: `app/server/api/interview/[id].get.ts`
- Calls: `getSession(sessionId)` from session service
- Returns: Full `InterviewSession` object

**Task 5: POST /api/interview/[id]/cancel**

- File: `app/server/api/interview/[id]/cancel.post.ts`
- Calls: `cancelInterview(sessionId, reason?)` from workflow
- Returns: `{ success, message }`

**Task 6: GET /api/interviews:**

- File: `app/server/api/interviews.get.ts`
- Calls: `getSessionsByTeam(teamId)` from session service
- Returns: `InterviewSession[]`

**Task 7: API Documentation:**

- File: `api-docs.md`
- Documents all 5 endpoints with examples

### Execution Order

1. **Parallel** (Tests + Implementation): Tasks 1-6 can run simultaneously
2. **Sequential** (Documentation): Task 7 after implementation complete

### Quality Gates

- ✅ TypeScript type check passes
- ✅ ESLint passes (no warnings)
- ✅ All tests passing (97 → 103+ tests expected)
- ✅ Can start interview via Postman/curl
- ✅ Full workflow testable end-to-end

## Reference Files

### Type Definitions

```typescript
// From app/server/services/interview/types.ts
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
```

### API Pattern Example

From `app/server/api/agents/index.post.ts`:

```typescript
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { createLogger, newCorrelationId } from '../../utils/logger'
import type { Agent } from '@@/types'

const logger = createLogger('api.agents.post')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  log.info('Received request to create a new agent')

  let body: Partial<Agent>
  try {
    body = await readBody<Partial<Agent>>(event)
  } catch (error) {
    log.error({ error }, 'Failed to parse request body')
    setResponseStatus(event, 400)
    return { error: 'Invalid request body' }
  }

  // Validate required fields
  const requiredFields: (keyof Agent)[] = [
    'name',
    'role',
    'organizationId',
    'teamId',
    'systemPrompt'
  ]
  const missingFields = requiredFields.filter((field) => !body[field])

  if (missingFields.length > 0) {
    log.warn({ missingFields }, 'Missing required fields')
    setResponseStatus(event, 400)
    return { error: `Missing required fields: ${missingFields.join(', ')}` }
  }

  try {
    // ... implementation
    log.info({ agentId: newAgent.id }, 'Successfully created new agent')
    setResponseStatus(event, 201)
    return newAgent
  } catch (error) {
    log.error({ error }, 'An unexpected error occurred')
    setResponseStatus(event, 500)
    return { error: 'Internal Server Error' }
  }
})
```

## Success Criteria

### Phase 1 Complete When

- [ ] All 5 API endpoints implemented and returning correct status codes
- [ ] Integration tests passing (start → respond → complete flow)
- [ ] Can start interview via Postman: `POST /api/interview/start`
- [ ] Can submit responses via Postman: `POST /api/interview/{id}/respond`
- [ ] Can retrieve session: `GET /api/interview/{id}`
- [ ] Can cancel interview: `POST /api/interview/{id}/cancel`
- [ ] Can list interviews: `GET /api/interviews?teamId=xxx`
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 warnings
- [ ] Tests: 97 → 103+ passing (100% pass rate)
- [ ] API documentation complete with examples

### Validation Commands

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Tests
npm test

# Test specific endpoint (after implementation)
curl -X POST http://localhost:3000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{"teamId":"team-123","interviewerId":"agent-456"}'
```

## Related Documentation

- Planning Decision: `.specify/features/F008-hr-interview-workflow/planning/api-ui-decision-2025-11-11.md`
- Service Layer: `app/server/services/interview/`
- Existing API Pattern: `app/server/api/agents/index.post.ts`
- Workflow Process: `.specify/WORKFLOW.md` (Phase 2-6)
