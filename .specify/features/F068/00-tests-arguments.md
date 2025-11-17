# F068-1: WorkspacePermissionService - Test Requirements

**Issue:** [#69](https://github.com/mitselek/ai-team/issues/69)  
**Task:** Generate comprehensive tests for WorkspacePermissionService

## Service Location

**File to test:** `app/server/services/orchestrator/workspace-permission.ts`

## Type Definitions

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

## Service Interface (Expected)

```typescript
interface WorkspacePermissionService {
  /**
   * Validates if agent can access a folder+scope combination
   * @param agentId - Agent making the request
   * @param folderId - Agent or team UUID
   * @param scope - 'private' or 'shared'
   * @param operation - 'read' or 'write'
   * @param organizationId - Organization context
   * @returns { allowed: boolean, reason?: string }
   */
  validateAccess(
    agentId: string,
    folderId: string,
    scope: 'private' | 'shared',
    operation: 'read' | 'write',
    organizationId: string
  ): Promise<{ allowed: boolean; reason?: string }>

  /**
   * Checks if folder exists on filesystem
   * @param organizationId - Organization ID
   * @param folderId - Agent or team UUID
   * @returns boolean
   */
  folderExists(organizationId: string, folderId: string): Promise<boolean>

  /**
   * Checks if folder can be created (own or team folder)
   * @param agentId - Agent making request
   * @param folderId - Folder to create
   * @param organizationId - Organization context
   * @returns { allowed: boolean, reason?: string }
   */
  canCreateFolder(
    agentId: string,
    folderId: string,
    organizationId: string
  ): Promise<{ allowed: boolean; reason?: string }>
}
```

## Test File Location

**Create:** `tests/services/orchestrator/workspace-permission.spec.ts`

## Required Test Coverage

### 1. Agent's Own Folder - Private Scope

**Success Cases:**

- Agent can read from own private folder
- Agent can write to own private folder

**Failure Cases:**

- Other agent cannot read from private folder
- Other agent cannot write to private folder
- Team member cannot access agent's private folder (unless leadership)

### 2. Agent's Own Folder - Shared Scope

**Success Cases:**

- Agent (owner) can read/write own shared folder
- Team members can read agent's shared folder
- Leadership team can read agent's shared folder

**Failure Cases:**

- Non-team members cannot read shared folder (unless leadership)
- Non-team members cannot write to shared folder

### 3. Team Folder - Private Scope

**Success Cases:**

- Team members can read team private folder
- Team members can write to team private folder

**Failure Cases:**

- Non-team members cannot read team private folder
- Non-team members cannot write to team private folder
- Other agents cannot access team private folder

### 4. Team Folder - Shared Scope

**Success Cases:**

- Any org member can read team shared folder
- Team members can write to team shared folder
- Leadership can read team shared folder

**Failure Cases:**

- Non-team members cannot write to team shared folder (unless leadership)
- Cross-org access denied (different organizationId)

### 5. Another Agent's Folder - Shared Scope

**Success Cases:**

- Team members can read peer agent's shared folder
- Leadership can read any agent's shared folder

**Failure Cases:**

- Non-team members cannot read peer agent's shared folder
- Cannot write to another agent's shared folder

### 6. Folder Existence Checks

**Success Cases:**

- folderExists returns true for existing folders
- folderExists returns false for non-existent folders

**Test Data:**

- Mock filesystem with sample folder structure
- Use data/organizations/{orgId}/workspaces/{folderId}/ pattern

### 7. Folder Creation Rules

**Success Cases:**

- Agent can create own folder (agentId === folderId)
- Agent can create team folder (agent.teamId === folderId)

**Failure Cases:**

- Agent cannot create other agent's folder
- Agent cannot create other team's folder

### 8. Edge Cases

**Test:**

- Invalid agentId (not found)
- Invalid folderId format
- Invalid scope value
- Invalid operation value
- Missing organizationId
- Agent without team (teamId = null or undefined)
- Team without leader

## Mock Data Requirements

### Test Agents

```typescript
const testAgent1: Agent = {
  id: 'agent-1',
  name: 'Agent One',
  role: 'worker',
  seniorId: null,
  teamId: 'team-1',
  organizationId: 'org-1',
  systemPrompt: 'Test prompt',
  tokenAllocation: 10000,
  tokenUsed: 0,
  status: 'active',
  createdAt: new Date(),
  lastActiveAt: new Date()
}

const testAgent2: Agent = {
  id: 'agent-2',
  name: 'Agent Two',
  role: 'worker',
  seniorId: null,
  teamId: 'team-1', // Same team as agent-1
  organizationId: 'org-1',
  systemPrompt: 'Test prompt',
  tokenAllocation: 10000,
  tokenUsed: 0,
  status: 'active',
  createdAt: new Date(),
  lastActiveAt: new Date()
}

const testAgent3: Agent = {
  id: 'agent-3',
  name: 'Agent Three',
  role: 'worker',
  seniorId: null,
  teamId: 'team-2', // Different team
  organizationId: 'org-1',
  systemPrompt: 'Test prompt',
  tokenAllocation: 10000,
  tokenUsed: 0,
  status: 'active',
  createdAt: new Date(),
  lastActiveAt: new Date()
}

const leadershipAgent: Agent = {
  id: 'agent-leader',
  name: 'Leadership Agent',
  role: 'leader',
  seniorId: null,
  teamId: 'team-leadership', // Leadership team
  organizationId: 'org-1',
  systemPrompt: 'Test prompt',
  tokenAllocation: 10000,
  tokenUsed: 0,
  status: 'active',
  createdAt: new Date(),
  lastActiveAt: new Date()
}
```

### Test Teams

```typescript
const testTeam1: Team = {
  id: 'team-1',
  name: 'Development Team',
  description: 'Development team',
  organizationId: 'org-1',
  leaderId: 'agent-1',
  tokenAllocation: 50000,
  type: 'custom'
}

const testTeam2: Team = {
  id: 'team-2',
  name: 'Support Team',
  description: 'Support team',
  organizationId: 'org-1',
  leaderId: 'agent-3',
  tokenAllocation: 50000,
  type: 'custom'
}

const leadershipTeam: Team = {
  id: 'team-leadership',
  name: 'Leadership Team',
  description: 'Leadership team',
  organizationId: 'org-1',
  leaderId: 'agent-leader',
  tokenAllocation: 100000,
  type: 'custom'
}
```

## Mocking Requirements

### Mock Data Stores

```typescript
import { agents } from '../../../server/data/agents'
import { teams } from '../../../server/data/teams'

beforeEach(() => {
  agents.length = 0
  teams.length = 0

  // Push test data
  agents.push(testAgent1, testAgent2, testAgent3, leadershipAgent)
  teams.push(testTeam1, testTeam2, leadershipTeam)
})
```

### Mock Filesystem

```typescript
import { vi } from 'vitest'
import { promises as fs } from 'fs'

// Mock filesystem for folderExists checks
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(), // Mock to simulate folder existence
    mkdir: vi.fn()
  }
}))
```

### Mock Logger

```typescript
vi.mock('../../../server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  }),
  newCorrelationId: () => 'test-correlation-id'
}))
```

## Permission Rules to Test

### Own Folder (folderId === agentId)

**Private Scope:**

- Owner: read ✅, write ✅
- Others: read ❌, write ❌

**Shared Scope:**

- Owner: read ✅, write ✅
- Team members: read ✅, write ❌
- Leadership: read ✅, write ❌
- Others: read ❌, write ❌

### Team Folder (folderId === agent.teamId)

**Private Scope:**

- Team members: read ✅, write ✅
- Others: read ❌, write ❌

**Shared Scope:**

- Team members: read ✅, write ✅
- All org members: read ✅, write ❌
- Leadership: read ✅, write ❌

### Other Agent Folder (folderId is another agent's ID)

**Private Scope:**

- Not accessible (N/A)

**Shared Scope:**

- Same team: read ✅, write ❌
- Leadership: read ✅, write ❌
- Others: read ❌, write ❌

### Other Team Folder (folderId is another team's ID)

**Private Scope:**

- Not accessible (N/A)

**Shared Scope:**

- All org members: read ✅, write ❌
- Leadership: read ✅, write ❌

## Test Organization

```typescript
describe('WorkspacePermissionService', () => {
  describe('validateAccess', () => {
    describe('Own folder - private scope', () => {
      it('should allow owner to read own private folder', async () => {})
      it('should allow owner to write to own private folder', async () => {})
      it('should deny other agent read access to private folder', async () => {})
      it('should deny other agent write access to private folder', async () => {})
    })

    describe('Own folder - shared scope', () => {
      it('should allow owner to read own shared folder', async () => {})
      it('should allow owner to write to own shared folder', async () => {})
      it('should allow team member to read shared folder', async () => {})
      it('should deny team member write access to shared folder', async () => {})
      it('should allow leadership to read shared folder', async () => {})
      it('should deny non-team member access to shared folder', async () => {})
    })

    describe('Team folder - private scope', () => {
      it('should allow team member to read team private folder', async () => {})
      it('should allow team member to write to team private folder', async () => {})
      it('should deny non-team member access to team private folder', async () => {})
    })

    describe('Team folder - shared scope', () => {
      it('should allow team member to read team shared folder', async () => {})
      it('should allow team member to write to team shared folder', async () => {})
      it('should allow any org member to read team shared folder', async () => {})
      it('should deny non-team member write access to team shared folder', async () => {})
      it('should allow leadership to read team shared folder', async () => {})
    })

    describe('Other agent folder - shared scope', () => {
      it('should allow team member to read peer shared folder', async () => {})
      it('should deny team member write access to peer shared folder', async () => {})
      it('should allow leadership to read any agent shared folder', async () => {})
      it('should deny non-team member access to peer shared folder', async () => {})
    })

    describe('Other team folder - shared scope', () => {
      it('should allow any org member to read other team shared folder', async () => {})
      it('should deny non-team member write access to other team shared folder', async () => {})
    })
  })

  describe('folderExists', () => {
    it('should return true for existing folder', async () => {})
    it('should return false for non-existent folder', async () => {})
  })

  describe('canCreateFolder', () => {
    it('should allow agent to create own folder', async () => {})
    it('should allow agent to create team folder', async () => {})
    it('should deny agent creating other agent folder', async () => {})
    it('should deny agent creating other team folder', async () => {})
  })

  describe('Edge cases', () => {
    it('should handle invalid agentId', async () => {})
    it('should handle invalid folderId format', async () => {})
    it('should handle invalid scope', async () => {})
    it('should handle agent without team', async () => {})
  })
})
```

## Success Criteria

- [ ] All test cases pass with `npm test`
- [ ] 100% coverage of permission logic
- [ ] Tests use proper type imports from `@@/types`
- [ ] Logger mocked correctly
- [ ] Data stores cleaned in beforeEach
- [ ] Clear test descriptions
- [ ] No TypeScript errors
- [ ] Tests run non-interactively

## Notes

- Tests define the contract for the service
- Implementation will be created to satisfy these tests (TDD)
- Leadership team detection: team.type === 'custom' && team.name includes 'Leadership'
- Or use dedicated 'leadership' team type in future
