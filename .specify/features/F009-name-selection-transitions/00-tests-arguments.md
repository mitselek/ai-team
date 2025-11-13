# Test Requirements: Name Selection State Transitions (F009)

## Context

This feature integrates the nameSelection state into the interview workflow state machine. Tests must verify that state transitions work correctly: `ask_preferences → nameSelection → finalize`.

## Dependencies Available

### From Issue #26 (Complete)

- `InterviewState` type includes `'nameSelection'`
- `STATE_CONFIG` has nameSelection configuration
- `formatNameOptions()` and `parseNameSelection()` helpers

### From Issue #27 (Complete)

- `handleNameSelection(session, userMessage?)` exported from workflow.ts
- Generates 3 name options on first call
- Validates and processes selection on second call
- Returns `{ nextQuestion: string; complete: boolean }`

## Test File

**Location:** `tests/services/interview/workflow.spec.ts`

**Integration with existing tests:** Add new describe block after existing "handleNameSelection" tests

## Test Requirements

### Test Suite: State Transitions with Name Selection

#### Test 1: Transition from ask_preferences to nameSelection

**Setup:**

- Create interview session
- Set `currentState` to `'ask_preferences'`
- Set `exchangesInCurrentState` to 2 (one before maxExchanges of 3)
- Populate candidateProfile with role, expertise, preferences

**Action:**

- Call `processCandidateResponse(session.id, 'I prefer flexible working hours')`
- This should be the 3rd exchange, triggering state transition

**Assertions:**

- `session.currentState` should be `'nameSelection'`
- `session.nameSelection` should be defined
- `session.nameSelection.options` should have length 3
- `session.nameSelection.selectedName` should be null
- Response should contain "three name suggestions"

#### Test 2: Transition from nameSelection to finalize after valid selection

**Setup:**

- Create interview session
- Set `currentState` to `'nameSelection'`
- Set `nameSelection` with 3 mock options and selectedName: null

**Action:**

- Call `processCandidateResponse(session.id, '1')` (numeric selection)

**Assertions:**

- `session.nameSelection.selectedName` should equal the first option's name
- `session.nameSelection.selectedAt` should be a Date instance
- Response should contain "Excellent choice"
- State should remain 'nameSelection' (finalize happens on next cycle)

**Note:** The actual transition to finalize happens when shouldTransitionState() is called in the next processCandidateResponse cycle or auto-triggered.

#### Test 3: Stay in nameSelection on invalid selection

**Setup:**

- Create interview session
- Set `currentState` to `'nameSelection'`
- Set `nameSelection` with 3 mock options and selectedName: null

**Action:**

- Call `processCandidateResponse(session.id, 'invalid-name')` (invalid input)

**Assertions:**

- `session.currentState` should still be `'nameSelection'`
- `session.nameSelection.selectedName` should still be null
- `session.nameSelection.selectedAt` should still be null
- Response should contain "Please choose" (error message)
- `exchangesInCurrentState` should not increment (invalid inputs don't count)

#### Test 4: Full workflow end-to-end with name selection

**Setup:**

- Start a fresh interview: `await startInterview(teamId, interviewerId)`
- Progress through all states: greet → ask_role → ask_expertise → ask_preferences

**Actions:**

1. Complete greeting exchange
2. Complete role questions (2 exchanges)
3. Complete expertise questions (2 exchanges)
4. Complete preferences questions (3 exchanges) → Should auto-transition to nameSelection
5. Wait for name options to be presented
6. Select a name: `processCandidateResponse(session.id, '2')`
7. Verify selection stored
8. State machine should be ready for finalize

**Assertions:**

- Session progresses through all states correctly
- After preferences complete, `currentState` becomes `'nameSelection'`
- Name options are presented (3 options)
- Name selection is processed and stored
- `session.nameSelection.selectedName` matches chosen option
- Session is ready to finalize (finalize would be next state)

**Note:** This test may need to mock `generateCompletion` for LLM calls and `generateNameOptions` for name generation.

## Mock Data Requirements

### Mock Options for Testing

```typescript
const mockOptions = [
  { name: 'Adrian', rationale: 'Conveys reliability and steady presence' },
  { name: 'Iris', rationale: 'Represents clarity and commitment to insight' },
  { name: 'Morgan', rationale: 'Suggests strategic thinking and flexibility' }
]
```

### Mock Team and Interviewer

Use existing mock data from workflow.spec.ts:

- `mockTeam` with id 'team-1'
- `mockInterviewer` with id 'interviewer-1'

## Expected Test Count

**New Tests:** 4 integration tests
**Existing Tests:** Should still pass (11 from previous work)
**Total After:** 15 tests in workflow.spec.ts

## Validation Requirements

### Success Criteria

- All 4 new tests pass
- All 11 existing tests still pass
- No TypeScript errors
- No linting errors
- Test coverage for state transitions is complete

### Edge Cases to Cover

- Invalid selection (non-numeric, out of range)
- State transitions happen in correct order
- Exchange counters reset properly at state boundaries
- Name selection is optional (session works without it for backward compatibility)

## Import Requirements

**No new imports needed** - All required functions/types already imported in workflow.spec.ts:

- `startInterview`
- `processCandidateResponse`
- `handleNameSelection` (from Issue #27)
- `InterviewSession`, `NameOption` types

## Test Execution

**Command:** `npm test -- workflow.spec`

**Expected Duration:** ~50ms for all 15 tests

**Output:** Should show:

```text
✓ tests/services/interview/workflow.spec.ts (15 tests) XXms
  ✓ Interview Workflow > [5 existing tests]
  ✓ handleNameSelection > [6 existing tests]
  ✓ State Transitions with Name Selection > [4 new tests]
```

## Notes for Test Generator

- Follow existing test patterns in workflow.spec.ts
- Use `beforeEach` to reset arrays and clear mocks
- Mock `generateCompletion` for LLM calls
- Use `await startInterview()` to create test sessions
- Set session state manually for targeted testing
- Use `vi.mocked()` for TypeScript-safe mocking
- Keep tests focused and isolated
- Use descriptive test names that explain what's being tested
