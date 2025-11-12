# F013 Phase 8: Integration Test Specification

**Phase:** 8 - Integration Testing
**Created:** 2025-11-12

## Phase 2: SPECIFY

### Test Scope

End-to-end validation of F013 Interview Approval Workflow from interview start through agent creation.

### Test Environments

- **Browser:** Chrome/Firefox (latest)
- **Server:** Nuxt dev server (localhost:3000)
- **Database:** In-memory session storage
- **LLM:** Google Gemini (configured via environment)

### Test Flows

#### Test Flow 1: Happy Path (Full Workflow)

**Objective:** Validate complete workflow from start to agent creation

**Steps:**

1. Navigate to `/interviews`
2. Select HR Team and Marcus as interviewer
3. Click "Start New Interview"
4. Complete standard interview conversation:
   - Answer role question
   - Answer expertise question
   - Answer preferences questions
   - Wait for transition to approval workflow
5. **review_prompt state:**
   - Click Refresh to load state
   - Verify prompt displays
   - Click "Approve" button
   - Wait for state transition
6. **test_conversation state:**
   - Click Refresh to load state
   - Send test message: "What MCP servers do you know?"
   - Verify agent response appears
   - Click "Approve Agent" button
   - Wait for state transition
7. **assign_details state:**
   - Click Refresh to load state
   - Verify name suggestions display
   - Click a suggested name (or enter custom)
   - Select gender radio button
   - Click "Create Agent" button
   - Wait for state transition
8. **complete state:**
   - Click Refresh to load state
   - Verify success message
   - Verify agent details (ID, name, gender)

**Expected Results:**

- All states render correctly
- All buttons functional
- Data persists across refreshes
- Agent created successfully in database

**Known Issues to Monitor:**

- Message truncation during standard interview
- Async channel errors
- Duplicate conversation turns

---

#### Test Flow 2: Edit Prompt

**Objective:** Validate prompt editing functionality

**Steps:**

1. Follow Test Flow 1 steps 1-4
2. **review_prompt state:**
   - Click "Edit" button
   - Textarea appears with current prompt
   - Modify prompt text
   - Click "Save" button
   - Verify state remains review_prompt
   - Verify prompt updated
   - Click "Approve" button
3. Continue with Test Flow 1 steps 6-8

**Expected Results:**

- Edit mode activates correctly
- Changes persist after save
- Approval works with edited prompt

---

#### Test Flow 3: Reject Agent

**Objective:** Validate agent rejection and restart flow

**Steps:**

1. Follow Test Flow 1 steps 1-5
2. **test_conversation state:**
   - Send test message
   - Verify response
   - Click "Reject Agent" button
   - Verify state transitions back

**Expected Results:**

- Rejection triggers workflow restart
- Interview can be restarted
- Previous data cleared appropriately

---

#### Test Flow 4: Validation Errors

**Objective:** Validate form validation on assign_details

**Steps:**

1. Follow Test Flow 1 steps 1-6
2. **assign_details state:**
   - Clear name field (or leave empty)
   - Click "Create Agent"
   - Verify error message: "Name must be at least 2 characters"
   - Enter valid name
   - Do NOT select gender
   - Click "Create Agent"
   - Verify error message: "Please select a gender"
   - Select gender
   - Click "Create Agent"
   - Verify success

**Expected Results:**

- Name validation works
- Gender validation works
- Error messages display correctly
- Form submission blocked until valid

---

### API Endpoint Verification

#### Endpoints to Test

1. **GET /api/interview/:id**
   - Returns full interview session
   - Includes agentDraft when in approval states
   - Includes testConversationHistory when available

2. **POST /api/interview/:id/approve-prompt**
   - Transitions review_prompt → test_conversation
   - Updates session status

3. **POST /api/interview/:id/reject-prompt**
   - Transitions review_prompt → earlier state
   - Restarts prompt generation

4. **POST /api/interview/:id/edit-prompt**
   - Updates agentDraft.generatedPrompt
   - Remains in review_prompt state

5. **POST /api/interview/:id/test-message**
   - Adds message to testConversationHistory
   - Returns agent response

6. **GET /api/interview/:id/test-history**
   - Returns testConversationHistory array

7. **POST /api/interview/:id/clear-test-history**
   - Clears testConversationHistory

8. **POST /api/interview/:id/approve-agent**
   - Transitions test_conversation → assign_details

9. **POST /api/interview/:id/reject-agent**
   - Restarts workflow or returns to earlier state

10. **GET /api/interview/:id/name-suggestions**
    - Returns suggestedNames array
    - Only works in assign_details state

11. **POST /api/interview/:id/set-details**
    - Creates agent in database
    - Transitions assign_details → complete
    - Returns agentId

#### Verification Checklist

For each endpoint:

- [ ] Returns expected HTTP status code
- [ ] Response body matches expected structure
- [ ] State transitions occur correctly
- [ ] Data persists in session
- [ ] Error cases handled gracefully
- [ ] 400/404/500 responses include error messages

---

### State Machine Validation

#### State Transitions

```text
greet → ask_role → ask_expertise → ask_preferences → ... → review_prompt
review_prompt → test_conversation (on approve)
review_prompt → greet (on reject)
test_conversation → assign_details (on approve agent)
test_conversation → review_prompt (on reject agent)
assign_details → complete (on set details)
```

#### Validation Points

- [ ] currentState field updates correctly
- [ ] status field updates appropriately
- [ ] Cannot skip states
- [ ] Cannot reverse-transition (except reject flows)
- [ ] State data (agentDraft, testHistory) available when expected

---

### Data Consistency Checks

#### Interview Session

- [ ] id persists throughout workflow
- [ ] transcript appends correctly
- [ ] candidateProfile builds incrementally
- [ ] createdAt/updatedAt timestamps update

#### Agent Draft

- [ ] generatedPrompt set in review_prompt
- [ ] suggestedNames set in assign_details
- [ ] finalDetails set after create agent
- [ ] prompt changes persist after edit

#### Test Conversation

- [ ] testConversationHistory separate from transcript
- [ ] Messages persist across refreshes
- [ ] Clear history works

---

### UI Component Validation

#### StandardChat Component

- [ ] Renders transcript correctly
- [ ] Marcus messages left-aligned blue
- [ ] User messages right-aligned green
- [ ] Input field works
- [ ] Send button functional
- [ ] Enter key sends message

#### ReviewPrompt Component

- [ ] Displays prompt text
- [ ] Approve button works
- [ ] Reject button works
- [ ] Edit button activates edit mode
- [ ] Textarea shows current prompt
- [ ] Save button updates prompt
- [ ] Cancel button exits edit mode

#### TestConversation Component

- [ ] Displays test history
- [ ] Agent messages purple, user green
- [ ] Send test message works
- [ ] Approve Agent button works
- [ ] Reject Agent button works
- [ ] Clear History button works

#### AssignDetails Component

- [ ] Name suggestions render as chips
- [ ] Clicking chip selects name
- [ ] Name input field editable
- [ ] Gender radio buttons work
- [ ] Validation errors display
- [ ] Create Agent button works

#### CompleteState Component

- [ ] Success checkmark displays
- [ ] Agent ID shown
- [ ] Agent name shown
- [ ] Agent gender shown

---

### Browser Console Monitoring

Watch for errors:

- [ ] No TypeScript compilation errors
- [ ] No Vue warnings
- [ ] No 404 API errors (except expected)
- [ ] No CORS errors
- [ ] No async channel errors (document if present)

---

### Issue Documentation Template

For each discovered issue:

```markdown
### Issue #N: [Brief Title]

**Severity:** Critical | High | Medium | Low

**Category:** Backend | Frontend | Integration | Data

**Description:**
[Detailed description of the issue]

**Steps to Reproduce:**

1.
2.
3.

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Evidence:**

- Console errors: [paste errors]
- API response: [paste response]
- Screenshot: [attach if relevant]

**Root Cause Analysis:**
[Initial hypothesis of cause]

**Proposed Fix:**
[Suggested remediation approach]

**Workaround:**
[Temporary workaround if available]
```

---

### Test Execution Log

Track each test run:

| Test Flow    | Date       | Result | Issues Found | Notes |
| ------------ | ---------- | ------ | ------------ | ----- |
| Happy Path   | 2025-11-12 |        |              |       |
| Edit Prompt  | 2025-11-12 |        |              |       |
| Reject Agent | 2025-11-12 |        |              |       |
| Validation   | 2025-11-12 |        |              |       |

---

### Success Criteria

Phase 8 is complete when:

- [ ] At least 1 successful complete workflow (Happy Path)
- [ ] All 4 test flows executed
- [ ] All API endpoints verified
- [ ] State transitions validated
- [ ] UI components confirmed functional
- [ ] Issue list documented with severity
- [ ] Recommendations provided for next phase

---

### Recommendations

Based on test results, provide recommendations for:

1. **Critical fixes** - Block further progress
2. **High priority fixes** - Should address before release
3. **Medium priority fixes** - Nice to have improvements
4. **Low priority fixes** - Future enhancements

---

### Next Steps

After Phase 8 completion:

1. Review discovered issues
2. Prioritize remediation work
3. Create Phase 9 plan for critical fixes
4. Document Phase 8 learnings
5. Update WORKFLOW.md if needed
