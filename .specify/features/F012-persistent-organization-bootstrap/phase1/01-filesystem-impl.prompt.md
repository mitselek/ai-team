# Task 1.3: Implement Filesystem Persistence Module

## Context

You are implementing the filesystem persistence layer for the AI Team system. This module provides save/load functions for organizations, teams, agents, and interview sessions. All data is stored as JSON files in a structured directory hierarchy.

## Critical Constraints

- **DO NOT MODIFY** `types/index.ts` - All types are already defined
- **USE** types from `@@/types` for Organization, Team, Agent
- **USE** types from `../persistence/types.ts` for InterviewSession
- **FOLLOW** existing patterns from `app/server/utils/logger.ts` for logging
- **USE** `fs/promises` for async file operations
- **HANDLE** errors gracefully - return null instead of throwing

## Type Definitions to Use

```typescript
// From types/index.ts
export interface Organization {
  id: string
  name: string
  githubRepoUrl: string
  tokenPool: number
  rootAgentId: string | null
  createdAt: Date
}

export interface Team {
  id: string
  name: string
  organizationId: string
  leaderId: string | null
  tokenAllocation: number
  type: TeamType
}

export type TeamType = 'hr' | 'toolsmith' | 'library' | 'vault' | 'tools-library' | 'nurse'

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

export type AgentStatus = 'active' | 'inactive' | 'archived'
```

## File to Create

**Path**: `app/server/services/persistence/filesystem.ts`

## Implementation Requirements

### Functions to Implement

1. **saveOrganization(org: Organization): Promise<void>**
   - Create directory: `data/organizations/{org.id}/`
   - Write file: `data/organizations/{org.id}/manifest.json`
   - Use `JSON.stringify(obj, null, 2)` for readable formatting
   - Convert Date to ISO string before saving
   - Create parent directories if they don't exist

2. **loadOrganization(orgId: string): Promise<Organization | null>**
   - Read file: `data/organizations/{orgId}/manifest.json`
   - Parse JSON and reconstruct Date objects
   - Return null if file doesn't exist (don't throw)

3. **listOrganizations(): Promise<string[]>**
   - Read `data/organizations/` directory
   - Return array of organization IDs (directory names)
   - Return empty array if directory doesn't exist
   - Filter out non-directories (like .gitkeep)

4. **saveTeam(team: Team): Promise<void>**
   - Write file: `data/organizations/{team.organizationId}/teams/{team.id}.json`
   - Create directories if needed

5. **loadTeams(orgId: string): Promise<Team[]>**
   - Read all files from: `data/organizations/{orgId}/teams/`
   - Parse each JSON file
   - Return empty array if directory doesn't exist

6. **saveAgent(agent: Agent): Promise<void>**
   - Write file: `data/organizations/{agent.organizationId}/agents/{agent.id}.json`
   - Convert Date fields (createdAt, lastActiveAt) to ISO strings

7. **loadAgents(orgId: string): Promise<Agent[]>**
   - Read all files from: `data/organizations/{orgId}/agents/`
   - Reconstruct Date objects from ISO strings
   - Return empty array if directory doesn't exist

8. **saveInterview(session: InterviewSession): Promise<void>**
   - Write file: `data/organizations/{orgId}/interviews/{session.id}.json`
   - Note: orgId must be derived from session (find agent's organizationId)
   - Convert all Date fields in transcript entries

9. **loadInterview(sessionId: string): Promise<InterviewSession | null>**
   - Search all orgs for interview file
   - Return null if not found
   - Reconstruct all Date objects

10. **loadInterviews(orgId: string): Promise<InterviewSession[]>**
    - Read all files from: `data/organizations/{orgId}/interviews/`
    - Return empty array if directory doesn't exist

### Implementation Patterns

#### Date Serialization

```typescript
// Saving
const json = JSON.stringify(
  {
    ...org,
    createdAt: org.createdAt.toISOString()
  },
  null,
  2
)

// Loading
const data = JSON.parse(content)
return {
  ...data,
  createdAt: new Date(data.createdAt)
}
```

#### Directory Creation

```typescript
import { mkdir } from 'fs/promises'

await mkdir(path, { recursive: true })
```

#### Error Handling

```typescript
import { createLogger } from '../../utils/logger'

const log = createLogger('persistence:filesystem')

try {
  // operation
} catch (error: unknown) {
  log.error({ error, orgId }, 'Failed to save organization')
  throw error // Re-throw after logging
}

// For load operations that should return null:
try {
  // read file
} catch (error: any) {
  if (error.code === 'ENOENT') {
    return null // File doesn't exist
  }
  log.error({ error, orgId }, 'Failed to load organization')
  throw error
}
```

#### Reading Directory

```typescript
import { readdir } from 'fs/promises'

try {
  const entries = await readdir(path, { withFileTypes: true })
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  return dirs
} catch (error: any) {
  if (error.code === 'ENOENT') {
    return [] // Directory doesn't exist
  }
  throw error
}
```

## Reference Files

- `app/server/utils/logger.ts` - Logging pattern
- `types/index.ts` - Type definitions (DO NOT MODIFY)
- `app/server/services/persistence/types.ts` - Interface definitions

## Validation Checklist

After implementation, verify:

- [ ] TypeScript compiles without errors
- [ ] All 10 functions implemented
- [ ] Date serialization/deserialization working
- [ ] Error handling with structured logging
- [ ] Directories created automatically
- [ ] Missing files return null (not throw)
- [ ] Empty directories return empty arrays

## Special Notes

- **For saveInterview**: You'll need to determine the orgId. This can be done by loading the agent specified in `session.interviewerId` and using their `organizationId` field.
- **For loadInterview**: Since you only have sessionId, you may need to search across all organizations. Alternatively, encode orgId in the search pattern.
- **Logging**: Use structured logging with context (orgId, teamId, etc.) not plain strings

## Output

Generate the complete implementation for `app/server/services/persistence/filesystem.ts` following all requirements above.
