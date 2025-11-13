# Task: Create Chat Session Type Definitions

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create type definitions for chat session persistence. These types will be used by the persistence layer and API endpoints to store and retrieve agent chat conversations.

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **Constitution principles** - Read .specify/memory/constitution.md and follow all 12 principles
- **Existing test patterns** - Match the style in existing persistence types

### MUST USE

- **Type-only exports** - Export types with `export interface` or `export type`
- **Date types** - Use `Date` not `string` for timestamps
- **UUID format** - All IDs are UUID v4 strings
- **Optional fields** - Use `?:` for optional properties (tokensUsed)
- **No emojis** - Never in code, comments, or type documentation

## Reference Pattern

Look at existing persistence types:

**app/server/services/persistence/types.ts** (Interview types):

```typescript
export interface InterviewSession {
  id: string
  organizationId: string
  candidateProfile: CandidateProfile
  // ... more fields
  transcript: InterviewMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface InterviewMessage {
  id: string
  speaker: 'interviewer' | 'requester'
  message: string
  timestamp: Date
  metadata?: InterviewMessageMetadata
  speakerLLM?: string
}
```

## Type Specifications

Create TWO interfaces following this exact structure:

### ChatSession

Properties (ALL required unless marked optional):

- `id`: string (sessionId, UUID v4)
- `agentId`: string (UUID v4 of agent)
- `organizationId`: string (UUID v4 of organization)
- `messages`: array of ChatMessage
- `createdAt`: Date (when session started)
- `updatedAt`: Date (when session last modified)

### ChatMessage

Properties (ALL required unless marked optional):

- `id`: string (message ID, UUID v4)
- `role`: 'user' | 'agent' (literal union type)
- `content`: string (message text)
- `timestamp`: Date (when message sent)
- `tokensUsed`: number | undefined (optional - LLM token count)

## Expected Output

Create ONLY this file:

**app/server/services/persistence/chat-types.ts**

File contents:

```typescript
// Type definitions for chat session persistence

export interface ChatSession {
  // Properties here
}

export interface ChatMessage {
  // Properties here
}
```

## Validation Checklist

Before finishing, verify:

- [ ] File created at: `app/server/services/persistence/chat-types.ts`
- [ ] Both interfaces exported
- [ ] All properties defined with correct types
- [ ] Date types used (not string)
- [ ] Role uses literal union type ('user' | 'agent')
- [ ] tokensUsed is optional (?: syntax)
- [ ] No emojis in code or comments
- [ ] No imports needed (pure type definitions)
- [ ] TypeScript strict mode compatible

## Success Criteria

- File created at specified path
- Two interfaces exported: ChatSession, ChatMessage
- All properties match specification exactly
- Can be imported with: `import type { ChatSession, ChatMessage } from './chat-types'`
- No type errors

## Notes

- This is a pure type definition file - no logic, no imports
- These types mirror the interview persistence pattern
- Types will be used by persistence layer and API endpoints
- Keep it simple and focused

## Constitutional Requirements

- **Type Safety First**: All properties explicitly typed
- **No Emojis**: Use text markers if needed: [ERROR], [INFO]
- **Markdown Quality**: Code blocks have language identifiers
