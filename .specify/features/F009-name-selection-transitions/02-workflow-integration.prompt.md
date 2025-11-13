# Task: Wire Name Selection Handler into Workflow (F009)

## Context

This task integrates the `handleNameSelection` function into the core interview workflow. The function is already implemented and tested (Issue nr 27), but needs to be invoked when the interview session is in the `nameSelection` state.

**Dependencies:**

- Issue nr 26 (Complete): nameSelection state infrastructure
- Issue nr 27 (Complete): handleNameSelection function exported from workflow.ts
- Task 1 (Parallel): State machine nextState updated to 'nameSelection'

## Objective

Add conditional logic to `processCandidateResponse` that invokes `handleNameSelection` when the session is in the `nameSelection` state.

## File to Modify

**Location:** `app/server/services/interview/workflow.ts`

**Line Range:** Approximately lines 180-230 (within `processCandidateResponse` function)

## Required Change

### CRITICAL CONSTRAINTS

1. **ONLY add the nameSelection handler** - do not refactor other code
2. **Place the new logic AFTER state transition logic** - around line 205-215
3. **BEFORE the auto-finalize check** - around line 220
4. **DO NOT modify existing handler calls** (handleGreeting, handleRole, etc.)

### Current Structure (Simplified)

```typescript
export async function processCandidateResponse(
  sessionId: string,
  response: string
): Promise<InterviewResponse> {
  const session = sessions.find((s) => s.id === sessionId)
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  logger.info('Processing candidate response', {
    sessionId,
    currentState: session.currentState,
    exchangeCount: session.exchangesInCurrentState
  })

  // Existing state-specific handlers
  if (session.currentState === 'greet') {
    return await handleGreeting(session)
  }

  if (session.currentState === 'ask_role') {
    return await handleRole(session, response)
  }

  if (session.currentState === 'ask_expertise') {
    return await handleExpertise(session, response)
  }

  if (session.currentState === 'ask_preferences') {
    return await handlePreferences(session, response)
  }

  // State transition logic happens here (around line 210)
  // [Existing code that checks maxExchanges and transitions states]

  // INSERT NEW NAMESELECTION HANDLER HERE (after transitions, before auto-finalize)

  // Auto-finalize check (around line 220)
  const nextState = STATE_CONFIG[session.currentState].nextState
  if (nextState === 'finalize') {
    logger.info('Auto-triggering finalize', { sessionId })
    return await finalizeInterview(sessionId)
  }

  // Return message for continued conversation
  return {
    message: getNextQuestion(session),
    complete: false
  }
}
```

### Required Addition

Insert this block **after state transitions** and **before the auto-finalize check**:

```typescript
// Handle name selection state
if (session.currentState === 'nameSelection') {
  logger.info('Handling name selection', { sessionId })
  return await handleNameSelection(session, response)
}
```

### Complete Context (Where to Insert)

```typescript
// ... existing state handlers above ...

// State transition logic
const config = STATE_CONFIG[session.currentState]
session.exchangesInCurrentState++

if (session.exchangesInCurrentState >= config.maxExchanges) {
  session.currentState = config.nextState
  session.exchangesInCurrentState = 0
  logger.info('Transitioned to next state', {
    sessionId,
    newState: session.currentState
  })
}

// INSERT HERE: Handle name selection state
if (session.currentState === 'nameSelection') {
  logger.info('Handling name selection', { sessionId })
  return await handleNameSelection(session, response)
}

// Auto-finalize check
const nextState = STATE_CONFIG[session.currentState].nextState
if (nextState === 'finalize') {
  logger.info('Auto-triggering finalize', { sessionId })
  return await finalizeInterview(sessionId)
}

// Continue conversation
return {
  message: getNextQuestion(session),
  complete: false
}
```

## Implementation Steps

1. Open `app/server/services/interview/workflow.ts`
2. Locate the `processCandidateResponse` function (around line 180)
3. Find the state transition logic (around line 205-215)
4. Find the auto-finalize check (around line 220)
5. **Insert the nameSelection handler between these two sections**
6. Verify imports at top of file (handleNameSelection should already be defined in same file)
7. Save the file

## Validation Checklist

After making the change, verify:

- [ ] TypeScript compiles without errors: `npm run typecheck`
- [ ] No ESLint errors: `npm run lint`
- [ ] Imports are correct (no new imports needed)
- [ ] Only added 4-5 lines of code
- [ ] Positioned after state transitions, before auto-finalize
- [ ] Uses same logging pattern as other handlers

## Logic Flow After Change

```text
processCandidateResponse(sessionId, response) {
  1. Find session
  2. Log entry
  3. Check if in specific states (greet, ask_role, etc.) - handle if yes
  4. Increment exchange counter
  5. Check if should transition state → transition if needed
  6. NEW: Check if in nameSelection state → handle if yes
  7. Check if should auto-finalize → finalize if yes
  8. Otherwise, return next question
}
```

## Integration with handleNameSelection

The `handleNameSelection` function (already implemented in this file):

- Takes `(session, userMessage?)` as parameters
- Returns `Promise<{ nextQuestion: string; complete: boolean }>`
- On first call (no userMessage): Generates 3 name options
- On second call (with selection): Validates and stores selected name
- Handles invalid input with retry prompts
- Uses structured logging with sessionId context

## Testing Impact

This change enables:

- Test 1: Transition from ask_preferences → nameSelection
- Test 2: Process valid name selection
- Test 3: Handle invalid name selection
- Test 4: Full end-to-end workflow with name selection

All tests will be added in workflow.spec.ts (generated separately).

## Error Handling

The handler already includes error handling:

- Invalid selection returns retry prompt
- Missing options triggers regeneration
- LLM failures are caught and logged
- All errors maintain session state consistency

## Constitutional Requirements

- No emojis in commit messages or log messages
- Maintain TypeScript strict mode compliance
- Follow existing code style (structured logging pattern)
- Keep changes minimal and focused

## Success Criteria

- [ ] nameSelection handler added to processCandidateResponse
- [ ] Positioned correctly (after transitions, before auto-finalize)
- [ ] TypeScript compiles cleanly
- [ ] No lint errors
- [ ] Only 4-5 lines added
- [ ] Follows existing handler pattern
- [ ] File committed successfully

## Notes

- **handleNameSelection is already in this file** - no import needed
- This is a **small, surgical change** - only add the handler call
- The function is already tested (6 tests in Issue nr 27)
- Tests for this integration will be generated separately (Split TDD)
- Do NOT refactor or improve other code in this function
