# Task: Implement Core Team Initialization Utility

## Context

You are implementing a utility function for an AI Team Management System built with Nuxt 3 and TypeScript. This function creates the 6 core teams required for every organization to support the agent orchestration workflow.

## Objective

Create `server/utils/initializeOrganization.ts` with a function that initializes the 6 core teams with proper configuration.

## Type Reference

```typescript
// From types/index.ts - DO NOT MODIFY TYPES
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

## Implementation Requirements

### File: `server/utils/initializeOrganization.ts`

```typescript
// Required imports
import type { Team, TeamType } from '../../types'
import { teams } from '../data/teams'
import { logger } from '../../app/utils/logger'

/**
 * Initialize the 6 core teams for an organization.
 * Creates: HR, Toolsmith, Library, Vault, Tools Library, and Nurse teams.
 *
 * This function is idempotent - calling it multiple times for the same
 * organization will not create duplicate teams.
 *
 * @param organizationId - The ID of the organization to initialize teams for
 * @returns Array of created Team objects
 */
export function initializeDefaultTeams(organizationId: string): Team[] {
  // Implementation here
}
```

### Core Team Definitions

Create these 6 teams in order:

1. **HR Team**
   - `name`: "Human Resources"
   - `type`: 'hr'
   - `tokenAllocation`: 50000
   - `leaderId`: null
   - Purpose: Conducts agent enrollment interviews

2. **Toolsmith Team**
   - `name`: "Toolsmiths"
   - `type`: 'toolsmith'
   - `tokenAllocation`: 100000
   - `leaderId`: null
   - Purpose: Creates and maintains internal tools

3. **Library Team**
   - `name`: "Knowledge Library"
   - `type`: 'library'
   - `tokenAllocation`: 75000
   - `leaderId`: null
   - Purpose: Manages organizational knowledge base

4. **Vault Team**
   - `name`: "Vault"
   - `type`: 'vault'
   - `tokenAllocation`: 25000
   - `leaderId`: null
   - Purpose: Central secret and credential management

5. **Tools Library Team**
   - `name`: "Tools Library"
   - `type`: 'tools-library'
   - `tokenAllocation`: 50000
   - `leaderId`: null
   - Purpose: Governs tool approval and availability

6. **Nurse Team**
   - `name`: "The Nurse"
   - `type`: 'nurse'
   - `tokenAllocation`: 50000
   - `leaderId`: null
   - Purpose: Memory/state specialist for cognitive load management

### Implementation Logic

1. **Idempotency Check**
   - Before creating teams, check if teams for this organization already exist
   - If any team with matching `organizationId` and expected `type` exists, skip creation
   - Return existing teams if already initialized

2. **Team Creation**
   - For each core team:
     - Generate unique `id` using `crypto.randomUUID()`
     - Set `name` per specification
     - Set `organizationId` to provided parameter
     - Set `leaderId` to `null` (assigned later during enrollment)
     - Set `tokenAllocation` per specification
     - Set `type` to appropriate TeamType
   - Add each team to the `teams` data array

3. **Logging**
   - Log at INFO level when starting initialization
   - Log at DEBUG level for each team created
   - Log at INFO level when initialization complete
   - Example: `logger.info('Initializing core teams', { organizationId })`

4. **Return Value**
   - Return array of all 6 created Team objects
   - Order: HR, Toolsmith, Library, Vault, Tools Library, Nurse

## Critical Constraints

⚠️ **DO NOT MODIFY** `types/index.ts` - Reference types only, never change them

⚠️ **Import Pattern**: Use relative imports:

```typescript
import type { Team, TeamType } from '../../types'
import { teams } from '../data/teams'
import { logger } from '../../app/utils/logger'
```

⚠️ **UUID Generation**: Use `crypto.randomUUID()` for IDs (built-in Node.js)

⚠️ **Data Store**: Mutate the imported `teams` array to persist teams:

```typescript
teams.push(newTeam)
```

⚠️ **All Team Fields**: Every created team MUST have all 6 fields:

- `id`, `name`, `organizationId`, `leaderId`, `tokenAllocation`, `type`

⚠️ **Idempotency**: Check existing teams before creating to prevent duplicates

⚠️ **TypeScript Strict Mode**: Code must pass `npm run typecheck` with strict mode enabled

## Example Usage

```typescript
// In API handler or initialization script
import { initializeDefaultTeams } from '../utils/initializeOrganization'

const organizationId = 'org-12345-uuid'
const coreTeams = initializeDefaultTeams(organizationId)

console.log(coreTeams.length) // 6
console.log(coreTeams[0].name) // "Human Resources"
console.log(coreTeams[0].type) // "hr"
console.log(coreTeams[0].leaderId) // null
console.log(coreTeams[0].tokenAllocation) // 50000
```

## Verification Steps

After implementation:

1. **Type Check**: `npm run typecheck` should pass
2. **Lint**: `npm run lint` should pass
3. **Tests**: `npm test` should pass all tests in `tests/utils/initializeOrganization.spec.ts`
4. **Manual Verification**: Import and call function in Node REPL

## Notes

- This is a utility function, not an API endpoint
- Leaders will be assigned later during agent enrollment workflow
- Token allocations are initial values, can be adjusted by admins later
- Team types are immutable (cannot change hr → custom)
- Function is safe to call multiple times (idempotent)
- Total allocation per organization: 350,000 tokens

## Success Criteria

- ✅ Function creates exactly 6 teams
- ✅ All teams have correct type, name, and token allocation
- ✅ All teams linked to provided organizationId
- ✅ All teams have leaderId set to null
- ✅ Function is idempotent (safe to call multiple times)
- ✅ All 6 Team fields present on every team
- ✅ `npm run typecheck` passes
- ✅ `npm run lint` passes
- ✅ All tests pass
