````prompt
# Development Task Prompt for Gemini CLI

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create the Vue composable for Team management. This composable must provide CRUD operations (create, read, list, update, delete) for Teams. Follow the EXACT pattern used in `app/composables/useAgent.ts`.

## Critical Constraints

### DO NOT MODIFY
- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **Constitution principles** - Read .specify/memory/constitution.md and follow all 12 principles
- **Existing test patterns** - Match the style in tests/api/organizations.spec.ts and tests/services/orchestrator.spec.ts

### MUST USE
- **Relative imports only** - No `~` aliases. Use `../../types`, `../../server/utils/logger`, etc.
- **Type-only imports** - For types/interfaces use `import type { ... }` not `import { ... }`
- **Existing patterns** - Reference similar files as examples (listed below)
- **All required fields** - Every object must include ALL fields from its interface (ALL 6 Team fields)
- **Structured logging** - Import and use `createLogger` from app/utils/logger
- **Error handling** - Wrap operations in try-catch, log errors with context

## Type Definitions to Use

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

## Reference Files

Look at these existing files for patterns to follow:
- `app/composables/useAgent.ts` - Agent composable pattern (EXACT template to follow)
- `app/composables/useOrganization.ts` - Organization composable pattern

## Expected Output

Create ONLY the following file(s):
- `app/composables/useTeam.ts` - SSR-safe Vue composable with these functions:
  - `createTeam(team: Omit<Team, 'id'>): Promise<Team>`
  - `getTeam(id: string): Promise<Team | null>`
  - `listTeams(filter?: { organizationId?: string; type?: TeamType }): Promise<Team[]>`
  - `updateTeam(id: string, updates: Partial<Team>): Promise<Team | null>`
  - `deleteTeam(id: string): Promise<boolean>`

## Validation Checklist

Before finishing, verify:
- [ ] All imports use relative paths (../../)
- [ ] Type imports use `import type { }` syntax (for TypeScript types/interfaces)
- [ ] All type fields are present (ALL 6 Team fields in ALL operations)
- [ ] Structured logging used (createLogger, correlationId)
- [ ] Error handling with try-catch
- [ ] Follows patterns from reference files
- [ ] No modifications to types/index.ts
- [ ] TypeScript strict mode compatible
- [ ] Uses `useState` for SSR-safe state management
- [ ] Generates IDs with `uuidv4()` from uuid package

## Success Criteria

- File(s) created at specified path(s)
- No type errors when imported
- Follows existing code style (ESLint compatible)
- Can be integrated without modifying other files
- All 5 CRUD functions implemented
- ALL 6 Team fields present in created/updated objects

## Notes

- This is a focused task - do not refactor existing code
- If you see inconsistencies, note them but don't fix them
- Stay within the scope defined above
- Use uuid v4 for ID generation: `import { v4 as uuidv4 } from 'uuid'`
- Import teams from: `../../server/data/teams`

````
