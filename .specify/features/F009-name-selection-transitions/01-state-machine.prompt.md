# Task: Update State Machine Transitions for Name Selection (F009)

## Context

This task updates the interview state machine configuration to integrate the newly implemented nameSelection state. After the `ask_preferences` state completes (3 exchanges), the workflow should transition to `nameSelection` instead of directly to `finalize`.

**Dependencies:**

- Issue nr 26 (Complete): nameSelection state infrastructure
- Issue nr 27 (Complete): handleNameSelection function
- This is Task 1 of 2 for Issue nr 29

## Objective

Modify the `ask_preferences` state configuration in STATE_CONFIG to transition to `nameSelection` instead of `finalize`.

## File to Modify

**Location:** `app/server/services/interview/state-machine.ts`

## Required Change

### CRITICAL CONSTRAINT

**ONLY modify the `nextState` property of `ask_preferences` configuration.**

Do NOT modify:

- Any other state configurations
- The STATE_CONFIG structure
- Imports or exports
- Any other code in the file

### Before (Current State)

```typescript
ask_preferences: {
  maxExchanges: 3,
  nextState: 'finalize' as InterviewState,  // OLD - Goes directly to finalize
  topic: 'preferences'
}
```

### After (Required Change)

```typescript
ask_preferences: {
  maxExchanges: 3,
  nextState: 'nameSelection' as InterviewState,  // NEW - Goes to name selection first
  topic: 'preferences'
}
```

## Full STATE_CONFIG Structure (For Reference)

```typescript
export const STATE_CONFIG: Record<InterviewState, StateConfig> = {
  greet: {
    maxExchanges: 1,
    nextState: 'ask_role' as InterviewState,
    topic: 'greeting'
  },
  ask_role: {
    maxExchanges: 2,
    nextState: 'ask_expertise' as InterviewState,
    topic: 'role'
  },
  ask_expertise: {
    maxExchanges: 2,
    nextState: 'ask_preferences' as InterviewState,
    topic: 'expertise'
  },
  ask_preferences: {
    maxExchanges: 3,
    nextState: 'nameSelection' as InterviewState, // CHANGE THIS LINE
    topic: 'preferences'
  },
  nameSelection: {
    maxExchanges: 1,
    nextState: 'finalize' as InterviewState,
    topic: 'name_selection'
  },
  finalize: {
    maxExchanges: 0,
    nextState: 'complete' as InterviewState,
    topic: 'finalization'
  },
  complete: {
    maxExchanges: 0,
    nextState: 'complete' as InterviewState,
    topic: 'completion'
  }
}
```

## Implementation Steps

1. Open `app/server/services/interview/state-machine.ts`
2. Locate the `STATE_CONFIG` constant (around line 10-40)
3. Find the `ask_preferences` configuration
4. Change `nextState: 'finalize' as InterviewState` to `nextState: 'nameSelection' as InterviewState`
5. Save the file

## Validation Checklist

After making the change, verify:

- [ ] TypeScript compiles without errors: `npm run typecheck`
- [ ] No ESLint errors: `npm run lint`
- [ ] File has exactly 1 line changed (the nextState line)
- [ ] The change matches the "After" example exactly
- [ ] No other configurations were modified

## State Flow After Change

The interview workflow will now follow this sequence:

```text
greet (1 exchange)
  → ask_role (2 exchanges)
    → ask_expertise (2 exchanges)
      → ask_preferences (3 exchanges)
        → nameSelection (generate options, then user selects)  ← NEW STEP
          → finalize (create agent with selected name)
            → complete
```

## Testing Impact

This change will be validated by:

- 4 new integration tests in workflow.spec.ts (Task 2)
- Existing tests should still pass (state machine structure unchanged)
- Full workflow end-to-end test will verify the new flow

## Constitutional Requirements

- No emojis in commit messages or comments
- Maintain TypeScript strict mode compliance
- Follow existing code style and formatting

## Success Criteria

- [ ] ask_preferences.nextState === 'nameSelection'
- [ ] TypeScript compiles cleanly
- [ ] No lint errors
- [ ] Only 1 line changed in state-machine.ts
- [ ] File committed successfully

## Notes

- This is a **small, focused change** - resist the urge to refactor or improve other code
- The nameSelection state configuration already exists (added in Issue nr 26)
- Tests will be generated and validated separately (Split TDD approach)
- Task 2 will wire the handler into the workflow
