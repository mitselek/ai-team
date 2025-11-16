# Issue #59: Agent Workspace Awareness - Folder-Based File Operations

<!-- markdownlint-disable MD024 MD036 -->

**Date:** November 16, 2025  
**Participants:** User (michelek), AI Assistant  
**Session Type:** Structured brainstorming following brainstorm.prompt.md workflow  
**Status:** ✅ Design Complete - Ready for Implementation

**GitHub Issue:** <https://github.com/mitselek/ai-team/issues/59>

---

## Design Finalized

**Key Decisions Made:**

1. ✅ **Five Discovery Scopes:** `my_private`, `my_shared`, `team_private`, `team_shared`, `org_shared`
2. ✅ **Ephemeral FolderIds:** UUID v4 with 30-minute TTL in-memory cache
3. ✅ **Context-Only Pattern:** `agentId` from ExecutionContext, not parameters
4. ✅ **Flatten Subfolders:** MVP returns single folderId per workspace, filenames include paths
5. ✅ **Whitelist-Based Access:** Three-level whitelist (org → team → agent) with ToolRegistry
6. ✅ **Five New Tools:** `list_folders`, `read_file_by_id`, `write_file_by_id`, `delete_file_by_id`, `get_file_info_by_id`
7. ✅ **Unified Workspace Structure:** `/workspaces/{uuid}/private|shared/` for both agents and teams

**Implementation Ready:** All architectural decisions finalized, sub-issues can be created.

---

## Executive Summary

This brainstorming session explores a fundamental architectural improvement for agent filesystem operations: replacing path-based operations with folder-based discovery workflows. This emerged from Issue #51 (MCP Tool Integration) design work when we realized agents lack knowledge of their workspace structure.

**Key Problem:** Agents don't know what folders exist, leading to "permission errors" that are actually "unknown path" errors.

**Proposed Solution:** Discovery-first workflow using folder IDs instead of path construction.

**Status:** Active design phase - issue will be updated iteratively as architecture solidifies.

---

## Problem Exploration (Phase 1: What?)

### What Exists Now?

**Current MCP Filesystem Tools (from Issue #39):**

```typescript
// Current path-based design
read_file(path: string, agentId: string) → content
write_file(path: string, content: string, agentId: string) → success
delete_file(path: string, agentId: string) → success
list_files(path: string, agentId: string) → string[]
get_file_info(path: string, agentId: string) → metadata
```

**Problem Scenarios:**

1. **Library Team Discovery:**
   - Agent wants to read organization-wide documentation
   - Question: "Is the Library team just another team, or does it need special handling?"
   - Current solution: Agents must know exact path `/teams/library/shared/...`
   - Better solution: Agents discover via `org_shared` scope

2. **Team Member Files:**
   - Leadership agent (Elena) wants to read notes from team members
   - Question: "Which paths are valid? What files exist?"
   - Current solution: User must tell agent exact paths
   - Better solution: Agent discovers via `team_shared` scope

3. **Permission vs. Unknown Path:**
   - Agent tries to read file at wrong path
   - Current error: "Permission denied" (misleading)
   - Real issue: Path doesn't exist or agent doesn't know structure
   - Better solution: Discovery shows what's actually available

### What's the Goal?

Enable agents to discover and navigate their workspace autonomously:

1. Agent discovers available folders via scoped queries
2. System returns folder metadata with unique identifiers
3. Agent uses discovered identifiers for file operations
4. Clear distinction between "folder doesn't exist" vs "no permission"
5. Organization-wide resource visibility (library, team docs, etc.)

### What Constraints Exist?

**Technical:**

- Must maintain security/permission boundaries
- Must work with existing workspace structure
- Must support all 3 LLM providers (already in F051)
- Must not break existing path-based tools during migration

**Architectural:**

- Significant refactoring of MCPFileServer required
- FilesystemService needs folder enumeration logic
- PermissionService must adapt to folderId-based validation
- Type system needs new abstractions (FolderScope, FolderId, etc.)

**User Experience:**

- Discovery must be intuitive for LLM agents
- Results must be clear (which team? which agent?)
- Errors must be actionable (what scopes are available?)

---

## Requirements Definition (Phase 2: Must Do/Not Do)

### Core Requirements

#### R1: Five Discovery Scopes

**Decision:** Define 5 scopes that match agent mental model

**Scopes:**

1. **`my_private`**: Agent's private workspace
   - Path: `/workspaces/{agentId}/private/`
   - Use case: Personal notes, drafts, scratch space
   - Access: Only the agent themselves

2. **`my_shared`**: Agent's shared workspace
   - Path: `/workspaces/{agentId}/shared/`
   - Use case: Work products, reports, team-visible docs
   - Access: Agent + their team + leadership

3. **`team_private`**: Team's private workspace
   - Path: `/workspaces/{teamId}/private/`
   - Use case: Team-internal planning, sensitive team docs, leadership notes
   - Access: Team members only (not visible to other teams)

4. **`team_shared`**: Team's shared workspace
   - Path: `/workspaces/{teamId}/shared/`
   - Use case: Team documentation, policies, shared resources
   - Access: All team members + org-wide visibility

5. **`org_shared`**: Organization-wide shared resources
   - Includes: All teams' shared folders + my team's agents' shared folders (excluding my own)
   - Use case: Cross-team documentation, org policies, library content, team members' work
   - Access: Entire organization (respecting team boundaries)
   - Note: Use `my_shared` to access your own shared folder

**Rationale:** These 5 scopes cover all common access patterns with proper separation between team-internal and team-public content. The `org_shared` scope excludes the agent's own shared folder to maintain clear conceptual boundaries between "my workspace" and "organization resources."

#### R2: Folder-Based Addressing

**Decision:** Use `folderId` + `filename` instead of full paths

**Format:**

```typescript
// Discovery returns folderIds
{
  folderId: "uuid-v4-here",
  folderName: "Marcus (HR Team)",
  folderType: "agent_shared" | "team_shared",
  path: "/workspaces/agent-marcus/shared/", // for human reference
  fileCount: 3
}

// Operations use discovered folderId
read_file(folderId: "uuid-v4-here", filename: "notes.md")
```

**Benefits:**

- Eliminates path construction by agents
- Prevents ambiguity (which Marcus? which team?)
- System handles all path resolution internally
- Easy to track folder access in audit logs

#### R3: Discovery Result Format

**Decision:** Rich metadata for informed agent decisions

**Structure:**

```typescript
interface FileListResult {
  folderId: string // Unique identifier for operations
  folderName: string // Human-readable name
  folderType: FolderScope // Which scope this belongs to
  path: string // Full path (for reference/debugging)
  files: FileEntry[] // List of files in this folder
}

interface FileEntry {
  filename: string
  size: number
  modified: string // ISO 8601 timestamp
  mimeType?: string
}
```

**Example Response:**

```json
[
  {
    "folderId": "a1b2c3d4-...",
    "folderName": "Marcus (HR Team) - Shared",
    "folderType": "agent_shared",
    "path": "/workspaces/agent-marcus/shared/",
    "files": [
      {
        "filename": "interview-notes.md",
        "size": 2048,
        "modified": "2025-11-16T10:30:00Z",
        "mimeType": "text/markdown"
      }
    ]
  }
]
```

#### R4: FolderId Generation Strategy

**DECISION: Option A (Ephemeral) for MVP**

**Chosen Approach: Ephemeral (UUID v4 per request)**

- ✅ No storage required, simple implementation
- ✅ Always reflects current state
- ✅ Easy to implement and test
- ⚠️ FolderId changes between requests (acceptable for MVP)
- ⚠️ Cannot reference folders across tasks (future enhancement if needed)

**Alternatives Considered:**

**Option B: Persistent (Stored in metadata)**

- Pro: Stable references across tasks
- Con: Requires storage/indexing infrastructure
- Con: Must handle folder deletions/renames
- Decision: Defer until proven need

**Option C: Deterministic (Hash-based)**

- Pro: No storage but stable IDs
- Con: Hash collision risk
- Con: Complex reverse lookup required
- Decision: Unnecessary complexity for MVP

**Expiration Strategy:** Time-based (30 minutes) with in-memory cache

#### R5: Library Team Handling

**Decision:** Library team is NOT a special scope

**Rationale:**

- Library team's shared folder appears in `org_shared` scope (like all teams)
- No special `library` scope needed
- Keeps design simple and consistent
- Library team can be discovered same way as other teams

**Example:**

```typescript
// Marcus (agent-marcus) calls list_folders('org_shared'):
[
  { folderName: "Library Team - Shared", ... },
  { folderName: "HR Team - Shared", ... },
  { folderName: "Catalyst (HR) - Shared", ... },  // Marcus's team member
  { folderName: "Nexus (HR) - Shared", ... },     // Another team member
  // Note: Marcus's own shared folder NOT included (use my_shared for that)
  { folderName: "Leadership Team - Shared", ... },
  { folderName: "Elena (Leadership) - Shared", ... }
]
```

#### R6: Migration Strategy

**DECISION: Two-phase migration (filesystem structure + tools)**

**Phase 1: Filesystem Structure Migration**

1. Create `workspaces/` directory structure
2. Move existing folders:
   - `agents/agent-{id}` → `workspaces/agent-{id}`
   - `teams/team-{id}` → `workspaces/team-{id}`
3. Update path resolution logic in all services
4. Maintain backward compatibility (support both paths temporarily)
5. Remove old structure after validation

**Phase 2: Tool Migration (After F059 implementation)**

1. Add new folder-based tools (`list_folders`, `read_file_by_id`, etc.)
2. Both path-based and folder-based tools available
3. Update agent prompts to prefer folder-based tools
4. Monitor usage patterns (6+ months)
5. Deprecate path-based tools
6. Remove path-based tools after full migration

#### R7: Error Messages

**Decision:** Clear, actionable errors that guide agents

**Error Categories:**

1. **Scope Invalid:**

   ```text
   "Invalid scope 'team_library'. Available scopes: my_private, my_shared, team_private, team_shared, org_shared"
   ```

2. **Folder Not Found:**

   ```text
   "Folder ID 'abc123' not found. It may have been deleted. Use list_folders() to discover current folders."
   ```

3. **File Not Found:**

   ```text
   "File 'notes.md' not found in folder 'Marcus (HR) - Shared'. Available files: [interview-notes.md, review.md]"
   ```

4. **Permission Denied:**

   ```text
   "You don't have permission to write to folder 'Finance Team - Shared'. Your team: HR"
   ```

### Must Not Do

- ❌ Don't expose internal path structure to agents (use folderIds)
- ❌ Don't require agents to construct paths manually
- ❌ Don't create a `library` scope (use `org_shared` instead)
- ❌ Don't break existing path-based tools during migration
- ❌ Don't return ALL org files at once (scope-based filtering required)
- ❌ Don't allow folder operations outside workspace boundaries

---

## Architecture Definition (Phase 3: How?)

### Component Responsibilities

#### 1. Type Definitions (`types/index.ts`)

**New Types:**

```typescript
// Folder scopes for discovery
type FolderScope = 'my_private' | 'my_shared' | 'team_private' | 'team_shared' | 'org_shared'

// Folder metadata returned by discovery
interface FolderInfo {
  folderId: string
  folderName: string
  folderType: FolderScope
  path: string
  fileCount: number
}

// File discovery result
interface FileListResult extends FolderInfo {
  files: FileEntry[]
}

interface FileEntry {
  filename: string
  size: number
  modified: string
  mimeType?: string
}

// MCP Tool definitions (add 5 new tools)
// Note: agentId comes from ExecutionContext, not parameters
interface MCPTool {
  name:
    | 'list_folders'
    | 'read_file_by_id'
    | 'write_file_by_id'
    | 'delete_file_by_id'
    | 'get_file_info_by_id'
  // ... rest of MCP tool structure
}
```

#### 2. MCPFileServer (`app/server/services/mcp/file-server.ts`)

**New Tool Definitions:**

```typescript
// 1. list_folders
{
  name: "list_folders",
  description: "Discover available folders in your workspace by scope",
  inputSchema: {
    type: "object",
    properties: {
      scope: {
        type: "string",
        enum: ["my_private", "my_shared", "team_private", "team_shared", "org_shared"],
        description: "Scope to search within"
      }
    },
    required: ["scope"]
  }
}

// 2. read_file_by_id
{
  name: "read_file_by_id",
  description: "Read file content using folder ID from list_folders()",
  inputSchema: {
    type: "object",
    properties: {
      folderId: { type: "string", description: "Folder ID from list_folders()" },
      filename: { type: "string", description: "Name of file to read" }
    },
    required: ["folderId", "filename"]
  }
}

// 3-5. write_file_by_id, delete_file_by_id, get_file_info_by_id (similar structure)
// Note: All tools receive agentId via ExecutionContext, not parameters
```

**New Execute Methods:**

```typescript
async executeListFolders(
  params: { scope: FolderScope },
  context: ExecutionContext
): Promise<FileListResult[]> {
  // 1. Load agent + team from context.agentId
  const agent = await dataLoader.loadAgent(context.agentId)
  const team = agent.teamId ? await dataLoader.loadTeam(agent.teamId) : null

  // 2. Determine folders based on scope
  const folders: FolderInfo[] = []

  switch (params.scope) {
    case 'my_private':
      folders.push(await this.getWorkspaceFolder(
        agent.id,
        agent.name,
        'private',
        'my_private'
      ))
      break

    case 'my_shared':
      folders.push(await this.getWorkspaceFolder(
        agent.id,
        agent.name,
        'shared',
        'my_shared'
      ))
      break

    case 'team_private':
      if (team) {
        folders.push(await this.getWorkspaceFolder(
          team.id,
          `${team.name} Team`,
          'private',
          'team_private'
        ))
      }
      break

    case 'team_shared':
      if (team) {
        folders.push(await this.getWorkspaceFolder(
          team.id,
          `${team.name} Team`,
          'shared',
          'team_shared'
        ))
      }
      break

    case 'org_shared':
      // All teams' shared folders
      const allTeams = await dataLoader.loadAllTeams(agent.organizationId)
      for (const t of allTeams) {
        folders.push(await this.getWorkspaceFolder(
          t.id,
          `${t.name} Team`,
          'shared',
          'org_shared'
        ))
      }

      // My team members' shared folders (excluding agent's own)
      if (team) {
        const teamAgents = await dataLoader.loadTeamAgents(team.id)
        for (const a of teamAgents) {
          if (a.id !== agent.id) { // Exclude agent's own shared folder
            folders.push(await this.getWorkspaceFolder(
              a.id,
              `${a.name} (${team.name})`,
              'shared',
              'org_shared'
            ))
          }
        }
      }
      break
  }

  // 3. For each folder, list files and generate folderId
  const results: FileListResult[] = []
  for (const folder of folders) {
    const files = await filesystemService.listFiles(folder.path)
    const folderId = this.generateFolderId(folder.path) // ephemeral or persistent?

    results.push({
      folderId,
      folderName: folder.folderName,
      folderType: params.scope,
      path: folder.path,
      files: files.map(f => ({
        filename: f.name,
        size: f.size,
        modified: f.modified,
        mimeType: f.mimeType
      }))
    })
  }

  return results
}

async executeReadFileById(
  params: { folderId: string, filename: string },
  context: ExecutionContext
): Promise<string> {
  // 1. Resolve folderId → path
  const path = await this.resolveFolderId(params.folderId)

  // 2. Check permissions using context
  const hasAccess = await permissionService.checkFileAccess(
    context.agentId,
    path,
    'read'
  )
  if (!hasAccess) {
    throw new PermissionError(/* ... */)
  }

  // 3. Read file (existing logic)
  const fullPath = `${path}/${params.filename}`
  return await filesystemService.readFile(fullPath)
}

// Similar for write_file_by_id, delete_file_by_id, get_file_info_by_id
// All use context.agentId instead of params.agentId
```

**Helper Methods:**

```typescript
private generateFolderId(path: string): string {
  // Option A: Ephemeral (UUID v4)
  return uuidv4()

  // Option B: Persistent (lookup or create)
  // return await folderIdRegistry.getOrCreate(path)

  // Option C: Deterministic (hash)
  // return createHash('sha256').update(path).digest('hex').substring(0, 16)
}

private async resolveFolderId(folderId: string): Promise<string> {
  // Option A: Ephemeral - store in memory cache (expires after N minutes)
  const cached = this.folderIdCache.get(folderId)
  if (!cached) {
    throw new Error(
      `Folder ID '${folderId}' not found. It may have expired. Use list_folders() to discover current folders.`
    )
  }
  return cached

  // Option B: Persistent - lookup in database/file
  // return await folderIdRegistry.resolve(folderId)

  // Option C: Deterministic - reverse hash (requires indexed lookup)
  // return await this.reverseLookupPath(folderId)
}

private async getWorkspaceFolder(
  workspaceId: string,
  displayName: string, // Pre-computed display name by caller (avoids redundant ID+name parameters)
  type: 'private' | 'shared',
  folderType: FolderScope
): Promise<FolderInfo> {
  // Note: displayName is pre-computed by caller to avoid passing both ID and name.
  // Caller already has the full object and decides the display format.
  const path = `/workspaces/${workspaceId}/${type}/`
  const fileCount = await filesystemService.countFiles(path)

  return {
    folderId: '', // Will be filled by executeListFolders
    folderName: `${displayName} - ${type}`,
    folderType,
    path,
    fileCount
  }
}
```

#### 3. FilesystemService (`app/server/services/persistence/filesystem.ts`)

**New Methods:**

```typescript
async listFiles(path: string): Promise<FileEntry[]> {
  // Read directory, return file metadata
  const entries = await fs.readdir(path, { withFileTypes: true })

  return entries
    .filter((e) => e.isFile())
    .map((e) => ({
      filename: e.name,
      size: fs.statSync(`${path}/${e.name}`).size,
      modified: fs.statSync(`${path}/${e.name}`).mtime.toISOString(),
      mimeType: this.guessMimeType(e.name)
    }))
}

async countFiles(path: string): Promise<number> {
  const entries = await fs.readdir(path, { withFileTypes: true })
  return entries.filter((e) => e.isFile()).length
}

private guessMimeType(filename: string): string | undefined {
  const ext = filename.split('.').pop()?.toLowerCase()
  const mimeTypes: Record<string, string> = {
    md: 'text/markdown',
    txt: 'text/plain',
    json: 'application/json',
    js: 'text/javascript',
    ts: 'text/typescript'
    // ... more as needed
  }
  return mimeTypes[ext || '']
}
```

#### 4. Data Loader (`app/server/data/*.ts`)

**New Methods:**

```typescript
// In organizations.ts
async loadAllTeams(organizationId: string): Promise<Team[]> {
  const org = await this.loadOrganization(organizationId)
  const teamIds = org.teams || []
  return Promise.all(teamIds.map((id) => this.loadTeam(id)))
}

// In teams.ts
async loadTeamAgents(teamId: string): Promise<Agent[]> {
  const agents = await this.loadAllAgents(org.id) // existing
  return agents.filter((a) => a.teamId === teamId)
}
```

### Data Flow

```text
┌──────────────────────────────────────────────────────────────┐
│ 1. DISCOVERY PHASE                                           │
│                                                              │
│ Agent → list_folders("org_shared") → MCPFileServer           │
│                                                              │
│ MCPFileServer:                                               │
│   - Load agent + team                                        │
│   - Enumerate folders based on scope:                        │
│     • org_shared: all teams' shared/ + my team agents shared │
│   - For each folder:                                         │
│     • Generate folderId                                      │
│     • List files                                             │
│     • Build FileListResult                                   │
│   - Return array of FileListResult                           │
└─────────────────────┬────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. OPERATION PHASE                                           │
│                                                              │
│ Agent → read_file_by_id(folderId, "notes.md") → MCPFileServer│
│                                                              │
│ MCPFileServer:                                               │
│   - Resolve folderId → path (cache/lookup/hash)              │
│   - Check permissions (existing PermissionService)           │
│   - Read file (existing FilesystemService)                   │
│   - Return content                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Open Questions & Design Decisions Needed

### 🔴 Critical Decisions (Block Implementation)

#### Q1: FolderId Generation Strategy

**Question:** Ephemeral, persistent, or deterministic?

**Options:**

- **A) Ephemeral (UUID v4 per request):** Simple, no storage, but IDs expire
- **B) Persistent (stored mapping):** Stable IDs, requires storage/indexing
- **C) Deterministic (hash-based):** No storage but stable, complex to reverse

**Factors to Consider:**

- How long do agents typically work on tasks? (minutes? hours?)
- Do agents need to reference folders across multiple tasks?
- Storage/performance implications of persistent IDs?

**Recommendation:** Start with A (ephemeral) for MVP, add B if needed.

#### Q2: FolderId Expiration

**DECISION: Time-based (30 minutes)**

**Implementation:**

- In-memory cache with TTL
- Clear error message on expiry: "Folder ID expired. Please call list_folders() again."
- Cache cleanup runs periodically

**Alternatives Considered:**

- Per task: Too short for multi-step workflows
- Session-based: Complex to track agent sessions
- Decision: 30 minutes balances usability and memory usage

#### Q3: Subfolder Discovery Strategy

**DECISION: Flatten filenames (Option 1) for MVP**

**Approach:**

- Discovery returns single folderId per workspace
- Filenames include subfolder path: `"reports/weekly.md"`
- Agents can filter by filename prefix if needed
- Simple implementation, no complex nested discovery

**Implementation:**

```typescript
{
  folderId: "abc123",
  folderName: "Marcus (HR) - Shared",
  files: [
    { filename: "reports/weekly.md", ... },
    { filename: "interviews/alice.md", ... }
  ]
}
```

**Future Enhancement:** Add subfolder enumeration if agents struggle with large flat lists

### 🟡 Important Questions (Can be decided during implementation)

#### Q4: Folder Creation

**Question:** How do agents create new folders?

**Options:**

- Auto-create on first write (write_file_by_id creates missing folders)
- Explicit create_folder() tool
- Not supported (admin-only operation)

**Recommendation:** Auto-create on write for simplicity.

#### Q5: Performance Optimization

**Question:** What if `org_shared` returns hundreds of results?

**Options:**

- Pagination (limit + offset parameters)
- Filtering (search query parameter)
- Lazy loading (return folder metadata only, files on demand)

**Recommendation:** Start without optimization, add pagination if needed.

#### Q6: Audit Logging

**Question:** What folder operations should be logged?

**Current Logging:**

- All file read/write/delete operations (existing)

**Add:**

- Folder discovery operations (`list_folders` calls)
- FolderId resolution attempts (for security analysis)

**Recommendation:** Log all folder operations for security audit trail.

---

## Testing Strategy

### Unit Tests

**FolderId Generation/Resolution:**

- ✓ Generate unique folderIds for different paths
- ✓ Resolve folderId back to correct path
- ✓ Handle expired folderIds gracefully
- ✓ Handle invalid folderIds with clear errors

**Scope-Based Discovery:**

- ✓ `my_private` returns only agent's private folder
- ✓ `my_shared` returns only agent's shared folder
- ✓ `team_private` returns only team's private folder (team members only)
- ✓ `team_shared` returns team's shared folder
- ✓ `org_shared` returns all teams' shared folders + my team members' shared folders (excluding agent's own)
- ✓ Handle agents with no team assigned

**Folder Enumeration:**

- ✓ List files correctly with metadata
- ✓ Count files accurately
- ✓ Guess MIME types correctly
- ✓ Handle empty folders
- ✓ Handle folders with many files

**Permission Validation:**

- ✓ Check permissions on folder operations
- ✓ Prevent access to other agents' private folders
- ✓ Prevent access to other teams' private folders
- ✓ Allow access to own team private folder
- ✓ Allow access to team shared folders
- ✓ Allow access to org shared folders

### Integration Tests

**Discovery + Operation Flows:**

- ✓ Discover folder → read file (happy path)
- ✓ Discover folder → write file → read back
- ✓ Discover folder → delete file
- ✓ Discover multiple folders → operate on each
- ✓ FolderId expires → graceful error + rediscovery

**Cross-Team Access:**

- ✓ HR agent discovers library team shared files (via org_shared)
- ✓ HR agent cannot discover other teams' private files
- ✓ Leadership agent discovers all team shared files
- ✓ Developer agent cannot access private folders of others (agents or teams)

**Error Scenarios:**

- ✓ Invalid scope → clear error message
- ✓ Expired folderId → clear error message
- ✓ File not found in folder → list available files
- ✓ Permission denied → explain which scope to use

### Coverage Target

**Industry Standard:** 80-90% code coverage  
**Critical Paths:** 100% coverage (folderId resolution, permission checks, scope logic)

---

## Implementation Phases

### Phase 1: Type Definitions & FolderId Strategy (3-4 hours)

**Files:**

- `types/index.ts` - Add FolderScope, FolderInfo, FileListResult, FileEntry
- `app/server/services/mcp/file-server.ts` - Add folderId helper methods (generate, resolve, cache)

**Tests:**

- Unit: FolderId generation uniqueness
- Unit: FolderId resolution (cache hit/miss)
- Unit: FolderId expiration logic

**Decision Point:** Finalize folderId generation strategy (ephemeral vs persistent)

### Phase 2: Folder Discovery (list_folders) (5-6 hours)

**Files:**

- `app/server/services/mcp/file-server.ts` - Add list_folders tool + executeListFolders()
- `app/server/services/persistence/filesystem.ts` - Add listFiles(), countFiles(), guessMimeType()
- `app/server/data/organizations.ts` - Add loadAllTeams()
- `app/server/data/teams.ts` - Add loadTeamAgents()

**Tests:**

- Unit: Scope-based folder enumeration (5 scopes)
- Unit: File listing with metadata
- Integration: Full discovery flow per scope

### Phase 3: File Operations by ID (6-7 hours)

**Files:**

- `app/server/services/mcp/file-server.ts` - Add 4 new tools:
  - `read_file_by_id`
  - `write_file_by_id`
  - `delete_file_by_id`
  - `get_file_info_by_id`

**Tests:**

- Unit: FolderId resolution before operations
- Unit: Permission checks on folder operations
- Integration: Discover → read → write → delete flows
- Integration: Error scenarios (expired ID, invalid ID, permission denied)

### Phase 4: Migration & Documentation (2-3 hours)

**Files:**

- `app/server/services/mcp/file-server.ts` - Mark old path-based tools as deprecated
- `.specify/features/F059-workspace-awareness/migration-guide.md` - Document migration
- Update agent prompts to prefer new tools

**Tests:**

- Integration: Both old and new tools work simultaneously
- Integration: Backward compatibility verified

**Total Estimated Time:** 16-20 hours

---

## Success Criteria

### Functional Success

- ✅ Agents can discover folders via 5 scopes (my_private, my_shared, team_private, team_shared, org_shared)
- ✅ Agents can read/write/delete files using discovered folderIds
- ✅ Library team files discoverable via org_shared scope
- ✅ FolderIds resolve correctly (within expiration window)
- ✅ Clear error messages guide agents on failures
- ✅ Permissions enforced on all folder operations

### Quality Success

- ✅ 80-90% code coverage overall
- ✅ 100% coverage on folderId resolution and permission checks
- ✅ All existing tests continue to pass
- ✅ TypeScript strict mode clean
- ✅ No regressions in path-based tools (during migration)

### User Experience Success

- ✅ Agents successfully complete tasks without path guidance
- ✅ "Permission errors" replaced with "folder not found" when appropriate
- ✅ Agents discover organization-wide resources autonomously
- ✅ Error messages actionable (suggest using list_folders)

---

## Design Evolution: Whitelist-Based Access Control

**Date Added:** November 16, 2025  
**Impact:** High - Affects both F051 (Issue #51) and F059 (Issue #59)

### Problem with Current Design

**Issue #51 Current Approach:**

- Tools defined in `org.json` with `tools: MCPTool[]`
- Access control via blacklists: `team.toolBlacklist`, `agent.toolBlacklist`
- Logic: Agent gets all org tools MINUS blacklisted tools

**Problems:**

1. **Default-allow is risky:** New tools automatically available to all agents
2. **Blacklist maintenance:** Must explicitly block tools for each team/agent
3. **No clear "tool registry":** Tool definitions mixed with org config
4. **Unclear tool provenance:** Where do tool definitions come from?

### Proposed Solution: Three-Level Whitelist with Separate Tool Registry

**Architecture:**

```text
┌─────────────────────────────────────────────────────────────────┐
│ TOOL REGISTRY (System-Level)                                    │
│ Location: app/server/services/mcp/tool-registry.ts              │
│                                                                 │
│ - Canonical tool definitions (MCP format)                       │
│ - Filesystem tools, GitHub tools, Shell tools, etc.             │
│ - Version-controlled, code-based (not JSON config)              │
│ - Single source of truth for ALL available tools                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ ORGANIZATION CONFIG (data/organizations/{orgId}/org.json)       │
│                                                                 │
│ toolWhitelist: string[]  // Tool names enabled for this org     │
│                                                                 │
│ Example:                                                        │
│ {                                                               │
│   "id": "org-1",                                                │
│   "name": "AI Team",                                            │
│   "toolWhitelist": [                                            │
│     "list_folders",                                             │
│     "read_file_by_id",                                          │
│     "write_file_by_id",                                         │
│     "delete_file_by_id",                                        │
│     "get_file_info_by_id"                                       │
│   ]                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ TEAM CONFIG (data/organizations/{orgId}/teams.json)             │
│                                                                 │
│ toolWhitelist?: string[]  // Optional: restrict team to subset  │
│                                                                 │
│ Example:                                                        │
│ {                                                               │
│   "id": "team-hr",                                              │
│   "name": "HR",                                                 │
│   "toolWhitelist": [                                            │
│     "list_folders",     // HR can discover                      │
│     "read_file_by_id",  // HR can read                          │
│     "write_file_by_id"  // HR can write (no delete)             │
│   ]                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ AGENT CONFIG (data/organizations/{orgId}/agents.json)           │
│                                                                 │
│ toolWhitelist?: string[]  // Optional: further restrict agent   │
│                                                                 │
│ Example:                                                        │
│ {                                                               │
│   "id": "agent-intern",                                         │
│   "name": "Intern Bob",                                         │
│   "teamId": "team-dev",                                         │
│   "toolWhitelist": [                                            │
│     "list_folders",     // Intern can discover                  │
│     "read_file_by_id"   // Intern can only read (no write)      │
│   ]                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Access Control Logic: Intersection of Whitelists

**Rule:** Agent can use tool ONLY IF whitelisted at ALL THREE levels

```typescript
function getAvailableTools(agent: Agent, team: Team | null, org: Organization): MCPTool[] {
  const toolRegistry = ToolRegistry.getInstance()

  // Start with org whitelist
  let allowedTools = new Set(org.toolWhitelist || [])

  // Intersect with team whitelist (if team has one)
  if (team?.toolWhitelist) {
    allowedTools = intersection(allowedTools, new Set(team.toolWhitelist))
  }

  // Intersect with agent whitelist (if agent has one)
  if (agent.toolWhitelist) {
    allowedTools = intersection(allowedTools, new Set(agent.toolWhitelist))
  }

  // Load tool definitions from registry
  return Array.from(allowedTools).map((name) => toolRegistry.getTool(name))
}

// Example scenarios:
// 1. Org allows [A, B, C], Team allows [B, C], Agent allows [B, D]
//    → Agent gets: [B] (intersection of all three)
//
// 2. Org allows [A, B, C], Team has no whitelist, Agent has no whitelist
//    → Agent gets: [A, B, C] (org whitelist is default)
//
// 3. Org allows [A, B, C], Team allows [A], Agent allows [B]
//    → Agent gets: [] (no intersection - agent can use no tools)
```

### Benefits of Whitelist Approach

**Security:**

- ✅ Default-deny: New tools must be explicitly enabled
- ✅ Principle of least privilege: Each level can only restrict, not expand
- ✅ Clear audit trail: Tool access defined at 3 levels
- ✅ Easy to reason about: Intersection logic is simple

**Maintainability:**

- ✅ Tool definitions separate from config (code vs. data)
- ✅ Version control: Tool registry in Git, configs in data/
- ✅ Easy tool updates: Change registry, configs reference by name
- ✅ Clear tool provenance: All tools defined in one place

**Flexibility:**

- ✅ Org-level defaults: Most agents inherit org whitelist
- ✅ Team-level restrictions: "HR team can't delete files"
- ✅ Agent-level restrictions: "Intern agents read-only"
- ✅ Optional overrides: Team/Agent whitelists are optional

### Tool Registry Structure

**New File:** `app/server/services/mcp/tool-registry.ts`

```typescript
export class ToolRegistry {
  private static instance: ToolRegistry
  private tools: Map<string, MCPTool>

  private constructor() {
    this.tools = new Map()
    this.registerDefaultTools()
  }

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry()
    }
    return ToolRegistry.instance
  }

  private registerDefaultTools(): void {
    // Folder-based filesystem tools (F059)
    this.register({
      name: 'list_folders',
      description: 'Discover available folders in your workspace by scope',
      inputSchema: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            enum: ['my_private', 'my_shared', 'team_private', 'team_shared', 'org_shared'],
            description: 'Scope to search within'
          },
          agentId: { type: 'string' }
        },
        required: ['scope', 'agentId']
      }
    })

    this.register({
      name: 'read_file_by_id',
      description: 'Read file content using folder ID from list_folders()',
      inputSchema: {
        type: 'object',
        properties: {
          folderId: { type: 'string', description: 'Folder ID from list_folders()' },
          filename: { type: 'string', description: 'Name of file to read' },
          agentId: { type: 'string' }
        },
        required: ['folderId', 'filename', 'agentId']
      }
    })

    // ... register other tools (write_file_by_id, delete_file_by_id, etc.)
  }

  register(tool: MCPTool): void {
    this.tools.set(tool.name, tool)
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name)
  }

  getAllTools(): MCPTool[] {
    return Array.from(this.tools.values())
  }

  listToolNames(): string[] {
    return Array.from(this.tools.keys())
  }
}
```

### Configuration Examples

1. **Scenario: Standard Developer**

   ```json
   // org.json
   {
   "toolWhitelist": ["list_folders", "read_file_by_id", "write_file_by_id", "delete_file_by_id", "get_file_info_by_id"]
   }

   // team.json (Development team - no restrictions)
   {
   "name": "Development",
   // No toolWhitelist = inherits org whitelist
   }

   // agent.json (Senior developer - no restrictions)
   {
   "name": "Catalyst",
   "teamId": "team-dev"
   // No toolWhitelist = inherits team whitelist (which is org whitelist)
   }

   // Result: Catalyst gets all 5 tools
   ```

2. **Scenario: Junior Developer (Read-Only)**

   ```json
   // org.json - same as above

   // team.json (Development team - no restrictions)
   {
   "name": "Development"
   }

   // agent.json (Junior developer - read-only)
   {
   "name": "Intern Bob",
   "teamId": "team-dev",
   "toolWhitelist": ["list_folders", "read_file_by_id", "get_file_info_by_id"]
   }

   // Result: Intern Bob gets 3 tools (no write, no delete)
   ```

3. **Scenario: HR Team (No Delete)**

   ```json
   // org.json - same as above

   // team.json (HR team - no delete)
   {
   "name": "HR",
   "toolWhitelist": ["list_folders", "read_file_by_id", "write_file_by_id", "get_file_info_by_id"]
   }

   // agent.json (Marcus - inherits team restrictions)
   {
   "name": "Marcus",
   "teamId": "team-hr"
   }

   // Result: Marcus gets 4 tools (no delete)
   ```

4. **Scenario: Restrictive Team + Permissive Agent (Intersection)**

   ```json
   // org.json
   {
   "toolWhitelist": ["list_folders", "read_file_by_id", "write_file_by_id", "delete_file_by_id"]
   }

   // team.json (Very restrictive)
   {
   "name": "External Contractors",
   "toolWhitelist": ["list_folders", "read_file_by_id"]
   }

   // agent.json (Agent tries to expand permissions - WON'T WORK)
   {
   "name": "Contractor Alice",
   "teamId": "team-contractors",
   "toolWhitelist": ["list_folders", "read_file_by_id", "write_file_by_id", "delete_file_by_id"]
   }

   // Result: Alice gets only 2 tools (intersection with team: list_folders, read_file_by_id)
   // Agent whitelist cannot EXPAND beyond team whitelist
   ```

### Migration Path from Issue #51 Blacklist Design

**Current State (Issue #51 implementation):**

- Tools defined in `org.tools: MCPTool[]`
- Access control via `team.toolBlacklist`, `agent.toolBlacklist`

**Migration Steps:**

1. **Create Tool Registry** (new file)
   - Move tool definitions from org.json to code
   - Create ToolRegistry singleton

2. **Add Whitelist Fields** (config migration)
   - Add `org.toolWhitelist: string[]`
   - Add optional `team.toolWhitelist?: string[]`
   - Add optional `agent.toolWhitelist?: string[]`

3. **Update Orchestrator** (logic change)
   - Replace blacklist logic with whitelist intersection
   - Load tools from registry instead of org config

4. **Backward Compatibility** (temporary)
   - If `org.tools` exists, convert to `org.toolWhitelist` (extract names)
   - If `team.toolBlacklist` exists, convert to whitelist (org tools - blacklist)
   - Deprecation warning in logs

5. **Remove Old Fields** (cleanup)
   - Remove `org.tools` field
   - Remove `team.toolBlacklist` field
   - Remove `agent.toolBlacklist` field

### Impact on Issue #51 (Already Implemented)

**Current PR Status:** Issue #51 implementation complete, PR #58 open

**Options:**

**Option A: Update PR #58 before merge:**

- Change from blacklist to whitelist approach
- Update tests to reflect new logic
- Delay merge until whitelist implementation complete

**Option B: Merge PR #58, then refactor:**

- Merge current blacklist implementation
- Create new issue for whitelist refactoring
- Implement migration with backward compatibility

**Option C: Hybrid approach:**

- Merge PR #58 as-is (blacklist implementation working)
- Include migration plan in Issue #59
- Both issues implement whitelist together

**Recommendation:** **Option B** - Merge #58, refactor in separate issue

- Rationale: Don't block working code for architecture evolution
- PR #58 has 100% test coverage and zero regressions
- Whitelist refactoring can be done safely with backward compatibility
- Gives us time to validate whitelist design in this brainstorming

### Open Questions on Whitelist Design

1. **Default behavior when whitelist missing?**
   - Option A: Empty whitelist = no tools (explicit enable required)
   - Option B: Missing whitelist = inherit parent level
   - **Recommendation:** Option B (inherit parent) for ergonomics

2. **Tool registry extensibility?**
   - Should orgs be able to define custom tools in their config?
   - Or are all tools system-defined in code?
   - **Recommendation:** System-defined only for MVP, custom tools in future

3. **Whitelist validation?**
   - Validate that whitelisted tool names exist in registry?
   - Warn or error if tool not found?
   - **Recommendation:** Warn in logs, skip unknown tools

4. **Performance implications?**
   - Intersection logic runs on every tool request?
   - Cache available tools per agent?
   - **Recommendation:** Cache in agent initialization, invalidate on config change

### Decision Point: Apply to Issue #59?

**Question:** Should Issue #59 (workspace awareness) implement whitelist approach from the start?

**Answer:** **YES**

**Rationale:**

- F059 defines NEW tools (folder-based operations)
- No existing implementation to migrate from
- Clean slate to implement whitelist correctly
- Provides reference implementation for F051 refactoring

**Action Items:**

1. Update F059 architecture to use ToolRegistry + whitelists
2. Create ToolRegistry as part of F059 Phase 1
3. Document whitelist pattern for future tool additions
4. Create separate issue for F051 refactoring (after PR #58 merges)

---

## Next Steps

1. **Continue Brainstorming:**
   - Finalize folderId generation strategy (ephemeral vs persistent)
   - Decide on folderId expiration policy
   - Clarify nested folder support (flat vs recursive)
   - **NEW:** Finalize whitelist design decisions (defaults, validation, caching)

2. **Update GitHub Issue #59:**
   - Add finalized architectural decisions
   - Update open questions as they're resolved
   - Add links to this brainstorming document

3. **Create Sub-Issues (when design complete):**
   - Issue #59.1: Type Definitions & FolderId Strategy
   - Issue #59.2: Folder Discovery (list_folders)
   - Issue #59.3: File Operations by ID
   - Issue #59.4: Migration & Documentation

4. **Mark Issue Ready for Implementation:**
   - Remove [WIP] prefix from title
   - Update status section
   - Add final specification document

---

## References

1. **Related Issues:**
   - Issue #39: Parent issue for filesystem access system
   - Issue #51: MCP Tool Integration (where this design emerged)
   - Issue #59: This feature (workspace awareness)

2. **Existing Code:**
   - `app/server/services/mcp/file-server.ts` - Current path-based tools
   - `app/server/services/persistence/*` - Filesystem services
   - `app/server/services/orchestrator.ts` - Permission validation

3. **Design Documents:**
   - `.specify/features/F051-tool-integration/brainstorming-session.md` - MCP integration patterns

---

## Session Metadata

**Brainstorming Duration:** ~1.5 hours (ongoing)  
**Questions Explored:** 10+  
**Key Decisions Made:** 7  
**Open Decisions:** 3 (folderId strategy, expiration, nesting)  
**Files to be Modified:** 8+  
**Tests to be Created:** 25+  
**Estimated Implementation Time:** 16-20 hours (4 phases)

**Session Quality:** ✅ Complete - All decisions finalized  
**Confidence Level:** High - Full architecture documented and approved  
**Risks Identified:** None - All critical decisions made

---

## Deep Dive: Tool Names and Semantic Reach

**Question:** What should the folder-based filesystem tools be named, and what operations should they support?

### Tool Naming Principles

**Considerations:**

1. **Clarity:** Name should clearly indicate what the tool does
2. **Consistency:** Follow established patterns from MCP ecosystem
3. **Brevity:** Short enough for LLMs to use easily
4. **Semantic Meaning:** Name reflects folder-based vs path-based approach
5. **Future-Proofing:** Room for related tools without name collision

**Naming Patterns to Consider:**

**Pattern A: Explicit "folder" prefix**

- `folder_list`, `folder_read_file`, `folder_write_file`, `folder_delete_file`, `folder_file_info`
- Pro: Very clear it's folder-based
- Con: Verbose, repetitive

**Pattern B: Scope-based naming:**

- `discover_files`, `read_discovered_file`, `write_discovered_file`, etc.
- Pro: Emphasizes discovery workflow
- Con: Less clear what "discovered" means

**Pattern C: Workspace-centric naming:**

- `workspace_list`, `workspace_read`, `workspace_write`, `workspace_delete`, `workspace_info`
- Pro: Clear scope (workspace operations)
- Con: Ambiguous (list what? workspaces or files?)

**Pattern D: Mixed approach (discovery + operation):**

- `list_folders` (discovery)
- `read_file`, `write_file`, `delete_file`, `get_file_info` (operations, context from folderId)
- Pro: Natural language flow
- Con: Operations ambiguous without context

**Pattern E: ID-based suffix:**

- `list_folders`, `read_file_by_id`, `write_file_by_id`, `delete_file_by_id`, `get_file_info_by_id`
- Pro: Clear distinction from path-based tools
- Con: Slightly verbose

### Recommended Tool Names (Pattern E with refinements)

**Decision:** Use Pattern E - clear, explicit, distinguishes from path-based

```typescript
// Discovery tool
'list_folders' // Discovers folders by scope, returns folderIds

// File operation tools (using folderId)
'read_file_by_id' // Read file content
'write_file_by_id' // Write/create file
'delete_file_by_id' // Delete file
'get_file_info_by_id' // Get file metadata
```

**Rationale:**

- `list_folders` is concise and clear (discover folders)
- `_by_id` suffix clearly indicates folder-based addressing
- Distinguishes from future path-based tools (if they coexist)
- Natural for LLMs: "list folders, then read file by ID"

### Tool Semantic Reach: What Operations to Support?

**Core Operations (MVP):**

#### 1. `list_folders(scope)`

**Semantics:**

- Returns ALL folders within scope (no filtering in MVP)
- Each result includes folder metadata + file list
- Files listed with metadata (name, size, modified, mimeType)
- Agent identity from ExecutionContext

**Parameters:**

```typescript
{
  scope: 'my_private' | 'my_shared' | 'team_private' | 'team_shared' | 'org_shared'
}
```

**Returns:**

```typescript
{
  folders: [
    {
      folderId: string,
      folderName: string,        // e.g., "Marcus (HR Team) - Shared"
      folderType: string,        // e.g., "agent_shared"
      path: string,              // For debugging only
      files: [
        {
          filename: string,
          size: number,
          modified: string,      // ISO 8601
          mimeType?: string
        }
      ]
    }
  ]
}
```

**Edge Cases:**

- Empty scope (no folders): Return empty array
- Scope with folders but no files: Return folders with empty files arrays
- Agent with no team: `team_shared` and `org_shared` return empty

#### 2. `read_file_by_id(folderId, filename)`

**Semantics:**

- Reads entire file content (no partial reads in MVP)
- Returns plain text content
- Validates folderId exists and not expired
- Checks read permissions using ExecutionContext

**Parameters:**

```typescript
{
  folderId: string,    // From list_folders result
  filename: string     // Exact filename from list_folders
}
```

**Returns:**

```typescript
{
  content: string,
  encoding: 'utf-8' | 'base64',  // utf-8 for text, base64 for binary
  size: number
}
```

**Edge Cases:**

- FolderId expired: Error with suggestion to call `list_folders` again
- FolderId invalid: Error explaining ID not found
- Filename not in folder: Error listing available filenames
- File deleted after discovery: Error indicating file no longer exists
- Binary file: Return base64 encoded content

#### 3. `write_file_by_id(folderId, filename, content)`

**Semantics:**

- Creates file if doesn't exist, overwrites if exists
- Auto-creates folder if it doesn't exist (within workspace boundaries)
- Validates write permissions using ExecutionContext
- Respects quota limits (if implemented)

**Parameters:**

```typescript
{
  folderId: string,
  filename: string,
  content: string,
  encoding?: 'utf-8' | 'base64'  // Optional, defaults to utf-8
}
```

**Returns:**

```typescript
{
  success: boolean,
  bytesWritten: number,
  created: boolean,        // true if new file, false if overwrite
  path: string            // For debugging/confirmation
}
```

**Edge Cases:**

- FolderId expired: Error with re-discovery suggestion
- Folder doesn't exist: Auto-create (if within workspace)
- Folder outside workspace: Permission error
- Quota exceeded: Error with current usage stats
- Invalid filename (/, .., etc.): Error explaining valid names
- File too large: Error with size limit

#### 4. `delete_file_by_id(folderId, filename)`

**Semantics:**

- Permanently deletes file (no trash/recovery in MVP)
- Validates delete permissions using ExecutionContext
- Idempotent: Deleting non-existent file succeeds (with warning)

**Parameters:**

```typescript
{
  folderId: string,
  filename: string
}
```

**Returns:**

```typescript
{
  success: boolean,
  existed: boolean,        // false if file already deleted
  freedBytes: number      // Space freed
}
```

**Edge Cases:**

- FolderId expired: Error with re-discovery suggestion
- File doesn't exist: Success with `existed: false`
- File deleted by another process: Success with `existed: false`
- Permission denied: Error explaining why

#### 5. `get_file_info_by_id(folderId, filename)`

**Semantics:**

- Returns detailed file metadata without reading content
- Useful for checking file before reading (size, type, etc.)
- Cheaper than full read for large files
- Permission check using ExecutionContext

**Parameters:**

```typescript
{
  folderId: string,
  filename: string
}
```

**Returns:**

```typescript
{
  filename: string,
  size: number,
  modified: string,        // ISO 8601
  created: string,         // ISO 8601
  mimeType: string,
  permissions: {
    read: boolean,
    write: boolean,
    delete: boolean
  },
  path: string            // For debugging
}
```

**Edge Cases:**

- FolderId expired: Error with re-discovery suggestion
- File doesn't exist: Error listing available files
- Permission check: Returns actual permissions for this agent

### Extended Operations (Future Considerations)

**Not in MVP, but design-compatible:**

#### Batch Operations

```typescript
read_multiple_files_by_id(operations: Array<{folderId, filename}>)
write_multiple_files_by_id(operations: Array<{folderId, filename, content}>)
```

#### Search/Filter

```typescript
list_folders(params: {
  scope: FolderScope,
  filter?: {
    filePattern?: string,      // Glob pattern: "*.md"
    modifiedAfter?: string,    // ISO 8601
    minSize?: number,
    maxSize?: number
  }
}, context: ExecutionContext)
```

#### Folder Operations

```typescript
// All use ExecutionContext for agent identity
create_folder(params: { scope: FolderScope, folderName: string }, context: ExecutionContext)
delete_folder_by_id(params: { folderId: string }, context: ExecutionContext)
rename_folder_by_id(params: { folderId: string, newName: string }, context: ExecutionContext)
```

#### Advanced File Operations

```typescript
// All use ExecutionContext for agent identity and permissions
copy_file_by_id(params: {
  sourceFolderId: string,
  sourceFilename: string,
  destFolderId: string,
  destFilename: string
}, context: ExecutionContext)

move_file_by_id(params: {
  sourceFolderId: string,
  sourceFilename: string,
  destFolderId: string,
  destFilename: string
}, context: ExecutionContext)

append_to_file_by_id(params: {
  folderId: string,
  filename: string,
  content: string
}, context: ExecutionContext)
```

### Tool Registration in ToolRegistry

```typescript
// In tool-registry.ts
private registerFilesystemTools(): void {
  // Discovery
  this.register({
    name: 'list_folders',
    description: 'Discover available folders in your workspace by scope (my_private, my_shared, team_shared, org_shared). Returns folder IDs and file listings.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['my_private', 'my_shared', 'team_shared', 'org_shared'],
          description: 'Scope to search within. my_private: your private workspace, my_shared: your shared workspace, team_shared: your team\'s shared workspace, org_shared: organization-wide shared files'
        },
        agentId: { type: 'string', description: 'Your agent ID for permission validation' }
      },
      required: ['scope', 'agentId']
    }
  })

  // Read
  this.register({
    name: 'read_file_by_id',
    description: 'Read file content using folder ID from list_folders(). Returns full file content.',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: {
          type: 'string',
          description: 'Folder ID obtained from list_folders() result'
        },
        filename: {
          type: 'string',
          description: 'Exact filename from list_folders() file listing'
        },
        agentId: { type: 'string' }
      },
      required: ['folderId', 'filename', 'agentId']
    }
  })

  // Write
  this.register({
    name: 'write_file_by_id',
    description: 'Write or create file using folder ID. Overwrites if file exists, creates if new. Auto-creates folder if needed (within workspace boundaries).',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'Folder ID from list_folders()' },
        filename: { type: 'string', description: 'Name of file to write' },
        content: { type: 'string', description: 'File content to write' },
        agentId: { type: 'string' },
        encoding: {
          type: 'string',
          enum: ['utf-8', 'base64'],
          description: 'Content encoding (default: utf-8)'
        }
      },
      required: ['folderId', 'filename', 'content', 'agentId']
    }
  })

  // Delete
  this.register({
    name: 'delete_file_by_id',
    description: 'Permanently delete file using folder ID. Idempotent (succeeds even if file already deleted).',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'Folder ID from list_folders()' },
        filename: { type: 'string', description: 'Name of file to delete' },
        agentId: { type: 'string' }
      },
      required: ['folderId', 'filename', 'agentId']
    }
  })

  // Info
  this.register({
    name: 'get_file_info_by_id',
    description: 'Get detailed file metadata without reading content. Useful for checking file size, type, and permissions before reading.',
    inputSchema: {
      type: 'object',
      properties: {
        folderId: { type: 'string', description: 'Folder ID from list_folders()' },
        filename: { type: 'string', description: 'Name of file to inspect' },
        agentId: { type: 'string' }
      },
      required: ['folderId', 'filename', 'agentId']
    }
  })
}
```

### Tool Usage Example Flow

```typescript
// 1. Agent discovers folders (agentId from ExecutionContext)
const result = await list_folders({ scope: 'org_shared' })
// Returns: [
//   { folderId: 'abc123', folderName: 'Library Team - Shared', files: [{filename: 'onboarding.md', ...}] },
//   { folderId: 'def456', folderName: 'Elena (Leadership) - Shared', files: [{filename: 'strategy.md', ...}] }
// ]

// 2. Agent reads file from Library (agentId from ExecutionContext)
const content = await read_file_by_id({ folderId: 'abc123', filename: 'onboarding.md' })
// Returns: { content: '# Onboarding Guide...', encoding: 'utf-8', size: 2048 }

// 3. Agent writes notes to own shared folder (agentId from ExecutionContext)
const myFolders = await list_folders({ scope: 'my_shared' })
const myFolderId = myFolders.folders[0].folderId
await write_file_by_id({
  folderId: myFolderId,
  filename: 'meeting-notes.md',
  content: '# Meeting Notes\n...'
})
// Returns: { success: true, bytesWritten: 256, created: true, path: '/workspaces/agent-marcus/shared/meeting-notes.md' }
```

---

## Deep Dive: Organization Filesystem Structure

**Question:** How should the organization's filesystem be organized on disk to support the folder-based discovery model?

### Current Structure (from F012 - Filesystem Persistence)

```text
data/
└── organizations/
    └── {orgId}/
        ├── org.json
        ├── teams.json
        ├── agents.json
        ├── agents/
        │   └── {agentId}/
        │       ├── private/
        │       │   └── (agent's private files)
        │       └── shared/
        │           └── (agent's shared files)
        └── teams/
            └── {teamId}/
                ├── private/
                │   └── (team private files - future)
                └── shared/
                    └── (team shared files)
```

### Analysis of Current Structure

**Strengths:**

- ✅ Clear separation of agent/team workspaces
- ✅ Permission boundaries align with folder structure
- ✅ Private/shared distinction explicit in paths
- ✅ Easy to enforce quotas per agent/team

**Gaps:**

- ❌ No clear structure for organizing many files within agent/team workspaces
- ❌ Duplication between agent/team folder patterns
- ❌ Unclear if subfolders should be enforced or optional

### Simplified Unified Structure

**Key Insight:** Agents and teams are both just "workspaces" with the same structure pattern.

```text
data/
└── organizations/
    └── {orgId}/
        ├── org.json                    # Org config + toolWhitelist
        ├── teams.json                  # Team configs + toolWhitelists
        ├── agents.json                 # Agent configs + toolWhitelists
        │
        └── workspaces/                 # UNIFIED: All workspaces (agents + teams)
            └── {uuid}/                 # Either agentId or teamId
                ├── private/            # Private workspace
                │   └── (substructure decided locally, optional)
                │
                └── shared/             # Shared workspace
                    └── (substructure decided locally, optional)
```

**Benefits:**

- ✅ Unified structure: agents and teams follow identical pattern
- ✅ Simpler code: one set of functions for both workspace types
- ✅ Flexible substructure: each workspace decides its own organization
- ✅ No enforced subfolder conventions (optional, emergent patterns)
- ✅ Easy to reason about: workspace is just UUID + private/shared
- ✅ Future-proof: any entity type can have a workspace

**Access to Organization-Wide Content:**

- No separate `org-shared/` folder needed
- `org_shared` scope provides access to all teams' shared folders
- If org-wide content needed, create a "Library" team with shared resources
- Leadership team can also serve as org-wide content repository

**Example Workspace IDs:**

```text
workspaces/
├── agent-marcus/              # Agent workspace (HR team member)
│   ├── private/
│   │   ├── drafts/           # Marcus organizes with subfolders
│   │   └── notes/
│   └── shared/
│       ├── reports/
│       └── interviews/
│
├── team-hr/                   # Team workspace (HR team)
│   ├── private/              # Team private (future)
│   └── shared/
│       ├── docs/             # Team organizes with subfolders
│       ├── processes/
│       └── projects/
│
├── team-library/              # Library team workspace
│   └── shared/               # Org-wide content lives here
│       ├── onboarding/       # Library team organizes content
│       ├── policies/
│       └── templates/
│
└── agent-catalyst/            # Another agent workspace
    ├── private/              # Catalyst uses flat structure (no subfolders)
    │   ├── notes.md
    │   └── scratch.md
    └── shared/
        ├── analysis.md
        └── report.md
```

### Subfolder Organization Strategy

**Decision:** Subfolders are **optional and locally decided**

**No Enforced Conventions:**

- System doesn't create or enforce subfolder structure
- Each workspace (agent/team) organizes files as needed
- Subfolders emerge organically based on usage patterns
- Discovery treats all folders equally (no special subfolder handling)

**Discovery Behavior with Subfolders:**

**Option 1: Flatten (Recommended for MVP)**

```typescript
// list_folders('my_shared') for Marcus:
{
  folders: [
    {
      folderId: 'abc123',
      folderName: 'Marcus (HR) - Shared',
      folderType: 'agent_shared',
      path: '/workspaces/agent-marcus/shared/',
      files: [
        { filename: 'reports/weekly-2025-11-01.md', ... },  // Subfolder preserved in filename
        { filename: 'reports/weekly-2025-11-15.md', ... },
        { filename: 'interviews/alice.md', ... },
        { filename: 'interviews/bob.md', ... }
      ]
    }
  ]
}
```

**Benefits:**

- Simple: one folderId per workspace
- Filenames preserve subfolder structure
- Agent can filter by filename prefix
- No complex nested discovery logic

**Option 2: Treat Subfolders as Separate Folders**

```typescript
// list_folders('my_shared') for Marcus:
{
  folders: [
    {
      folderId: 'abc123',
      folderName: 'Marcus (HR) - Shared / reports',
      path: '/workspaces/agent-marcus/shared/reports/',
      files: [
        { filename: 'weekly-2025-11-01.md', ... },
        { filename: 'weekly-2025-11-15.md', ... }
      ]
    },
    {
      folderId: 'def456',
      folderName: 'Marcus (HR) - Shared / interviews',
      path: '/workspaces/agent-marcus/shared/interviews/',
      files: [
        { filename: 'alice.md', ... },
        { filename: 'bob.md', ... }
      ]
    }
  ]
}
```

**Benefits:**

- Clear categorization visible in discovery
- Each subfolder gets unique folderId
- Easier to work with specific category

**Recommendation:** Start with **Option 1 (Flatten)** for MVP simplicity. Add Option 2 if agents struggle with large flat file lists.

### Workspace Type Identification

**How to distinguish agent vs team workspace?**

**Option A: Prefix convention**

- Agent IDs: `agent-{name}` (e.g., `agent-marcus`)
- Team IDs: `team-{name}` (e.g., `team-hr`)
- Deterministic from ID alone

**Option B: Lookup in config**

- Check if UUID exists in agents.json or teams.json
- More flexible, no naming convention required

**Option C: Workspace metadata file**

- Each workspace has `workspace.json` with type info
- Most flexible but adds file overhead

**Recommendation:** **Option A (Prefix convention)** - simple, deterministic, already in use.

### Folder Auto-Creation Rules

**When to Auto-Create:**

1. **On Workspace Initialization:**

   ```typescript
   // On agent/team creation:
   createDirectory(`/workspaces/{uuid}/private/`)
   createDirectory(`/workspaces/{uuid}/shared/`)
   // That's it - no subfolders enforced
   ```

2. **On First Write:**

   ```typescript
   // If agent writes to path with subfolder:
   write_file_by_id(folderId, 'reports/weekly.md', content, agentId)
   // → Auto-creates /workspaces/agent-marcus/shared/reports/ if needed
   ```

**When NOT to Auto-Create:**

1. **Outside Workspace:** Never create folders outside workspace boundaries
2. **Deep Nesting:** Limit to reasonable depth (e.g., 3 levels max)
3. **Invalid Names:** Block creation with invalid names (., .., /, null bytes, etc.)

---

## Filesystem Structure Implementation

**New File:** `app/server/services/persistence/filesystem-structure.ts`

```typescript
export class FilesystemStructure {
  // Workspace base path
  static getWorkspacePath(organizationId: string, workspaceId: string): string {
    return `data/organizations/${organizationId}/workspaces/${workspaceId}`
  }

  // Initialize workspace structure for new agent or team
  static async initializeWorkspace(organizationId: string, workspaceId: string): Promise<void> {
    const basePath = this.getWorkspacePath(organizationId, workspaceId)

    // Create base private/shared folders - no subfolders enforced
    await fs.mkdir(`${basePath}/private`, { recursive: true })
    await fs.mkdir(`${basePath}/shared`, { recursive: true })
  }

  // Validate workspace path is within boundaries
  static isValidWorkspacePath(path: string, workspaceId: string, organizationId: string): boolean {
    const normalized = path.normalize(path)
    const workspacePath = this.getWorkspacePath(organizationId, workspaceId)

    // Check workspace boundary
    if (normalized.startsWith(workspacePath)) {
      return true
    }

    return false
  }

  // Parse subfolder from filename (if using path separators)
  static parseSubfolder(filename: string): { subfolder: string | null; basename: string } {
    const parts = filename.split('/')
    if (parts.length === 1) {
      return { subfolder: null, basename: filename }
    }
    if (parts.length === 2) {
      return { subfolder: parts[0], basename: parts[1] }
    }
    // More than 2 parts = nested path
    const subfolder = parts.slice(0, -1).join('/')
    const basename = parts[parts.length - 1]
    return { subfolder, basename }
  }

  // Validate nesting depth
  static validateNestingDepth(filename: string, maxDepth: number = 3): boolean {
    const parts = filename.split('/')
    return parts.length <= maxDepth
  }
}
```

---

## Key Design Decisions Summary

### Unified Workspace Structure

**Decision:** Agents and teams share identical workspace structure

```text
workspaces/{uuid}/
├── private/
└── shared/
```

**Benefits:**

- Code simplicity (one implementation for both)
- Clear pattern for any future workspace types
- Flexible local organization (each workspace decides substructure)

### No org-shared/ Folder

**Decision:** Organization-wide content accessed via `org_shared` scope, not separate folder

**Rationale:**

- `org_shared` scope already provides access to all teams' shared folders
- Dedicated "Library" team can serve as org-wide content repository
- Simpler structure, fewer special cases

### Optional Subfolders

**Decision:** No enforced subfolder conventions

**Rationale:**

- Each workspace organizes files as needed
- Patterns emerge organically (reports/, docs/, etc.)
- System doesn't prescribe structure
- Discovery treats all files equally (flatten or enumerate subfolders)

### Discovery Behavior

**Decision:** Flatten filenames in MVP (Option 1)

**Example:**

```json
{
  "folderId": "abc123",
  "folderName": "Marcus (HR) - Shared",
  "files": [
    { "filename": "reports/weekly.md", ... },
    { "filename": "interviews/alice.md", ... }
  ]
}
```

**Future:** Can add subfolder enumeration if agents need clearer categorization

---

## Session Metadata

**Brainstorming Duration:** ~4 hours (document cleanup complete)
**Questions Explored:** 20+
**Key Decisions Made:** 17 (all major decisions finalized)
**Open Questions Resolved:** 3 (folderId generation, expiration, discovery behavior)
**Files to be Modified:** 8+
**Tests to be Created:** 25+
**Estimated Implementation Time:** 16-20 hours (4 phases)

**Session Quality:** ✅ Complete - Ready for sub-issue creation
**Confidence Level:** High - Simplified architecture with clear implementation path
**Document Status:** ✅ Cleaned and consolidated (November 2025)

**Risks Identified:**

- Migration from current structure to unified workspaces/
- Time-based folderId expiration (needs monitoring in production)
- Subfolder handling in discovery (flatten approach chosen)

**Major Simplifications Achieved:**

1. ✅ Unified workspace structure (agents + teams use same pattern)
2. ✅ No org-shared/ folder needed (use Library team instead)
3. ✅ No enforced subfolder conventions (optional, emergent organization)
4. ✅ Simplified code (one getWorkspaceFolder() for all workspaces)
5. ✅ Whitelist-based access control (default-deny security)
6. ✅ Ephemeral folderIds (no persistence required for MVP)
7. ✅ Flattened discovery (subfolders in filenames)  
   **Open Decisions:** 3 (folderId strategy, expiration, nesting)
