# Issue #59 Update: Agent Workspace Awareness - Folder-Based File Operations

**Status:** Design Complete - Ready for Implementation  
**Design Document:** [Brainstorming Session](brainstorming-session.md)  
**Architectural Decision:** [Index Entry](.specify/memory/architectural-decisions.md#agent-workspace-awareness---folder-based-operations-november-16-2025)

## Problem Statement

Agents lack knowledge of their workspace structure, leading to:

- Path construction errors ("I don't know where files are")
- Misleading "permission denied" errors (actually "unknown path")
- Dependency on user guidance for basic filesystem navigation
- Inability to discover organization-wide resources independently

## Solution: Discovery-First Workflow

Replace path-based file operations with folder discovery using ephemeral folderIds.

## Architecture Summary

### Five Discovery Scopes

1. `my_private` - Agent's private workspace (`/workspaces/{agentId}/private/`)
2. `my_shared` - Agent's shared workspace (`/workspaces/{agentId}/shared/`)
3. `team_private` - Team's private workspace (`/workspaces/{teamId}/private/`) - team members only
4. `team_shared` - Team's shared workspace (`/workspaces/{teamId}/shared/`)
5. `org_shared` - All teams' shared + my team members' shared (excluding agent's own)

### Five New Tools

All tools use `ExecutionContext` for agent identity (no `agentId` parameter):

1. **`list_folders(scope)`** - Discover available folders, returns folderIds + file listings
2. **`read_file_by_id(folderId, filename)`** - Read file content
3. **`write_file_by_id(folderId, filename, content)`** - Write/create file
4. **`delete_file_by_id(folderId, filename)`** - Delete file
5. **`get_file_info_by_id(folderId, filename)`** - Get file metadata

### Key Design Decisions

- **Ephemeral FolderIds:** UUID v4 with 30-minute TTL in in-memory cache
- **Context-Only Pattern:** Agent identity from `ExecutionContext`, not parameters
- **Flatten Subfolders:** Single folderId per workspace, filenames include path (e.g., `"reports/weekly.md"`)
- **Unified Structure:** `/workspaces/{uuid}/private|shared/` for both agents and teams
- **Auto-Create:** Folders created on first write (no explicit `create_folder`)
- **Rich Metadata:** Discovery returns filename, size, modified, mimeType
- **Actionable Errors:** Guide agents to solutions (suggest `list_folders()`, list available files)

### Migration Strategy

**Phase 1: Filesystem Structure (Part of F059):**

1. Create `/workspaces/` structure
2. Move `agents/agent-{id}` → `workspaces/agent-{id}`
3. Move `teams/team-{id}` → `workspaces/team-{id}`
4. Update path resolution in services
5. Remove old structure after validation

**Phase 2: Tool Migration (Future):**

1. Add 5 new folder-based tools
2. Co-existence period (both path-based and folder-based available)
3. Update agent prompts to prefer folder-based tools
4. Monitor usage (6+ months)
5. Deprecate path-based tools
6. Remove after full migration

## Implementation Phases

### Phase 1: Type Definitions & FolderId Strategy (3-4 hours)

- Add `FolderScope`, `FolderInfo`, `FileListResult`, `FileEntry` types
- Implement folderId generation (UUID v4)
- Implement folderId resolution with TTL cache
- Tests: Generation uniqueness, resolution, expiration

### Phase 2: Folder Discovery (5-6 hours)

- Implement `list_folders` tool + executor
- Add `FilesystemService.listFiles()`, `countFiles()`, `guessMimeType()`
- Add data loader methods: `loadAllTeams()`, `loadTeamAgents()`
- Tests: All 5 scopes, file listing, integration flows

### Phase 3: File Operations by ID (6-7 hours)

- Implement 4 file operation tools + executors
- FolderId resolution before operations
- Permission validation using `ExecutionContext`
- Tests: Operations, error handling, expiration scenarios

### Phase 4: Migration & Documentation (2-3 hours)

- Filesystem structure migration script
- Update documentation
- Migration guide for users
- Tests: Backward compatibility, both structures work

**Total Estimated Time:** 16-20 hours

## Success Criteria

**Functional:**

- Agents discover folders via 5 scopes autonomously
- Agents read/write/delete files using discovered folderIds
- Library team files discoverable via `org_shared`
- FolderIds resolve correctly (within TTL)
- Clear, actionable error messages

**Quality:**

- 80-90% code coverage overall
- 100% coverage on folderId resolution and permission checks
- All existing tests continue passing
- TypeScript strict mode clean

**User Experience:**

- Agents complete tasks without path guidance
- Error messages guide agents to solutions
- Agents discover org-wide resources independently

## Future Enhancements

- Pagination for large `org_shared` results
- Nested folder discovery with depth parameter
- Batch file operations
- Tool access control refactoring (blacklist → whitelist)

## Related Issues

- Issue #51 - MCP Tool Integration (PR #58) - Will merge to main first
- Issue #39 - Parent filesystem access issue
- Future: Whitelist refactoring issue (after #51 merges)

## Files to Modify

- `types/index.ts` - New types
- `app/server/services/mcp/file-server.ts` - 5 new tools
- `app/server/services/persistence/filesystem.ts` - File enumeration
- `app/server/data/organizations.ts` - Load all teams
- `app/server/data/teams.ts` - Load team agents
- Filesystem migration script
- Test files (8+)

## Next Steps

1. Design finalized (November 16, 2025)
2. Create sub-issues for 4 implementation phases
3. Begin Phase 1 implementation
4. Iterative development with testing at each phase

---

**Copy this content to GitHub Issue #59 to update it with the finalized architecture.**
