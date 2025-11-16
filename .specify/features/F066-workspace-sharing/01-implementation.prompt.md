# Implementation Task: Workspace Access Control System

## Context

You are implementing workspace sharing for an AI agent management system. Currently, all agent workspaces are isolated - even "shared" folders are private. This task implements proper access control so agents can collaborate across workspace boundaries according to 5 defined scopes.

## Critical Constraints

- **DO NOT MODIFY** `types/index.ts` - Types are already defined
- **MUST USE** exact type definitions provided below
- **MUST FOLLOW** existing code patterns in referenced files
- **MUST IMPLEMENT** all 5 folder scopes with proper permissions
- **MUST ADD** permission checks before all file operations

## Type Definitions (From types/index.ts)

```typescript
type FolderScope = 'my_private' | 'my_shared' | 'team_private' | 'team_shared' | 'org_shared'

interface Agent {
  id: string
  name: string
  role: string
  organizationId: string
  teamId?: string
  status: 'active' | 'inactive'
  systemPrompt: string
  createdAt: string
  updatedAt: string
}

interface Team {
  id: string
  name: string
  organizationId: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface FolderInfo {
  folderId: string
  folderName: string
  folderType: FolderScope
  path: string
  fileCount: number
}
```

## Reference Files

Study these existing implementations:

1. **app/server/services/mcp/file-server.ts** - Current list_folders implementation (lines 450-520)
2. **app/server/services/persistence/file-workspace.ts** - FilesystemService with file operations
3. **app/server/data/teams.ts** - Team data loading
4. **app/server/data/agents.ts** - Agent data loading

## Task 1: Create Workspace Access Control Service

**File to create**: `app/server/services/persistence/workspace-access.ts`

### Requirements

Create a service that determines if an agent can access a given workspace path based on the 5 scopes:

```typescript
export interface WorkspaceAccessRules {
  canRead(agentId: string, path: string, organizationId: string): Promise<boolean>
  canWrite(agentId: string, path: string, organizationId: string): Promise<boolean>
  canDelete(agentId: string, path: string, organizationId: string): Promise<boolean>
}
```

### Access Rules by Scope

#### my_private (`workspaces/{agentId}/private/`)

- Read: Only the agent themselves
- Write: Only the agent themselves
- Delete: Only the agent themselves

#### my_shared (`workspaces/{agentId}/shared/`)

- Read: Agent + their team members + leadership team members
- Write: Only the agent themselves
- Delete: Only the agent themselves

#### team_private (`workspaces/{teamId}/private/`)

- Read: Team members only
- Write: Team members only
- Delete: Team members only

#### team_shared (`workspaces/{teamId}/shared/`)

- Read: All organization members
- Write: Team members only
- Delete: Team members only

#### org_shared (virtual scope, no specific path)

- This scope aggregates multiple folders in list_folders
- Individual folders follow their own scope rules above

### Implementation Pattern

```typescript
import { createLogger } from '../../utils/logger'
import { loadAgent } from '../../data/agents'
import { loadAllTeams } from '../../data/organizations'

const log = createLogger('persistence:workspace-access')

export class WorkspaceAccessService implements WorkspaceAccessRules {
  async canRead(agentId: string, path: string, organizationId: string): Promise<boolean> {
    // 1. Parse path to determine workspace type and owner
    //    - workspaces/{uuid}/private/ → private workspace
    //    - workspaces/{uuid}/shared/ → shared workspace

    // 2. Load agent making the request
    const agent = await loadAgent(agentId, organizationId)

    // 3. Determine workspace owner (is it agent or team?)
    const workspaceId = this.extractWorkspaceId(path)
    const isPrivate = path.includes('/private/')

    // 4. Check if workspace belongs to agent
    if (workspaceId === agentId) {
      return true // Always can read own workspace
    }

    // 5. Check if workspace belongs to agent's team
    if (agent.teamId && workspaceId === agent.teamId) {
      return true // Team members can read team workspace
    }

    // 6. Check if it's another agent's shared workspace
    if (!isPrivate) {
      // Shared workspaces readable by org (except private)
      return true
    }

    return false
  }

  async canWrite(agentId: string, path: string, organizationId: string): Promise<boolean> {
    // Similar logic but stricter
    // Only owner can write to my_private and my_shared
    // Only team members can write to team workspaces
  }

  async canDelete(agentId: string, path: string, organizationId: string): Promise<boolean> {
    // Same as canWrite for this implementation
  }

  private extractWorkspaceId(path: string): string {
    // Parse "workspaces/{uuid}/private/" → return uuid
    const match = path.match(/workspaces\/([^/]+)\//)
    return match ? match[1] : ''
  }

  private async isTeamMember(
    agentId: string,
    teamId: string,
    organizationId: string
  ): Promise<boolean> {
    const agent = await loadAgent(agentId, organizationId)
    return agent.teamId === teamId
  }

  private async isLeadershipMember(agentId: string, organizationId: string): Promise<boolean> {
    // Check if agent is on Leadership team
    const agent = await loadAgent(agentId, organizationId)
    if (!agent.teamId) return false

    const teams = await loadAllTeams(organizationId)
    const leadershipTeam = teams.find((t) => t.name === 'Leadership')
    return agent.teamId === leadershipTeam?.id
  }
}

// Export singleton
export const workspaceAccess = new WorkspaceAccessService()
```

### Validation Checklist

- [ ] Implements WorkspaceAccessRules interface
- [ ] canRead() checks all scope rules correctly
- [ ] canWrite() enforces ownership constraints
- [ ] canDelete() matches canWrite() rules
- [ ] extractWorkspaceId() parses paths correctly
- [ ] isTeamMember() helper works
- [ ] isLeadershipMember() helper checks Leadership team
- [ ] Uses async/await correctly
- [ ] Has proper error handling
- [ ] Imports from correct paths
- [ ] Exports singleton instance

## Task 2: Update FilesystemService with Permission Checks

**File to modify**: `app/server/services/persistence/file-workspace.ts`

### Requirements

Add permission checks to all file operations (read, write, delete) using the WorkspaceAccessService.

### Changes Needed

1. **Import WorkspaceAccessService**:

   ```typescript
   import { workspaceAccess } from './workspace-access'
   ```

2. **Add agentId parameter to all methods**:

   ```typescript
   // Current
   async readFile(path: string): Promise<FileContent>

   // New
   async readFile(agentId: string, path: string, organizationId: string): Promise<FileContent>
   ```

3. **Add permission check before operation**:
   ```typescript
   async readFile(agentId: string, path: string, organizationId: string): Promise<FileContent> {
     // Check permissions FIRST
     const canRead = await workspaceAccess.canRead(agentId, path, organizationId)
     if (!canRead) {
       throw new Error('Permission denied: You do not have access to read this file')
     }

     // Existing logic continues...
     this.validatePath(path)
     const fullPath = this.resolvePath(path)
     // ... rest of implementation
   }
   ```

### Methods to Update

- `readFile()` - Add canRead check
- `writeFile()` - Add canWrite check
- `deleteFile()` - Add canDelete check
- `listFiles()` - Add canRead check
- `getFileInfo()` - Add canRead check

### Validation Checklist

- [ ] All file operation methods have permission checks
- [ ] Permission checks happen BEFORE the operation
- [ ] Clear error messages when permission denied
- [ ] All method signatures updated with agentId and organizationId
- [ ] Existing functionality preserved
- [ ] Error handling works correctly

## Task 3: Update MCPFileServer list_folders for All Scopes

**File to modify**: `app/server/services/mcp/file-server.ts`

### Current Implementation (lines 450-520)

Currently `executeListFolders()` handles `my_private` and `my_shared` scopes. You need to add support for `team_private`, `team_shared`, and `org_shared`.

### Changes Needed

Find the `executeListFolders()` method (around line 450) and extend the switch statement:

```typescript
async executeListFolders(args: {
  agentId: string
  organizationId: string
  teamId?: string
  scope: FolderScope
}): Promise<MCPToolResult> {
  const { agentId, organizationId, teamId, scope } = args

  const folders: FolderInfo[] = []

  switch (scope) {
    case 'my_private': {
      // EXISTING - Keep as is
      const folderPath = this.getWorkspaceFolder(agentId, 'private')
      folders.push(await this.buildFolderResult(agentId, folderPath, 'my_private'))
      break
    }

    case 'my_shared': {
      // EXISTING - Keep as is
      const folderPath = this.getWorkspaceFolder(agentId, 'shared')
      folders.push(await this.buildFolderResult(agentId, folderPath, 'my_shared'))
      break
    }

    case 'team_private': {
      // NEW - Add this
      if (!teamId) {
        return this.errorResult('Agent is not on a team')
      }
      const folderPath = this.getWorkspaceFolder(teamId, 'private')
      folders.push(await this.buildFolderResult(agentId, folderPath, 'team_private'))
      break
    }

    case 'team_shared': {
      // NEW - Add this
      if (!teamId) {
        return this.errorResult('Agent is not on a team')
      }
      const folderPath = this.getWorkspaceFolder(teamId, 'shared')
      folders.push(await this.buildFolderResult(agentId, folderPath, 'team_shared'))
      break
    }

    case 'org_shared': {
      // NEW - Add this
      // Aggregate:
      // 1. All teams' shared folders
      // 2. All agents' shared folders (EXCEPT the calling agent's own)

      const teams = await loadAllTeams(organizationId)
      for (const team of teams) {
        const folderPath = this.getWorkspaceFolder(team.id, 'shared')
        const displayName = `${team.name} - Shared`
        folders.push(await this.buildFolderResult(agentId, folderPath, 'team_shared', displayName))
      }

      // Get all agents (except caller)
      const allAgents = await loadAllAgents(organizationId)
      for (const agent of allAgents) {
        if (agent.id === agentId) continue // Skip own folder

        const folderPath = this.getWorkspaceFolder(agent.id, 'shared')
        const displayName = `${agent.name} - Shared`
        folders.push(await this.buildFolderResult(agentId, folderPath, 'my_shared', displayName))
      }

      break
    }
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ folders }, null, 2)
    }]
  }
}
```

### Helper Method Updates

You may need to update `buildFolderResult()` to accept optional displayName:

```typescript
private async buildFolderResult(
  agentId: string,
  folderPath: string,
  folderType: FolderScope,
  displayName?: string
): Promise<FolderInfo> {
  const files = await this.filesystemService.listFiles(agentId, folderPath, organizationId)
  const folderId = this.generateFolderId(folderPath)

  return {
    folderId,
    folderName: displayName || folderPath,
    folderType,
    path: folderPath,
    fileCount: files.length
  }
}
```

### Validation Checklist

- [ ] All 5 scopes implemented in switch statement
- [ ] team_private checks for teamId
- [ ] team_shared checks for teamId
- [ ] org_shared aggregates all teams + other agents
- [ ] org_shared excludes calling agent's own folder
- [ ] buildFolderResult() accepts optional displayName
- [ ] Import loadAllTeams and loadAllAgents
- [ ] Error messages are clear

## Task 4: Create Team Workspaces on Initialization

**File to modify**: `app/server/utils/initializeOrganization.ts`

### Requirements

When creating teams during organization initialization, also create their workspace folders.

### Changes Needed

Find the section where teams are created (around line 80-120) and add workspace folder creation:

```typescript
import { mkdir } from 'fs/promises'
import { join } from 'path'

// In createDefaultTeams() or similar function:
async function createTeamWithWorkspace(teamData: Partial<Team>, orgId: string): Promise<Team> {
  // Create team record
  const team = await createTeam(teamData, orgId)

  // Create workspace folders
  const dataDir = process.env.TEST_DATA_DIR || path.resolve(process.cwd(), 'data/organizations')
  const workspaceBase = join(dataDir, orgId, 'workspaces', team.id)

  await mkdir(join(workspaceBase, 'private'), { recursive: true })
  await mkdir(join(workspaceBase, 'shared'), { recursive: true })

  log.info({ teamId: team.id, workspaceBase }, 'Created team workspace folders')

  return team
}
```

### Validation Checklist

- [ ] Team workspace folders created on team creation
- [ ] Both private/ and shared/ folders created
- [ ] Uses recursive mkdir (creates parent directories)
- [ ] Logs workspace creation
- [ ] Works for all default teams
- [ ] Doesn't break existing team creation logic

## General Guidelines

1. **Error Handling**: Always provide clear, actionable error messages
2. **Logging**: Log important operations (permission checks, folder discovery)
3. **Async/Await**: Use proper async/await patterns
4. **Type Safety**: Maintain strict TypeScript types
5. **Testing**: Code should be testable (avoid tight coupling)

## Success Criteria

- [ ] All 5 scopes work correctly in list_folders
- [ ] Permission checks enforce access control
- [ ] Team workspaces created automatically
- [ ] Clear error messages when permission denied
- [ ] No regressions in existing functionality
- [ ] TypeScript compiles without errors
- [ ] Follows existing code patterns

## Implementation Order

1. Create WorkspaceAccessService (foundation)
2. Update FilesystemService with permission checks
3. Update MCPFileServer list_folders for all scopes
4. Update initializeOrganization for team workspaces

This order ensures each piece builds on the previous work.
