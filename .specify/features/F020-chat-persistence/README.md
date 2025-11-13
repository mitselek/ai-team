# F020: Agent Chat Persistence

## Objective

Implement filesystem-based persistence for agent chat sessions, enabling conversation history retrieval, session continuity across page refreshes, and multi-session management per agent.

## Problem Statement

Currently, agent chat sessions are not persisted:

- Messages stored only in component state
- Conversation history lost on page refresh
- No ability to review past conversations
- SessionId generated but not used for retrieval

## Solution Overview

Add chat session persistence following the existing interview persistence pattern:

- Store chat sessions in `data/organizations/{orgId}/chats/{agentId}/{sessionId}.json`
- Implement persistence layer functions (save, load, list)
- Create API endpoints for retrieving chat history
- Modify existing chat API to persist messages

## Scope

### New Files (4)

1. `app/server/services/persistence/chat-types.ts` - Type definitions
2. `app/server/api/agents/[id]/chats.get.ts` - List sessions endpoint
3. `app/server/api/agents/[id]/chats/[sessionId].get.ts` - Get session endpoint
4. `tests/services/persistence/chat.spec.ts` - Persistence tests

### Modified Files (2)

1. `app/server/services/persistence/filesystem.ts` - Add 3 persistence functions
2. `app/server/api/agents/[id]/chat.post.ts` - Add persistence logic

### Tests

- Persistence layer tests (save, load, list sessions)
- API endpoint tests (GET endpoints)
- Integration tests (chat API with persistence)

## Dependencies

- Issue #14 (✅ Complete): Agent chat API endpoint exists
- F012 (✅ Complete): Filesystem persistence pattern established
- Interview persistence implementation (reference pattern)

## Execution Plan

### Phase 1: Types & Persistence Layer

- Create `chat-types.ts` with `ChatSession` and `ChatMessage` interfaces
- Add 3 functions to `filesystem.ts`:
  - `saveChatSession(session: ChatSession): Promise<void>`
  - `loadChatSession(agentId: string, sessionId: string, orgId: string): Promise<ChatSession | null>`
  - `loadChatSessions(agentId: string, orgId: string): Promise<ChatSession[]>`

### Phase 2: API Endpoints

- Create GET `/api/agents/[id]/chats` - List all sessions for agent
- Create GET `/api/agents/[id]/chats/[sessionId]` - Retrieve specific session
- Modify POST `/api/agents/[id]/chat` - Persist messages on each exchange

### Phase 3: Testing

- Test persistence functions (save, load, list, edge cases)
- Test new GET endpoints (list, retrieve, 404 handling)
- Test modified POST endpoint (creates sessions, appends messages)

## Acceptance Criteria

- [ ] Chat messages persisted to filesystem
- [ ] API endpoint to retrieve conversation history
- [ ] SessionId properly tracks conversations
- [ ] Tests for persistence layer
- [ ] Tests for API endpoints
- [ ] No data loss on page refresh
- [ ] TypeScript type check passes
- [ ] All tests passing (100%)

## Data Structure

```typescript
interface ChatSession {
  id: string // sessionId (UUID v4)
  agentId: string
  organizationId: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

interface ChatMessage {
  id: string // UUID v4
  role: 'user' | 'agent'
  content: string
  timestamp: Date
  tokensUsed?: number // Track LLM token usage
}
```

## Storage Pattern

```text
data/organizations/
└── {org-id}/
    ├── manifest.json
    ├── agents/
    ├── teams/
    ├── interviews/
    └── chats/           # NEW
        └── {agent-id}/  # NEW
            ├── {session-id-1}.json
            ├── {session-id-2}.json
            └── ...
```

## Example Session File

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "agentId": "95eb79e2-978d-4f5f-b4b6-9c6c6ae7d5a4",
  "organizationId": "537ba67e-0e50-47f7-931d-360b547efe90",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "What are our priorities?",
      "timestamp": "2025-11-13T10:30:00.000Z"
    },
    {
      "id": "msg-2",
      "role": "agent",
      "content": "Based on analysis...",
      "timestamp": "2025-11-13T10:30:05.000Z",
      "tokensUsed": 150
    }
  ],
  "createdAt": "2025-11-13T10:30:00.000Z",
  "updatedAt": "2025-11-13T10:30:05.000Z"
}
```

## Constitutional Requirements

- Type Safety First: Full TypeScript types for ChatSession, messages
- Test-First Development: Tests before implementation
- Observable Development: Structured logging with context (sessionId, agentId)
- No Emojis: Never in code, logs, or UI
- Markdown Quality: All code blocks with language tags

## Related Issues

- Issue #20: Agent chats are not persistent but should be
- Issue #14 (✅ Closed): Agent chat API endpoint
- Issue #15 (In Progress): Agent chat UI page
- F012: Filesystem persistence (already implemented for agents/teams)
- F015: GitHub repository persistence (Phase 2 - in planning)

## Estimated Effort

- Manual implementation: 3.5-5.5 hours
- With Gemini workflow: 40-70 minutes (parallel execution)

## Complexity

Medium - Follows proven interview persistence pattern, straightforward CRUD operations, no complex business logic.
