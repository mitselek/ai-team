# Development Task: Agent Composable

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create a Vue composable for agent management with CRUD operations, following the exact pattern from `app/composables/useOrganization.ts`.

## Critical Constraints

### DO NOT MODIFY
- **types/index.ts** - Use Agent interface EXACTLY as defined with ALL fields
- Any other existing files

### MUST USE
- **Relative imports only** - No `~` aliases
  - Types: `import type { Agent } from '../../types'`
  - Logger: `import { logger } from '../../app/utils/logger'`
  - Data: `import { agents as agentsData } from '../../server/data/agents'`
- **useState** for SSR-safe state: `useState<Agent[]>('agents', () => agentsData)`
- **uuid v4** for ID generation: `import { v4 as uuidv4 } from 'uuid'`
- **Structured logging** with logger.error for all catch blocks
- **All required fields** from Agent interface

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

Follow this pattern EXACTLY:
- `app/composables/useOrganization.ts` - Copy structure and style

## Expected Output

Create ONLY: `app/composables/useAgent.ts`

Required functions:
1. **createAgent**(name, role, organizationId, teamId, systemPrompt, seniorId?, tokenAllocation?): Agent
   - Generate id with uuidv4()
   - Set defaults: tokenUsed=0, status='active', createdAt=new Date(), lastActiveAt=new Date()
   - Push to agents.value array
   - Return created agent
   
2. **getAgent**(id): Agent | undefined
   - Find by id
   - Return agent or undefined

3. **listAgents**(filters?: {organizationId?, teamId?, status?}): Agent[]
   - Filter agents array by provided filters
   - Return filtered array

4. **updateAgent**(id, updates: Partial<Agent>): Agent | undefined
   - Find agent by id
   - Merge updates
   - Return updated agent or undefined

5. **deleteAgent**(id): void
   - Find agent by id
   - Remove from array

All functions wrapped in try-catch with logger.error on exceptions.

## Validation Checklist

Before finishing, verify:
- [ ] All imports use relative paths (../../)
- [ ] All Agent fields included when creating (id, name, role, seniorId, teamId, organizationId, systemPrompt, tokenAllocation, tokenUsed, status, createdAt, lastActiveAt)
- [ ] Uses useState for SSR-safe state management
- [ ] uuid v4 for ID generation
- [ ] Structured logging in catch blocks
- [ ] Error handling with try-catch on all functions
- [ ] Follows pattern from useOrganization.ts

## Success Criteria

- File created at `app/composables/useAgent.ts`
- All 5 CRUD functions implemented
- No type errors when imported
- TypeScript strict mode compatible
- ~90-120 lines total

## Notes

- Copy the pattern from useOrganization.ts very closely
- Every Agent object must have ALL 12 fields from the interface
- Don't simplify or omit fields - use the full Agent interface
- Keep error messages descriptive: "Failed to create agent", "Failed to get agent with id ${id}", etc.
