# F066 Test Specifications: Workspace Sharing

## Test Requirements for Workspace Sharing Implementation

This document defines comprehensive test requirements for implementing team-level and org-level workspace sharing. Tests MUST cover all 5 scopes, permission boundaries, and error scenarios.

## Type Definitions to Use

**CRITICAL**: DO NOT MODIFY `types/index.ts`. Use these exact type definitions:

```typescript
// From types/index.ts
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
  // ... other fields
}

interface Team {
  id: string
  name: string
  organizationId: string
  description?: string
  createdAt: string
  updatedAt: string
  // ... other fields
}

type FolderScope = 'my_private' | 'my_shared' | 'team_private' | 'team_shared' | 'org_shared'

interface FolderInfo {
  folderId: string
  folderName: string
  folderType: FolderScope
  path: string
  fileCount: number
}
```

## Test Suite 1: Team Workspace Creation

**File**: `tests/api/workspace-sharing-team-creation.spec.ts`

### Test 1.1: Team workspace folders created on initialization

- **Setup**: Create new organization with teams
- **Action**: Call initializeOrganization or createTeam
- **Assert**:
  - Workspace folders exist: `data/organizations/{orgId}/workspaces/{teamId}/private/`
  - Workspace folders exist: `data/organizations/{orgId}/workspaces/{teamId}/shared/`
  - Both folders are empty initially

### Test 1.2: Agent workspace folders still created

- **Setup**: Create agent within organization
- **Action**: Create agent
- **Assert**:
  - Agent workspace exists: `workspaces/{agentId}/private/`
  - Agent workspace exists: `workspaces/{agentId}/shared/`

### Test 1.3: Multiple teams get separate workspaces

- **Setup**: Create 3 teams in same organization
- **Action**: Create teams
- **Assert**:
  - Each team has unique workspace folder
  - Team IDs are different
  - No shared workspace folders between teams

## Test Suite 2: Folder Discovery - All 5 Scopes

**File**: `tests/api/workspace-sharing-discovery.spec.ts`

### Test 2.1: my_private scope returns only agent's private folder

- **Setup**:
  - Agent1 (HR team) with files in private folder
  - Agent2 (HR team) with files in private folder
- **Action**: Agent1 calls `list_folders(scope: 'my_private')`
- **Assert**:
  - Returns 1 folder (Agent1's private)
  - Does NOT include Agent2's private folder
  - Does NOT include team private folder
  - Folder path matches `workspaces/{agent1Id}/private/`

### Test 2.2: my_shared scope returns only agent's shared folder

- **Setup**: Agent1 with files in shared folder
- **Action**: Agent1 calls `list_folders(scope: 'my_shared')`
- **Assert**:
  - Returns 1 folder (Agent1's shared)
  - Folder path matches `workspaces/{agent1Id}/shared/`
  - Files in folder are listed correctly

### Test 2.3: team_private scope returns team's private folder (members only)

- **Setup**:
  - HR team with Agent1 and Agent2 as members
  - Dev team with Agent3 as member
  - Files in HR team's private folder
- **Action**: Agent1 (HR) calls `list_folders(scope: 'team_private')`
- **Assert**:
  - Returns 1 folder (HR team private)
  - Folder path matches `workspaces/{hrTeamId}/private/`
  - Files in folder are listed

### Test 2.4: team_private scope fails for agents without team

- **Setup**: Agent with no teamId (teamId: undefined)
- **Action**: Agent calls `list_folders(scope: 'team_private')`
- **Assert**:
  - Returns error: "Agent is not on a team"
  - No folders returned

### Test 2.5: team_shared scope returns team's shared folder

- **Setup**: HR team with files in shared folder
- **Action**: Agent1 (HR) calls `list_folders(scope: 'team_shared')`
- **Assert**:
  - Returns 1 folder (HR team shared)
  - Folder path matches `workspaces/{hrTeamId}/shared/`
  - Files are listed correctly

### Test 2.6: org_shared scope aggregates all teams' shared folders

- **Setup**:
  - HR team with 2 files in shared folder
  - Dev team with 3 files in shared folder
  - Leadership team with 1 file in shared folder
  - Agent1 (HR) with 2 files in shared folder
  - Agent2 (HR) with 1 file in shared folder
  - Agent3 (Dev) with 2 files in shared folder
- **Action**: Agent1 (HR) calls `list_folders(scope: 'org_shared')`
- **Assert**:
  - Returns 5 folders:
    1. HR team shared (2 files)
    2. Dev team shared (3 files)
    3. Leadership team shared (1 file)
    4. Agent2 (HR team member) shared (1 file) - NOT Agent1's own!
    5. Agent3 (Dev) shared (2 files) - cross-team visibility
  - Does NOT include Agent1's own shared folder (use my_shared for that)
  - Does NOT include any private folders
  - Folder names distinguish teams/agents clearly

### Test 2.7: org_shared excludes agent's own shared folder

- **Setup**: Agent1 with files in own shared folder
- **Action**: Agent1 calls `list_folders(scope: 'org_shared')`
- **Assert**:
  - Agent1's own shared folder NOT in results
  - Other agents' shared folders ARE in results
  - Rationale: Use `my_shared` to access own folder, `org_shared` for others

## Test Suite 3: Permission Checks - Read Access

**File**: `tests/api/workspace-sharing-read-permissions.spec.ts`

### Test 3.1: Agent can read own private files

- **Setup**: Agent1 with file in `workspaces/{agent1}/private/test.md`
- **Action**: Agent1 calls `read_file_by_id(folderId, 'test.md')`
- **Assert**: Success - returns file content

### Test 3.2: Agent CANNOT read other agent's private files

- **Setup**:
  - Agent1 (HR) with file in private folder
  - Agent2 (HR) on same team
- **Action**: Agent2 tries to read Agent1's private file
- **Assert**:
  - Permission denied error
  - Error message: "You don't have permission to read this folder"

### Test 3.3: Team member can read team's private files

- **Setup**:
  - HR team with file in `workspaces/{hrTeamId}/private/plan.md`
  - Agent1 is HR team member
- **Action**: Agent1 calls `read_file_by_id(teamPrivateFolderId, 'plan.md')`
- **Assert**: Success - returns file content

### Test 3.4: Non-team member CANNOT read team's private files

- **Setup**:
  - HR team with file in private folder
  - Agent3 (Dev team) tries to access HR private
- **Action**: Agent3 tries to read HR team private file
- **Assert**:
  - Permission denied error
  - Clear message explaining team boundary

### Test 3.5: Any org member can read team's shared files

- **Setup**:
  - HR team with file in `workspaces/{hrTeamId}/shared/policy.md`
  - Agent3 (Dev team) tries to read
- **Action**: Agent3 calls `read_file_by_id(hrSharedFolderId, 'policy.md')`
- **Assert**: Success - returns file content

### Test 3.6: Team member can read teammate's shared files

- **Setup**:
  - Agent1 (HR) with file in `workspaces/{agent1}/shared/report.md`
  - Agent2 (HR) on same team
- **Action**: Agent2 calls `read_file_by_id(agent1SharedFolderId, 'report.md')`
- **Assert**: Success - returns file content

### Test 3.7: Cross-team agent can read other agent's shared files (via org_shared)

- **Setup**:
  - Agent1 (HR) with file in shared folder
  - Agent3 (Dev) from different team
- **Action**: Agent3 discovers via org_shared, reads Agent1's file
- **Assert**: Success - returns file content

### Test 3.8: Leadership team can read all my_shared folders

- **Setup**:
  - Agent1 (HR) with file in shared folder
  - Elena (Leadership team) tries to read
- **Action**: Elena reads Agent1's shared file
- **Assert**: Success - returns file content

## Test Suite 4: Permission Checks - Write Access

**File**: `tests/api/workspace-sharing-write-permissions.spec.ts`

### Test 4.1: Agent can write to own private folder

- **Setup**: Agent1
- **Action**: Write file to own private folder
- **Assert**: Success - file created

### Test 4.2: Agent CANNOT write to other agent's private folder

- **Setup**: Agent1 and Agent2 (same team)
- **Action**: Agent2 tries to write to Agent1's private folder
- **Assert**: Permission denied error

### Test 4.3: Team member can write to team's private folder

- **Setup**: Agent1 (HR team member)
- **Action**: Write file to HR team private folder
- **Assert**: Success - file created

### Test 4.4: Non-team member CANNOT write to team's private folder

- **Setup**: Agent3 (Dev team)
- **Action**: Try to write to HR team private folder
- **Assert**: Permission denied error

### Test 4.5: Team member can write to team's shared folder

- **Setup**: Agent1 (HR team member)
- **Action**: Write file to HR team shared folder
- **Assert**: Success - file created

### Test 4.6: Non-team member CANNOT write to team's shared folder

- **Setup**: Agent3 (Dev team)
- **Action**: Try to write to HR team shared folder
- **Assert**: Permission denied error

### Test 4.7: Agent can write to own my_shared folder

- **Setup**: Agent1
- **Action**: Write file to own shared folder
- **Assert**: Success - file created

### Test 4.8: Other agents CANNOT write to agent's my_shared folder

- **Setup**: Agent1 and Agent2 (same team)
- **Action**: Agent2 tries to write to Agent1's shared folder
- **Assert**: Permission denied error

### Test 4.9: Leadership team CAN write to team shared folders

- **Setup**:
  - Elena (Leadership team)
  - HR team shared folder
- **Action**: Elena writes to HR team shared folder
- **Assert**: Success - leadership override works

## Test Suite 5: Permission Checks - Delete Access

**File**: `tests/api/workspace-sharing-delete-permissions.spec.ts`

### Test 5.1: Agent can delete from own private folder

- **Setup**: Agent1 with file in private folder
- **Action**: Delete file from own private folder
- **Assert**: Success - file deleted

### Test 5.2: Agent CANNOT delete from other agent's folders

- **Setup**: Agent1 with file, Agent2 tries to delete
- **Action**: Agent2 tries to delete Agent1's file
- **Assert**: Permission denied error

### Test 5.3: Team member can delete from team private folder

- **Setup**: HR team with file, Agent1 (HR member)
- **Action**: Agent1 deletes from team private folder
- **Assert**: Success - file deleted

### Test 5.4: Team member can delete from team shared folder

- **Setup**: HR team with file in shared, Agent1 (HR member)
- **Action**: Agent1 deletes from team shared folder
- **Assert**: Success - file deleted

### Test 5.5: Non-team member CANNOT delete from team folders

- **Setup**: HR team folder, Agent3 (Dev team)
- **Action**: Agent3 tries to delete from HR folder
- **Assert**: Permission denied error

## Test Suite 6: Integration Scenarios

**File**: `tests/api/workspace-sharing-integration.spec.ts`

### Test 6.1: Complete Alex → Marcus workflow (same team)

- **Setup**:
  - Alex (HR team) as Documentation Specialist
  - Marcus (HR team) as HR Specialist
- **Actions**:
  1. Alex discovers his my_shared folder
  2. Alex writes `cone-volume.md` to his shared folder
  3. Marcus discovers team_shared folders (should include Alex's)
  4. Marcus reads Alex's `cone-volume.md` file
- **Assert**:
  - All operations succeed
  - Marcus can read Alex's file content
  - File content matches what Alex wrote

### Test 6.2: Cross-team collaboration via org_shared

- **Setup**:
  - Agent1 (HR) writes policy document
  - Agent3 (Dev) needs to read it
- **Actions**:
  1. Agent1 writes to my_shared
  2. Agent3 discovers via org_shared
  3. Agent3 reads Agent1's file
- **Assert**:
  - Agent3 successfully reads Agent1's file
  - Content is correct

### Test 6.3: Team private isolation

- **Setup**:
  - HR team with sensitive planning doc in team_private
  - Agent3 (Dev team) tries to access
- **Actions**:
  1. HR team member writes to team_private
  2. Agent3 tries to discover team_private folders
  3. Agent3 tries to read the file (if folder exposed)
- **Assert**:
  - Agent3 does NOT see HR team private folder in discovery
  - If Agent3 somehow gets folderId, read fails with permission error

### Test 6.4: org_shared aggregation completeness

- **Setup**:
  - 3 teams (HR, Dev, Leadership)
  - 2 agents per team
  - Each team and agent has files in shared folders
- **Actions**:
  - Any agent calls org_shared
- **Assert**:
  - Returns all 3 team shared folders
  - Returns all 6 agents' shared folders EXCEPT caller's own
  - Total: 8 folders for any agent (3 teams + 5 other agents)

## Test Suite 7: Error Messages

**File**: `tests/api/workspace-sharing-errors.spec.ts`

### Test 7.1: Clear error when accessing private folder

- **Action**: Agent tries to read other agent's private file
- **Assert**: Error message includes:
  - "Permission denied"
  - "private folders are only accessible by the owner"

### Test 7.2: Clear error when not on team

- **Action**: Agent with no team tries team_private
- **Assert**: Error message: "Agent is not on a team"

### Test 7.3: Clear error when writing to read-only scope

- **Action**: Non-team member tries to write to team shared
- **Assert**: Error message explains:
  - "You don't have permission to write"
  - "Only team members can write to team folders"

### Test 7.4: Actionable error for cross-team access

- **Action**: Dev agent tries to access HR team_private
- **Assert**: Error suggests:
  - "This is a private team folder"
  - "Use org_shared scope to access team shared folders"

## Test Coverage Requirements

- **Scope coverage**: All 5 scopes tested
- **Permission coverage**: Read, write, delete for each scope
- **Agent scenarios**: Solo agent, same-team, cross-team, no-team
- **Error scenarios**: All permission boundaries tested
- **Integration**: Real workflow scenarios (Alex/Marcus)
- **Edge cases**: Empty folders, missing teams, leadership overrides

## Success Criteria

- ✅ All tests passing (100%)
- ✅ Tests cover all 5 scopes
- ✅ Permission boundaries enforced
- ✅ Error messages are clear
- ✅ Integration scenarios work end-to-end
- ✅ No regressions in existing F059 tools
