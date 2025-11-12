# Task 1.4: Filesystem Persistence Tests

## Test File Location

`tests/services/persistence/filesystem.spec.ts`

## Module Under Test

`app/server/services/persistence/filesystem.ts`

## Test Requirements

### Setup/Teardown

- Create a temporary test directory for each test (use `os.tmpdir()`)
- Clean up after each test (delete temp files/directories)
- Mock the logger to prevent console spam during tests

### Test Coverage Required

#### saveOrganization() tests

- ✅ Creates directory structure
- ✅ Writes manifest.json with correct data
- ✅ Handles dates correctly (converts to ISO strings)
- ✅ Overwrites existing file
- ✅ Throws on filesystem error (permissions, etc.)

#### loadOrganization() tests

- ✅ Reads existing manifest correctly
- ✅ Reconstructs Date objects from ISO strings
- ✅ Returns null for missing organization
- ✅ Handles corrupt JSON gracefully

#### listOrganizations() tests

- ✅ Returns empty array for empty directory
- ✅ Returns all organization IDs
- ✅ Ignores non-directory files (like .gitkeep)

#### saveTeam() / loadTeams() tests

- ✅ Saves team to correct subdirectory
- ✅ Loads all teams for an organization
- ✅ Returns empty array when no teams exist

#### saveAgent() / loadAgents() tests

- ✅ Saves agent with all fields
- ✅ Loads agents with Date reconstruction (createdAt, lastActiveAt)
- ✅ Handles multiple agents correctly

#### saveInterview() / loadInterview() / loadInterviews() tests

- ✅ Saves interview session completely
- ✅ Reconstructs transcript with dates
- ✅ Loads single interview by ID
- ✅ Loads all interviews for an organization
- ✅ Handles transcript entries with both string and object messages

## Test Data Examples

### Organization

```typescript
const testOrg: Organization = {
  id: 'test-org-1',
  name: 'Test Organization',
  githubRepoUrl: 'https://github.com/test/repo',
  tokenPool: 1000000,
  rootAgentId: null,
  createdAt: new Date('2025-01-01T10:00:00Z')
}
```

### Team

```typescript
const testTeam: Team = {
  id: 'team-1',
  name: 'HR Team',
  organizationId: 'test-org-1',
  leaderId: null,
  tokenAllocation: 100000,
  type: 'hr'
}
```

### Agent

```typescript
const testAgent: Agent = {
  id: 'agent-1',
  name: 'Marcus',
  role: 'HR Specialist',
  seniorId: null,
  teamId: 'team-1',
  organizationId: 'test-org-1',
  systemPrompt: 'You are Marcus, an HR specialist.',
  tokenAllocation: 50000,
  tokenUsed: 0,
  status: 'active',
  createdAt: new Date('2025-01-01T10:00:00Z'),
  lastActiveAt: new Date('2025-01-01T12:00:00Z')
}
```

### Interview Session

```typescript
const testSession: InterviewSession = {
  id: 'session-1',
  teamId: 'team-1',
  interviewerId: 'agent-1',
  candidateProfile: {
    name: 'Test Candidate',
    role: 'Developer',
    expertise: ['TypeScript', 'Node.js']
  },
  transcript: [
    {
      id: 'msg-1',
      speaker: 'interviewer',
      message: 'Hello, tell me about yourself.',
      timestamp: new Date('2025-01-01T12:00:00Z')
    },
    {
      id: 'msg-2',
      speaker: 'candidate',
      message: 'I am a developer with 5 years experience.',
      timestamp: new Date('2025-01-01T12:01:00Z')
    }
  ],
  currentState: 'follow_up',
  createdAt: new Date('2025-01-01T12:00:00Z'),
  updatedAt: new Date('2025-01-01T12:01:00Z')
}
```

## Critical Test Cases

### Date Handling

Test that:

- Dates are stored as ISO strings in JSON files
- Dates are reconstructed as Date objects when loaded
- `instanceof Date` returns true for loaded dates

### File System Edge Cases

- Missing directories (should create them)
- Missing files (should return null or empty array)
- Corrupt JSON (should handle gracefully)
- Multiple organizations in same directory

### Data Integrity

- All fields preserved during save/load cycle
- Arrays preserved correctly
- Nested objects (like candidateProfile) preserved
- Transcript with mixed message formats (string vs object)

## Test Structure

Use Vitest patterns:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'

describe('Filesystem Persistence', () => {
  let tempDir: string

  beforeEach(async () => {
    // Create temp directory
    tempDir = path.join(os.tmpdir(), `test-persistence-${Date.now()}`)
    await fs.mkdir(tempDir, { recursive: true })

    // Mock logger
    vi.mock('../../app/server/utils/logger', () => ({
      createLogger: () => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
      })
    }))
  })

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('saveOrganization', () => {
    it('creates directory and saves manifest.json', async () => {
      // test implementation
    })
  })

  // ... more test suites
})
```

## Validation

- All tests must pass (100%)
- No console.log spam (logger mocked)
- Temp directories cleaned up after tests
- Tests are deterministic (no race conditions)

## Reference Files

- `tests/api/organizations.spec.ts` - Test structure pattern
- `tests/services/orchestrator.spec.ts` - Service test pattern

## Output

Generate comprehensive test suite for `tests/services/persistence/filesystem.spec.ts` covering all requirements above.
