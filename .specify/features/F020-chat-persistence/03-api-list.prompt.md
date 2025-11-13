# Task: Create GET /api/agents/[id]/chats Endpoint

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create a GET endpoint to list all chat sessions for a specific agent. This endpoint returns session metadata (with messages) sorted by most recent first.

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final
- **Constitution principles** - Read .specify/memory/constitution.md

### MUST USE

- **Import paths**:
  - Project types: `import type { Agent } from '@@/types'`
  - Chat types: `import type { ChatSession } from '../../../services/persistence/chat-types'`
  - Services: relative paths `../../../services/persistence/filesystem`
- **Type-only imports** - Use `import type { }` for types
- **Structured logging** - Import and use `createLogger` from `../../../utils/logger`
- **Error handling** - Use `error: unknown`, try-catch blocks
- **H3 helpers** - `defineEventHandler`, `setResponseStatus`

## Reference Pattern

**app/server/api/interviews.get.ts** (Similar pattern):

```typescript
import { defineEventHandler, getQuery, setResponseStatus } from 'h3'
import { getSessionsByTeam } from '../services/interview/session'
import { createLogger, newCorrelationId } from '../utils/logger'
import type { InterviewSession } from '../services/interview/types'

const logger = createLogger('api.interviews.get')

export default defineEventHandler((event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  log.info('Received request for GET /api/interviews')

  const query = getQuery(event)
  const teamId = query.teamId as string | undefined

  if (!teamId) {
    log.warn('teamId query parameter missing')
    setResponseStatus(event, 400)
    return { error: 'Missing teamId query parameter' }
  }

  try {
    const sessions: InterviewSession[] = getSessionsByTeam(teamId)
    log.info({ teamId, count: sessions.length }, 'Sessions retrieved successfully')
    return sessions
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes('not found')) {
      log.warn({ error: error.message, teamId }, 'Resource not found')
      setResponseStatus(event, 404)
      return { error: error.message }
    }

    log.error({ error, teamId }, 'Failed to retrieve sessions')
    setResponseStatus(event, 500)
    return { error: 'Internal Server Error' }
  }
})
```

## Endpoint Specification

**Path**: `app/server/api/agents/[id]/chats.get.ts`

**URL**: `GET /api/agents/[id]/chats`

**Parameters**:

- `id`: agentId from route params (event.context.params?.id)

**Response Success (200)**:

```typescript
{
  sessions: ChatSession[]  // Sorted by updatedAt descending
}
```

**Response Errors**:

- 400: agentId missing
- 404: agent not found
- 500: internal server error

## Implementation Steps

1. Import dependencies:
   - `defineEventHandler`, `setResponseStatus` from 'h3'
   - `createLogger`, `newCorrelationId` from '../../../utils/logger'
   - `agents` from '../../../data/agents'
   - `loadChatSessions` from '../../../services/persistence/filesystem'
   - Type: `Agent` from '@@/types'
   - Type: `ChatSession` from '../../../services/persistence/chat-types'

2. Create logger: `createLogger('api.agents.chats')`

3. Define event handler:
   - Generate correlationId
   - Create child logger
   - Log request: "Received request for GET /api/agents/{id}/chats"

4. Extract agentId:
   - Get from `event.context.params?.id`
   - Validate not empty
   - Return 400 if missing

5. Find agent:
   - Search `agents` array by id
   - Return 404 if not found

6. Load chat sessions:
   - Call `loadChatSessions(agentId, agent.organizationId)`
   - Wrap in try-catch
   - Log success: { agentId, count: sessions.length }
   - Return: `{ sessions }`

7. Error handling:
   - Catch errors in try-catch
   - Log error with { error, agentId }
   - Set status 500
   - Return: `{ error: 'Failed to load chat sessions' }`

## Expected Output

Create ONLY this file:

**app/server/api/agents/[id]/chats.get.ts**

```typescript
import { defineEventHandler, setResponseStatus } from 'h3'
import { createLogger, newCorrelationId } from '../../../utils/logger'
import { agents } from '../../../data/agents'
import { loadChatSessions } from '../../../services/persistence/filesystem'
import type { Agent } from '@@/types'
import type { ChatSession } from '../../../services/persistence/chat-types'

const logger = createLogger('api.agents.chats')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  const agentId = event.context.params?.id

  // Validation
  if (!agentId) {
    log.warn('Missing agentId')
    setResponseStatus(event, 400)
    return { error: 'agentId is required' }
  }

  log.info({ agentId }, 'Received request for GET /api/agents/{id}/chats')

  // Find agent
  const agent = agents.find((a) => a.id === agentId)
  if (!agent) {
    log.warn({ agentId }, 'Agent not found')
    setResponseStatus(event, 404)
    return { error: 'Agent not found' }
  }

  // Load sessions
  try {
    const sessions = await loadChatSessions(agentId, agent.organizationId)
    log.info({ agentId, count: sessions.length }, 'Chat sessions retrieved successfully')
    return { sessions }
  } catch (error: unknown) {
    log.error({ error, agentId }, 'Failed to load chat sessions')
    setResponseStatus(event, 500)
    return { error: 'Failed to load chat sessions' }
  }
})
```

## Validation Checklist

Before finishing, verify:

- [ ] File created at: `app/server/api/agents/[id]/chats.get.ts`
- [ ] Agent type import uses `@@/types`
- [ ] ChatSession type import uses relative path to chat-types
- [ ] Service imports use relative paths
- [ ] Type imports use `import type { }` syntax
- [ ] Logger created with correct name
- [ ] CorrelationId generated and used
- [ ] AgentId extracted from route params
- [ ] Validation returns 400 for missing agentId
- [ ] Agent lookup returns 404 if not found
- [ ] Try-catch wraps loadChatSessions call
- [ ] Error logging includes {error, agentId} context
- [ ] Success logging includes {agentId, count} context
- [ ] Returns `{ sessions }` on success
- [ ] Returns `{ error }` on failure
- [ ] Function is async (loadChatSessions is async)

## Success Criteria

- File created at specified path
- Endpoint follows existing pattern (interviews.get.ts)
- Type-safe (no type errors)
- Proper error handling (try-catch)
- Structured logging with context
- HTTP status codes correct (200, 400, 404, 500)

## Notes

- This endpoint is similar to interviews.get.ts but simpler
- No query parameters needed (list all for agent)
- Sessions come pre-sorted from loadChatSessions (updatedAt desc)
- Agent data comes from memory (agents array), orgId needed for filesystem lookup

## Constitutional Requirements

- **Type Safety First**: All types explicit
- **No Emojis**: Use text markers: [ERROR], [INFO]
- **Observable Development**: Log all operations with context
- **Error handling**: Always use `error: unknown`
