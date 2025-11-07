````prompt
# Development Task Prompt for Gemini CLI

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create the GET API endpoint for listing Teams with optional filters. This endpoint should allow filtering by organizationId and type. Follow the EXACT pattern used in `server/api/agents/index.get.ts`.

## Critical Constraints

### DO NOT MODIFY
- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **Constitution principles** - Read .specify/memory/constitution.md and follow all 12 principles
- **Existing test patterns** - Match the style in tests/api/organizations.spec.ts and tests/services/orchestrator.spec.ts

### MUST USE
- **Relative imports only** - No `~` aliases. Use `../../utils/logger`, `../../data/teams`, etc.
- **Type-only imports** - For types/interfaces use `import type { ... }` not `import { ... }`
- **Existing patterns** - Reference similar files as examples (listed below)
- **All required fields** - Every object must include ALL fields from its interface
- **Structured logging** - Import and use `createLogger` from server/utils/logger
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
- `server/api/agents/index.get.ts` - Agent GET endpoint (EXACT template to follow)
- `server/api/organizations/index.get.ts` - Organization GET endpoint

## Expected Output

Create ONLY the following file(s):
- `server/api/teams/index.get.ts` - GET endpoint that:
  - Accepts query params: organizationId (string), type (TeamType)
  - Filters teams array based on provided params
  - Returns filtered array of teams
  - Logs request with structured logging

## Validation Checklist

Before finishing, verify:
- [ ] All imports use relative paths (../../)
- [ ] Type imports use `import type { }` syntax (for TypeScript types/interfaces)
- [ ] All type fields are present (no missing required fields)
- [ ] Structured logging used (createLogger, correlationId)
- [ ] Error handling with try-catch
- [ ] Follows patterns from reference files
- [ ] No modifications to types/index.ts
- [ ] TypeScript strict mode compatible

## Success Criteria

- File(s) created at specified path(s)
- No type errors when imported
- Follows existing code style (ESLint compatible)
- Can be integrated without modifying other files
- Filters work correctly (can combine organizationId + type)
- Returns full Team objects with all 6 fields

## Notes

- This is a focused task - do not refactor existing code
- If you see inconsistencies, note them but don't fix them
- Stay within the scope defined above
- Use `getQuery(event)` from h3 to read query parameters
- Import teams from: `../../data/teams`

````
