# Workspace Security Refactor

## Status

**Proposed** - November 18, 2025

## Problem Statement

### Security Concerns

**C1: Anti-pattern - Decoding IDs from paths**

- Current implementation: `WorkspaceAccessService.extractWorkspaceInfo()` parses path strings to extract `orgId`, `entityId`, and `scope`
- Path format: `{orgId}/workspaces/{entityId}/{scope}/filename`
- Issues:
  - Fragile and error-prone
  - Vulnerable to path manipulation
  - IDs should be explicit parameters, not extracted from strings
  - Violates principle of explicit data flow

**C2: Separation of concerns - Permission checking location**

- Current flow: Orchestrator validates whitelist → MCP layer re-validates permissions
- Issues:
  - Duplicate permission logic in MCP layer
  - MCP should be execution layer, not security layer
  - Tool executors are exported and can be called from elsewhere with different business rules
- Desired: Orchestrator handles all permissions, MCP just executes

### Current Architecture Problems

**Tool Call Flow:**

```text
Agent → Orchestrator → MCP FileServer → FilesystemService → WorkspaceAccessService
                         ↓
                    extractWorkspaceInfo() parses path string
```

**Issues:**

1. `folderId` is generated opaque token stored in cache (30-min TTL)
2. `folderId` maps to full filesystem path
3. Permission checking happens by parsing that path
4. No validation that `folderId` was legitimately created
5. Scope information embedded in `filename` parameter (e.g., `"shared/notes.md"`)

## Proposed Solution

### Architecture Changes

**New Model:**

- **folderId = agent UUID or team UUID** (not generated token)
- **scope = explicit parameter** (`"private"` | `"shared"`)
- **path = file path within scope** (e.g., `"notes.md"` or `"subdir/file.txt"`)
- **Orchestrator checks permissions** before MCP call
- **MCP constructs full filesystem path** and executes operation

### Tool Signatures (Refactored)

**list_folders:**

```typescript
list_folders(
  agentId: string,          // Auto-injected
  organizationId: string,   // Auto-injected
  teamId: string,           // Auto-injected
  scope: 'my_private' | 'my_shared' | 'team_private' | 'team_shared' | 'org_shared'
)

Returns: Array<{
  name: string,      // "Marcus" or "Development Team"
  uuid: string,      // agent-123 or team-456
  scope: string,     // "private" or "shared"
  path: string       // "notes.md" or "reports/quarterly.pdf"
}>
```

**read_file_by_id:**

```typescript
read_file_by_id(
  agentId: string,              // Auto-injected
  folderId: string,             // Agent/Team UUID (not generated token)
  scope: 'private' | 'shared',  // Explicit scope parameter
  path: string                  // File path within scope
)
```

**write_file_by_id:**

```typescript
write_file_by_id(
  agentId: string,
  folderId: string,
  scope: 'private' | 'shared',
  path: string,
  content: string
)
```

**delete_file_by_id:**

```typescript
delete_file_by_id(
  agentId: string,
  folderId: string,
  scope: 'private' | 'shared',
  path: string
)
```

**get_file_info_by_id:**

```typescript
get_file_info_by_id(
  agentId: string,
  folderId: string,
  scope: 'private' | 'shared',
  path: string
)
```

### Permission Checking Logic (Orchestrator)

**Location:** Before MCP tool call, in orchestrator

**Check sequence:**

1. **Whitelist validation** (already implemented)
2. **Folder existence check:**
   - Check if folder exists on filesystem
   - If folder doesn't exist:
     - **Allow creation** if: writing to own/team folder (folderId === agentId OR folderId === teamId)
     - **Deny** otherwise
3. **Ownership/membership validation:**

   ```typescript
   if (folderId === agentId) {
     // Agent owns this folder → check scope-based rules
     if (scope === 'private') {
       // my_private: Only owner can access
       return true
     } else {
       // my_shared: Agent + team members + leadership can access
       return true // (with appropriate checks for write/delete)
     }
   } else if (folderId === agent.teamId) {
     // Agent's team folder → check team membership
     if (scope === 'private') {
       // team_private: Only team members can access
       return isTeamMember(agentId, folderId)
     } else {
       // team_shared: All org members can read
       return true // (check team membership for write/delete)
     }
   } else if (isAgentUUID(folderId)) {
     // Another agent's folder
     if (scope === 'shared') {
       // my_shared: Team members + leadership can read
       return isTeamMember(agentId, otherAgent.teamId) || isLeadershipMember(agentId)
     } else {
       return false
     }
   } else if (isTeamUUID(folderId)) {
     // Another team's folder
     if (scope === 'shared') {
       // team_shared: All org members can read
       return true // (check specific permissions for write/delete)
     } else {
       return false
     }
   }
   ```

### MCP Layer Changes

**Remove permission checking:**

- `WorkspaceAccessService.canRead/canWrite/canDelete` → Not called from MCP
- `WorkspaceAccessService.extractWorkspaceInfo()` → Can be removed
- `FilesystemService` → Just executes filesystem operations

**Path construction:**

```typescript
// In MCP FileServer
const fullPath = `${organizationId}/workspaces/${folderId}/${scope}/${path}`
await filesystemService.readFile(fullPath) // No permission check, just read
```

### Filesystem Structure

```text
data/organizations/{orgId}/workspaces/
  ├── {agentId}/
  │   ├── private/
  │   │   └── notes.md
  │   └── shared/
  │       └── report.pdf
  └── {teamId}/
      ├── private/
      │   └── team-docs.md
      └── shared/
          └── public-info.md
```

## Implementation Plan

### Phase 1: Add scope parameter to tools

- [ ] Update tool definitions in `register-tools.ts`
  - Add `scope` parameter to all `*_by_id` tools
  - Rename `filename` to `path`
- [ ] Update tool executors in `f059-workspace-tools.ts`
  - Accept new parameters
  - Pass through to MCP layer
- [ ] Update MCP FileServer in `file-server.ts`
  - Remove folderId cache/generation logic
  - Accept folderId as UUID, scope as parameter
  - Construct paths: `{orgId}/workspaces/{folderId}/{scope}/{path}`

### Phase 2: Move permission checking to orchestrator

- [ ] Create `WorkspacePermissionService` in orchestrator
  - Implement ownership/membership validation
  - Check folder existence
  - Handle folder creation rules
- [ ] Update orchestrator tool execution flow
  - Add permission check before MCP call
  - Return permission errors to agent
- [ ] Update `list_folders` implementation
  - Return actual file listings with (name, uuid, scope, path)
  - Remove folderId generation
  - Filter results based on agent permissions

### Phase 3: Remove permission checking from MCP

- [ ] Simplify `FilesystemService`
  - Remove agentId parameter
  - Remove organizationId parameter
  - Just execute filesystem operations
- [ ] Remove `WorkspaceAccessService` usage from MCP
  - Delete `extractWorkspaceInfo()` method
  - Remove `canRead/canWrite/canDelete` calls

### Phase 4: Update tests

- [ ] Update workspace-sharing tests
  - New tool signatures
  - Permission checking at orchestrator level
- [ ] Add orchestrator permission tests
  - Ownership validation
  - Membership validation
  - Folder creation rules
- [ ] Remove MCP permission tests
  - No longer relevant

## Acceptance Criteria

- [ ] All `*_by_id` tools have explicit `scope` parameter
- [ ] `list_folders` returns file listings with (name, uuid, scope, path)
- [ ] Orchestrator validates permissions before MCP call
- [ ] MCP layer has no permission checking logic
- [ ] No path parsing to extract IDs
- [ ] `WorkspaceAccessService.extractWorkspaceInfo()` removed
- [ ] All existing workspace-sharing tests pass
- [ ] Tool executors can still be called from elsewhere with different business rules

## Related Issues

- Issue #66: Workspace Sharing (original implementation)
- Issue #51: Tool Integration (orchestrator validation)

## Notes

- This refactor addresses security anti-patterns while maintaining functionality
- Separation of concerns: Orchestrator = security, MCP = execution
- Explicit parameters eliminate path parsing vulnerabilities
- Tool executors remain flexible for different use cases
