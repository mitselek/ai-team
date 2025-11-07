# F002 Team System - Test Requirements

## Files to Test

### 1. GET API Endpoint (`server/api/teams/index.get.ts`)

**Test Coverage:**

- Returns empty array when no teams exist
- Returns all teams when no filters applied
- Filters by organizationId correctly
- Filters by type correctly
- Combines organizationId + type filters

**Test Data:**

```typescript
const testTeam1: Team = {
  id: 'team-1',
  name: 'Toolsmiths',
  organizationId: 'org-1',
  leaderId: 'agent-1',
  tokenAllocation: 100000,
  type: 'toolsmith'
}

const testTeam2: Team = {
  id: 'team-2',
  name: 'HR Team',
  organizationId: 'org-1',
  leaderId: null,
  tokenAllocation: 50000,
  type: 'hr'
}

const testTeam3: Team = {
  id: 'team-3',
  name: 'Library Team',
  organizationId: 'org-2',
  leaderId: 'agent-2',
  tokenAllocation: 75000,
  type: 'library'
}
```

### 2. POST API Endpoint (`server/api/teams/index.post.ts`)

**Test Coverage:**

- Creates team with all required fields
- Returns 400 when name missing
- Returns 400 when organizationId missing
- Returns 400 when type missing
- Applies default: leaderId=null
- Applies default: tokenAllocation=0
- Auto-generates id (uuid format)
- Returns 201 status on success
- Created team has ALL 6 fields

**Validation Tests:**

```typescript
// Missing required fields
requiredFields = ['name', 'organizationId', 'type']

// Valid payload
{
  name: 'Test Team',
  organizationId: 'org-1',
  type: 'custom'
}

// Expected defaults
leaderId: null
tokenAllocation: 0
```

## Type Definition (Reference)

```typescript
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

## Test File Location

`tests/api/teams.spec.ts`

## Expected Test Count

~14 tests total:

- 5 GET endpoint tests
- 9 POST endpoint tests
