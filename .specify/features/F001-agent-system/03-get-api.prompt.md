# Development Task: GET Agents API Endpoint

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create a GET API endpoint to list agents with optional query filters (organizationId, teamId, status), following the pattern from `server/api/organizations/index.get.ts`.

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - Use Agent interface EXACTLY as defined
- Any other existing files

### MUST USE

- **Relative imports only** - No `~` aliases
  - Logger: `import { createLogger } from '../../utils/logger'`
  - Data: `import { agents } from '../../data/agents'`
- **H3 defineEventHandler** for route handler
- **getQuery(event)** to read query parameters
- **Structured logging** with logger.info for request tracking
- **Default export** of the handler

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

- `server/api/organizations/index.get.ts` - Copy structure and style

## Expected Output

Create ONLY: `server/api/agents/index.get.ts`

Implementation details:

1. Create logger with name 'api.agents.get'
2. Define event handler with defineEventHandler
3. Extract query params: organizationId, teamId, status
4. Log the request with filters
5. Filter agents array by each param if provided:
   - If organizationId: filter by agent.organizationId
   - If teamId: filter by agent.teamId
   - If status: filter by agent.status
6. Return filtered agents array

Expected structure (~30 lines):

```typescript
import { defineEventHandler, getQuery } from 'h3'
import { createLogger } from '../../utils/logger'
import { agents } from '../../data/agents'

const logger = createLogger('api.agents.get')

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const { organizationId, teamId, status } = query

  logger.info({ organizationId, teamId, status }, 'Fetching agents with filters')

  let filteredAgents = agents

  if (organizationId) {
    filteredAgents = filteredAgents.filter((agent) => agent.organizationId === organizationId)
  }

  if (teamId) {
    filteredAgents = filteredAgents.filter((agent) => agent.teamId === teamId)
  }

  if (status) {
    filteredAgents = filteredAgents.filter((agent) => agent.status === status)
  }

  return filteredAgents
})
```

## Validation Checklist

Before finishing, verify:

- [ ] File created at `server/api/agents/index.get.ts`
- [ ] All imports use relative paths (../../)
- [ ] Uses createLogger with descriptive name
- [ ] Uses getQuery to extract filters
- [ ] Filters applied conditionally (only if provided)
- [ ] Returns array of agents (not wrapped in {status, body})
- [ ] Default export of handler
- [ ] Follows pattern from organizations GET endpoint

## Success Criteria

- File created at exact path
- No type errors
- Supports optional filtering by organizationId, teamId, status
- ~25-35 lines total
- TypeScript strict mode compatible

## Notes

- Keep it simple - just filtering an array
- Return the agents array directly, not wrapped in response object
- Match the organizations GET pattern exactly
- All filters are optional - if none provided, return all agents
