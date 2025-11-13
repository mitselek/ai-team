# Task: Create GET /api/agents/[id]/chats/[sessionId] Endpoint

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create a GET endpoint to retrieve a specific chat session by sessionId. This endpoint returns the full session including all messages.

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final
- **Constitution principles** - Read .specify/memory/constitution.md

### MUST USE

- **Import paths**:
  - Project types: `import type { Agent } from '@@/types'`
  - Chat types: `import type { ChatSession } from '../../../../services/persistence/chat-types'`
  - Services: relative paths `../../../../services/persistence/filesystem`
- **Type-only imports** - Use `import type { }` for types
- **Structured logging** - Import and use `createLogger` from `../../../../utils/logger`
- **Error handling** - Use `error: unknown`, try-catch blocks
- **H3 helpers** - `defineEventHandler`, `setResponseStatus`

## Endpoint Specification

**Path**: `app/server/api/agents/[id]/chats/[sessionId].get.ts`

**URL**: `GET /api/agents/[id]/chats/[sessionId]`

**Parameters**:

- `id`: agentId from route params (event.context.params?.id)
- `sessionId`: sessionId from route params (event.context.params?.sessionId)

**Response Success (200)**:

```typescript
{
  session: ChatSession // Full session with all messages
}
```

**Response Errors**:

- 400: agentId or sessionId missing
- 404: agent not found OR session not found
- 500: internal server error

## Implementation Steps

1. Import dependencies:
   - `defineEventHandler`, `setResponseStatus` from 'h3'
   - `createLogger`, `newCorrelationId` from '../../../../utils/logger'
   - `agents` from '../../../../data/agents'
   - `loadChatSession` from '../../../../services/persistence/filesystem'
   - Type: `Agent` from '@@/types'
   - Type: `ChatSession` from '../../../../services/persistence/chat-types'

2. Create logger: `createLogger('api.agents.chats.session')`

3. Define event handler:
   - Generate correlationId
   - Create child logger

4. Extract route params:
   - Get agentId from `event.context.params?.id`
   - Get sessionId from `event.context.params?.sessionId`
   - Validate both not empty
   - Return 400 if either missing
   - Log request: "Received request for GET /api/agents/{id}/chats/{sessionId}"

5. Find agent:
   - Search `agents` array by id
   - Return 404 with error: 'Agent not found' if not found

6. Load chat session:
   - Call `loadChatSession(agentId, sessionId, agent.organizationId)`
   - Wrap in try-catch
   - If session is null, return 404 with error: 'Session not found'
   - Log success: { agentId, sessionId, messageCount: session.messages.length }
   - Return: `{ session }`

7. Error handling:
   - Catch errors in try-catch
   - Log error with { error, agentId, sessionId }
   - Set status 500
   - Return: `{ error: 'Failed to load chat session' }`

## Expected Output

Create ONLY this file:

**app/server/api/agents/[id]/chats/[sessionId].get.ts**

```typescript
import { defineEventHandler, setResponseStatus } from 'h3'
import { createLogger, newCorrelationId } from '../../../../utils/logger'
import { agents } from '../../../../data/agents'
import { loadChatSession } from '../../../../services/persistence/filesystem'
import type { Agent } from '@@/types'
import type { ChatSession } from '../../../../services/persistence/chat-types'

const logger = createLogger('api.agents.chats.session')

export default defineEventHandler(async (event) => {
  const correlationId = newCorrelationId()
  const log = logger.child({ correlationId })

  const agentId = event.context.params?.id
  const sessionId = event.context.params?.sessionId

  // Validation
  if (!agentId || !sessionId) {
    log.warn({ agentId, sessionId }, 'Missing required parameters')
    setResponseStatus(event, 400)
    return { error: 'agentId and sessionId are required' }
  }

  log.info({ agentId, sessionId }, 'Received request for GET /api/agents/{id}/chats/{sessionId}')

  // Find agent
  const agent = agents.find((a) => a.id === agentId)
  if (!agent) {
    log.warn({ agentId }, 'Agent not found')
    setResponseStatus(event, 404)
    return { error: 'Agent not found' }
  }

  // Load session
  try {
    const session = await loadChatSession(agentId, sessionId, agent.organizationId)

    if (!session) {
      log.warn({ agentId, sessionId }, 'Session not found')
      setResponseStatus(event, 404)
      return { error: 'Session not found' }
    }

    log.info(
      { agentId, sessionId, messageCount: session.messages.length },
      'Chat session retrieved successfully'
    )
    return { session }
  } catch (error: unknown) {
    log.error({ error, agentId, sessionId }, 'Failed to load chat session')
    setResponseStatus(event, 500)
    return { error: 'Failed to load chat session' }
  }
})
```

## Validation Checklist

Before finishing, verify:

- [ ] File created at: `app/server/api/agents/[id]/chats/[sessionId].get.ts`
- [ ] Note the path depth: 4 levels up for imports (../../../../)
- [ ] Agent type import uses `@@/types`
- [ ] ChatSession type import uses relative path to chat-types
- [ ] Service imports use relative paths (4 levels up)
- [ ] Type imports use `import type { }` syntax
- [ ] Logger created with correct name
- [ ] CorrelationId generated and used
- [ ] Both agentId and sessionId extracted from route params
- [ ] Validation returns 400 for missing parameters
- [ ] Agent lookup returns 404 if not found
- [ ] Session null check returns 404 with 'Session not found'
- [ ] Try-catch wraps loadChatSession call
- [ ] Error logging includes {error, agentId, sessionId} context
- [ ] Success logging includes {agentId, sessionId, messageCount} context
- [ ] Returns `{ session }` on success
- [ ] Returns `{ error }` on failure
- [ ] Function is async (loadChatSession is async)

## Success Criteria

- File created at specified path (note: nested under /chats/)
- Endpoint handles two route parameters
- Type-safe (no type errors)
- Proper error handling (try-catch + null check)
- Structured logging with context
- HTTP status codes correct (200, 400, 404, 500)

## Notes

- This is a nested route: `/agents/[id]/chats/[sessionId]`
- Requires 4 levels up for imports (../../../../)
- Similar to the list endpoint but retrieves single session
- Must handle null return from loadChatSession (session not found)
- Agent validation prevents accessing sessions from wrong agent

## Constitutional Requirements

- **Type Safety First**: All types explicit
- **No Emojis**: Use text markers: [ERROR], [INFO]
- **Observable Development**: Log all operations with context
- **Error handling**: Always use `error: unknown`
