# F002: Team System Implementation

**Status**: 🟡 In Progress  
**Priority**: High (Core MVP feature)  
**Dependencies**: F001 Agent System (✅ Complete)

## Objective

Implement the Team management system with composable, API endpoints, and in-memory data store. Teams organize agents within organizations and manage token allocation.

## Scope

### Type Definition (Reference)

```typescript
export interface Team {
  id: string
  name: string
  organizationId: string
  leaderId: string | null
  tokenAllocation: number
  type: TeamType
}

export type TeamType = 'hr' | 'toolsmith' | 'library' | 'vault' | 'tools-library' | 'nurse' | 'custom'
```

### Implementation Tasks

1. **01-data-store.prompt.md** - `server/data/teams.ts`
   - In-memory array storage
   - Export empty array
   - JSDoc with GitHub persistence TODO

2. **02-composable.prompt.md** - `app/composables/useTeam.ts`
   - SSR-safe Vue composable
   - CRUD operations: createTeam, getTeam, listTeams, updateTeam, deleteTeam
   - ALL 6 Team fields required in operations
   - Structured logging with correlationId

3. **03-get-api.prompt.md** - `server/api/teams/index.get.ts`
   - List teams with optional filters
   - Filter by: organizationId, type
   - Return filtered array

4. **04-post-api.prompt.md** - `server/api/teams/index.post.ts`
   - Create new team
   - Validate required fields: name, organizationId, type
   - Defaults: leaderId=null, tokenAllocation=0
   - Auto-generate: id (uuid), ALL 6 fields in response

5. **05-tests** - Comprehensive test coverage
   - GET endpoint: empty list, with data, filters
   - POST endpoint: success, validation errors, defaults

## Acceptance Criteria

- ✅ All 6 Team fields present in ALL operations
- ✅ Type-only imports for TypeScript types
- ✅ Relative imports (../../)
- ✅ Structured logging throughout
- ✅ npm run typecheck passes
- ✅ npm run lint passes
- ✅ npm test passes (all tests)

## Execution

Launch all 4 implementation tasks in parallel:

```bash
# From project root
cd .specify/features/F002-team-system
gemini --yolo "$(cat 01-data-store.prompt.md)" > ../../logs/F002-01.log 2>&1 &
gemini --yolo "$(cat 02-composable.prompt.md)" > ../../logs/F002-02.log 2>&1 &
gemini --yolo "$(cat 03-get-api.prompt.md)" > ../../logs/F002-03.log 2>&1 &
gemini --yolo "$(cat 04-post-api.prompt.md)" > ../../logs/F002-04.log 2>&1 &
```

Wait 5-10 minutes, then verify and generate tests.
