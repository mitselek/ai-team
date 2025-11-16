# Agent Workspace Sharing: Implement Team-Level and Org-Level Shared Folders

## Summary

Currently, agent workspaces are completely isolated. The "shared" folder in an agent's workspace (`workspaces/{agentId}/shared/`) is not actually shared with other agents - it's just part of their personal workspace structure. This prevents agents from collaborating by sharing files.

## Current Behavior

**Test Scenario:**

1. Alex (Documentation Specialist) creates `cone-volume.md` in his shared folder
2. File is written to: `workspaces/31dbe1a3-959d-4299-b5e9-4b555d8823ae/shared/cone-volume.md`
3. Marcus (HR Specialist) tries to read the file
4. Result: **Permission denied** - Marcus cannot access Alex's workspace

**Current Structure:**

```text
workspaces/
├── {agentId}/
│   ├── private/   # Only accessible by this agent
│   └── shared/    # Still only accessible by this agent (misleading name!)
```

## Expected Behavior (from F059 Design)

The F059 brainstorming session defines 5 folder scopes:

1. **`my_private`**: Agent's private workspace (only the agent)
2. **`my_shared`**: Agent's shared workspace (agent + team + leadership)
3. **`team_private`**: Team's private workspace (team members only)
4. **`team_shared`**: Team's shared workspace (all team members + org-wide visibility)
5. **`org_shared`**: Organization-wide (all teams' shared folders + team members' shared folders)

**Proper Structure:**

```text
workspaces/
├── {agentId}/
│   ├── private/        # Scope: my_private (agent only)
│   └── shared/         # Scope: my_shared (agent + team + leadership)
├── {teamId}/
│   ├── private/        # Scope: team_private (team members only)
│   └── shared/         # Scope: team_shared (team + org-wide)
```

## Problem Analysis

### What's Missing

1. **No Team Workspaces**: Teams don't have their own workspace folders yet
2. **No Permission System**: File access only checks workspace ownership, not visibility rules
3. **No Scope Implementation**: The 5 scopes defined in F059 aren't implemented
4. **Misleading Naming**: `agent/{id}/shared/` implies sharing but doesn't actually share

### What Works

- ✅ F059 folder discovery tools (`list_folders`, `*_by_id`) are implemented
- ✅ Agent workspaces are created and accessible
- ✅ Files can be written/read within agent's own workspace
- ✅ Organization ID is properly included in paths

## Proposed Solution

### Phase 1: Add Team Workspaces

1. Create team workspace structure:

   ```typescript
   // On team creation
   createDirectory(`workspaces/{teamId}/private/`)
   createDirectory(`workspaces/{teamId}/shared/`)
   ```

2. Update `list_folders` to support `team_private` and `team_shared` scopes

### Phase 2: Implement Access Control

Add permission rules to FilesystemService:

```typescript
interface WorkspaceAccess {
  canRead(agentId: string, path: string): boolean
  canWrite(agentId: string, path: string): boolean
  canDelete(agentId: string, path: string): boolean
}

// Rules:
// my_private: Only the agent
// my_shared: Agent + their team members + leadership team
// team_private: Only team members
// team_shared: All organization members (read), team members (write)
// org_shared: Virtual scope (aggregates all team_shared folders)
```

### Phase 3: Update Discovery Implementation

Modify `MCPFileServer.executeListFolders()` to:

1. Return agent's `my_shared` folders when scope is `my_shared`
2. Return team's folders when scope is `team_private` or `team_shared`
3. Aggregate all team shared folders when scope is `org_shared`
4. Respect access control rules for each scope

## Acceptance Criteria

- [ ] Teams have workspace folders (`workspaces/{teamId}/private|shared/`)
- [ ] `list_folders` correctly returns folders for all 5 scopes
- [ ] Alex can write to his `my_shared` folder
- [ ] Marcus can read Alex's `my_shared` file (if they're on same team)
- [ ] Cross-team agents can read each other's `my_shared` files (via `org_shared` scope)
- [ ] Team members can write to `team_shared` folder
- [ ] Non-team members can read (but not write) `team_shared` folder
- [ ] `team_private` is only accessible to team members
- [ ] Permission denied errors are clear and actionable

## Test Scenario

```bash
# 1. Alex (HR team) writes to his shared folder
Alex: list_folders(scope: my_shared)
Alex: write_file_by_id(folderId: "{alex-shared}", filename: "cone-volume.md", content: "...")

# 2. Marcus (HR team) reads Alex's shared file
Marcus: list_folders(scope: team_shared)  # Should show Alex's shared files
Marcus: read_file_by_id(folderId: "{found-in-team-shared}", filename: "cone-volume.md")
# Expected: Success - returns file content

# 3. Elena (Leadership team) reads via org_shared
Elena: list_folders(scope: org_shared)  # Should show all teams' shared folders
Elena: read_file_by_id(folderId: "{hr-team-member-shared}", filename: "cone-volume.md")
# Expected: Success - returns file content
```

## References

- [F059 Brainstorming Session](/.specify/features/F059-workspace-awareness/brainstorming-session.md)
- Related: #59 (F059 implementation)
- Related: #39 (Parent: Filesystem Access)

## Priority

**High** - This is a fundamental feature for agent collaboration. Without it, agents cannot share work products or collaborate on documents.
