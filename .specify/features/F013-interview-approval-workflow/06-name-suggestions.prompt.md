# Task: Implement Name Suggestions Endpoint (F013 Phase 6)

## Context

You are implementing **Phase 6** of the F013 Interview Approval Workflow. The requester needs to see the suggested agent names before assigning the final name and gender.

**Previous phases:**

- Phase 1: Foundation (state machine, types, blocking logic) ✅
- Phase 2: Prompt approval endpoints ✅
- Phase 3: Test conversation endpoints ✅
- Phase 4: Agent approval endpoints ✅
- Phase 5: Details assignment ✅
- Phase 6: **Name suggestions** ← YOU ARE HERE

## Your Task

Create a simple GET endpoint that returns the suggested agent names from the draft.

### Create API Endpoint

**File:** `app/server/api/interview/[id]/name-suggestions.get.ts`

**Request:**

```typescript
GET / api / interview / [id] / name - suggestions
```

**Response (Success):**

```typescript
{
  names: string[]  // e.g., ['Alex', 'Jordan', 'Casey']
}
```

**Validation:**

1. `interviewId` must be present in URL
2. Session must exist
3. Session must be in `assign_details` state
4. Agent draft must exist

**Error Responses:**

- 400: Missing interviewId, wrong state, no agent draft
- 404: Session not found

**Implementation Pattern:**

```typescript
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { getSession } from '~/server/services/interview/session'
import { createLogger } from '~/server/utils/logger'

export default defineEventHandler((event) => {
  const log = createLogger('api:interview:name-suggestions')
  const interviewId = getRouterParam(event, 'id')

  // Validate interviewId
  if (!interviewId) {
    log.warn('Validation failed: interviewId is required')
    throw createError({
      statusCode: 400,
      data: { error: 'interviewId is required' }
    })
  }

  log.info({ interviewId }, 'Processing request to get name suggestions')

  try {
    const session = getSession(interviewId)
    if (!session) {
      log.warn({ interviewId }, 'Interview session not found')
      throw createError({
        statusCode: 404,
        data: { error: `Interview session ${interviewId} not found` }
      })
    }

    if (session.currentState !== 'assign_details') {
      log.warn(
        { interviewId, currentState: session.currentState },
        'Validation failed: Cannot get name suggestions in current state'
      )
      throw createError({
        statusCode: 400,
        data: { error: `Cannot get name suggestions in state '${session.currentState}'` }
      })
    }

    if (!session.agentDraft) {
      log.warn({ interviewId }, 'Agent draft not found')
      throw createError({
        statusCode: 400,
        data: { error: 'Agent draft not found' }
      })
    }

    const names = session.agentDraft.suggestedNames || []

    log.info({ interviewId, count: names.length }, 'Name suggestions retrieved successfully')
    return { names }
  } catch (error: unknown) {
    // Re-throw H3Errors
    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      throw error
    }

    log.error({ error }, 'Failed to get name suggestions')
    throw createError({
      statusCode: 500,
      data: { error: 'Failed to get name suggestions' }
    })
  }
})
```

## Important Constraints

**DO NOT:**

- Modify `app/server/services/interview/types.ts` (types are frozen)
- Modify `app/server/services/interview/session.ts` (session management is stable)
- Modify test files (tests are written first, frozen during implementation)
- Add any workflow functions (not needed for simple getter)

**DO:**

- Follow the exact pattern from previous GET endpoints
- Use existing helper functions: `getSession()`
- Add proper logging at each step
- Validate all inputs before processing
- Handle errors gracefully with proper status codes
- Return empty array if `suggestedNames` is undefined

## Validation Checklist

Before submitting:

- [ ] TypeScript compiles with no errors (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] All tests pass (`npm test tests/api/interview-name-suggestions.spec.ts`)
- [ ] Endpoint follows existing GET patterns exactly
- [ ] Proper error handling (400, 404, 500)
- [ ] Logger used for all operations
- [ ] Returns empty array for missing suggestedNames

## Reference Files

**Existing GET endpoints to copy from:**

- `app/server/api/interview/[id].get.ts`
- Similar validation pattern to `app/server/api/interview/[id]/approve-agent.post.ts`

**Services to use:**

- `app/server/services/interview/session.ts` → `getSession()`

**Types:**

- `app/server/services/interview/types.ts` → `AgentDraft`, `InterviewSession`

## Success Criteria

✅ Endpoint created at correct path  
✅ Simple read-only operation (no state changes)  
✅ All validations implemented  
✅ Proper error handling  
✅ Returns names array from draft  
✅ All 6 tests passing  
✅ TypeScript clean  
✅ No linting errors

Good luck! 🚀
