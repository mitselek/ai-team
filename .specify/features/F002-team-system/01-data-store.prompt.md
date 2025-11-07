````prompt
# Development Task Prompt for Gemini CLI

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create the in-memory data store for Teams. This file should export an empty array that will hold Team objects during runtime. Follow the EXACT pattern used in `server/data/agents.ts` and `server/data/organizations.ts`.

## Critical Constraints

### DO NOT MODIFY
- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **Constitution principles** - Read .specify/memory/constitution.md and follow all 12 principles
- **Existing test patterns** - Match the style in tests/api/organizations.spec.ts and tests/services/orchestrator.spec.ts

### MUST USE
- **Relative imports only** - No `~` aliases. Use `../../types`, `../../server/utils/logger`, etc.
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
- `server/data/organizations.ts` - Organization data store pattern
- `server/data/agents.ts` - Agent data store pattern (EXACT template to follow)

## Expected Output

Create ONLY the following file(s):
- `server/data/teams.ts` - In-memory Team storage array

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

## Notes

- This is a focused task - do not refactor existing code
- If you see inconsistencies, note them but don't fix them
- Stay within the scope defined above
- Keep it simple - just export an empty array with proper types and a JSDoc comment about future GitHub persistence

````
