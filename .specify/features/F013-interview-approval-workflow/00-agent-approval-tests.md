# F013 Phase 4: Agent Approval Endpoints - Test Requirements

## Overview

After testing the draft agent in conversation (Phase 3), the requester needs to either approve the agent's behavior or reject and return to prompt review. This phase implements the approval decision points.

## Test File

**Location:** `tests/api/interview-agent-approval.spec.ts`

**Estimated Tests:** 6-8 tests covering both endpoints

## Type Definitions to Use

```typescript
// From app/server/services/interview/types.ts

type InterviewState =
  | 'greet'
  | 'ask_role'
  | 'ask_expertise'
  | 'ask_preferences'
  | 'follow_up'
  | 'consult_hr'
  | 'awaiting_review'
  | 'finalize'
  | 'review_prompt'
  | 'test_conversation' // Current state for these endpoints
  | 'assign_details' // Target state after approval
  | 'complete'

interface InterviewSession {
  id: string
  candidateId: string
  teamId: string
  interviewerId: string
  status: InterviewStatus
  currentState: InterviewState
  transcript: InterviewMessage[]
  candidateProfile: CandidateProfile
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  stateHistory?: InterviewState[]
  exchangesInCurrentState?: number
  topicsCovered?: string[]
  agentDraft?: AgentDraft
  testConversationHistory?: InterviewMessage[]
}

interface AgentDraft {
  profile: CandidateProfile
  draftPrompt: string
  suggestedNames: string[]
  finalName?: string
  gender?: 'male' | 'female' | 'non-binary' | 'other'
}
```

## Endpoint 1: Approve Agent

**Route:** `POST /api/interview/[id]/approve-agent`

### Success Cases (2 tests)

#### Test: "should transition to assign_details state on success"

**Setup:**

- Create session in `test_conversation` state
- Session has `agentDraft` with draft prompt
- Session has test conversation history (optional)

**Action:**

- POST to `/api/interview/${session.id}/approve-agent`
- No body required

**Expected:**

- Response: 200 OK
- Body: `{ success: true }`
- Session state: `assign_details`
- Exchange counter: reset to 0

**Validation:**

```typescript
expect(response.status).toBe(200)
expect(response.body).toEqual({ success: true })
const updatedSession = getSession(session.id)
expect(updatedSession.currentState).toBe('assign_details')
```

### Error Cases (3 tests)

#### Test: "should return 400 if not in test_conversation state"

**Setup:**

- Create session in `review_prompt` state (wrong state)

**Action:**

- POST to `/api/interview/${session.id}/approve-agent`

**Expected:**

- Response: 400 Bad Request
- Body: `{ error: "Cannot approve agent in state 'review_prompt'. Must be in 'test_conversation' state." }`

#### Test: "should return 404 if session not found"

**Action:**

- POST to `/api/interview/nonexistent-id/approve-agent`

**Expected:**

- Response: 404 Not Found
- Body: `{ error: "Interview session not found" }`

#### Test: "should return 400 if interviewId is missing"

**Action:**

- POST to `/api/interview//approve-agent` (empty ID)

**Expected:**

- Response: 400 Bad Request
- Body: `{ error: "Interview ID is required" }`

## Endpoint 2: Reject Agent

**Route:** `POST /api/interview/[id]/reject-agent`

### Success Cases (1 test)

#### Test: "should transition back to review_prompt state on success"

**Setup:**

- Create session in `test_conversation` state
- Session has test conversation history

**Action:**

- POST to `/api/interview/${session.id}/reject-agent`
- No body required

**Expected:**

- Response: 200 OK
- Body: `{ success: true }`
- Session state: `review_prompt`
- Test conversation history: cleared (optional - decide in implementation)

**Validation:**

```typescript
expect(response.status).toBe(200)
expect(response.body).toEqual({ success: true })
const updatedSession = getSession(session.id)
expect(updatedSession.currentState).toBe('review_prompt')
```

### Error Cases (2 tests)

#### Test: "should return 400 if not in test_conversation state"

**Setup:**

- Create session in `assign_details` state (wrong state)

**Action:**

- POST to `/api/interview/${session.id}/reject-agent`

**Expected:**

- Response: 400 Bad Request
- Body: `{ error: "Cannot reject agent in state 'assign_details'. Must be in 'test_conversation' state." }`

#### Test: "should return 404 if session not found"

**Action:**

- POST to `/api/interview/nonexistent-id/reject-agent`

**Expected:**

- Response: 404 Not Found
- Body: `{ error: "Interview session not found" }`

## Test Structure

```typescript
describe('POST /api/interview/[id]/approve-agent', () => {
  // Success cases
  it('should transition to assign_details state on success')

  // Error cases
  it('should return 400 if not in test_conversation state')
  it('should return 404 if session not found')
  it('should return 400 if interviewId is missing')
})

describe('POST /api/interview/[id]/reject-agent', () => {
  // Success case
  it('should transition back to review_prompt state on success')

  // Error cases
  it('should return 400 if not in test_conversation state')
  it('should return 404 if session not found')
})
```

## Test Helpers (from Phase 2 & 3)

**Reuse existing patterns:**

```typescript
// From interview-approval.spec.ts
const createTestSession = async (
  initialState: InterviewSession['currentState']
): Promise<InterviewSession> => {
  // Create agent file
  // Create session
  // Set state
  // Return session
}
```

## Mocking Strategy

**Mock the same dependencies:**

```typescript
// Logger
vi.mock('../../app/server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis()
  }),
  newCorrelationId: () => 'test-correlation-id'
}))

// Persistence
vi.mock('../../app/server/services/persistence/filesystem', () => ({
  saveInterview: vi.fn().mockResolvedValue(undefined),
  loadInterview: vi.fn().mockResolvedValue(null),
  saveAgent: vi.fn().mockResolvedValue(undefined),
  loadAgent: vi.fn().mockResolvedValue(null)
}))
```

## Validation Requirements

### All Tests Must

- ✅ Use proper TypeScript types (no `any`)
- ✅ Mock external dependencies (logger, persistence)
- ✅ Use h3 test helpers (createApp, createRouter, eventHandler)
- ✅ Follow existing test patterns from Phase 2 & 3
- ✅ Check response status codes
- ✅ Validate response body structure
- ✅ Verify state transitions in session
- ✅ Clean up test data (afterAll hook)

### Test Quality Checklist

- [ ] All 8 tests defined
- [ ] Success paths covered
- [ ] Error paths covered (400, 404)
- [ ] State validation logic tested
- [ ] Proper mocking (no real I/O)
- [ ] Fast execution (<100ms)
- [ ] TypeScript clean (no errors)
- [ ] Follows existing patterns

## Expected Test Run

```bash
npm test tests/api/interview-agent-approval.spec.ts
```

**Target Output:**

```text
✓ tests/api/interview-agent-approval.spec.ts (8 tests) <100ms
✓ POST /api/interview/[id]/approve-agent (4 tests)
✓ POST /api/interview/[id]/reject-agent (3 tests)

Test Files  1 passed (1)
     Tests  8 passed (8)
  Duration  <1s
```

## Notes

- Keep tests frozen during implementation (TDD)
- Tests define the contract/requirements
- Only modify tests if requirements change
- Follow Phase 2 & 3 patterns exactly
- Simple state transitions - no complex logic needed
