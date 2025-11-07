# Development Task Prompt for Gemini CLI

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

[TASK_DESCRIPTION]

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
;[TYPES_TO_INCLUDE]
```

## Reference Files

Look at these existing files for patterns to follow:
[REFERENCE_FILES]

## Expected Output

Create ONLY the following file(s):
[FILES_TO_CREATE]

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
- Use uuid v4 for ID generation: `import { v4 as uuidv4 } from 'uuid'`

## Output Formatting (MANDATORY)

All output (status, reasoning, steps) MUST be cleanly formatted:

- Use blank lines to separate conceptual blocks
- One sentence or bullet per line for lists / steps
- No run-on paragraphs longer than 3 sentences
- Begin major phases with a clear heading like: `== Planning ==`, `== Implementation ==`
- Use fenced code blocks for any commands or code
  ```bash
  npm run typecheck
  npm run lint
  npm test -- --run
  ```
- Wrap lines at ~100 characters; insert newlines rather than overflowing
- Explicit progress structure:
  - Action: <what is being done>
  - Result: <observed outcome>
  - Next: <next planned step>
- Do not compress multiple unrelated actions into a single line
- Avoid trailing spaces, avoid inline JSON unless necessary

Failure to follow these formatting rules reduces readability; prioritize structured, line-separated output.
