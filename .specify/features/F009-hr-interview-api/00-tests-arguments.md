# Test Specifications: HR Interview API Endpoints

**Target**: `tests/api/interview.spec.ts`
**Pattern**: Follow structure in `tests/api/organizations.spec.ts`
**Goal**: 103+ total tests (currently 97, adding ~6-8 integration tests)

## Test Framework

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
```

## Test Structure

### Mock Setup

```typescript
// Mock service layer
vi.mock('../../app/server/services/interview/workflow', () => ({
  startInterview: vi.fn(),
  processCandidateResponse: vi.fn(),
  cancelInterview: vi.fn()
}))

vi.mock('../../app/server/services/interview/session', () => ({
  getSession: vi.fn(),
  getSessionsByTeam: vi.fn()
}))
```

## Test Cases Required

### 1. POST /api/interview/start

**Success Cases**:

- Test should create new interview session when valid teamId and interviewerId provided
- Test should return 201 status with sessionId, greeting, and first question
- Test should generate unique sessionId for each interview
- Test should call startInterview service with correct parameters

**Error Cases**:

- Test should return 400 when teamId is missing
- Test should return 400 when interviewerId is missing
- Test should return 400 when request body is malformed
- Test should return 404 when interviewer agent does not exist
- Test should return 404 when team does not exist
- Test should return 500 when service layer throws unexpected error

**Request Schema**:

```typescript
{
  teamId: string // required
  interviewerId: string // required
}
```

**Success Response Schema (201)**:

```typescript
{
  sessionId: string
  greeting: string
  firstQuestion: string
  status: 'active'
  createdAt: Date
}
```

**Error Response Schema (4xx/5xx)**:

```typescript
{
  error: string
}
```

---

### 2. POST /api/interview/[id]/respond

**Success Cases**:

- Test should accept candidate response and return next question
- Test should return 200 with nextQuestion when interview continues
- Test should return 200 with complete:true and profile when interview finishes
- Test should call processCandidateResponse service with correct parameters
- Test should add response to session transcript

**Error Cases**:

- Test should return 400 when response text is missing
- Test should return 400 when response is empty string
- Test should return 404 when session ID does not exist
- Test should return 400 when session is not in 'active' status
- Test should return 500 when service layer throws unexpected error

**Request Schema**:

```typescript
{
  response: string // required, non-empty
}
```

**Success Response Schema (200 - continuing)**:

```typescript
{
  nextQuestion: string
  complete: false
  currentState: InterviewState
}
```

**Success Response Schema (200 - completed)**:

```typescript
{
  nextQuestion: null
  complete: true
  profile: CandidateProfile
  systemPrompt: string
  suggestedName: string
}
```

**Error Response Schema (4xx/5xx)**:

```typescript
{
  error: string
}
```

---

### 3. GET /api/interview/[id]

**Success Cases**:

- Test should return full session when valid session ID provided
- Test should return 200 with complete InterviewSession object
- Test should include transcript array with all messages
- Test should include candidateProfile when available
- Test should call getSession service with correct session ID

**Error Cases**:

- Test should return 404 when session ID does not exist
- Test should return 400 when session ID is malformed (not UUID format)
- Test should return 500 when service layer throws unexpected error

**Success Response Schema (200)**:

```typescript
{
  id: string
  candidateId: string
  teamId: string
  interviewerId: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  currentState: InterviewState
  transcript: InterviewMessage[]
  candidateProfile: CandidateProfile
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  cancelledAt?: Date
  cancelReason?: string
}
```

**Error Response Schema (4xx/5xx)**:

```typescript
{
  error: string
}
```

---

### 4. POST /api/interview/[id]/cancel

**Success Cases**:

- Test should cancel interview successfully with reason
- Test should cancel interview successfully without reason (optional)
- Test should return 200 with success message
- Test should call cancelInterview service with correct parameters
- Test should mark session status as 'cancelled'

**Error Cases**:

- Test should return 404 when session ID does not exist
- Test should return 400 when session is already completed
- Test should return 400 when session is already cancelled
- Test should return 500 when service layer throws unexpected error

**Request Schema**:

```typescript
{
  reason?: string  // optional
}
```

**Success Response Schema (200)**:

```typescript
{
  success: true
  message: string
  sessionId: string
}
```

**Error Response Schema (4xx/5xx)**:

```typescript
{
  error: string
}
```

---

### 5. GET /api/interviews

**Success Cases**:

- Test should return array of sessions for valid team ID
- Test should return 200 with InterviewSession[] array
- Test should filter sessions by teamId query parameter
- Test should return empty array when no sessions exist for team
- Test should call getSessionsByTeam service with correct team ID

**Error Cases**:

- Test should return 400 when teamId query parameter is missing
- Test should return 404 when team does not exist
- Test should return 500 when service layer throws unexpected error

**Query Parameters**:

```typescript
teamId: string // required
```

**Success Response Schema (200)**:

```typescript
InterviewSession[]  // array of sessions
```

**Error Response Schema (4xx/5xx)**:

```typescript
{
  error: string
}
```

---

## Integration Test (End-to-End)

**Critical Path Test**:

- Test should complete full interview workflow from start to finish:
  1. POST /api/interview/start → get sessionId
  2. POST /api/interview/[id]/respond (role) → get next question
  3. POST /api/interview/[id]/respond (expertise) → get next question
  4. POST /api/interview/[id]/respond (preferences) → get completion
  5. GET /api/interview/[id] → verify complete session with profile
  6. GET /api/interviews?teamId=X → verify session in list

**Cancellation Path Test**:

- Test should cancel interview mid-workflow:
  1. POST /api/interview/start → get sessionId
  2. POST /api/interview/[id]/respond (role) → get next question
  3. POST /api/interview/[id]/cancel → verify cancellation
  4. GET /api/interview/[id] → verify status is 'cancelled'
  5. POST /api/interview/[id]/respond → should return 400 (inactive)

---

## Mock Data Examples

### Mock Session

```typescript
const mockSession: InterviewSession = {
  id: 'session-123',
  candidateId: 'candidate-456',
  teamId: 'team-789',
  interviewerId: 'agent-101',
  status: 'active',
  currentState: 'ask_role',
  transcript: [
    {
      id: 'msg-1',
      speaker: 'interviewer',
      message: 'Hello! Welcome to the interview.',
      timestamp: new Date(),
      metadata: { state: 'greet' }
    }
  ],
  candidateProfile: {
    expertise: [],
    preferences: {
      communicationStyle: 'collaborative',
      workingHours: 'flexible',
      autonomyLevel: 'medium'
    },
    personality: {
      traits: ['analytical'],
      tone: 'professional'
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
}
```

### Mock Completed Session

```typescript
const mockCompletedSession: InterviewSession = {
  ...mockSession,
  status: 'completed',
  currentState: 'complete',
  candidateProfile: {
    role: 'Senior Backend Engineer',
    expertise: ['TypeScript', 'Node.js', 'PostgreSQL'],
    preferences: {
      communicationStyle: 'direct and concise',
      workingHours: 'standard business hours',
      autonomyLevel: 'high'
    },
    personality: {
      traits: ['analytical', 'detail-oriented', 'pragmatic'],
      tone: 'professional with dry humor'
    },
    systemPrompt: 'You are a Senior Backend Engineer...',
    suggestedName: 'Backend-Bruce-42'
  },
  completedAt: new Date()
}
```

---

## Validation Requirements

### All Endpoints

- Verify correct HTTP status codes (200, 201, 400, 404, 500)
- Verify error responses include descriptive messages
- Verify logging calls happen with correct context
- Verify service layer functions called with correct parameters

### Request Validation

- Verify required fields are validated
- Verify empty/null values rejected appropriately
- Verify malformed JSON returns 400
- Verify UUIDs validated where required

### Response Schema

- Verify all response fields match TypeScript types
- Verify dates are properly serialized
- Verify arrays are properly structured
- Verify null/undefined handled correctly

---

## Test Execution

```bash
# Run all tests
npm test

# Run only interview API tests
npm test -- tests/api/interview.spec.ts

# Run with coverage
npm test -- --coverage
```

---

## Success Criteria

- ✅ All test cases passing (0 failures)
- ✅ Test coverage for all 5 endpoints
- ✅ Integration test covering full workflow
- ✅ Error cases verified (400, 404, 500)
- ✅ Mock setup follows existing patterns
- ✅ Type safety enforced in all tests
- ✅ Total tests: 97 → 103+ (target 106-108)
