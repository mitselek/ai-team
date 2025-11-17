# Development Task: Create WorkspacePermissionService

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create a new service `WorkspacePermissionService` in the orchestrator layer to handle all workspace folder permission validation. This service will be used by the orchestrator to validate permissions BEFORE calling MCP layer tools.

**This is F068-1: Foundation phase** - Create the service WITHOUT modifying any existing code. The service will be integrated later.

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final. Use EXACTLY as defined.
- **ANY existing files** - This task ONLY creates ONE new file
- **Existing permission logic** - Do not touch WorkspaceAccessService or FilesystemService
- **.specify/memory/constitution.md** - Follow all 12 constitutional principles

### MUST USE

- **Import paths** - CRITICAL: Follow these rules EXACTLY:
  - **Project types**: ALWAYS use `import type { Agent, Team } from '@@/types'`
  - **Services/data stores**: Use relative paths `../../../server/data/agents`
  - **NEVER use `~` or `@`** for service/utility imports
- **Type-only imports** - For types/interfaces use `import type { ... }`
- **Structured logging** - Import and use `createLogger` from `../../../server/utils/logger`
- **Error handling** - Wrap operations in try-catch, use `error: unknown`
- **Filesystem checks** - Use `promises as fs` from 'fs' for folder existence

## Type Definitions to Use

```typescript
// From types/index.ts
interface Agent {
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
  maxFiles?: number
  storageQuotaMB?: number
  toolWhitelist?: string[]
}

interface Team {
  id: string
  name: string
  description?: string
  organizationId: string
  leaderId: string | null
  tokenAllocation: number
  type: TeamType
  maxFiles?: number
  storageQuotaGB?: number
  toolWhitelist?: string[]
}

type AgentStatus = 'active' | 'bored' | 'stuck' | 'paused'
type TeamType =
  | 'hr'
  | 'toolsmith'
  | 'library'
  | 'vault'
  | 'tools-library'
  | 'nurse'
  | 'post-office'
  | 'custom'
```

## Service Interface Requirements

```typescript
export interface PermissionResult {
  allowed: boolean
  reason?: string
}

export class WorkspacePermissionService {
  /**
   * Validates if agent can access a folder+scope combination
   * @param agentId - Agent making the request
   * @param folderId - Agent or team UUID
   * @param scope - 'private' or 'shared'
   * @param operation - 'read' or 'write'
   * @param organizationId - Organization context
   * @returns Promise<PermissionResult>
   */
  async validateAccess(
    agentId: string,
    folderId: string,
    scope: 'private' | 'shared',
    operation: 'read' | 'write',
    organizationId: string
  ): Promise<PermissionResult>

  /**
   * Checks if folder exists on filesystem
   * @param organizationId - Organization ID
   * @param folderId - Agent or team UUID
   * @returns Promise<boolean>
   */
  async folderExists(organizationId: string, folderId: string): Promise<boolean>

  /**
   * Checks if folder can be created (own or team folder)
   * @param agentId - Agent making request
   * @param folderId - Folder to create
   * @param organizationId - Organization context
   * @returns Promise<PermissionResult>
   */
  async canCreateFolder(
    agentId: string,
    folderId: string,
    organizationId: string
  ): Promise<PermissionResult>
}
```

## Permission Rules to Implement

### Own Folder (folderId === agentId)

**Private Scope:**

- Owner: read ✅, write ✅
- Others: read ❌, write ❌

**Shared Scope:**

- Owner: read ✅, write ✅
- Team members: read ✅, write ❌
- Leadership team: read ✅, write ❌
- Others: read ❌, write ❌

### Team Folder (folderId === agent.teamId)

**Private Scope:**

- Team members: read ✅, write ✅
- Others: read ❌, write ❌

**Shared Scope:**

- Team members: read ✅, write ✅
- All org members (same organizationId): read ✅, write ❌
- Leadership team: read ✅, write ❌

### Other Agent Folder (folderId is another agent's ID)

**Shared Scope only:**

- Same team members: read ✅, write ❌
- Leadership team: read ✅, write ❌
- Others: read ❌, write ❌

### Other Team Folder (folderId is another team's ID)

**Shared Scope only:**

- All org members: read ✅, write ❌
- Leadership team: read ✅, write ❌

## Leadership Team Detection

A team is considered "leadership" if:

- Team name contains "Leadership" (case-insensitive)
- OR team.type === 'custom' AND name includes "Leadership"

Leadership team members have read access to ALL shared folders in the organization.

## Data Store Access

```typescript
import { agents } from '../../../server/data/agents'
import { teams } from '../../../server/data/teams'

// Find agent
const agent = agents.find((a) => a.id === agentId && a.organizationId === organizationId)

// Find team
const team = teams.find((t) => t.id === teamId && t.organizationId === organizationId)
```

## Filesystem Path Construction

```typescript
import { join } from 'path'

const basePath = join(
  process.cwd(),
  'data',
  'organizations',
  organizationId,
  'workspaces',
  folderId
)

// Check existence
import { promises as fs } from 'fs'
try {
  await fs.access(basePath)
  return true
} catch {
  return false
}
```

## Logging Requirements

Follow Constitutional Principle VII (Observable Development):

```typescript
import { createLogger, newCorrelationId } from '../../../server/utils/logger'

const logger = createLogger('WorkspacePermissionService')

// Log permission checks
logger.info('Permission check', {
  agentId,
  folderId,
  scope,
  operation,
  result: allowed ? 'allowed' : 'denied',
  reason,
  correlationId: newCorrelationId()
})
```

## Error Handling

```typescript
try {
  // Permission logic
} catch (error: unknown) {
  logger.error('Permission validation error', {
    error: error instanceof Error ? error.message : String(error),
    agentId,
    folderId
  })
  return { allowed: false, reason: 'Internal error during permission check' }
}
```

## Reference Files

Look at these existing files for patterns:

- `app/server/services/persistence/workspace-access.ts` - Current permission logic (pattern to improve)
- `app/server/services/orchestrator.ts` - Where this service will be called
- `app/server/data/agents.ts` - Agent data store
- `app/server/data/teams.ts` - Team data store

## Expected Output

Create ONLY this file:

**File:** `app/server/services/orchestrator/workspace-permission.ts`

**Structure:**

```typescript
import type { Agent, Team } from '@@/types'
import { agents } from '../../../server/data/agents'
import { teams } from '../../../server/data/teams'
import { promises as fs } from 'fs'
import { join } from 'path'
import { createLogger, newCorrelationId } from '../../../server/utils/logger'

const logger = createLogger('WorkspacePermissionService')

export interface PermissionResult {
  allowed: boolean
  reason?: string
}

export class WorkspacePermissionService {
  // Implement three methods as specified above
}

// Export singleton instance
export const workspacePermissionService = new WorkspacePermissionService()
```

## Helper Methods Needed

You'll likely need these private helper methods:

```typescript
private isLeadershipTeam(team: Team): boolean {
  // Check if team is leadership
}

private async getAgent(agentId: string, organizationId: string): Promise<Agent | undefined> {
  // Find agent in data store
}

private async getTeam(teamId: string, organizationId: string): Promise<Team | undefined> {
  // Find team in data store
}

private isAgentInTeam(agent: Agent, teamId: string): boolean {
  // Check team membership
}

private isAgentInLeadership(agent: Agent, organizationId: string): boolean {
  // Check if agent is in leadership team
}
```

## Validation Checklist

Before finishing, verify:

- [ ] File created at: `app/server/services/orchestrator/workspace-permission.ts`
- [ ] Uses `import type { Agent, Team } from '@@/types'`
- [ ] Uses relative paths for data stores: `../../../server/data/...`
- [ ] Implements all 3 public methods (validateAccess, folderExists, canCreateFolder)
- [ ] Exports PermissionResult interface
- [ ] Exports singleton instance
- [ ] Structured logging with correlationId
- [ ] Error handling with try-catch
- [ ] All permission rules implemented correctly
- [ ] Leadership team detection works
- [ ] Filesystem existence checks work
- [ ] TypeScript strict mode compatible
- [ ] No modifications to ANY other files

## Success Criteria

- [ ] File created at correct path
- [ ] No TypeScript errors
- [ ] Can be imported without errors
- [ ] Tests in `tests/services/orchestrator/workspace-permission.spec.ts` will pass
- [ ] Follows Constitutional Principles (especially III, V, VII)
- [ ] Ready for integration in Phase 2 (F068-4)

## Notes

- This is a FOUNDATION task - we're building the service WITHOUT integrating it
- The service will be called by orchestrator in a later phase
- Tests already exist (or will be generated) - implementation must match test expectations
- Focus on correctness and clarity over optimization
- Use defensive programming - validate inputs, handle edge cases
- Log permission decisions for debugging and auditing

## Git Workflow

After completion:

```bash
git status  # Verify only one new file
git add app/server/services/orchestrator/workspace-permission.ts
git status  # Verify staged changes
git commit -m "feat(orchestrator): add WorkspacePermissionService (F068-1)

- Implement UUID-based permission validation
- Support private/shared scope access rules
- Handle agent own, team, and cross-team permissions
- Leadership team has read access to all shared folders
- Folder existence and creation validation
- Structured logging for all permission checks

Related to nr 68, nr 69"
```

## Output Formatting (MANDATORY)

When describing what you are doing:

- Use blank lines between major steps
- One action or result per line
- Use fenced code blocks for any code or commands
- Keep lines under ~100 characters
- Structure as: Action → Result → Next

Example:

```text
== Implementation ==

Action: Creating WorkspacePermissionService class
Result: File created at app/server/services/orchestrator/workspace-permission.ts

Action: Implementing validateAccess method
Result: Added permission logic for all scope combinations

Action: Adding helper methods
Result: Created 5 private helper methods for permission checks

Next: Verifying TypeScript compilation
```
