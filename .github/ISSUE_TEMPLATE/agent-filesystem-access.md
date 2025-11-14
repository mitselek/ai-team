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

### Phase 1: Core Infrastructure

- [ ] Add `maxFiles` and `storageQuota` fields to Agent/Team types
- [ ] Implement Filesystem Service (basic CRUD operations)
- [ ] Implement Permission Service (access rule engine)
- [ ] Implement Audit Service (operation logging)

### Phase 2: MCP Integration

- [ ] Create MCP File Server with tool definitions
- [ ] Implement read_file tool
- [ ] Implement write_file tool
- [ ] Implement delete_file tool
- [ ] Implement list_files tool
- [ ] Implement get_file_info tool

### Phase 3: Orchestrator Gateway

- [ ] Add Tool Registry to orchestrator
- [ ] Implement identity validation layer
- [ ] Implement permission checking layer
- [ ] Add tool routing logic
- [ ] Implement loud security violation logging

### Phase 4: Quota Management

- [ ] Implement quota calculation
- [ ] Implement quota enforcement (warn at 100%, block at 110%)
- [ ] Add quota monitoring dashboard
- [ ] Implement quota adjustment API

### Phase 5: Security & Validation

- [ ] Implement extension whitelist validation
- [ ] Implement file size validation (5MB max)
- [ ] Add path traversal protection
- [ ] Security audit and penetration testing

### Phase 6: Testing & Documentation

- [ ] Unit tests for Permission Service
- [ ] Integration tests for MCP tools
- [ ] E2E tests for orchestrator flow
- [ ] Security test suite
- [ ] API documentation
- [ ] Agent developer guide

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
