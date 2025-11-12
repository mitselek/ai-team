# Task: Implement Agent Details Assignment Endpoint (F013 Phase 5)

## Context

You are implementing **Phase 5** of the F013 Interview Approval Workflow. The requester has approved the agent behavior during testing and now needs to assign the final name and gender before creating the agent.

**Previous phases:**

- Phase 1: Foundation (state machine, types, blocking logic) ✅
- Phase 2: Prompt approval endpoints ✅
- Phase 3: Test conversation endpoints ✅
- Phase 4: Agent approval endpoints ✅
- Phase 5: **Details assignment** ← YOU ARE HERE

## Your Task

Create the API endpoint and workflow function for setting agent details (name + gender) and finalizing agent creation.

### 1. Create API Endpoint

**File:** `app/server/api/interview/[id]/set-details.post.ts`

**Request:**

```typescript
POST / api / interview / [id] / set - details
Body: {
  name: string // Agent name (required)
  gender: 'male' | 'female' | 'non-binary' | 'other' // Required
}
```

**Response (Success):**

```typescript
{
  success: true,
  agentId: string   // UUID of created agent
}
```

**Validation:**

1. `interviewId` must be present in URL
2. Session must exist
3. Session must be in `assign_details` state
4. `name` must be provided (non-empty string)
5. `gender` must be provided and valid ('male', 'female', 'non-binary', or 'other')

**Error Responses:**

- 400: Missing interviewId, missing name/gender, invalid gender, wrong state
- 404: Session not found
- 500: Internal error during agent creation

**Pattern:** Copy structure from `approve-agent.post.ts`:

```typescript
import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { getSession } from '~/server/services/interview/session'
import { setAgentDetails } from '~/server/services/interview/workflow'
import { createLogger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const log = createLogger('api:interview:set-details')
  const interviewId = getRouterParam(event, 'id')

  // Validate interviewId
  if (!interviewId) {
    log.warn('Validation failed: interviewId is required')
    throw createError({
      statusCode: 400,
      data: { error: 'interviewId is required' }
    })
  }

  // Read and validate body
  const body = await readBody(event)

  if (!body.name) {
    log.warn('Validation failed: name is required')
    throw createError({
      statusCode: 400,
      data: { error: 'name is required' }
    })
  }

  if (!body.gender) {
    log.warn('Validation failed: gender is required')
    throw createError({
      statusCode: 400,
      data: { error: 'gender is required' }
    })
  }

  const validGenders = ['male', 'female', 'non-binary', 'other']
  if (!validGenders.includes(body.gender)) {
    log.warn({ gender: body.gender }, 'Validation failed: invalid gender')
    throw createError({
      statusCode: 400,
      data: { error: 'gender must be one of: male, female, non-binary, other' }
    })
  }

  log.info(
    { interviewId, name: body.name, gender: body.gender },
    'Processing request to set agent details'
  )

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
        'Validation failed: Cannot set details in current state'
      )
      throw createError({
        statusCode: 400,
        data: { error: `Cannot set details in state '${session.currentState}'` }
      })
    }

    const agentId = await setAgentDetails(interviewId, body.name, body.gender)

    log.info({ interviewId, agentId }, 'Agent details set and agent created successfully')
    return { success: true, agentId }
  } catch (error: unknown) {
    // Re-throw H3Errors
    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      throw error
    }

    log.error({ error }, 'Failed to set agent details')
    throw createError({
      statusCode: 500,
      data: { error: 'Failed to set agent details' }
    })
  }
})
```

### 2. Create Workflow Function

**File:** `app/server/services/interview/workflow.ts`

Add the `setAgentDetails()` function at the end of the file (after `rejectAgent()`):

```typescript
/**
 * Set agent name and gender, create the final agent
 */
export async function setAgentDetails(
  sessionId: string,
  name: string,
  gender: 'male' | 'female' | 'non-binary' | 'other'
): Promise<string> {
  const log = logger.child({ sessionId })

  log.info({ name, gender }, 'Setting agent details and creating final agent')

  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`)
  }

  if (session.currentState !== 'assign_details') {
    throw new Error(`Cannot set details in state '${session.currentState}'`)
  }

  if (!session.agentDraft) {
    throw new Error('Agent draft not found - cannot create agent')
  }

  // Update agent draft with final details
  session.agentDraft.finalName = name
  session.agentDraft.gender = gender

  // Create the final agent
  const agentId = await createAgentFromProfile(session, name, session.agentDraft.draftPrompt)

  // Transition to complete
  updateState(sessionId, 'complete')
  completeSession(sessionId)

  log.info({ agentId, name, gender }, 'Agent created successfully')

  return agentId
}
```

**Note:** The `createAgentFromProfile()` function already exists in workflow.ts around line 169. It creates an agent with all the necessary properties and persists it.

## Important Constraints

**DO NOT:**

- Modify `app/server/services/interview/types.ts` (types are frozen)
- Modify `app/server/services/interview/session.ts` (session management is stable)
- Modify test files (tests are written first, frozen during implementation)
- Change existing workflow functions

**DO:**

- Follow the exact pattern from `approve-agent.post.ts` and `reject-agent.post.ts`
- Use existing helper functions: `getSession()`, `updateState()`, `completeSession()`, `createAgentFromProfile()`
- Add proper logging at each step
- Validate all inputs before processing
- Handle errors gracefully with proper status codes

## Validation Checklist

Before submitting:

- [ ] TypeScript compiles with no errors (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] All tests pass (`npm test tests/api/interview-details-assignment.spec.ts`)
- [ ] Endpoint follows existing patterns exactly
- [ ] Proper error handling (400, 404, 500)
- [ ] Logger used for all operations
- [ ] Agent creation succeeds with correct properties

## Reference Files

**Existing endpoints to copy from:**

- `app/server/api/interview/[id]/approve-agent.post.ts`
- `app/server/api/interview/[id]/reject-agent.post.ts`

**Services to use:**

- `app/server/services/interview/session.ts` → `getSession()`
- `app/server/services/interview/workflow.ts` → `updateState()`, `completeSession()`, `createAgentFromProfile()`

**Types:**

- `app/server/services/interview/types.ts` → `AgentDraft`, `InterviewSession`

## Success Criteria

✅ Endpoint created at correct path  
✅ Workflow function added to workflow.ts  
✅ All validations implemented  
✅ Agent created with correct name, gender, and system prompt  
✅ Session transitioned to `complete` state  
✅ All 8 tests passing  
✅ TypeScript clean  
✅ No linting errors

Good luck! 🚀
