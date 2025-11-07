# Development Task: Agent Data Store

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create an in-memory storage array for agents, following the exact same pattern as `server/data/organizations.ts`.

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final. Use Agent interface EXACTLY as defined.
- Any other existing files

### MUST USE

- Relative import: `import type { Agent } from '../../types'`
- Empty array initialization: `export const agents: Agent[] = []`
- JSDoc comment explaining purpose and TODO for persistence

## Type Definition to Use

```typescript
export interface Agent {
  id: string
  name: string
  role: string
  seniorId: string | null
  teamId: string
  organizationId: string
  systemPrompt: string
  tokenAllocation: number
  tokenUsed: number
  status: AgentStatus
  createdAt: Date
  lastActiveAt: Date
}

export type AgentStatus = 'active' | 'bored' | 'stuck' | 'paused'
```

## Reference Files

Look at this file and copy its EXACT pattern:

- `server/data/organizations.ts` - Follow this structure exactly

## Expected Output

Create ONLY: `server/data/agents.ts`

Expected structure (~6 lines):

```typescript
import type { Agent } from '../../types'

/**
 * In-memory storage for agents (MVP).
 * TODO: Replace with GitHub-backed persistence.
 */
export const agents: Agent[] = []
```

## Validation Checklist

Before finishing, verify:

- [ ] File created at `server/data/agents.ts`
- [ ] Uses relative import `../../types`
- [ ] Exports empty `Agent[]` array
- [ ] Includes JSDoc comment
- [ ] Includes TODO comment about GitHub persistence
- [ ] Matches pattern from organizations.ts exactly

## Success Criteria

- File created at exact path: `server/data/agents.ts`
- No type errors when imported
- Simple and clean (5-8 lines total)
- Follows ESLint rules (no linting errors)

## Notes

- This is the simplest possible file - just an empty array export
- Keep it minimal - no logic, no functions, just data storage
- Match organizations.ts pattern exactly
