# F013 Phase 7: Approval Workflow UI Components

## Phase 1: PLAN

### Feature Selection

**Feature ID**: F013-phase-7-approval-ui
**Priority**: High (completes F013 approval workflow)
**Dependencies**:

- F013 Phases 1-6 (all API endpoints complete, 100% tests passing)
- UI foundation healthy (composables connected to API)

### Objectives

Transform the interview detail page (`/interviews/[id]`) into a state-aware UI that provides distinct interfaces for each approval workflow state.

### Current State Analysis

**Existing UI**: Basic chat interface

- Shows conversation history
- Allows sending messages
- Polls every 2s for updates
- No awareness of workflow states

**Backend Ready**: All 14 API endpoints functional

- Phase 2: Prompt approval (approve/reject/edit)
- Phase 3: Test conversation (test-message, clear-history)
- Phase 4: Agent approval (approve/reject agent)
- Phase 5: Details assignment (set-details)
- Phase 6: Name suggestions (name-suggestions GET)

### Scope

**Files to Modify**:

1. `app/composables/useInterview.ts` - Add 10 workflow functions
2. `app/pages/interviews/[id].vue` - State-aware UI (~200 lines total)

**New UI States**:

1. `review_prompt` - Display generated prompt, approve/reject/edit controls
2. `test_conversation` - Test agent with sample messages, approve/reject agent
3. `assign_details` - Name input, gender selection, name suggestions
4. `complete` - Success message with agent details

### Acceptance Criteria

- [ ] Composable has all 10 workflow functions
- [ ] UI renders different interface based on `currentState`
- [ ] Polling removed, manual refresh button added
- [ ] All 4 approval states functional
- [ ] Tailwind CSS styling throughout
- [ ] TypeScript 0 errors
- [ ] Lint clean
- [ ] Manual browser testing complete

### Implementation Approach

**Manual Implementation** (not Gemini-generated)

- Reason: Complex UI logic, state-dependent rendering, user interaction flows
- Vue component requires careful template structure
- Better suited for human developer with live browser testing

### Estimated Complexity

- **Lines of Code**: ~100 new lines (composable + Vue component)
- **Time**: 45-60 minutes
- **Complexity**: Medium (multiple state branches, form handling)

## Execution Plan

### Step 1: Extend Composable (~15 mins)

Add 10 functions to `useInterview.ts`:

- `approvePrompt(id)`
- `rejectPrompt(id)`
- `editPrompt(id, newPrompt)`
- `sendTestMessage(id, message)`
- `getTestHistory(id)`
- `clearTestHistory(id)`
- `approveAgent(id)`
- `rejectAgent(id)`
- `getNameSuggestions(id)`
- `setAgentDetails(id, name, gender)`

### Step 2: Refactor Interview Page (~30 mins)

Modify `/interviews/[id].vue`:

- Remove polling (`setInterval`)
- Add manual refresh button
- Create state-aware template with 4 sections:
  - Standard interview (existing chat)
  - `review_prompt` UI
  - `test_conversation` UI
  - `assign_details` UI
  - `complete` UI
- Use Tailwind CSS classes

### Step 3: Browser Testing (~15 mins)

- Start interview → complete conversation
- Test each approval state transition
- Verify all buttons work
- Check error handling
- Confirm completion screen

## Success Metrics

- All workflow states render correctly
- All API calls succeed
- No TypeScript errors
- Clean lint
- Clean git working tree after commit

## Notes

- This is the final phase of F013 before integration testing (Phase 8)
- SSE/WebSocket push mechanics deferred to post-Phase 8 evaluation
- Manual refresh approach chosen for clarity during development
