# F013 Phase 7: UI Requirements & Specifications

## Phase 2: SPECIFY

This document defines the exact UI requirements for each approval workflow state. These specifications serve as acceptance criteria for manual implementation.

---

## UI State 1: Standard Interview States

**Applicable States**: `greet`, `ask_role`, `ask_expertise`, `ask_preferences`, `follow_up`, `consult_hr`, `awaiting_review`, `finalize`

### Requirements

**Existing UI (Keep as-is)**:

- Chat window showing conversation history
- Input box for user messages
- Send button
- Manual refresh button (new)

**Layout**:

```text
┌─────────────────────────────────────────┐
│ Interview [ID]             [🔄 Refresh] │
├─────────────────────────────────────────┤
│ State: [currentState]                   │
│                                         │
│ Conversation:                           │
│ ┌─────────────────────────────────────┐ │
│ │ Marcus: Welcome! Let's discuss...   │ │
│ │ You: I need a senior TypeScript...  │ │
│ │ Marcus: Great! What expertise...    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Type your message here...] [Send]     │
└─────────────────────────────────────────┘
```

**Tailwind Classes**:

- Container: `max-w-4xl mx-auto p-6`
- Chat window: `border border-gray-300 rounded-lg p-4 h-96 overflow-y-auto bg-gray-50`
- Message: `mb-3 p-2`
- Input: `flex-1 border border-gray-300 rounded-lg px-4 py-2`
- Button: `bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700`

---

## UI State 2: `review_prompt` - Prompt Review

**Trigger**: Interview completes, Marcus generates system prompt

### Requirements

**Display Elements**:

1. Success indicator
2. Generated system prompt (read-only, scrollable)
3. Three action buttons: Approve, Reject, Edit

**API Data Required**:

- `currentInterview.agentDraft.draftPrompt` (string)

**Layout**:

```text
┌─────────────────────────────────────────┐
│ 🎉 Interview Complete!     [🔄 Refresh] │
├─────────────────────────────────────────┤
│ Generated System Prompt:                │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ You are a Senior TypeScript         │ │
│ │ Developer with expertise in...      │ │
│ │ [Full prompt text, scrollable]      │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Do you approve this prompt?             │
│                                         │
│ [✓ Approve] [✗ Reject] [✎ Edit Prompt] │
└─────────────────────────────────────────┘
```

**Actions**:

1. **Approve**: Call `approvePrompt(id)` → transitions to `test_conversation`
2. **Reject**: Call `rejectPrompt(id)` → returns to interview (last state before review)
3. **Edit**: Show editable textarea, save button calls `editPrompt(id, newPrompt)`

**Edit Mode Layout**:

```text
┌─────────────────────────────────────────┐
│ Edit System Prompt         [🔄 Refresh] │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ [Editable textarea with prompt]     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [💾 Save Changes] [Cancel]              │
└─────────────────────────────────────────┘
```

**Tailwind Classes**:

- Success header: `text-2xl font-bold text-green-600 mb-4`
- Prompt display: `border border-gray-300 rounded-lg p-4 bg-gray-50 h-64 overflow-y-auto font-mono text-sm`
- Button row: `flex gap-4 mt-6`
- Approve button: `bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700`
- Reject button: `bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700`
- Edit button: `bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700`

**Validation**:

- Prompt must not be empty when saving edits
- Show error message if API call fails

---

## UI State 3: `test_conversation` - Agent Testing

**Trigger**: User approves prompt

### Requirements

**Display Elements**:

1. System prompt (collapsible/expandable)
2. Test conversation history
3. Input for test messages
4. Clear history button
5. Approve/Reject agent buttons

**API Data Required**:

- `currentInterview.agentDraft.draftPrompt` (string)
- Test history via `getTestHistory(id)` (array of messages)

**Layout**:

```
┌─────────────────────────────────────────┐
│ Test Your Agent            [🔄 Refresh] │
├─────────────────────────────────────────┤
│ System Prompt: [Show/Hide ▼]            │
│                                         │
│ Test Conversation:                      │
│ ┌─────────────────────────────────────┐ │
│ │ You: Hello                          │ │
│ │ Agent: Hi! How can I help?          │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Type test message...] [Send]           │
│ [Clear History]                         │
│                                         │
│ ─────────────────────────────────────── │
│                                         │
│ Happy with the agent's behavior?        │
│ [✓ Approve Agent] [✗ Reject & Restart] │
└─────────────────────────────────────────┘
```

**Actions**:

1. **Send Test Message**: Call `sendTestMessage(id, message)` → updates test history
2. **Clear History**: Call `clearTestHistory(id)` → empties test conversation
3. **Approve Agent**: Call `approveAgent(id)` → transitions to `assign_details`
4. **Reject Agent**: Call `rejectAgent(id)` → returns to `review_prompt`, clears test history

**Test Message Format**:

```typescript
{
  role: 'user' | 'assistant',
  content: string,
  timestamp: Date
}
```

**Tailwind Classes**:

- Prompt toggle: `text-blue-600 cursor-pointer hover:text-blue-800`
- Test chat: `border border-gray-300 rounded-lg p-4 bg-gray-50 h-64 overflow-y-auto mb-4`
- User message: `bg-blue-100 p-2 rounded-lg mb-2 text-right`
- Agent message: `bg-gray-200 p-2 rounded-lg mb-2`
- Clear button: `bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700`

**Validation**:

- Test message must not be empty
- Show loading state while agent responds
- Handle API errors gracefully

---

## UI State 4: `assign_details` - Agent Details & Finalization

**Trigger**: User approves agent after testing

### Requirements

**Display Elements**:

1. Name suggestions (clickable chips)
2. Agent name input field
3. Gender radio buttons (male, female, non-binary)
4. Create agent button

**API Data Required**:

- Name suggestions via `getNameSuggestions(id)` → `{ names: string[] }`

**Layout**:

```
┌─────────────────────────────────────────┐
│ Finalize Your Agent        [🔄 Refresh] │
├─────────────────────────────────────────┤
│ Name Suggestions:                       │
│ [Alex] [Jordan] [Casey] [Morgan]        │
│                                         │
│ Agent Name:                             │
│ ┌─────────────────────────────────────┐ │
│ │ [________________________]          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Gender:                                 │
│ ○ Male  ○ Female  ○ Non-binary          │
│                                         │
│ [✨ Create Agent]                       │
└─────────────────────────────────────────┘
```

**Actions**:

1. **Click Name Suggestion**: Populate name input with suggested name
2. **Create Agent**: Call `setAgentDetails(id, name, gender)` → transitions to `complete`

**Validation**:

- Name required (non-empty, trimmed)
- Gender required (must select one)
- Show error if validation fails
- Show loading state during agent creation

**Tailwind Classes**:

- Name chip: `bg-blue-100 text-blue-800 px-4 py-2 rounded-full cursor-pointer hover:bg-blue-200 mr-2 mb-2`
- Name input: `w-full border border-gray-300 rounded-lg px-4 py-2`
- Radio group: `flex gap-6 mt-2`
- Radio label: `flex items-center gap-2 cursor-pointer`
- Create button: `bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 text-lg font-semibold`

**Empty State**:

If no name suggestions available:

```
Name Suggestions: (No suggestions available)
```

---

## UI State 5: `complete` - Success Screen

**Trigger**: Agent successfully created

### Requirements

**Display Elements**:

1. Success icon/message
2. Agent details summary
3. Link to view agent (if applicable)

**API Data Required**:

- `currentInterview.agentDraft.finalName` (string)
- `currentInterview.candidateProfile.role` (string)
- Agent ID from response (if available)

**Layout**:

```
┌─────────────────────────────────────────┐
│ 🎉 Agent Created Successfully!          │
├─────────────────────────────────────────┤
│                                         │
│         ✅ SUCCESS                      │
│                                         │
│ Agent Name: Alex                        │
│ Role: Senior TypeScript Developer       │
│                                         │
│ Your new agent is ready to work!        │
│                                         │
│ [← Back to Dashboard]                   │
└─────────────────────────────────────────┘
```

**Actions**:

1. **Back to Dashboard**: Navigate to home page or agents list

**Tailwind Classes**:

- Container: `text-center py-12`
- Success icon: `text-6xl mb-4`
- Title: `text-3xl font-bold text-green-600 mb-6`
- Details: `text-lg mb-2`
- Button: `bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mt-6`

---

## Common UI Elements

### Manual Refresh Button

**Position**: Top right of every state
**Appearance**: Icon button with label
**Action**: Call `getInterview(id)` to fetch latest state

```html
<button class="flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300">
  🔄 Refresh
</button>
```

### Loading States

**When API call in progress**:

```html
<button disabled class="cursor-not-allowed bg-gray-400 opacity-50">⏳ Loading...</button>
```

### Error Messages

**When API call fails**:

```html
<div class="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
  Error: [Error message]
</div>
```

**Tailwind**: `bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4`

---

## Responsive Design

**Breakpoints**:

- Mobile: Single column, full width
- Tablet: Max width 768px, centered
- Desktop: Max width 1024px, centered

**Tailwind Utilities**:

- Container: `max-w-4xl mx-auto px-4 sm:px-6 lg:px-8`
- Buttons: Stack vertically on mobile (`flex-col sm:flex-row`)

---

## Acceptance Criteria Checklist

**Functional Requirements**:

- [ ] All 4 approval states render correctly
- [ ] Manual refresh button works in all states
- [ ] Approve/reject/edit actions transition to correct states
- [ ] Test conversation sends messages and displays responses
- [ ] Name suggestions populate input on click
- [ ] Form validation prevents invalid submissions
- [ ] Success screen shows after agent creation

**Technical Requirements**:

- [ ] No polling (`setInterval` removed)
- [ ] Tailwind CSS used throughout
- [ ] TypeScript 0 errors
- [ ] Lint clean
- [ ] Responsive on mobile/tablet/desktop

**User Experience**:

- [ ] Loading states visible during API calls
- [ ] Error messages clear and actionable
- [ ] Buttons disabled when appropriate
- [ ] Smooth transitions between states

---

## Testing Plan

### Manual Browser Testing

**Test Flow 1: Happy Path**

1. Start interview → complete conversation
2. Verify `review_prompt` shows generated prompt
3. Click Approve → verify `test_conversation` loads
4. Send test message → verify agent responds
5. Click Approve Agent → verify `assign_details` loads
6. Click name suggestion → verify input populates
7. Select gender → click Create Agent
8. Verify `complete` screen shows success

**Test Flow 2: Edit Prompt**

1. Reach `review_prompt` state
2. Click Edit Prompt
3. Modify text → Save Changes
4. Verify prompt updates
5. Approve → continue to test

**Test Flow 3: Reject Agent**

1. Reach `test_conversation` state
2. Test agent behavior
3. Click Reject & Restart
4. Verify returns to `review_prompt`
5. Verify test history cleared

**Test Flow 4: Validation**

1. Reach `assign_details` state
2. Try submit with empty name → verify error
3. Try submit without gender → verify error
4. Fill valid data → verify success

**Edge Cases**:

- [ ] No name suggestions (empty array)
- [ ] Very long prompt text (scrolling)
- [ ] Network error during API call
- [ ] Rapid button clicks (double-submit prevention)

---

## Implementation Notes

**Manual Implementation Rationale**:

- Complex state-dependent UI logic
- Multiple form interactions
- Real-time browser testing required
- Tailwind class composition
- Vue template conditional rendering

**Estimated Time**: 45-60 minutes total

**Phase 4 (ASSESS) will verify**:

- Browser testing complete
- All test flows pass
- No console errors
- Clean git status
