# Agent Filesystem Access System

## Overview

Implement a secure, quota-managed filesystem access system for agents and teams with MCP-based tools and orchestrator-mediated permissions.

## Requirements

### Filesystem Structure

```text
/agents/{agentId}/
  private/    - Only agent can access
  shared/     - Agent writes, organization reads

/teams/{teamId}/
  private/    - Leader writes, members read, others blocked
  shared/     - All members write, organization reads
```

### Access Rules

**Agent Workspaces:**

- `private/`: Owner only (read/write/delete)
- `shared/`: Owner writes, all org members read

**Team Workspaces:**

- `private/`: Team leader writes, team members read, others no access
- `shared/`: All team members write, all org members read

**Special Cases:**

- Library team's `shared/` folder serves as organization-wide library
- Senior/junior relationships do NOT grant file access
- Team leader has no special access to member private folders

### Storage Limits (Configurable per Agent/Team)

**Defaults:**

- Agent: 1000 files max, 100MB quota, 5MB per file
- Team: 2000 files max, 1GB quota, 5MB per file

**Quota Enforcement:**

- At 100%: Warn but allow writes
- At 110%: Block new writes

**Type Changes Required:**

```typescript
interface Agent {
  // ... existing fields
  maxFiles?: number // default 1000
  storageQuotaMB?: number // default 100
}

interface Team {
  // ... existing fields
  maxFiles?: number // default 2000
  storageQuotaGB?: number // default 1
}
```

### Security

**File Type Whitelist:**

- Text: `.md`, `.txt`
- Documents: `.pdf`
- Data: `.json`, `.yaml`
- Images: `.svg`, `.png`, `.jpg`, `.jpeg`

**File Constraints:**

- Max size: 5MB per file
- Extension must be in whitelist
- Path traversal prevention

**Audit Logging:**
Track all operations: `{timestamp, agentId, operation, filePath}`

- Operations: `create`, `update`, `delete`, `move` (logged as delete+create)

## Architecture

### Component Overview

```text
Agent (LLM)
  ↓ MCP tool call with agentId
Orchestrator (Security Gateway)
  ├─ Validates agent identity (LOUD failure if mismatch)
  ├─ Checks permissions via Permission Service
  └─ Routes to MCP File Server
MCP File Server
  ↓ Calls Filesystem Service
Filesystem Service
  ├─ Performs I/O operations
  ├─ Enforces quotas
  └─ Logs to Audit Service
```

### MCP File Server Tools

```typescript
// Tool signatures (explicit agentId required)
read_file(agentId: string, path: string): FileContent
write_file(agentId: string, path: string, content: string): Success
delete_file(agentId: string, path: string): Success
list_files(agentId: string, path: string): FileInfo[]
get_file_info(agentId: string, path: string): FileMetadata

// Response types
interface FileContent {
  content: string
  metadata: FileMetadata
}

interface FileMetadata {
  size: number
  owner: string
  created: Date
  modified: Date
  permissions: string  // e.g., "owner-write" | "team-read"
}

interface FileInfo {
  path: string
  type: 'file' | 'directory'
  size: number
  modified: Date
}
```

### Orchestrator Responsibilities

**1. Identity Validation:**

```typescript
// Agent provides agentId in tool call
// Orchestrator knows real agent ID from execution context
if (toolCall.agentId !== orchestrator.currentAgentId) {
  logger.error('[SECURITY] Agent identity mismatch!', {
    claimed: toolCall.agentId,
    actual: orchestrator.currentAgentId,
    tool: toolCall.name,
    timestamp: new Date()
  })
  throw new SecurityError('Agent ID mismatch - potential impersonation attempt')
}
```

**2. Permission Validation:**

```typescript
// After identity confirmed, check file permissions
const allowed = await permissionService.checkFileAccess(
  agentId,
  path,
  operation // 'read' | 'write' | 'delete'
)

if (!allowed) {
  logger.warn('[ACCESS_DENIED]', {
    agentId,
    path,
    operation,
    timestamp: new Date()
  })
  throw new PermissionError('Access denied')
}
```

**3. Tool Registry & Routing:**

```typescript
interface ToolGateway {
  // Tool discovery
  registry: ToolRegistry

  // Permission checking
  permissionService: PermissionService

  // Tool executors
  executors: {
    filesystem: FilesystemExecutor // MCP file server
    github: GitHubExecutor
    custom: CustomToolExecutor
    // ... more tool types
  }
}
```

### Permission Service

```typescript
class PermissionService {
  async checkFileAccess(
    agentId: string,
    path: string,
    operation: 'read' | 'write' | 'delete'
  ): Promise<boolean> {
    // Parse path to determine workspace type
    const pathInfo = this.parsePath(path)

    // Load agent and team data
    const agent = await loadAgent(agentId)
    const team = pathInfo.teamId ? await loadTeam(pathInfo.teamId) : null

    // Apply access rules based on workspace type
    switch (pathInfo.workspace) {
      case 'agent-private':
        return pathInfo.ownerId === agentId

      case 'agent-shared':
        if (operation === 'read') return agent.organizationId === pathInfo.orgId
        return pathInfo.ownerId === agentId

      case 'team-private':
        if (!team || agent.teamId !== team.id) return false
        if (operation === 'write') return agent.id === team.leaderId
        return true // team members can read

      case 'team-shared':
        if (operation === 'read') return agent.organizationId === pathInfo.orgId
        return agent.teamId === team?.id // members can write

      default:
        return false
    }
  }

  private parsePath(path: string): PathInfo {
    // Parse path like "/agents/{agentId}/private/file.md"
    // or "/teams/{teamId}/shared/doc.pdf"
    // Returns: { workspace, ownerId, teamId, orgId, filename }
  }
}
```

### Filesystem Service

```typescript
class FilesystemService {
  async readFile(agentId: string, path: string): Promise<FileContent> {
    // Validate extension
    this.validateExtension(path)

    // Read file
    const content = await fs.readFile(this.resolvePath(path), 'utf-8')
    const stats = await fs.stat(this.resolvePath(path))

    // Log access
    await auditService.log({
      operation: 'read',
      agentId,
      path,
      timestamp: new Date()
    })

    return {
      content,
      metadata: this.buildMetadata(stats, path)
    }
  }

  async writeFile(agentId: string, path: string, content: string): Promise<Success> {
    // Validate extension
    this.validateExtension(path)

    // Check file size
    if (Buffer.byteLength(content, 'utf-8') > 5 * 1024 * 1024) {
      throw new QuotaError('File exceeds 5MB limit')
    }

    // Check quota
    await this.checkQuota(agentId, path, content.length)

    // Write file
    await fs.writeFile(this.resolvePath(path), content, 'utf-8')

    // Log operation
    await auditService.log({
      operation: 'create',
      agentId,
      path,
      size: content.length,
      timestamp: new Date()
    })

    return { success: true }
  }

  private async checkQuota(agentId: string, path: string, fileSize: number) {
    const pathInfo = this.parsePath(path)
    const usage = await this.calculateUsage(pathInfo)

    const limits = pathInfo.workspace.startsWith('agent')
      ? { files: 1000, bytes: 100 * 1024 * 1024 }
      : { files: 2000, bytes: 1024 * 1024 * 1024 }

    // Check file count
    if (usage.fileCount >= limits.files * 1.1) {
      throw new QuotaError('File count limit exceeded (110%)')
    }

    // Check storage
    const newUsage = usage.bytes + fileSize
    if (newUsage >= limits.bytes * 1.1) {
      throw new QuotaError('Storage quota exceeded (110%)')
    }

    // Warn at 100%
    if (newUsage >= limits.bytes && usage.bytes < limits.bytes) {
      logger.warn('[QUOTA_WARNING]', {
        agentId,
        workspace: pathInfo.workspace,
        usage: newUsage,
        limit: limits.bytes
      })
    }
  }

  private validateExtension(path: string) {
    const allowed = ['.md', '.txt', '.pdf', '.json', '.yaml', '.svg', '.png', '.jpg', '.jpeg']
    const ext = path.substring(path.lastIndexOf('.')).toLowerCase()

    if (!allowed.includes(ext)) {
      throw new ValidationError(`File extension ${ext} not allowed`)
    }
  }
}
```

### Audit Service

```typescript
interface AuditEntry {
  timestamp: Date
  agentId: string
  operation: 'create' | 'update' | 'delete' | 'read'
  path: string
  size?: number
  success: boolean
  error?: string
}

class AuditService {
  async log(entry: Omit<AuditEntry, 'success'>): Promise<void> {
    // Store audit entry
    await this.store.append({
      ...entry,
      success: true
    })
  }

  async queryLogs(filters: AuditFilters): Promise<AuditEntry[]> {
    // Support queries like:
    // - All operations by agent
    // - All operations on file/directory
    // - Operations in time range
    // - Failed operations
  }
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Difficulty: 3/5)

- [ ] **[D:1]** Add `maxFiles` and `storageQuota` fields to Agent/Team types
- [ ] **[D:3]** Implement Filesystem Service (basic CRUD operations)
  - Path resolution and safety validation
  - Node.js fs operations wrapper
  - Error handling for file I/O
- [ ] **[D:4]** Implement Permission Service (access rule engine)
  - Path parsing logic (agent vs team, private vs shared)
  - Complex access rules for 4 workspace types
  - Team leader/member distinction
  - Organization-wide read logic
- [ ] **[D:2]** Implement Audit Service (operation logging)
  - Simple append-only logging
  - JSON file storage

**Total Phase Difficulty: 3/5** (Permission Service is complex, rest moderate)

### Phase 2: MCP Integration (Difficulty: 3/5)

- [ ] **[D:3]** Create MCP File Server with tool definitions
  - MCP protocol compliance
  - Tool schema definitions
  - Server initialization
- [ ] **[D:2]** Implement read_file tool
  - Straightforward file read
  - Metadata assembly
- [ ] **[D:2]** Implement write_file tool
  - File write with directory creation
  - Update existing file handling
- [ ] **[D:1]** Implement delete_file tool
  - Simple fs.unlink wrapper
- [ ] **[D:2]** Implement list_files tool
  - Directory traversal
  - Recursive vs flat listing
- [ ] **[D:1]** Implement get_file_info tool
  - fs.stat wrapper with metadata

**Total Phase Difficulty: 3/5** (MCP server setup is moderate, tools are simple)

### Phase 3: Orchestrator Gateway (Difficulty: 4/5)

- [ ] **[D:3]** Add Tool Registry to orchestrator
  - Dynamic tool loading
  - Tool metadata management
  - Integration with existing orchestrator
- [ ] **[D:4]** Implement identity validation layer
  - Security-critical: agent ID mismatch detection
  - Execution context tracking
  - Loud failure logging
- [ ] **[D:3]** Implement permission checking layer
  - Integration with Permission Service
  - Operation type mapping (read/write/delete)
  - Error handling and user feedback
- [ ] **[D:2]** Add tool routing logic
  - Tool name → executor mapping
  - Parameter forwarding
- [ ] **[D:2]** Implement loud security violation logging
  - Structured logging with full context
  - Alerting mechanism

**Total Phase Difficulty: 4/5** (Security-critical, complex integration)

### Phase 4: Quota Management (Difficulty: 3/5)

- [ ] **[D:3]** Implement quota calculation
  - Recursive directory size calculation
  - File count tracking
  - Caching for performance
- [ ] **[D:2]** Implement quota enforcement (warn at 100%, block at 110%)
  - Pre-write quota checks
  - Warning vs blocking logic
- [ ] **[D:3]** Add quota monitoring dashboard
  - UI component for quota display
  - Real-time usage calculation
  - Visual indicators (progress bars)
- [ ] **[D:2]** Implement quota adjustment API
  - Update Agent/Team quota fields
  - Validation and permission checking

**Total Phase Difficulty: 3/5** (Calculation complexity, UI work)

### Phase 5: Security & Validation (Difficulty: 4/5)

- [ ] **[D:1]** Implement extension whitelist validation
  - Simple string comparison
- [ ] **[D:1]** Implement file size validation (5MB max)
  - Buffer.byteLength check
- [ ] **[D:3]** Add path traversal protection
  - Path normalization
  - Jail/chroot-like validation
  - Edge case testing (../../, symlinks, etc.)
- [ ] **[D:5]** Security audit and penetration testing
  - Comprehensive threat modeling
  - Manual security review
  - Automated vulnerability scanning
  - Penetration testing scenarios

**Total Phase Difficulty: 4/5** (Security audit is very complex)

### Phase 6: Testing & Documentation (Difficulty: 3/5)

- [ ] **[D:3]** Unit tests for Permission Service
  - Complex test matrix (4 workspaces × 3 operations × roles)
  - Edge cases and boundary conditions
- [ ] **[D:2]** Integration tests for MCP tools
  - Tool invocation scenarios
  - Success and failure paths
- [ ] **[D:3]** E2E tests for orchestrator flow
  - Full request/response cycle
  - Multi-agent scenarios
  - Security violation scenarios
- [ ] **[D:4]** Security test suite
  - Identity spoofing attempts
  - Path traversal attacks
  - Quota bypass attempts
  - Concurrent access issues
- [ ] **[D:2]** API documentation
  - Tool signatures and examples
  - Error codes and responses
- [ ] **[D:2]** Agent developer guide
  - Usage examples
  - Best practices
  - Common patterns

**Total Phase Difficulty: 3/5** (Security tests are complex, rest moderate)

---

**Overall Project Difficulty: 3.5/5** (Moderately complex with critical security components)

## Success Criteria

- [ ] Agents can read/write files in their workspaces
- [ ] Permission rules correctly enforced
- [ ] Quota limits prevent runaway storage
- [ ] Identity spoofing attempts are detected and logged
- [ ] All file operations are auditable
- [ ] Extension whitelist blocks unauthorized file types
- [ ] File size limits enforced
- [ ] No path traversal vulnerabilities
- [ ] All tests passing (unit, integration, E2E, security)

## Security Considerations

1. **Identity Spoofing**: Orchestrator MUST validate agent identity against execution context
2. **Path Traversal**: All paths must be validated and resolved safely
3. **Quota Bypass**: Quota checks must happen before write operations
4. **Race Conditions**: Concurrent writes must be handled safely
5. **Audit Integrity**: Audit logs must be tamper-proof
6. **Error Messages**: Must not leak sensitive path information

## Open Questions

- [ ] File versioning: Do we need version history?
- [ ] Concurrent access: How to handle simultaneous edits?
- [ ] Backup strategy: Where/when/how to backup agent files?
- [ ] Migration: How to roll this out incrementally?
- [ ] Performance: Caching strategy for permission checks?

## References

- Model Context Protocol (MCP) specification
- Existing orchestrator implementation
- Current agent execution flow
- Constitutional requirements (.specify/memory/constitution.md)
