# Development Task: POST Agents API Endpoint

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create a POST API endpoint to create new agents with validation, following the pattern from `server/api/organizations/index.post.ts`.

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - Use Agent interface EXACTLY as defined with ALL 12 fields
- Any other existing files

### MUST USE

- **Relative imports only** - No `~` aliases
  - Logger: `import { createLogger, newCorrelationId } from '../../utils/logger'`
  - Types: `import type { Agent } from '../../../types'`
  - Data: `import { agents } from '../../data/agents'`
- **H3 functions**: defineEventHandler, readBody, setResponseStatus
- **uuid v4** for ID generation: `import { v4 as uuidv4 } from 'uuid'`
- **Structured logging** with correlationId tracking
- **Validation** for required fields
- **All Agent fields** must be set in created object

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

- `server/api/organizations/index.post.ts` - Copy structure, validation, error handling

## Expected Output

Create ONLY: `server/api/agents/index.post.ts`

Required validation:

- **Required fields**: name, role, organizationId, teamId, systemPrompt
- **Optional fields**: seniorId (nullable), tokenAllocation (default: 10000)
- **Auto-generated**: id (uuidv4), tokenUsed (0), status ('active'), createdAt (new Date()), lastActiveAt (new Date())

Implementation flow:

1. Create correlationId and child logger
2. Log request received
3. Parse body with readBody, catch parse errors → 400
4. Validate required fields, return 400 if missing
5. Create new Agent object with ALL 12 fields
6. Push to agents array
7. Log success with agentId
8. Return 201 with created agent

Error handling:

- Parse error → 400 "Invalid request body"
- Missing fields → 400 "Missing required fields: [list]"
- Unexpected error → 500 "Internal Server Error"

Expected structure (~70 lines):

```typescript
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { v4 as uuidv4 } from 'uuid'
import { createLogger, newCorrelationId } from '../../utils/logger'
import type { Agent } from '../../../types'
import { agents } from '../../data/agents'

const logger = createLogger('api.agents.post')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  log.info('Received request to create a new agent')

  let body: Partial<Agent>
  try {
    body = await readBody<Partial<Agent>>(event)
  } catch (error) {
    log.error({ error }, 'Failed to parse request body')
    setResponseStatus(event, 400)
    return { error: 'Invalid request body' }
  }

  // Validate required fields
  const requiredFields: (keyof Agent)[] = [
    'name',
    'role',
    'organizationId',
    'teamId',
    'systemPrompt'
  ]
  const missingFields = requiredFields.filter((field) => !body[field])

  if (missingFields.length > 0) {
    log.warn({ missingFields }, 'Missing required fields')
    setResponseStatus(event, 400)
    return { error: `Missing required fields: ${missingFields.join(', ')}` }
  }

  try {
    const newAgent: Agent = {
      id: uuidv4(),
      name: body.name!,
      role: body.role!,
      seniorId: body.seniorId ?? null,
      teamId: body.teamId!,
      organizationId: body.organizationId!,
      systemPrompt: body.systemPrompt!,
      tokenAllocation: body.tokenAllocation ?? 10000,
      tokenUsed: 0,
      status: 'active',
      createdAt: new Date(),
      lastActiveAt: new Date()
    }

    agents.push(newAgent)

    log.info({ agentId: newAgent.id }, 'Successfully created new agent')

    setResponseStatus(event, 201)
    return newAgent
  } catch (error) {
    log.error({ error }, 'An unexpected error occurred while creating the agent')
    setResponseStatus(event, 500)
    return { error: 'Internal Server Error' }
  }
})
```

## Validation Checklist

Before finishing, verify:

- [ ] File created at `server/api/agents/index.post.ts`
- [ ] All imports use relative paths (../../ or ../../../)
- [ ] Uses correlationId for request tracking
- [ ] Validates ALL required fields
- [ ] Creates Agent with ALL 12 fields
- [ ] Uses uuidv4() for id
- [ ] Sets proper defaults (tokenUsed=0, status='active', dates=new Date())
- [ ] Returns 201 on success, 400 on validation error, 500 on exception
- [ ] Follows pattern from organizations POST endpoint

## Success Criteria

- File created at exact path
- No type errors
- Comprehensive validation
- Proper HTTP status codes (201, 400, 500)
- ~65-80 lines total
- TypeScript strict mode compatible

## Notes

- ALL 12 Agent fields must be present in the created object
- Don't skip or simplify fields - use the complete Agent interface
- seniorId is nullable - use `?? null` for default
- Match the organizations POST pattern for error handling
- Use setResponseStatus before returning error/success responses
