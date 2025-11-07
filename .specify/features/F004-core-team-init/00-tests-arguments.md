# F004 Test Arguments: Core Team Initialization

## Overview

Generate comprehensive tests for the `initializeDefaultTeams` utility function that creates the 6 core teams required for every organization in the AI Team Management System.

## Target Test File

- **File**: `tests/utils/initializeOrganization.spec.ts`
- **Function Under Test**: `initializeDefaultTeams(organizationId: string): Team[]`
- **Source File**: `server/utils/initializeOrganization.ts`

## Type Reference

```typescript
// From types/index.ts - DO NOT MODIFY
export interface Team {
  id: string
  name: string
  organizationId: string
  leaderId: string | null
  tokenAllocation: number
  type: TeamType
}

export type TeamType =
  | 'hr'
  | 'toolsmith'
  | 'library'
  | 'vault'
  | 'tools-library'
  | 'nurse'
  | 'custom'
```

## Required Test Coverage

### 1. Basic Functionality Tests (3 tests)

**Test 1.1**: "should create exactly 6 core teams"

- Call `initializeDefaultTeams(organizationId)`
- Verify returned array has length 6
- Verify all teams added to teams data array

**Test 1.2**: "should link all teams to the provided organization"

- Call `initializeDefaultTeams(organizationId)`
- Verify every team has `team.organizationId === organizationId`

**Test 1.3**: "should set leaderId to null for all teams"

- Call `initializeDefaultTeams(organizationId)`
- Verify every team has `team.leaderId === null`

### 2. Team Type Coverage Tests (6 tests)

**Test 2.1**: "should create HR team with type 'hr'"

- Verify team exists with `type: 'hr'`
- Verify name is "Human Resources"

**Test 2.2**: "should create Toolsmith team with type 'toolsmith'"

- Verify team exists with `type: 'toolsmith'`
- Verify name is "Toolsmiths"

**Test 2.3**: "should create Library team with type 'library'"

- Verify team exists with `type: 'library'`
- Verify name is "Knowledge Library"

**Test 2.4**: "should create Vault team with type 'vault'"

- Verify team exists with `type: 'vault'`
- Verify name is "Vault"

**Test 2.5**: "should create Tools Library team with type 'tools-library'"

- Verify team exists with `type: 'tools-library'`
- Verify name is "Tools Library"

**Test 2.6**: "should create Nurse team with type 'nurse'"

- Verify team exists with `type: 'nurse'`
- Verify name is "The Nurse"

### 3. Token Allocation Tests (1 test)

**Test 3.1**: "should set appropriate token allocations for each team"

- Verify HR team: 50,000 tokens
- Verify Toolsmith team: 100,000 tokens
- Verify Library team: 75,000 tokens
- Verify Vault team: 25,000 tokens
- Verify Tools Library team: 50,000 tokens
- Verify Nurse team: 50,000 tokens

### 4. Field Completeness Tests (1 test)

**Test 4.1**: "should populate all required Team fields"

- For each team, verify presence of:
  - `id` (string, non-empty)
  - `name` (string, non-empty)
  - `organizationId` (string, matches input)
  - `leaderId` (null)
  - `tokenAllocation` (number, positive)
  - `type` (TeamType enum)

### 5. Idempotency Tests (2 tests)

**Test 5.1**: "should be idempotent when called multiple times"

- Call `initializeDefaultTeams(orgId)` twice
- Second call should not duplicate teams
- Should still have exactly 6 teams for that organization

**Test 5.2**: "should handle multiple organizations independently"

- Call `initializeDefaultTeams(orgId1)`
- Call `initializeDefaultTeams(orgId2)`
- Verify 12 total teams (6 per org)
- Verify orgId1 teams have orgId1, orgId2 teams have orgId2

## Test Structure Requirements

### Setup

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Team } from '../../types'
import { initializeDefaultTeams } from '../../server/utils/initializeOrganization'
import { teams } from '../../server/data/teams'

// Mock logger
vi.mock('../../app/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

describe('initializeDefaultTeams', () => {
  beforeEach(() => {
    // Clear teams array before each test
    teams.length = 0
  })

  // Tests here
})
```

### Test Pattern

Each test should:

1. Arrange: Clear state, prepare test data
2. Act: Call `initializeDefaultTeams(organizationId)`
3. Assert: Verify expected outcomes
4. Use explicit organizationId (uuid format: 'org-test-uuid')

## Expected Total

- **Test Count**: ~13 tests
- **Coverage Areas**: Basic functionality (3), Team types (6), Token allocation (1), Field completeness (1), Idempotency (2)
- **Lines**: ~200-250 lines total

## Critical Constraints

⚠️ **DO NOT MODIFY** `types/index.ts` - Use existing Team and TeamType definitions only

⚠️ **Import Syntax**: Use relative imports and type-only imports for TypeScript types:

```typescript
import type { Team, TeamType } from '../../types'
import { initializeDefaultTeams } from '../../server/utils/initializeOrganization'
```

⚠️ **Data Store**: Import and manipulate `teams` array from `server/data/teams.ts`:

```typescript
import { teams } from '../../server/data/teams'
```

⚠️ **Logger Mocking**: Always mock logger in tests:

```typescript
vi.mock('../../app/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }
}))
```

⚠️ **State Cleanup**: Use `beforeEach(() => { teams.length = 0 })` to ensure clean state

⚠️ **Test Execution**: Tests should run non-interactively with `vitest run`

## Success Criteria

- ✅ All 13 tests pass
- ✅ `npm run typecheck` passes
- ✅ `npm run lint` passes
- ✅ Tests verify all 6 Team fields for all 6 teams
- ✅ Tests verify correct TeamType for each team
- ✅ Tests verify idempotency behavior
- ✅ Tests verify token allocations
- ✅ No type errors in test file
