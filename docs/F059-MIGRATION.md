# F059 Workspace Awareness - Migration Guide

## Overview

F059 introduces folder-based workspace operations with improved discovery and scoped access. The filesystem structure migrates from `agents/` and `teams/` to a unified `workspaces/` directory.

## What Changed

### Old Structure (Pre-F059)

```text
data/
  agents/
    agent-123/
      private/
      shared/
  teams/
    team-dev/
      private/
      shared/
```

### New Structure (F059)

```text
data/
  workspaces/
    agent-123/
      private/
      shared/
    team-dev/
      private/
      shared/
```

## New Tools

### Discovery Tool

- **list_folders**: Discover available workspace folders by scope
  - Scopes: `my_private`, `my_shared`, `team_private`, `team_shared`, `org_shared`
  - Returns ephemeral `folderId` with 30-minute TTL
  - Includes file listings with metadata

### File Operations by ID

- **read_file_by_id**: Read file using discovered folderId
- **write_file_by_id**: Write file using discovered folderId
- **delete_file_by_id**: Delete file using discovered folderId
- **get_file_info_by_id**: Get metadata using discovered folderId

## Migration Steps

### For Existing Deployments

1. **Backup Data**

   ```bash
   cp -r data/ data-backup/
   ```

2. **Create New Structure**

   ```bash
   mkdir -p data/workspaces
   ```

3. **Move Agent Workspaces**

   ```bash
   # Move all agent directories
   for agent in data/agents/*/; do
     agent_id=$(basename "$agent")
     mv "$agent" "data/workspaces/$agent_id"
   done
   ```

4. **Move Team Workspaces**

   ```bash
   # Move all team directories
   for team in data/teams/*/; do
     team_id=$(basename "$team")
     mv "$team" "data/workspaces/$team_id"
   done
   ```

5. **Verify Structure**

   ```bash
   ls -la data/workspaces/
   # Should show agent-* and team-* directories
   ```

6. **Clean Up Old Directories** (Optional)

   ```bash
   rmdir data/agents data/teams
   ```

## Tool Usage Examples

### Discovery Pattern

```typescript
// 1. Discover available folders
const discoverResult = await executeTool({
  name: 'list_folders',
  arguments: {
    agentId: 'agent-123',
    scope: 'my_private'
  }
})

const folders = discoverResult.folders
// folders[0] = {
//   folderId: 'uuid-here',
//   folderName: 'agent-123/private',
//   folderType: 'my_private',
//   path: '/workspaces/agent-123/private/',
//   fileCount: 3,
//   files: [...]
// }
```

### File Operations

```typescript
// 2. Write file using folderId
await executeTool({
  name: 'write_file_by_id',
  arguments: {
    agentId: 'agent-123',
    folderId: folders[0].folderId,
    filename: 'notes.md',
    content: '# My Notes\n\nContent here...'
  }
})

// 3. Read file
const readResult = await executeTool({
  name: 'read_file_by_id',
  arguments: {
    agentId: 'agent-123',
    folderId: folders[0].folderId,
    filename: 'notes.md'
  }
})

// 4. Get file info
const infoResult = await executeTool({
  name: 'get_file_info_by_id',
  arguments: {
    agentId: 'agent-123',
    folderId: folders[0].folderId,
    filename: 'notes.md'
  }
})

// 5. Delete file
await executeTool({
  name: 'delete_file_by_id',
  arguments: {
    agentId: 'agent-123',
    folderId: folders[0].folderId,
    filename: 'notes.md'
  }
})
```

## Error Messages

### Expired FolderId

```text
Folder ID '{uuid}' has expired. Use list_folders() to discover current folders.
```

**Solution**: Call `list_folders` again to get fresh folderIds.

### Invalid FolderId

```text
Folder ID '{uuid}' not found. It may have expired. Use list_folders() to discover current folders.
```

**Solution**: Call `list_folders` to discover available folders.

### Agent Not on Team

```text
Agent is not on a team
```

**Solution**: `team_private` and `team_shared` scopes require agent to be on a team.

## Best Practices

### 1. Always Discover First

Start every workflow with `list_folders` to get current folderIds:

```typescript
const folders = await listFolders(agentId, scope)
const folderId = folders[0].folderId
// Use folderId for subsequent operations
```

### 2. Handle TTL Expiration

FolderIds expire after 30 minutes. If operations fail with expired error, re-discover:

```typescript
try {
  await readFileById(agentId, folderId, filename)
} catch (error) {
  if (error.message.includes('expired')) {
    // Re-discover and retry
    const folders = await listFolders(agentId, scope)
    await readFileById(agentId, folders[0].folderId, filename)
  }
}
```

### 3. Scope Selection

- **my_private**: Agent's private notes/scratch space
- **my_shared**: Agent's shared documents (visible to org)
- **team_private**: Team collaboration space (team members only)
- **team_shared**: Team's public documents (visible to org)
- **org_shared**: Discover all shared resources across org (read-only pattern)

### 4. File Organization

```text
/workspaces/agent-123/
  private/          # Personal workspace
    notes/
    drafts/
  shared/           # Shared with org
    documentation/
    reports/
```

## Backward Compatibility

The old path-based tools (`read_file`, `write_file`, etc.) remain functional for backward compatibility but are **deprecated**. New code should use folder-based tools.

**Migration Timeline:**

- Phase 1 (Current): Both old and new tools available
- Phase 2 (TBD): Old tools marked deprecated with warnings
- Phase 3 (TBD): Old tools removed

## Troubleshooting

### FolderId keeps expiring

- **Cause**: Operations taking longer than 30 minutes
- **Solution**: Re-discover folders more frequently, or batch operations within TTL window

### Can't find team folders

- **Cause**: Agent not assigned to team
- **Solution**: Verify agent.teamId is set correctly

### Permission denied

- **Cause**: Attempting to access folder outside agent's scope
- **Solution**: Verify scope is appropriate (my*\* for agent, team*\* for team members)

## Support

For issues or questions:

1. Check error message for actionable guidance
2. Review this migration guide
3. Consult `.specify/features/F059-workspace-awareness/` documentation
4. Open GitHub issue with `F059` label
