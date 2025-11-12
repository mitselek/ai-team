# Task: Implement Agent Approval Endpoints (F013 Phase 4)

## Context

You're continuing F013 Interview Approval Workflow. Phases 1-3 are complete. Now implement Phase 4: agent approval endpoints after test conversation.

**Current Status:**

- ✅ Phase 1: Foundation (types, state machine)
- ✅ Phase 2: Prompt approval (approve, reject, edit)
- ✅ Phase 3: Test conversation (message, history, clear)
- ⏳ Phase 4: Agent approval (THIS TASK)

## Your Task

Implement 2 endpoints to approve or reject the agent after testing:

### 1. POST /api/interview/[id]/approve-agent

**File:** `app/server/api/interview/[id]/approve-agent.post.ts` (CREATE NEW)

**Logic:**

1. Get interviewId from params
2. Validate interviewId not empty (400 if missing)
3. Get session or 404
4. Validate state is `test_conversation` (400 if not)
5. Call workflow function `approveAgent(interviewId)`
6. Return `{ success: true }`

**Error Handling:**

- 400: Missing interviewId or wrong state
- 404: Session not found
- 500: Internal error

**Pattern to Follow:** Copy from `approve-prompt.post.ts` (Phase 2)

### 2. POST /api/interview/[id]/reject-agent

**File:** `app/server/api/interview/[id]/reject-agent.post.ts` (CREATE NEW)

**Logic:**

1. Get interviewId from params
2. Validate interviewId not empty (400 if missing)
3. Get session or 404
4. Validate state is `test_conversation` (400 if not)
5. Call workflow function `rejectAgent(interviewId)`
6. Return `{ success: true }`

**Error Handling:**

- 400: Missing interviewId or wrong state
- 404: Session not found
- 500: Internal error

**Pattern to Follow:** Copy from `reject-prompt.post.ts` (Phase 2)

## Workflow Functions

**File:** `app/server/services/interview/workflow.ts` (MODIFY EXISTING)

### Function 1: approveAgent(sessionId: string): void

**Add after `clearTestHistory()` function**

**Logic:**

```typescript
export function approveAgent(sessionId: string): void {
  const log = logger.child({ sessionId })

  log.info('Approving agent after test conversation')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  if (session.currentState !== 'test_conversation') {
    throw new Error(`Cannot approve agent in state '${session.currentState}'`)
  }

  // Transition to assign_details
  updateState(sessionId, 'assign_details')
  resetExchangeCounter(session)

  log.info({ newState: 'assign_details' }, 'Agent approved, moved to assign details')
}
```

### Function 2: rejectAgent(sessionId: string): void

**Add after `approveAgent()` function**

**Logic:**

```typescript
export function rejectAgent(sessionId: string): void {
  const log = logger.child({ sessionId })

  log.info('Rejecting agent, returning to prompt review')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  if (session.currentState !== 'test_conversation') {
    throw new Error(`Cannot reject agent in state '${session.currentState}'`)
  }

  // Clear test conversation history (start fresh)
  session.testConversationHistory = []

  // Transition back to review_prompt
  updateState(sessionId, 'review_prompt')

  log.info({ newState: 'review_prompt' }, 'Agent rejected, moved back to review prompt')
}
```

## Critical Constraints

### ❌ DO NOT MODIFY

- `types/index.ts` - NEVER touch this file
- Test files - Tests are frozen (TDD)
- Existing endpoint files (only create new ones)

### ✅ MUST USE

**Types to Import:**

```typescript
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { getSession } from '~/server/services/interview/session'
import { approveAgent, rejectAgent } from '~/server/services/interview/workflow'
import { createLogger } from '~/server/utils/logger'
```

**Error Response Format:**

```typescript
throw createError({
  statusCode: 400,
  data: { error: 'Error message here' }
})
```

**Logging Pattern:**

```typescript
const log = createLogger('api:interview:approve-agent')
log.info({ interviewId }, 'Processing request')
log.warn({ interviewId }, 'Validation failed')
log.error({ interviewId, error: error.message }, 'Failed')
```

## Reference Files

**Copy patterns from:**

- `app/server/api/interview/[id]/approve-prompt.post.ts` (Phase 2)
- `app/server/api/interview/[id]/reject-prompt.post.ts` (Phase 2)
- `app/server/services/interview/workflow.ts` (approve/reject functions)

**State machine functions:**

- `updateState(sessionId, newState)` - Changes state
- `resetExchangeCounter(session)` - Resets counter

## Implementation Checklist

- [ ] Create `approve-agent.post.ts`
- [ ] Create `reject-agent.post.ts`
- [ ] Add `approveAgent()` to workflow.ts
- [ ] Add `rejectAgent()` to workflow.ts
- [ ] Both endpoints handle all error cases
- [ ] Proper logging throughout
- [ ] State transitions correct
- [ ] Test conversation history cleared on reject
- [ ] TypeScript compiles (npm run typecheck)
- [ ] Linting passes (npm run lint)
- [ ] All tests pass (npm test tests/api/interview-agent-approval.spec.ts)

## Success Criteria

✅ All 8 tests pass
✅ No TypeScript errors
✅ No lint errors
✅ Follows existing patterns exactly
✅ Proper error handling (400, 404, 500)
✅ Clean logging

## Validation

```bash
# After implementation:
npm run typecheck  # Should pass
npm run lint       # Should pass
npm test tests/api/interview-agent-approval.spec.ts  # 8/8 passing
```

**Expected Output:**

```
✓ tests/api/interview-agent-approval.spec.ts (8 tests) <100ms
  ✓ POST /api/interview/[id]/approve-agent (4 tests)
  ✓ POST /api/interview/[id]/reject-agent (3 tests)
```

## Notes

- Keep it simple - just state transitions
- Follow Phase 2 patterns exactly
- Don't overthink - this is straightforward
- Tests will guide you if something's wrong
- Trust the TDD process!
