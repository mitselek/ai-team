# Task: Add Chat Persistence Functions to Filesystem Layer

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Add three persistence functions to the existing filesystem.ts file for managing chat sessions. Follow the EXACT pattern used for interview persistence (saveInterview, loadInterview, loadInterviews).

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final
- **Existing functions** - Do not modify saveInterview, loadInterview, etc.
- **Constitution principles** - Read .specify/memory/constitution.md

### MUST USE

- **Import paths** - For chat types use: `import type { ChatSession, ChatMessage } from './chat-types'`
- **Type-only imports** - Use `import type { }` for types
- **Existing patterns** - Mirror saveInterview/loadInterview/loadInterviews exactly
- **Structured logging** - Use existing `log` from createLogger('persistence:filesystem')
- **Error handling** - Use `error: unknown`, try-catch blocks
- **Directory helper** - Use existing `ensureDir()` function
- **Date conversion** - toISOString() when saving, new Date() when loading

## Reference Pattern (MIRROR THIS)

**app/server/services/persistence/filesystem.ts** (Interview functions - lines 183-270):

```typescript
export async function saveInterview(session: InterviewSession): Promise<void> {
  const orgId = await getOrgIdForInterview(session)
  if (!orgId) {
    throw new Error(`Could not find organization for interviewer ${session.interviewerId}`)
  }

  const interviewDir = path.join(DATA_DIR, orgId, 'interviews')
  await ensureDir(interviewDir)
  const filePath = path.join(interviewDir, `${session.id}.json`)

  const data = {
    ...session,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    transcript: session.transcript.map((t) => ({
      ...t,
      timestamp: t.timestamp.toISOString()
    }))
  }

  try {
    await writeFile(filePath, JSON.stringify(data, null, 2))
  } catch (error: unknown) {
    log.error({ error, sessionId: session.id, orgId }, 'Failed to save interview session')
    throw error
  }
}

export async function loadInterview(sessionId: string): Promise<InterviewSession | null> {
  const orgIds = await listOrganizations()
  for (const orgId of orgIds) {
    const filePath = path.join(DATA_DIR, orgId, 'interviews', `${sessionId}.json`)
    try {
      const content = await readFile(filePath, 'utf-8')
      const data = JSON.parse(content)
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        transcript: data.transcript.map(
          (t: InterviewMessage): InterviewMessage => ({
            ...t,
            timestamp: new Date(t.timestamp)
          })
        )
      }
    } catch (error: unknown) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
        log.error({ error, sessionId, orgId }, 'Failed to load interview')
        throw error
      }
    }
  }
  return null
}

export async function loadInterviews(orgId: string): Promise<InterviewSession[]> {
  const interviewDir = path.join(DATA_DIR, orgId, 'interviews')
  try {
    const files = await readdir(interviewDir)
    const sessions: InterviewSession[] = []
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await readFile(path.join(interviewDir, file), 'utf-8')
        const data = JSON.parse(content)
        sessions.push({
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          transcript: data.transcript.map(
            (t: InterviewMessage): InterviewMessage => ({
              ...t,
              timestamp: new Date(t.timestamp)
            })
          )
        })
      }
    }
    // Sort by updatedAt descending
    return sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return []
    }
    log.error({ error, orgId }, 'Failed to load interviews')
    throw error
  }
}
```

## Function Specifications

Add these THREE functions to the BOTTOM of filesystem.ts (after interview functions):

### 1. saveChatSession(session: ChatSession): Promise<void>

Storage path: `data/organizations/{orgId}/chats/{agentId}/{sessionId}.json`

Steps:

1. Extract orgId from session.organizationId (already provided in session)
2. Build directory path: `DATA_DIR/orgId/chats/agentId/`
3. Call ensureDir() to create directory
4. Build file path: `{chatDir}/{sessionId}.json`
5. Convert Dates to ISO strings:
   - session.createdAt → toISOString()
   - session.updatedAt → toISOString()
   - Each message.timestamp → toISOString()
6. Write file with JSON.stringify(data, null, 2)
7. Try-catch: Log error with {error, sessionId, agentId, orgId} context
8. Throw error on failure

### 2. loadChatSession(agentId: string, sessionId: string, orgId: string): Promise<ChatSession | null>

Steps:

1. Build file path: `DATA_DIR/orgId/chats/agentId/${sessionId}.json`
2. Try to read file
3. Parse JSON
4. Convert ISO strings back to Dates:
   - data.createdAt → new Date()
   - data.updatedAt → new Date()
   - Each message.timestamp → new Date()
5. Return ChatSession
6. Catch ENOENT → return null (file not found)
7. Catch other errors → log with {error, sessionId, agentId, orgId}, throw error

### 3. loadChatSessions(agentId: string, orgId: string): Promise<ChatSession[]>

Steps:

1. Build directory path: `DATA_DIR/orgId/chats/agentId/`
2. Read directory (readdir)
3. For each .json file:
   - Read file content
   - Parse JSON
   - Convert ISO strings to Dates (createdAt, updatedAt, message timestamps)
   - Push to sessions array
4. Sort sessions by updatedAt descending (most recent first)
5. Return sessions array
6. Catch ENOENT → return [] (directory doesn't exist)
7. Catch other errors → log with {error, agentId, orgId}, throw error

## Expected Output

Modify ONLY this file:

**app/server/services/persistence/filesystem.ts**

Add at the bottom (after loadInterviews):

```typescript
// --- Chat ---

export async function saveChatSession(session: ChatSession): Promise<void> {
  // Implementation here
}

export async function loadChatSession(
  agentId: string,
  sessionId: string,
  orgId: string
): Promise<ChatSession | null> {
  // Implementation here
}

export async function loadChatSessions(agentId: string, orgId: string): Promise<ChatSession[]> {
  // Implementation here
}
```

## Validation Checklist

Before finishing, verify:

- [ ] Import added: `import type { ChatSession, ChatMessage } from './chat-types'`
- [ ] Three functions added at bottom of file
- [ ] All functions exported
- [ ] Date conversions correct (Date ↔ ISO string)
- [ ] Error logging includes full context (sessionId, agentId, orgId)
- [ ] ENOENT errors handled (return null or [])
- [ ] Directory creation uses existing ensureDir()
- [ ] JSON writing uses 2-space indent: JSON.stringify(data, null, 2)
- [ ] Sessions sorted by updatedAt descending in loadChatSessions
- [ ] Error types are `error: unknown` not `error: any`
- [ ] No modifications to existing functions

## Success Criteria

- Three functions added to filesystem.ts
- Functions mirror interview persistence pattern exactly
- Type-safe (no type errors)
- Follows existing code style
- No breaking changes to existing code

## Notes

- These functions are nearly identical to interview functions
- Only differences:
  - Path: `/chats/{agentId}/` instead of `/interviews/`
  - No need for getOrgIdForInterview (orgId passed directly)
  - Type is ChatSession instead of InterviewSession
  - Message array is `messages` not `transcript`
- Use existing helpers: ensureDir, DATA_DIR constant
- Use existing logger: `log` variable

## Constitutional Requirements

- **Type Safety First**: All types explicit, no `any`
- **No Emojis**: Use text markers: [ERROR], [INFO]
- **Observable Development**: Log all errors with full context
- **Error handling**: Always use `error: unknown` in catch blocks
