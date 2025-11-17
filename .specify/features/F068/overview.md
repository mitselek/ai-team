# F068: Workspace Security Refactor

**Status:** Planned  
**Issue:** [#68](https://github.com/mitselek/ai-team/issues/68)  
**Created:** November 18, 2025

## Overview

Refactor workspace file access tools to eliminate security anti-patterns and establish clear separation of concerns between orchestrator (security) and MCP layer (execution).

## Security Concerns Addressed

### C1: Anti-pattern - Decoding IDs from paths

Current implementation parses filesystem paths to extract organizational IDs, which is fragile, error-prone, and vulnerable to manipulation. IDs should be explicit parameters.

### C2: Separation of concerns

Permission checking currently happens in MCP layer. Orchestrator should handle all security validation, MCP should just execute filesystem operations.

## Architecture Changes

### Current Flow

```text
Agent → Orchestrator (whitelist) → MCP (permission check) → FilesystemService
                                     ↓
                                extractWorkspaceInfo() parses path
```

### New Flow

```text
Agent → Orchestrator (whitelist + permissions) → MCP (execution only)
         ↓
    UUID-based validation, no path parsing
```

## Tool Signatures

### list_folders

**Purpose:** Discover accessible files by scope

**Input:**

- `agentId` (auto-injected)
- `organizationId` (auto-injected)
- `teamId` (auto-injected)
- `scope`: `'my_private' | 'my_shared' | 'team_private' | 'team_shared' | 'org_shared'`

**Output:** Array of file metadata

```typescript
{
  name: string,      // "Marcus" or "Development Team"
  uuid: string,      // agent-123 or team-456
  scope: string,     // "private" or "shared"
  path: string       // "notes.md" or "reports/quarterly.pdf"
}
```

### read_file_by_id

**Purpose:** Read file content using UUID-based addressing

**Input:**

- `agentId` (auto-injected)
- `folderId`: Agent or team UUID
- `scope`: `'private' | 'shared'`
- `path`: File path within scope (e.g., `"notes.md"` or `"subdir/file.txt"`)

### write_file_by_id

**Purpose:** Write file content using UUID-based addressing

**Input:**

- `agentId` (auto-injected)
- `folderId`: Agent or team UUID
- `scope`: `'private' | 'shared'`
- `path`: File path within scope
- `content`: File content

### delete_file_by_id

**Purpose:** Delete file using UUID-based addressing

**Input:**

- `agentId` (auto-injected)
- `folderId`: Agent or team UUID
- `scope`: `'private' | 'shared'`
- `path`: File path within scope

### get_file_info_by_id

**Purpose:** Get file metadata using UUID-based addressing

**Input:**

- `agentId` (auto-injected)
- `folderId`: Agent or team UUID
- `scope`: `'private' | 'shared'`
- `path`: File path within scope

## Permission Model

### Orchestrator Validation (Before MCP Call)

**Step 1: Whitelist Check** (existing)

- Verify agent has tool in whitelist

**Step 2: Folder Existence**

- Check if folder exists on filesystem
- Special case: Allow folder creation if writing to own/team folder

**Step 3: Ownership/Membership**

```typescript
if (folderId === agentId) {
  // Agent's own folder
  if (scope === 'private') → Only owner
  if (scope === 'shared') → Owner + team + leadership
} else if (folderId === agent.teamId) {
  // Agent's team folder
  if (scope === 'private') → Team members only
  if (scope === 'shared') → All org members (read), team members (write)
} else if (isAgentUUID(folderId)) {
  // Another agent's folder
  if (scope === 'shared') → Team members + leadership (read)
} else if (isTeamUUID(folderId)) {
  // Another team's folder
  if (scope === 'shared') → All org members (read)
}
```

### MCP Layer (Execution Only)

**No permission checking** - just construct path and execute:

```typescript
const fullPath = `${organizationId}/workspaces/${folderId}/${scope}/${path}`
await filesystemService.readFile(fullPath)
```

## Filesystem Structure

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

## Implementation Phases

### Phase 1: Add scope parameter to tools

- Update tool definitions in `register-tools.ts`
- Update tool executors in `f059-workspace-tools.ts`
- Update MCP FileServer to use UUID + scope parameters

### Phase 2: Move permission checking to orchestrator

- Create `WorkspacePermissionService`
- Implement ownership/membership validation
- Update orchestrator execution flow

### Phase 3: Remove permission checking from MCP

- Simplify `FilesystemService` (remove agentId/orgId params)
- Remove `WorkspaceAccessService` usage
- Delete path parsing logic

### Phase 4: Update tests

- Update workspace-sharing tests for new signatures
- Add orchestrator permission tests
- Remove MCP permission tests

## Acceptance Criteria

- [ ] All `*_by_id` tools have explicit `scope` parameter
- [ ] `list_folders` returns file listings (not just folder metadata)
- [ ] Orchestrator validates permissions before MCP call
- [ ] MCP layer has no permission checking logic
- [ ] No path parsing to extract IDs
- [ ] `WorkspaceAccessService.extractWorkspaceInfo()` removed
- [ ] All existing workspace-sharing tests pass
- [ ] Tool executors remain callable from other contexts

## Dependencies

- None (self-contained refactor)

## Related Features

- F059: Workspace Sharing (original implementation)
- F051: Tool Integration (orchestrator validation framework)

## Technical Debt Resolved

- Path-based permission checking anti-pattern
- Duplicate permission logic across layers
- Fragile path parsing vulnerable to manipulation
- Unclear separation of concerns between orchestrator and MCP

## Breaking Changes

**Agent-facing tools:**

- `read_file_by_id`, `write_file_by_id`, `delete_file_by_id`, `get_file_info_by_id` gain `scope` parameter
- `filename` parameter renamed to `path`
- `list_folders` returns different structure (includes file listings)

**Internal APIs:**

- `FilesystemService` methods simplified (remove agentId/orgId params)
- `WorkspaceAccessService` methods removed from MCP usage
- MCP FileServer folderId cache removed

## Testing Strategy

**Unit Tests:**

- Orchestrator permission validation logic
- UUID-based ownership checks
- Scope-based access rules

**Integration Tests:**

- End-to-end file access flows
- Permission denial scenarios
- Folder creation rules

**Regression Tests:**

- All existing workspace-sharing scenarios
- Multi-agent collaboration
- Cross-team file access
