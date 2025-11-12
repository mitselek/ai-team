# F013 Phase 6: Name Suggestions - Test Requirements

## Overview

Test specification for the name suggestions endpoint that retrieves suggested agent names from the draft.

**Endpoint:** `GET /api/interview/[id]/name-suggestions`

**Purpose:** Retrieve the list of suggested names for the agent from the draft

## Test Structure

Use h3 test helpers pattern from previous phases:

- `createApp()` + `createRouter()` + `eventHandler()`
- Mock logger (silent functions)
- Mock persistence layer (no filesystem I/O)
- Test helper: `createTestSession(initialState)`

## Test Cases

### Success Cases

#### Test 1: Get name suggestions successfully

**Given:**

- Session exists in `assign_details` state
- Agent draft has `suggestedNames: ['Alex', 'Jordan', 'Casey']`

**When:**

- GET `/api/interview/[id]/name-suggestions`

**Then:**

- Status: 200
- Response: `{ names: ['Alex', 'Jordan', 'Casey'] }`

**Assertions:**

```typescript
expect(response.statusCode).toBe(200)
expect(body.names).toEqual(['Alex', 'Jordan', 'Casey'])
expect(body.names).toHaveLength(3)
```

### Error Cases

#### Test 2: Should throw 404 if session not found

**Given:**

- No session exists with given ID

**When:**

- GET `/api/interview/non-existent-id/name-suggestions`

**Then:**

- Status: 404
- Error message: "Interview session non-existent-id not found"

#### Test 3: Should throw 400 if interviewId is missing

**Given:**

- Request without ID parameter

**When:**

- GET `/api/interview//name-suggestions` (empty ID)

**Then:**

- Status: 400
- Error message: "interviewId is required"

#### Test 4: Should throw 400 if not in assign_details state

**Given:**

- Session in `test_conversation` state (wrong state)

**When:**

- GET `/api/interview/[id]/name-suggestions`

**Then:**

- Status: 400
- Error message: "Cannot get name suggestions in state 'test_conversation'"

#### Test 5: Should throw 400 if agent draft not found

**Given:**

- Session in `assign_details` state
- No `agentDraft` exists

**When:**

- GET `/api/interview/[id]/name-suggestions`

**Then:**

- Status: 400
- Error message: "Agent draft not found"

#### Test 6: Should return empty array if no suggested names

**Given:**

- Session in `assign_details` state
- Agent draft exists but `suggestedNames` is empty array

**When:**

- GET `/api/interview/[id]/name-suggestions`

**Then:**

- Status: 200
- Response: `{ names: [] }`

## Test Helper

```typescript
const createTestSession = (
  id: string,
  currentState: InterviewSession['currentState'],
  options?: { withDraft?: boolean; names?: string[] }
): InterviewSession => {
  const session: InterviewSession = {
    id,
    candidateId: 'test-candidate',
    teamId: 'test-team',
    interviewerId: 'test-interviewer',
    status: 'active',
    currentState,
    candidateProfile: {
      role: 'Software Engineer',
      expertise: ['TypeScript', 'Nuxt'],
      preferences: {
        communicationStyle: 'Direct',
        workingHours: 'Flexible',
        autonomyLevel: 'High'
      },
      personality: {
        traits: ['analytical', 'detail-oriented'],
        tone: 'professional'
      }
    },
    transcript: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    testConversationHistory: [],
    exchangesInCurrentState: 0
  }

  if (options?.withDraft) {
    session.agentDraft = {
      profile: session.candidateProfile,
      draftPrompt: 'You are a helpful TypeScript developer.',
      suggestedNames: options.names || ['Alex', 'Jordan', 'Casey']
    }
  }

  return session
}
```

## Mocking Strategy

### Logger Mock

```typescript
vi.mock('../../server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  })
}))
```

### Services Mock

```typescript
vi.mock('../../app/server/services/interview/session', () => ({
  getSession: vi.fn()
}))
```

## Validation Checklist

Before marking complete:

- [ ] All 6 tests implemented
- [ ] All tests passing
- [ ] Mocking strategy prevents filesystem I/O
- [ ] TypeScript compiles without errors
- [ ] Follows h3 test patterns from Phases 2-5
- [ ] Test helper creates realistic session data
- [ ] Error messages match specification
