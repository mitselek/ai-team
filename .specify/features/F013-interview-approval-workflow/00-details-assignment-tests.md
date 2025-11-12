# F013 Phase 5: Details Assignment - Test Requirements

## Overview

Test specification for the agent details assignment endpoint that finalizes agent creation.

**Endpoint:** `POST /api/interview/[id]/set-details`

**Purpose:** Set agent name and gender, create the final agent, transition to complete state

## Test Structure

Use h3 test helpers pattern from previous phases:

- `createApp()` + `createRouter()` + `eventHandler()`
- Mock logger (silent functions)
- Mock persistence layer (no filesystem I/O)
- Test helper: `createTestSession(initialState)`

## Test Cases

### Success Cases

#### Test 1: Set details and create agent successfully

**Given:**

- Session exists in `assign_details` state
- Valid name and gender provided
- Agent draft exists with profile and prompt

**When:**

- POST `/api/interview/[id]/set-details` with `{ name: "Alex", gender: "non-binary" }`

**Then:**

- Status: 200
- Response: `{ success: true, agentId: string }`
- Session state: `complete`
- Agent created with correct properties
- `agentDraft.finalName` set to "Alex"
- `agentDraft.gender` set to "non-binary"

**Assertions:**

```typescript
expect(response.statusCode).toBe(200)
expect(body.success).toBe(true)
expect(body.agentId).toMatch(/^[a-f0-9-]{36}$/) // UUID format
expect(updatedSession.currentState).toBe('complete')
expect(updatedSession.agentDraft?.finalName).toBe('Alex')
expect(updatedSession.agentDraft?.gender).toBe('non-binary')
```

### Error Cases

#### Test 2: Should throw 400 if not in assign_details state

**Given:**

- Session in `test_conversation` state (wrong state)

**When:**

- POST `/api/interview/[id]/set-details` with valid body

**Then:**

- Status: 400
- Error message: "Cannot set details in state 'test_conversation'"

#### Test 3: Should throw 404 if session not found

**Given:**

- No session exists with given ID

**When:**

- POST `/api/interview/non-existent-id/set-details`

**Then:**

- Status: 404
- Error message: "Interview session non-existent-id not found"

#### Test 4: Should throw 400 if interviewId is missing

**Given:**

- Request without ID parameter

**When:**

- POST `/api/interview//set-details` (empty ID)

**Then:**

- Status: 400
- Error message: "interviewId is required"

#### Test 5: Should throw 400 if name is missing

**Given:**

- Session in correct state
- Request body without `name` field

**When:**

- POST `/api/interview/[id]/set-details` with `{ gender: "female" }`

**Then:**

- Status: 400
- Error message: "name is required"

#### Test 6: Should throw 400 if gender is missing

**Given:**

- Session in correct state
- Request body without `gender` field

**When:**

- POST `/api/interview/[id]/set-details` with `{ name: "Alex" }`

**Then:**

- Status: 400
- Error message: "gender is required"

#### Test 7: Should throw 400 if gender is invalid

**Given:**

- Session in correct state
- Invalid gender value

**When:**

- POST `/api/interview/[id]/set-details` with `{ name: "Alex", gender: "invalid" }`

**Then:**

- Status: 400
- Error message: "gender must be one of: male, female, non-binary, other"

#### Test 8: Should throw 500 if setAgentDetails fails

**Given:**

- Session in correct state
- `setAgentDetails()` throws internal error

**When:**

- POST `/api/interview/[id]/set-details` with valid body

**Then:**

- Status: 500
- Error caught and logged

## Test Helper

```typescript
const createTestSession = (
  id: string,
  currentState: InterviewSession['currentState']
): InterviewSession => {
  return {
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
    agentDraft: {
      profile: {
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
      draftPrompt: 'You are a helpful TypeScript developer.',
      suggestedNames: ['Alex', 'Jordan', 'Casey']
    },
    testConversationHistory: [],
    exchangesInCurrentState: 0
  }
}
```

## Mocking Strategy

### Logger Mock

```typescript
vi.mock('~/server/utils/logger', () => ({
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
vi.mock('~/server/services/interview/session', () => ({
  getSession: vi.fn()
}))

vi.mock('~/server/services/interview/workflow', () => ({
  setAgentDetails: vi.fn()
}))
```

## Validation Checklist

Before marking complete:

- [ ] All 8 tests implemented
- [ ] All tests passing
- [ ] Mocking strategy prevents filesystem I/O
- [ ] TypeScript compiles without errors
- [ ] Follows h3 test patterns from Phases 2-4
- [ ] Test helper creates realistic session data
- [ ] Error messages match specification
