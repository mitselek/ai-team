# Task 1.4 RETRY: Filesystem Persistence Tests

## Status: RETRY - Previous attempt failed to locate implementation file

## Implementation File Location (CONFIRMED)

**File exists at**: `app/server/services/persistence/filesystem.ts`
**Types file exists at**: `app/server/services/persistence/types.ts`

These files EXIST in the workspace. If you cannot find them, use `read_file` with the absolute path:

- `/home/michelek/Documents/github/ai-team/app/server/services/persistence/filesystem.ts`
- `/home/michelek/Documents/github/ai-team/app/server/services/persistence/types.ts`

## Your Task

Create a comprehensive test suite at: `tests/services/persistence/filesystem.spec.ts`

## Step 1: Read the Implementation Files

FIRST, read both files to understand what you're testing:

```bash
# Read the implementation
read_file app/server/services/persistence/filesystem.ts

# Read the types
read_file app/server/services/persistence/types.ts

# Read the main types
read_file types/index.ts
```

## Step 2: Understand Test Patterns

Read existing test files to understand the project's testing patterns:

```bash
read_file tests/api/organizations.spec.ts
read_file tests/services/orchestrator.spec.ts
```

## Step 3: Create the Test Suite

### Test File Location

`tests/services/persistence/filesystem.spec.ts`

### Required Test Coverage

#### Setup/Teardown

- Use `os.tmpdir()` to create temporary test directory
- Clean up after EACH test
- Override the DATA_DIR constant to use temp directory
- Mock logger to prevent console spam

#### Tests for saveOrganization()

- ✅ Creates directory structure (`data/organizations/{id}/`)
- ✅ Writes `manifest.json` with correct data
- ✅ Converts Date to ISO string in JSON
- ✅ Uses pretty formatting (`JSON.stringify(obj, null, 2)`)
- ✅ Overwrites existing file correctly
- ✅ Handles filesystem errors (re-throws after logging)

#### Tests for loadOrganization()

- ✅ Reads existing manifest correctly
- ✅ Reconstructs Date objects from ISO strings
- ✅ Returns null for missing organization (ENOENT)
- ✅ Throws for other errors (corrupt JSON, permissions)
- ✅ Validates Date is instanceof Date

#### Tests for listOrganizations()

- ✅ Returns empty array for non-existent directory
- ✅ Returns empty array for empty directory
- ✅ Returns all organization IDs (directory names)
- ✅ Filters out files (only returns directories)
- ✅ Ignores `.gitkeep` and other non-directory entries

#### Tests for saveTeam() / loadTeams()

- ✅ Saves team to correct path: `{orgId}/teams/{teamId}.json`
- ✅ Creates teams subdirectory if missing
- ✅ Loads all teams for an organization
- ✅ Returns empty array when teams directory missing
- ✅ Returns empty array when teams directory empty
- ✅ Handles multiple teams correctly

#### Tests for saveAgent() / loadAgents()

- ✅ Saves agent to correct path: `{orgId}/agents/{agentId}.json`
- ✅ Converts both createdAt and lastActiveAt to ISO strings
- ✅ Loads agents with Date reconstruction
- ✅ Returns empty array when agents directory missing
- ✅ Handles multiple agents correctly

#### Tests for saveInterview() / loadInterview() / loadInterviews()

- ✅ Saves interview to correct path: `{orgId}/interviews/{sessionId}.json`
- ✅ Converts all dates in transcript entries
- ✅ Determines orgId from interviewer's agent file
- ✅ Throws error if interviewer agent not found
- ✅ loadInterview() searches across all orgs
- ✅ loadInterview() returns null if session not found
- ✅ loadInterviews() loads all interviews for org
- ✅ Reconstructs transcript with Date objects
- ✅ Returns empty array when interviews directory missing

### Critical Implementation Details

#### Mocking the DATA_DIR Constant

The implementation uses:

```typescript
const DATA_DIR = path.resolve(process.cwd(), 'data/organizations')
```

You need to mock this for tests. Use one of these approaches:

**Option A: Module mock (before imports)**

```typescript
import { vi, beforeEach } from 'vitest'
import * as path from 'path'
import * as os from 'os'

let tempDir: string

vi.mock('path', async () => {
  const actual = await vi.importActual('path')
  return {
    ...actual,
    resolve: vi.fn((base: string, rel: string) => {
      if (rel === 'data/organizations') {
        return tempDir
      }
      return actual.resolve(base, rel)
    })
  }
})
```

**Option B: Environment variable approach**

```typescript
// If filesystem.ts can be modified to use:
// const DATA_DIR = process.env.TEST_DATA_DIR || path.resolve(process.cwd(), 'data/organizations')

beforeEach(() => {
  tempDir = path.join(os.tmpdir(), `test-persistence-${Date.now()}`)
  process.env.TEST_DATA_DIR = tempDir
})
```

**Option C: Direct filesystem setup**

```typescript
// Create the actual data/organizations structure in temp
beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `test-persistence-${Date.now()}`)
  await fs.mkdir(path.join(tempDir, 'data/organizations'), { recursive: true })

  // Then temporarily change working directory
  const originalCwd = process.cwd()
  process.chdir(tempDir)

  afterEach(() => {
    process.chdir(originalCwd)
  })
})
```

Choose the approach that works best with Vitest.

#### Logger Mocking

```typescript
vi.mock('../../app/server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  })
}))
```

#### Test Data Fixtures

```typescript
import type { Organization, Team, Agent } from '@@/types'
import type { InterviewSession } from '../../../app/server/services/persistence/types'

const createTestOrg = (): Organization => ({
  id: 'test-org-1',
  name: 'Test Organization',
  githubRepoUrl: 'https://github.com/test/org',
  tokenPool: 10000000,
  rootAgentId: null,
  createdAt: new Date('2025-01-01T10:00:00.000Z')
})

const createTestTeam = (orgId: string): Team => ({
  id: 'team-1',
  name: 'HR Team',
  organizationId: orgId,
  leaderId: null,
  tokenAllocation: 1000000,
  type: 'hr'
})

const createTestAgent = (orgId: string, teamId: string): Agent => ({
  id: 'agent-1',
  name: 'Marcus',
  role: 'HR Specialist',
  seniorId: null,
  teamId,
  organizationId: orgId,
  systemPrompt: 'You are Marcus.',
  tokenAllocation: 500000,
  tokenUsed: 0,
  status: 'active',
  createdAt: new Date('2025-01-01T10:00:00.000Z'),
  lastActiveAt: new Date('2025-01-01T12:00:00.000Z')
})

const createTestInterview = (teamId: string, interviewerId: string): InterviewSession => ({
  id: 'session-1',
  candidateId: 'candidate-1',
  teamId,
  interviewerId,
  status: 'active',
  currentState: 'ask_role',
  transcript: [
    {
      id: 'msg-1',
      speaker: 'interviewer',
      message: 'Hello!',
      timestamp: new Date('2025-01-01T12:00:00.000Z')
    },
    {
      id: 'msg-2',
      speaker: 'candidate',
      message: 'Hi there!',
      timestamp: new Date('2025-01-01T12:01:00.000Z')
    }
  ],
  candidateProfile: {
    role: '',
    expertise: [],
    preferences: {
      communicationStyle: '',
      workingHours: '',
      autonomyLevel: ''
    },
    personality: {
      traits: [],
      tone: ''
    }
  },
  createdAt: new Date('2025-01-01T12:00:00.000Z'),
  updatedAt: new Date('2025-01-01T12:01:00.000Z')
})
```

### Example Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import {
  saveOrganization,
  loadOrganization,
  listOrganizations,
  saveTeam,
  loadTeams,
  saveAgent,
  loadAgents,
  saveInterview,
  loadInterview,
  loadInterviews
} from '../../../app/server/services/persistence/filesystem'

// Mock logger
vi.mock('../../../app/server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  })
}))

describe('Filesystem Persistence', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(async () => {
    // Setup temp directory
    tempDir = path.join(
      os.tmpdir(),
      `test-persistence-${Date.now()}-${Math.random().toString(36).slice(2)}`
    )
    await fs.mkdir(tempDir, { recursive: true })

    // Change to temp directory so DATA_DIR resolves correctly
    originalCwd = process.cwd()
    process.chdir(tempDir)

    // Create data/organizations structure
    await fs.mkdir(path.join(tempDir, 'data/organizations'), { recursive: true })
  })

  afterEach(async () => {
    // Restore working directory
    process.chdir(originalCwd)

    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {
      // Ignore errors during cleanup
    })
  })

  describe('saveOrganization', () => {
    it('should create directory and save manifest.json', async () => {
      const org = createTestOrg()

      await saveOrganization(org)

      const manifestPath = path.join(tempDir, 'data/organizations', org.id, 'manifest.json')
      const content = await fs.readFile(manifestPath, 'utf-8')
      const data = JSON.parse(content)

      expect(data.id).toBe(org.id)
      expect(data.name).toBe(org.name)
      expect(data.createdAt).toBe('2025-01-01T10:00:00.000Z')
      expect(typeof data.createdAt).toBe('string')
    })

    // Add more tests...
  })

  describe('loadOrganization', () => {
    it('should load and reconstruct Date objects', async () => {
      const org = createTestOrg()
      await saveOrganization(org)

      const loaded = await loadOrganization(org.id)

      expect(loaded).not.toBeNull()
      expect(loaded?.id).toBe(org.id)
      expect(loaded?.createdAt).toBeInstanceOf(Date)
      expect(loaded?.createdAt.toISOString()).toBe('2025-01-01T10:00:00.000Z')
    })

    it('should return null for non-existent organization', async () => {
      const loaded = await loadOrganization('non-existent')
      expect(loaded).toBeNull()
    })

    // Add more tests...
  })

  // Add more describe blocks for other functions...
})
```

## Validation Checklist

After creating the tests, verify:

- [ ] All tests pass: `npm test tests/services/persistence/filesystem.spec.ts`
- [ ] No console spam (logger properly mocked)
- [ ] Temp directories properly cleaned up
- [ ] Test coverage includes all functions
- [ ] Date handling tested (ISO strings <-> Date objects)
- [ ] Error cases tested (missing files, corrupt JSON)
- [ ] Edge cases tested (empty directories, multiple entities)

## Critical: Handle the DATA_DIR Issue

The main challenge is that `DATA_DIR` is a module-level constant. Choose the best approach for your implementation:

1. **Recommended**: Change working directory in tests (simplest)
2. **Alternative**: Mock the path.resolve function
3. **If needed**: Modify filesystem.ts to support TEST_DATA_DIR env var

## Expected Output

Create `tests/services/persistence/filesystem.spec.ts` with:

- ~20-30 test cases covering all functions
- Proper setup/teardown with temp directories
- Mocked logger
- Test fixtures for all entity types
- Date serialization validation
- Error handling validation

## Reference Files to Read

1. `app/server/services/persistence/filesystem.ts` - Implementation to test
2. `app/server/services/persistence/types.ts` - Type definitions
3. `types/index.ts` - Core types
4. `tests/api/organizations.spec.ts` - Test patterns
5. `tests/services/orchestrator.spec.ts` - Service test patterns

## Start Here

```typescript
// Step 1: Read the implementation
read_file('app/server/services/persistence/filesystem.ts')

// Step 2: Read the types
read_file('app/server/services/persistence/types.ts')

// Step 3: Create the test file
create_file('tests/services/persistence/filesystem.spec.ts', '...')
```

## Success Criteria

- ✅ Test file created
- ✅ All tests pass
- ✅ No console spam
- ✅ Covers all 10 functions
- ✅ Tests date serialization
- ✅ Tests error handling
- ✅ Temp directories cleaned up
