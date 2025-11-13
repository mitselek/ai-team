# Test Arguments for F020: Agent Chat Persistence

Generate comprehensive tests for agent chat session persistence following the interview persistence pattern.

## Type Definitions to Test

```typescript
export interface ChatSession {
  id: string // sessionId (UUID v4)
  agentId: string
  organizationId: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface ChatMessage {
  id: string // UUID v4
  role: 'user' | 'agent'
  content: string
  timestamp: Date
  tokensUsed?: number // Optional: Track LLM token usage
}
```

## Test Files to Generate

### 1. Persistence Layer Tests: `tests/services/persistence/chat.spec.ts`

Test the three persistence functions in `app/server/services/persistence/filesystem.ts`:

#### `saveChatSession(session: ChatSession): Promise<void>`

**Success Cases:**

- Creates directory structure: `data/organizations/{orgId}/chats/{agentId}/`
- Saves session file: `{sessionId}.json`
- Converts Date fields to ISO strings (createdAt, updatedAt, message timestamps)
- Handles empty messages array
- Handles messages with and without tokensUsed field
- Creates nested directories recursively

**Error Cases:**

- Logs error if write fails
- Throws error on permission denied
- Handles invalid file paths

#### `loadChatSession(agentId: string, sessionId: string, orgId: string): Promise<ChatSession | null>`

**Success Cases:**

- Loads existing session from filesystem
- Converts ISO strings back to Date objects (createdAt, updatedAt, message timestamps)
- Preserves all message fields
- Preserves optional tokensUsed field
- Handles sessions with multiple messages
- Handles sessions with empty messages array

**Error Cases:**

- Returns null for non-existent session (ENOENT)
- Logs error for other failures
- Throws error on invalid JSON
- Handles corrupted file data

**Edge Cases:**

- Session file exists but empty
- Invalid sessionId format
- Mismatched agentId in file vs parameter

#### `loadChatSessions(agentId: string, orgId: string): Promise<ChatSession[]>`

**Success Cases:**

- Returns array of all sessions for agent
- Sorts sessions by updatedAt descending (most recent first)
- Loads multiple session files correctly
- Converts all Date fields properly
- Returns empty array if agent chats directory doesn't exist
- Handles mix of sessions with different message counts

**Error Cases:**

- Returns empty array for non-existent directory (ENOENT)
- Skips non-JSON files in directory
- Logs error for other failures
- Handles directory with some corrupted files

**Edge Cases:**

- Agent has no sessions (empty directory)
- Agent directory doesn't exist
- Directory contains non-JSON files (.DS_Store, etc.)
- Sessions with same updatedAt timestamp

### 2. API Endpoint Tests: `tests/api/agents-chat-persistence.spec.ts`

Test the API endpoints for chat session management.

#### POST `/api/agents/[id]/chat` (Modified Endpoint)

**Success Cases - New Session:**

- Creates new session when sessionId not provided
- Generates UUID v4 for sessionId
- Saves user message to session
- Saves agent response to session
- Sets createdAt and updatedAt timestamps
- Returns sessionId in response
- Persists session to filesystem

**Success Cases - Existing Session:**

- Loads existing session when sessionId provided
- Appends new messages to existing session
- Updates updatedAt timestamp
- Preserves previous messages
- Maintains message order (chronological)

**Token Tracking:**

- Stores tokensUsed in agent message
- Retrieves token count from LLM response
- Optional field (undefined if not available)

**Error Cases:**

- Returns 404 if sessionId provided but session not found (creates new instead)
- Handles persistence failures gracefully
- Logs errors appropriately

#### GET `/api/agents/[id]/chats`

**Success Cases:**

- Returns array of all sessions for agent
- Sessions sorted by updatedAt descending
- Each session includes all fields (id, agentId, organizationId, messages, createdAt, updatedAt)
- Returns empty array if agent has no sessions
- Filters by agentId correctly

**Error Cases:**

- Returns 400 if agentId missing
- Returns 404 if agent doesn't exist
- Returns 500 on filesystem errors
- Logs errors with context

**Edge Cases:**

- Agent exists but has no chats
- Multiple agents, only returns sessions for specified agent

#### GET `/api/agents/[id]/chats/[sessionId]`

**Success Cases:**

- Returns specific session by sessionId
- Includes all messages in chronological order
- Includes all session metadata
- Validates agentId matches session.agentId

**Error Cases:**

- Returns 400 if agentId or sessionId missing
- Returns 404 if agent doesn't exist
- Returns 404 if session doesn't exist
- Returns 500 on filesystem errors
- Logs errors with context

**Security:**

- Prevents accessing sessions from different agents
- Validates sessionId format (UUID)

## Test Data Requirements

### Sample Organizations

- Valid orgId: `537ba67e-0e50-47f7-931d-360b547efe90`

### Sample Agents

- Valid agent with multiple sessions
- Valid agent with no sessions
- Non-existent agentId

### Sample Sessions

- Session with 1 message exchange (user + agent)
- Session with multiple exchanges (10+ messages)
- Session with empty messages array
- Session with tokensUsed in all agent messages
- Session with no tokensUsed (older format)

### Sample Messages

- User message: short (10 words)
- User message: long (200 words)
- Agent message with tokensUsed
- Agent message without tokensUsed

## Mocking Requirements

### File System Operations

- Mock `writeFile` for save tests
- Mock `readFile` for load tests
- Mock `readdir` for list tests
- Mock `mkdir` for directory creation
- Mock ENOENT errors for non-existent paths

### Logger

- Mock all logger methods (info, error, warn, debug)
- Verify log calls with correct context

### LLM Service (for chat.post.ts tests)

- Mock `generateCompletion` return value
- Include tokensUsed in response
- Simulate various response content

### Agent Data

- Mock `agents` array with test data
- Include agent with valid organizationId

## Validation Checklist

Each test MUST verify:

- [ ] All required fields present in saved data
- [ ] Date conversions (Date ↔ ISO string) correct
- [ ] UUID v4 format for all IDs
- [ ] Message ordering preserved (chronological)
- [ ] Optional fields (tokensUsed) handled correctly
- [ ] Error logging includes context (agentId, sessionId, orgId)
- [ ] Empty arrays handled (no sessions, no messages)
- [ ] Filesystem operations use correct paths
- [ ] API responses include proper HTTP status codes
- [ ] Type safety maintained (no `any` types)

## Reference Files for Patterns

- `tests/services/persistence/filesystem.spec.ts` - Interview persistence tests (SIMILAR PATTERN)
- `tests/api/interview.spec.ts` - Interview API tests
- `app/server/services/persistence/filesystem.ts` - Existing persistence functions (saveInterview, loadInterview, loadInterviews)
- `app/server/api/agents/[id]/chat.post.ts` - Current chat endpoint (TO BE MODIFIED)

## Expected Test Structure

```typescript
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  saveChatSession,
  loadChatSession,
  loadChatSessions
} from '~/server/services/persistence/filesystem'
import type { ChatSession, ChatMessage } from '~/server/services/persistence/chat-types'

describe('Chat Persistence', () => {
  describe('saveChatSession', () => {
    test('saves session with all fields to filesystem', async () => {
      // Test implementation
    })
    // More tests...
  })

  describe('loadChatSession', () => {
    test('loads existing session from filesystem', async () => {
      // Test implementation
    })
    // More tests...
  })

  describe('loadChatSessions', () => {
    test('loads all sessions for agent sorted by updatedAt', async () => {
      // Test implementation
    })
    // More tests...
  })
})
```

## Success Criteria

- [ ] All persistence functions fully tested
- [ ] All API endpoints fully tested
- [ ] Edge cases covered (empty arrays, missing files, etc.)
- [ ] Error cases tested with proper mocking
- [ ] Type safety verified (no type errors)
- [ ] All tests pass initially (may fail until implementation complete)
- [ ] Test coverage for new code: 100%
- [ ] Tests follow existing patterns from interview persistence

## Constitutional Requirements

- **Type Safety**: All test data properly typed, no `any`
- **No Emojis**: Use text markers: `[ERROR]`, `[INFO]`, `[SUCCESS]`
- **Markdown Quality**: Code blocks have language identifiers
- **Observable**: Tests verify logging calls with proper context
- **Test-First**: Generate these tests BEFORE implementation
