# F013 Phase 8: Discovered Issues

**Test Date:** 2025-11-12
**Tester:** Integration Testing Phase
**Environment:** Dev server localhost:3000

---

## Issue #1: Message Truncation in Interview Responses

**Severity:** High

**Category:** Backend - Interview Workflow

**Description:**

LLM-generated interviewer responses are being truncated mid-sentence. The truncation appears to be non-deterministic and affects longer responses more frequently.

**Steps to Reproduce:**

1. Start new interview
2. Provide detailed responses to Marcus's questions
3. Wait for Marcus's follow-up question
4. Observe response ends abruptly (e.g., "5" at end of numbered list)

**Expected Behavior:**

Complete interviewer responses should be received and stored in transcript.

**Actual Behavior:**

Responses are cut off mid-sentence or mid-word. Example from transcript:

```text
"...5. Experience with documentation standards and API design principles would be valuable too.\n\n5"
```

**Evidence:**

- Session ID: `cb8f6b3b-7aa0-4873-8491-61ab80d2eea9`
- Message ID: `c0bc7c9d-1dad-4790-9a9c-f17dccced3d1`
- Transcript shows response ending with just "5"
- No error in API response, truncation happens during generation

**Root Cause Analysis:**

Likely causes:

1. LLM streaming response timeout
2. Token limit reached during generation
3. Buffer size limitation in LLM service
4. Response chunking issue in streaming implementation

**Proposed Fix:**

1. Investigate LLM service configuration (timeout, max tokens)
2. Check streaming implementation in `app/server/services/interview/hr-specialist.ts`
3. Add response length validation
4. Implement retry logic for truncated responses
5. Consider increasing token limits for interviewer responses

**Workaround:**

None - blocks completing standard interview flow.

**Impact:**

- Prevents users from understanding full questions
- Blocks progression through interview
- Makes interview seem broken/unprofessional

---

## Issue #2: Duplicate Conversation Turns in Single Response

**Severity:** High

**Category:** Backend - Interview Workflow

**Description:**

The interviewer (Marcus) is generating multiple conversation turns within a single response, including timestamps and hallucinated requester responses.

**Steps to Reproduce:**

1. Continue interview conversation for 4-5 exchanges
2. Observe interviewer response includes full conversation with timestamps
3. Example format: "[20:06:00] Interviewer: ... [20:06:29] Requester: ..."

**Expected Behavior:**

Each interviewer response should contain only Marcus's single question/statement, not a full multi-turn conversation.

**Actual Behavior:**

Interviewer response includes:

- Original question
- Timestamp markers (e.g., [20:06:00])
- Multiple speaker labels (Interviewer: / Requester:)
- Hallucinated or echoed requester responses

**Evidence:**

Session ID: `cb8f6b3b-7aa0-4873-8491-61ab80d2eea9`
Message ID: `fc0d808c-7d5e-4565-8293-1ff4699b30cf`

Example transcript entry:

```text
"Okay, let's talk about how this new MCP librarian agent should communicate. What kind of communication style or approach would work best for this role?\n\n[20:06:00] Interviewer: Great question. In terms of communication style, what would be the most effective way for this MCP librarian agent to interact with the teams and users it will be supporting?\n\n[20:06:29] Requester: The MCP librarian agent should have a very clear, concise, and informative communication style..."
```

**Root Cause Analysis:**

Likely causes:

1. LLM prompt includes too much conversation history
2. System prompt instructs LLM to generate full conversation
3. Temperature/sampling settings encourage verbose/creative responses
4. Few-shot examples in prompt show multi-turn format

**Proposed Fix:**

1. Review system prompt for hr-specialist
2. Limit conversation history in prompt context
3. Add explicit instruction: "Respond with ONLY your next question"
4. Strip timestamps from responses before saving
5. Validate response format before adding to transcript

**Workaround:**

None - confuses conversation flow.

**Impact:**

- Makes UI display confusing
- Shows timestamps that shouldn't be visible to user
- Echoes user's own responses back at them
- Breaks conversation immersion

---

## Issue #3: Async Channel Closure Errors

**Severity:** Critical

**Category:** Backend - Interview Workflow / LLM Integration

**Description:**

Browser console shows repeated errors about async response channels closing before receiving responses.

**Steps to Reproduce:**

1. Send message during interview
2. Wait for response
3. Observe console errors
4. Multiple occurrences in short time span

**Expected Behavior:**

Async operations should complete successfully without channel closure errors.

**Actual Behavior:**

Console errors:

```text
Uncaught (in promise) Error: A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received
```

**Evidence:**

- Session ID: `cb8f6b3b-7aa0-4873-8491-61ab80d2eea9`
- Errors appear in groups of 3
- Occurs during LLM response generation

**Root Cause Analysis:**

Likely causes:

1. LLM service timeout/crash during generation
2. Async handler not awaiting completion properly
3. Response promise rejected before channel receives data
4. Streaming implementation connection loss

**Proposed Fix:**

1. Investigate `/api/interview/:id/respond` endpoint
2. Check LLM service error handling
3. Add proper timeout handling
4. Implement graceful failure recovery
5. Add logging to identify exactly where channel closes

**Workaround:**

None - causes workflow failure.

**Impact:**

- Prevents interview from progressing
- May corrupt session state
- User sees broken functionality
- No clear error message to user

---

## Issue #4: Session ID vs ID Inconsistency (FIXED)

**Severity:** Medium (RESOLVED)

**Category:** Integration - API Response Format

**Description:**

The `/api/interview/start` endpoint returns `sessionId` while client code expected `id`, causing "Interview undefined" navigation.

**Steps to Reproduce:**

1. Click "Start New Interview"
2. Observe URL becomes `/interviews/undefined`
3. Page shows "Interview undefined"

**Expected Behavior:**

Navigate to `/interviews/{session-id}` with valid ID.

**Actual Behavior:**

URL contains `undefined` because `newInterview.id` was undefined (API returns `sessionId`).

**Evidence:**

- Commit: ac74f85
- File: `app/composables/useInterview.ts`

**Root Cause Analysis:**

API response structure mismatch between endpoint and client expectations.

**Proposed Fix:**

Map `sessionId` to `id` in composable:

```typescript
return { id: result.sessionId, ...result }
```

**Resolution:**

✅ Fixed in commit ac74f85 - "fix(f013): handle sessionId from start interview endpoint"

**Impact:**

Was blocking all testing until fixed. Now resolved.

---

## Testing Status Summary

### Completed Tests

- ✅ Interview start navigation (fixed)
- ✅ Component rendering (all 5 components render correctly)
- ✅ TypeScript compilation (0 errors)
- ✅ Basic UI interaction (buttons, inputs work)

### Blocked Tests

Due to Issues #1, #2, #3, the following cannot be completed:

- ❌ Complete standard interview conversation
- ❌ Reach approval workflow states naturally
- ❌ End-to-end happy path test
- ❌ State transition validation through standard flow

### Partially Testable

Can test with alternative approaches:

- ⚠️ Approval workflow UI (if we can manually set state)
- ⚠️ Individual API endpoints (can test in isolation)
- ⚠️ Component behavior (can test with mock data)

---

## Recommendations

### Critical Priority (Blocks Phase 7 Completion)

- **Fix Issue #3 (Async channel errors)** - Root cause of workflow failure
  - Investigate LLM service integration
  - Add proper error handling
  - Implement timeout management

- **Fix Issue #1 (Message truncation)** - Prevents interview completion
  - Review token limits
  - Fix streaming implementation
  - Add response validation

- **Fix Issue #2 (Duplicate turns)** - Breaks conversation flow
  - Review system prompt
  - Limit context window
  - Validate response format

### High Priority (Quality Issues)

- Consider adding mock/test mode for approval workflow testing
- Add session state manipulation endpoints for testing
- Implement better error messages in UI

### Next Steps

**Option A: Fix Backend Issues First:**

- Address Issues #1, #2, #3
- Return to Phase 8 testing
- Complete approval workflow validation

**Option B: Test What We Can:**

- Create test endpoint to manually advance interview state
- Test approval workflow UI in isolation
- Validate API endpoints individually
- Document Phase 7 UI as functionally complete

**Option C: Mock Data Testing:**

- Create mock interview sessions in approval states
- Test UI components with controlled data
- Validate state transitions with mocked backend

---

## Phase 8 Status

**Overall Progress:** 20%

**Completion Blockers:**

- Backend interview workflow instability
- Cannot reach approval workflow states naturally

**What Works:**

- Phase 7 UI components render correctly
- Navigation and routing functional
- TypeScript/ESLint passing
- Component architecture solid

**What's Blocked:**

- End-to-end workflow testing
- State transition validation
- Data persistence verification

**Recommendation:**

Proceed with **Option B** - create test utilities to manually advance interview state, allowing Phase 7 UI validation to complete while backend issues are addressed in separate remediation phase.
