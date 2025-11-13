# Task: Modify POST /api/agents/[id]/chat to Persist Messages

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Modify the existing chat POST endpoint to persist chat messages to filesystem. Load existing sessions when sessionId provided, create new sessions when not provided, and save messages after each exchange.

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final
- **Existing response format** - Keep ChatResponse interface unchanged
- **Constitution principles** - Read .specify/memory/constitution.md

### MUST MODIFY

- **app/server/api/agents/[id]/chat.post.ts** - Add persistence logic

### MUST ADD

- **Import paths**:
  - `import { saveChatSession, loadChatSession } from '../../../services/persistence/filesystem'`
  - `import type { ChatSession, ChatMessage } from '../../../services/persistence/chat-types'`
- **Type-only imports** - Use `import type { }` for types
- **Session management** - Load existing or create new ChatSession
- **Message persistence** - Save user + agent messages after each exchange

## Current File Structure

**app/server/api/agents/[id]/chat.post.ts** (Current - lines 1-110):

```typescript
import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { v4 as uuidv4 } from 'uuid'
import { createLogger, newCorrelationId } from '../../../utils/logger'
import { agents } from '../../../data/agents'
import { generateCompletion } from '../../../services/llm'

const logger = createLogger('api.agents.chat')

interface ChatRequest {
  message: string
  sessionId?: string
}

interface ChatResponse {
  response: string
  sessionId: string
  timestamp: string
}

interface ErrorResponse {
  error: string
}

export default defineEventHandler(async (event): Promise<ChatResponse | ErrorResponse> => {
  // ... validation logic (lines 24-68)

  // Generate or use provided sessionId
  const finalSessionId = sessionId || uuidv4()

  log.info({ agentId, sessionId: finalSessionId }, 'Processing chat request')

  try {
    // Construct prompt with agent's system prompt as context
    const prompt = `${agent.systemPrompt}

User message: ${message}

Please respond to the user's message.`

    // Generate completion using LLM service
    const llmResponse = await generateCompletion(prompt, {
      agentId: agent.id,
      agentRole: agent.role,
      correlationId
    })

    const timestamp = new Date().toISOString()

    log.info(
      {
        agentId,
        sessionId: finalSessionId,
        tokensUsed: llmResponse.tokensUsed.total
      },
      'Chat response generated successfully'
    )

    return {
      response: llmResponse.content,
      sessionId: finalSessionId,
      timestamp
    }
  } catch (error: unknown) {
    log.error({ error, agentId, sessionId: finalSessionId }, 'Failed to generate chat response')
    setResponseStatus(event, 500)
    return { error: 'Failed to generate chat response' }
  }
})
```

## Modification Plan

### 1. Add Imports (Top of file, after existing imports)

```typescript
import { saveChatSession, loadChatSession } from '../../../services/persistence/filesystem'
import type { ChatSession, ChatMessage } from '../../../services/persistence/chat-types'
```

### 2. Session Management (After line 68, before finalSessionId generation)

Replace this section:

```typescript
// Generate or use provided sessionId
const finalSessionId = sessionId || uuidv4()

log.info({ agentId, sessionId: finalSessionId }, 'Processing chat request')
```

With this:

```typescript
// Load existing session or create new
let chatSession: ChatSession
const finalSessionId = sessionId || uuidv4()

if (sessionId) {
  // Try to load existing session
  const existing = await loadChatSession(agentId, sessionId, agent.organizationId)
  if (existing) {
    chatSession = existing
    log.info({ sessionId, messageCount: existing.messages.length }, 'Loaded existing chat session')
  } else {
    // Session not found, create new
    log.warn({ sessionId }, 'Session not found, creating new session')
    chatSession = {
      id: finalSessionId,
      agentId,
      organizationId: agent.organizationId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
} else {
  // New session
  log.info({ sessionId: finalSessionId }, 'Creating new chat session')
  chatSession = {
    id: finalSessionId,
    agentId,
    organizationId: agent.organizationId,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

log.info({ agentId, sessionId: finalSessionId }, 'Processing chat request')
```

### 3. Message Persistence (After LLM response, before return)

Add this section AFTER the llmResponse is generated and BEFORE the final return statement:

```typescript
// ... llmResponse generated above

const timestamp = new Date().toISOString()

// ADD THIS SECTION:
// Create user message
const userMessage: ChatMessage = {
  id: uuidv4(),
  role: 'user',
  content: message,
  timestamp: new Date()
}
chatSession.messages.push(userMessage)

// Create agent message
const agentMessage: ChatMessage = {
  id: uuidv4(),
  role: 'agent',
  content: llmResponse.content,
  timestamp: new Date(),
  tokensUsed: llmResponse.tokensUsed.total
}
chatSession.messages.push(agentMessage)

// Update session timestamp
chatSession.updatedAt = new Date()

// Persist to filesystem
await saveChatSession(chatSession)

log.info(
  {
    agentId,
    sessionId: finalSessionId,
    tokensUsed: llmResponse.tokensUsed.total,
    messageCount: chatSession.messages.length
  },
  'Chat response generated and persisted successfully'
)

return {
  response: llmResponse.content,
  sessionId: finalSessionId,
  timestamp
}
```

## Expected Changes Summary

**Added imports** (2 lines):

- saveChatSession, loadChatSession from filesystem
- ChatSession, ChatMessage types

**Modified session handling** (~35 lines):

- Load existing session if sessionId provided
- Create new session if sessionId not provided or not found
- Initialize ChatSession object with all required fields

**Added message persistence** (~25 lines):

- Create ChatMessage for user
- Create ChatMessage for agent (with tokensUsed)
- Push both to session.messages array
- Update session.updatedAt
- Call saveChatSession to persist
- Update success log to include messageCount

**Total additions**: ~62 lines
**Modified lines**: ~5 lines
**File length**: ~172 lines (was ~110)

## Validation Checklist

Before finishing, verify:

- [ ] Imports added at top of file
- [ ] ChatSession and ChatMessage types imported with `import type { }`
- [ ] Session loading logic added before LLM call
- [ ] Creates new session if sessionId not provided
- [ ] Loads existing session if sessionId provided
- [ ] Falls back to new session if sessionId not found
- [ ] User message created with UUID, role='user', timestamp
- [ ] Agent message created with UUID, role='agent', timestamp, tokensUsed
- [ ] Both messages pushed to chatSession.messages
- [ ] chatSession.updatedAt updated
- [ ] saveChatSession called to persist
- [ ] Logging includes messageCount in session load
- [ ] Logging includes messageCount in success message
- [ ] Existing error handling preserved
- [ ] Function remains async (was already async)
- [ ] Return format unchanged (ChatResponse interface)

## Success Criteria

- File modified at: app/server/api/agents/[id]/chat.post.ts
- Chat messages persist to filesystem
- Existing sessions load correctly
- New sessions create correctly
- Message history accumulates across requests
- Type-safe (no type errors)
- No breaking changes to API response format

## Notes

- Existing response format MUST NOT change (ChatResponse interface)
- SessionId behavior unchanged from caller perspective
- First message creates session, subsequent messages append
- loadChatSession returns null if not found → handle gracefully
- saveChatSession creates directory structure automatically
- tokensUsed is optional but we have it from llmResponse

## Constitutional Requirements

- **Type Safety First**: All types explicit
- **No Emojis**: Use text markers: [ERROR], [INFO]
- **Observable Development**: Log all operations with context (including messageCount)
- **Error handling**: Preserve existing try-catch structure
