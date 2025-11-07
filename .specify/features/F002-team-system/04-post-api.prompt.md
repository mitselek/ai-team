````prompt
# Development Task Prompt for Gemini CLI

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create the POST API endpoint for creating new Teams. This endpoint should validate required fields, apply defaults, and return the created team. Follow the EXACT pattern used in `server/api/agents/index.post.ts`.

## Critical Constraints

### DO NOT MODIFY
- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **Constitution principles** - Read .specify/memory/constitution.md and follow all 12 principles
- **Existing test patterns** - Match the style in tests/api/organizations.spec.ts and tests/services/orchestrator.spec.ts

### MUST USE
- **Relative imports only** - No `~` aliases. Use `../../utils/logger`, `../../data/teams`, etc.
- **Type-only imports** - For types/interfaces use `import type { ... }` not `import { ... }`
- **Existing patterns** - Reference similar files as examples (listed below)
- **All required fields** - Every object must include ALL fields from its interface (ALL 6 Team fields)
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
- `server/api/agents/index.post.ts` - Agent POST endpoint (EXACT template to follow)
- `server/api/organizations/index.post.ts` - Organization POST endpoint

## Expected Output

Create ONLY the following file(s):
- `server/api/teams/index.post.ts` - POST endpoint that:
  - Validates required fields: name, organizationId, type
  - Applies defaults: leaderId=null, tokenAllocation=0
  - Auto-generates: id (uuid v4)
  - Creates team with ALL 6 fields
  - Pushes to teams array
  - Returns 201 with created team
  - Returns 400 for validation errors
  - Returns 500 for server errors
  - Uses correlationId for all logs

## Validation Checklist

Before finishing, verify:
- [ ] All imports use relative paths (../../)
- [ ] Type imports use `import type { }` syntax (for TypeScript types/interfaces)
- [ ] All type fields are present (ALL 6 Team fields in created object)
- [ ] Structured logging used (createLogger, correlationId)
- [ ] Error handling with try-catch
- [ ] Follows patterns from reference files
- [ ] No modifications to types/index.ts
- [ ] TypeScript strict mode compatible
- [ ] Validates 3 required fields: name, organizationId, type
- [ ] Returns proper HTTP status codes (201, 400, 500)

## Success Criteria

- File(s) created at specified path(s)
- No type errors when imported
- Follows existing code style (ESLint compatible)
- Can be integrated without modifying other files
- Created team has ALL 6 fields
- Validation catches missing required fields
- Defaults applied correctly

## Notes

- This is a focused task - do not refactor existing code
- If you see inconsistencies, note them but don't fix them
- Stay within the scope defined above
- Use uuid v4 for ID generation: `import { v4 as uuidv4 } from 'uuid'`
- Import teams from: `../../data/teams`
- Use `newCorrelationId()` from server/utils/logger for tracking

````
