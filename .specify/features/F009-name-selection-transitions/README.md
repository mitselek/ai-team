# F009: Name Selection State Transitions

## Overview

**Feature**: Update state machine transitions to include nameSelection in the interview workflow
**Issue**: #29
**Parent**: #9 (Marcus presents three name options)
**Dependencies**: #26 (infrastructure) ✅, #27 (handler) ✅
**Risk**: MEDIUM - Modifies core workflow state machine

## Objectives

1. Update `ask_preferences` state to transition to `nameSelection` instead of `finalize`
2. Wire `handleNameSelection` into `processCandidateResponse` workflow
3. Ensure proper state transitions: `ask_preferences → nameSelection → finalize`
4. Add integration tests covering full workflow with name selection

## Scope

### Files to Modify

1. `app/server/services/interview/state-machine.ts` - Update ask_preferences nextState
2. `app/server/services/interview/workflow.ts` - Wire handler into response processing
3. `tests/services/interview/workflow.spec.ts` - Add integration tests

### What Changes

**state-machine.ts:**

- Change `ask_preferences.nextState` from `'finalize'` to `'nameSelection'`

**workflow.ts:**

- Add nameSelection state handling in `processCandidateResponse`
- Call `handleNameSelection` when in nameSelection state
- Ensure proper state flow after selection

**workflow.spec.ts:**

- Add test: Transition from ask_preferences to nameSelection
- Add test: Transition from nameSelection to finalize after valid selection
- Add test: Stay in nameSelection on invalid selection
- Add test: Full workflow end-to-end with name selection

## Dependencies Satisfied

✅ **Issue #26** (PR #28): nameSelection infrastructure

- InterviewState type includes 'nameSelection'
- STATE_CONFIG has nameSelection entry
- Helper functions (formatNameOptions, parseNameSelection)

✅ **Issue #27** (PR #31): handleNameSelection function

- Function exported from workflow.ts
- Generates 3 options on first entry
- Processes selection on second entry
- Returns proper response structure

## Execution Plan

### Phase 1: Test Specification (Split TDD)

Create `00-tests-arguments.md` with:

- Integration test requirements
- State transition expectations
- Mock data structures
- Validation criteria

### Phase 2: Test Generation (Gemini)

Generate tests first using test-generation.prompt.md:

- Focus on integration tests
- Cover state transitions
- Test invalid inputs
- Commit tests separately before implementation

### Phase 3: Implementation (Gemini)

Two implementation tasks:

1. Update state machine (state-machine.ts)
2. Wire handler into workflow (workflow.ts)

### Phase 4: Validation

- All tests pass (241 + N new tests)
- TypeScript compiles
- No linting errors
- Manual workflow test

## Risk Mitigation

**Risks:**

- Breaking existing workflow (5 existing tests)
- Incorrect state transition logic
- Race conditions in async state updates

**Mitigations:**

- Split TDD approach (tests first)
- Comprehensive integration tests
- Review existing workflow tests for patterns
- Test with mock data before live testing

## Success Criteria

- [ ] ask_preferences transitions to nameSelection (not finalize)
- [ ] nameSelection state properly handled in processCandidateResponse
- [ ] Valid selection triggers transition to finalize
- [ ] Invalid selection stays in nameSelection with retry prompt
- [ ] All existing tests still pass (no regressions)
- [ ] 4 new integration tests pass
- [ ] TypeScript compiles cleanly
- [ ] Full workflow: preferences → nameSelection → finalize works end-to-end

## Estimated Complexity

**Lines of Code:** ~30 lines (15 in workflow.ts, 10 in tests, 5 in state-machine.ts)
**Test Count:** 4 new integration tests
**Gemini Tasks:** 2 tasks (state machine + workflow integration)
**Time Estimate:** 60-90 minutes total (30 min spec, 10 min Gemini, 20 min assess, 30 min learn)
