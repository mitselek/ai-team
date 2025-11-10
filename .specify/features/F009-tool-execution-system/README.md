# F009: Tool Execution System

## Status

Planning

## Objective

Build a secure, auditable tool execution system that allows agents to invoke MCP tools with proper approval workflows, sandboxing, rate limiting, and anomaly detection. This enables agents to perform actions (read files, run commands, access APIs) while maintaining safety and control.

## Scope

### In Scope

- Tool invocation wrapper (security layer over MCP)
- Approval workflow (require permission for sensitive tools)
- Automatic approval rules (low-risk tools)
- Manual approval queue (high-risk tools)
- Tool execution sandboxing (resource limits)
- Audit logging (who, what, when, result)
- Rate limiting (prevent abuse)
- Anomaly detection (unusual patterns)
- Error handling and retry logic
- Tool result validation
- Execution history tracking

### Out of Scope (Future)

- Custom tool creation (F013 - Building team)
- Tool performance optimization (caching)
- Advanced sandboxing (Docker containers)
- Cross-agent tool sharing (F014)
- Tool recommendation engine (suggest tools)
- Tool usage analytics dashboard

## Dependencies

### Required (Complete)

- F001 Agent System ✅ (Agent type, permissions)
- F006 LLM Integration ✅ (Tool result interpretation)
- F006 Phase 2 MCP Client ✅ (Tool discovery, invocation)

### Required (Pending)

- F007 Agent Execution Engine ⏳ (Task processing context)

### Uses

- `server/services/llm/mcp/` (MCP client)
- `server/data/agents.ts` (Agent data store)
- `server/utils/logger.ts` (Audit logging)
- `types/index.ts` (Agent type)

## Architecture

### High-Level Design

```text
┌─────────────────────────────────────────────┐
│  Agent Requests Tool Execution              │
│  "I need to read file config.json"          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Tool Execution Gateway                     │
│  - Validate tool exists                     │
│  - Check agent permissions                  │
│  - Apply rate limiting                      │
│  - Route to approval or direct execution    │
└─────────────────────────────────────────────┘
                    ↓
         ┌──────────┴──────────┐
         ↓                     ↓
┌─────────────────┐   ┌─────────────────┐
│ Auto-Approve    │   │ Manual Approve  │
│ (Low-risk)      │   │ (High-risk)     │
│ - Read files    │   │ - Write files   │
│ - List dirs     │   │ - Run commands  │
│ - Search        │   │ - API calls     │
└─────────────────┘   └─────────────────┘
         ↓                     ↓
         └──────────┬──────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Tool Execution Sandbox                     │
│  - Resource limits (CPU, memory, time)      │
│  - Network restrictions                     │
│  - File system boundaries                   │
│  - Execute tool via MCP                     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Result Validation & Audit                  │
│  - Validate output format                   │
│  - Check for errors                         │
│  - Log execution (audit trail)              │
│  - Update rate limit counters               │
│  - Detect anomalies                         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Return Result to Agent                     │
│  Success: { data, metadata }                │
│  Failure: { error, retryable }              │
└─────────────────────────────────────────────┘
```

### Tool Risk Classification

```text
LOW RISK (Auto-approve):
- read_file (non-sensitive paths)
- list_directory
- search_code
- get_definition
- get_documentation

MEDIUM RISK (Auto-approve with limits):
- http_get (allow-listed domains)
- database_read (read-only queries)
- log_search

HIGH RISK (Require approval):
- write_file
- delete_file
- run_command
- http_post/put/delete
- database_write
- system_config_change

CRITICAL (Require Director approval):
- grant_permission
- create_agent
- delete_agent
- modify_system_prompt
```

## Implementation Tasks

### Task 1: Tool Execution Gateway

**File:** `server/services/tools/gateway.ts`

**Responsibilities:**

- Receive tool execution requests
- Validate tool exists in MCP registry
- Check agent permissions
- Apply rate limiting
- Route to approval workflow
- Return execution results

### Task 2: Approval Engine

**File:** `server/services/tools/approval.ts`

**Responsibilities:**

- Classify tool risk level
- Auto-approve low-risk tools
- Queue high-risk tools for manual approval
- Notify approvers (senior agents)
- Track approval status
- Handle approval timeouts

### Task 3: Execution Sandbox

**File:** `server/services/tools/sandbox.ts`

**Responsibilities:**

- Execute tools via MCP client
- Enforce resource limits (timeout, memory)
- Restrict network access
- Isolate file system access
- Capture stdout/stderr
- Handle crashes gracefully

### Task 4: Audit Logger

**File:** `server/services/tools/audit.ts`

**Responsibilities:**

- Log all tool executions
- Record agent, tool, arguments, result
- Track execution time and resource usage
- Store audit trail in durable storage
- Support audit queries (who did what when)

### Task 5: Rate Limiter

**File:** `server/services/tools/rate-limiter.ts`

**Responsibilities:**

- Track tool usage per agent
- Enforce rate limits (per minute, per hour)
- Block agents exceeding limits
- Reset counters periodically
- Report abuse to seniors

### Task 6: Anomaly Detector

**File:** `server/services/tools/anomaly.ts`

**Responsibilities:**

- Detect unusual patterns (spike in usage)
- Identify suspicious tool combinations
- Flag repeated failures
- Alert on permission escalation attempts
- Generate anomaly reports

### Task 7: Permission Manager

**File:** `server/services/tools/permissions.ts`

**Responsibilities:**

- Define agent tool permissions
- Check if agent can use tool
- Grant/revoke permissions
- Support role-based defaults
- Handle permission inheritance (teams)

## Technical Specification

### Tool Execution Request

```typescript
interface ToolExecutionRequest {
  id: string
  agentId: string
  toolName: string
  arguments: Record<string, unknown>
  context?: {
    taskId?: string
    correlationId?: string
  }
  requestedAt: Date
}

interface ToolExecutionResult {
  requestId: string
  status: 'success' | 'failure' | 'pending_approval'
  data?: unknown
  error?: string
  metadata: {
    executionTime: number
    resourceUsage: ResourceUsage
    approvedBy?: string
    approvedAt?: Date
  }
  executedAt: Date
}

interface ResourceUsage {
  cpuTime: number // milliseconds
  memoryPeak: number // bytes
  networkCalls: number
}
```

### Gateway Implementation

```typescript
async function executeToolSecurely(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
  const log = logger.child({
    requestId: request.id,
    agentId: request.agentId,
    toolName: request.toolName
  })

  log.info('Tool execution requested')

  try {
    // 1. Validate tool exists
    const tool = await mcpClient.getTool(request.toolName)
    if (!tool) {
      throw new Error(`Tool not found: ${request.toolName}`)
    }

    // 2. Check permissions
    const hasPermission = await checkPermission(request.agentId, request.toolName)
    if (!hasPermission) {
      throw new Error(`Agent ${request.agentId} lacks permission for ${request.toolName}`)
    }

    // 3. Rate limiting
    const isWithinLimit = await checkRateLimit(request.agentId, request.toolName)
    if (!isWithinLimit) {
      throw new Error(`Rate limit exceeded for ${request.toolName}`)
    }

    // 4. Approval workflow
    const riskLevel = classifyToolRisk(request.toolName)

    if (riskLevel === 'high' || riskLevel === 'critical') {
      return await queueForApproval(request, riskLevel)
    }

    // 5. Execute in sandbox
    const result = await executeInSandbox(request)

    // 6. Audit log
    await auditLog(request, result)

    // 7. Update rate limit
    await incrementRateLimit(request.agentId, request.toolName)

    // 8. Anomaly detection
    await checkForAnomalies(request, result)

    log.info('Tool execution completed', {
      status: result.status,
      executionTime: result.metadata.executionTime
    })

    return result
  } catch (error) {
    log.error({ error }, 'Tool execution failed')

    await auditLog(request, {
      status: 'failure',
      error: error.message
    })

    throw error
  }
}
```

### Risk Classification

```typescript
function classifyToolRisk(toolName: string): RiskLevel {
  const riskMap: Record<string, RiskLevel> = {
    // Low risk
    read_file: 'low',
    list_directory: 'low',
    search_code: 'low',
    get_definition: 'low',

    // Medium risk
    http_get: 'medium',
    database_read: 'medium',

    // High risk
    write_file: 'high',
    run_command: 'high',
    http_post: 'high',

    // Critical
    delete_file: 'critical',
    grant_permission: 'critical',
    create_agent: 'critical'
  }

  return riskMap[toolName] || 'medium'
}

type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
```

### Approval Workflow

```typescript
async function queueForApproval(
  request: ToolExecutionRequest,
  riskLevel: RiskLevel
): Promise<ToolExecutionResult> {
  const log = logger.child({ requestId: request.id })

  // Find appropriate approver
  const agent = agents.find((a) => a.id === request.agentId)
  const approver =
    riskLevel === 'critical' ? findDirector(agent.organizationId) : findSenior(agent.seniorId)

  if (!approver) {
    throw new Error('No approver found')
  }

  // Create approval task
  const approvalTask = await createTask({
    id: uuidv4(),
    title: `Approve tool execution: ${request.toolName}`,
    description: `Agent: ${agent.name}
Tool: ${request.toolName}
Arguments: ${JSON.stringify(request.arguments, null, 2)}
Risk: ${riskLevel}

Please review and approve or deny this tool execution.`,
    assignedTo: approver.id,
    createdBy: request.agentId,
    priority: riskLevel === 'critical' ? 'critical' : 'high',
    status: 'pending',
    organizationId: agent.organizationId,
    createdAt: new Date(),
    metadata: {
      toolExecutionRequestId: request.id,
      requiresApproval: true
    }
  })

  log.info('Tool execution queued for approval', {
    approvalTaskId: approvalTask.id,
    approverId: approver.id,
    riskLevel
  })

  return {
    requestId: request.id,
    status: 'pending_approval',
    metadata: {
      executionTime: 0,
      resourceUsage: { cpuTime: 0, memoryPeak: 0, networkCalls: 0 },
      approvalTaskId: approvalTask.id
    },
    executedAt: new Date()
  }
}
```

### Sandbox Execution

```typescript
async function executeInSandbox(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
  const log = logger.child({ requestId: request.id })

  const startTime = Date.now()
  let resourceUsage: ResourceUsage = {
    cpuTime: 0,
    memoryPeak: 0,
    networkCalls: 0
  }

  try {
    // Execute with timeout
    const timeout = getToolTimeout(request.toolName)

    const result = await Promise.race([
      mcpClient.invokeTool(request.toolName, request.arguments),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
      )
    ])

    const executionTime = Date.now() - startTime

    // Validate result
    validateToolResult(result, request.toolName)

    // Estimate resource usage (simplified)
    resourceUsage = estimateResourceUsage(executionTime, result)

    return {
      requestId: request.id,
      status: 'success',
      data: result,
      metadata: {
        executionTime,
        resourceUsage
      },
      executedAt: new Date()
    }
  } catch (error) {
    const executionTime = Date.now() - startTime

    log.error({ error }, 'Sandbox execution failed')

    return {
      requestId: request.id,
      status: 'failure',
      error: error.message,
      metadata: {
        executionTime,
        resourceUsage
      },
      executedAt: new Date()
    }
  }
}

function getToolTimeout(toolName: string): number {
  const timeouts: Record<string, number> = {
    read_file: 5000, // 5 seconds
    write_file: 10000, // 10 seconds
    run_command: 30000, // 30 seconds
    http_get: 15000 // 15 seconds
  }

  return timeouts[toolName] || 10000 // Default 10s
}
```

### Rate Limiting

```typescript
interface RateLimitConfig {
  toolName: string
  perMinute: number
  perHour: number
  perDay: number
}

const rateLimitStore = new Map<string, RateLimitCounter>()

interface RateLimitCounter {
  minute: { count: number; resetAt: Date }
  hour: { count: number; resetAt: Date }
  day: { count: number; resetAt: Date }
}

async function checkRateLimit(agentId: string, toolName: string): Promise<boolean> {
  const key = `${agentId}:${toolName}`
  const config = getRateLimitConfig(toolName)
  const counter = rateLimitStore.get(key) || initCounter()

  const now = new Date()

  // Check and reset minute counter
  if (now >= counter.minute.resetAt) {
    counter.minute = { count: 0, resetAt: addMinutes(now, 1) }
  }

  // Check and reset hour counter
  if (now >= counter.hour.resetAt) {
    counter.hour = { count: 0, resetAt: addHours(now, 1) }
  }

  // Check and reset day counter
  if (now >= counter.day.resetAt) {
    counter.day = { count: 0, resetAt: addDays(now, 1) }
  }

  // Check limits
  if (counter.minute.count >= config.perMinute) return false
  if (counter.hour.count >= config.perHour) return false
  if (counter.day.count >= config.perDay) return false

  rateLimitStore.set(key, counter)
  return true
}

async function incrementRateLimit(agentId: string, toolName: string): Promise<void> {
  const key = `${agentId}:${toolName}`
  const counter = rateLimitStore.get(key)

  if (counter) {
    counter.minute.count++
    counter.hour.count++
    counter.day.count++
    rateLimitStore.set(key, counter)
  }
}

function getRateLimitConfig(toolName: string): RateLimitConfig {
  const configs: Record<string, RateLimitConfig> = {
    read_file: { toolName, perMinute: 30, perHour: 500, perDay: 5000 },
    write_file: { toolName, perMinute: 10, perHour: 100, perDay: 500 },
    run_command: { toolName, perMinute: 5, perHour: 50, perDay: 200 }
  }

  return (
    configs[toolName] || {
      toolName,
      perMinute: 20,
      perHour: 200,
      perDay: 1000
    }
  )
}
```

### Anomaly Detection

```typescript
async function checkForAnomalies(
  request: ToolExecutionRequest,
  result: ToolExecutionResult
): Promise<void> {
  const log = logger.child({ agentId: request.agentId })

  // Get recent execution history
  const history = await getExecutionHistory(request.agentId, 100)

  // Detect spikes
  const recentCount = history.filter((h) => h.executedAt > subMinutes(new Date(), 5)).length

  if (recentCount > 50) {
    log.warn('Anomaly detected: execution spike', {
      recentCount,
      toolName: request.toolName
    })

    await alertSenior(request.agentId, `Execution spike detected: ${recentCount} in 5 minutes`)
  }

  // Detect repeated failures
  const recentFailures = history.slice(0, 10).filter((h) => h.status === 'failure')

  if (recentFailures.length >= 8) {
    log.warn('Anomaly detected: repeated failures', {
      failureCount: recentFailures.length,
      toolName: request.toolName
    })

    await alertSenior(
      request.agentId,
      `Repeated tool failures: ${recentFailures.length} in last 10 executions`
    )
  }

  // Detect unusual tool combinations
  const recentTools = history.slice(0, 5).map((h) => h.toolName)
  const suspiciousPatterns = [
    ['read_file', 'write_file', 'delete_file'], // Potential data exfiltration
    ['grant_permission', 'run_command'] // Privilege escalation
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.every((tool) => recentTools.includes(tool))) {
      log.warn('Anomaly detected: suspicious tool pattern', {
        pattern,
        recentTools
      })

      await alertSenior(request.agentId, `Suspicious tool pattern detected: ${pattern.join(' → ')}`)
    }
  }
}
```

### Audit Logging

```typescript
interface AuditLogEntry {
  id: string
  requestId: string
  agentId: string
  toolName: string
  arguments: Record<string, unknown>
  status: 'success' | 'failure' | 'pending_approval'
  result?: unknown
  error?: string
  executionTime: number
  resourceUsage: ResourceUsage
  approvedBy?: string
  approvedAt?: Date
  createdAt: Date
}

const auditLogs: AuditLogEntry[] = []

async function auditLog(
  request: ToolExecutionRequest,
  result: Partial<ToolExecutionResult>
): Promise<void> {
  const entry: AuditLogEntry = {
    id: uuidv4(),
    requestId: request.id,
    agentId: request.agentId,
    toolName: request.toolName,
    arguments: request.arguments,
    status: result.status || 'failure',
    result: result.data,
    error: result.error,
    executionTime: result.metadata?.executionTime || 0,
    resourceUsage: result.metadata?.resourceUsage || {
      cpuTime: 0,
      memoryPeak: 0,
      networkCalls: 0
    },
    approvedBy: result.metadata?.approvedBy,
    approvedAt: result.metadata?.approvedAt,
    createdAt: new Date()
  }

  auditLogs.push(entry)

  logger.info({ ...entry }, 'Tool execution audited')

  // Persist to file/database (future enhancement)
  // await writeAuditLog(entry)
}

async function queryAuditLogs(filter: {
  agentId?: string
  toolName?: string
  status?: string
  startDate?: Date
  endDate?: Date
}): Promise<AuditLogEntry[]> {
  return auditLogs.filter((log) => {
    if (filter.agentId && log.agentId !== filter.agentId) return false
    if (filter.toolName && log.toolName !== filter.toolName) return false
    if (filter.status && log.status !== filter.status) return false
    if (filter.startDate && log.createdAt < filter.startDate) return false
    if (filter.endDate && log.createdAt > filter.endDate) return false
    return true
  })
}
```

## Acceptance Criteria

### Functionality

- [ ] Low-risk tools execute automatically
- [ ] High-risk tools require approval
- [ ] Approval workflow creates tasks for seniors
- [ ] Tool execution respects timeouts
- [ ] Rate limits are enforced
- [ ] Anomaly detection triggers alerts
- [ ] All executions are audit logged
- [ ] Permission checks work correctly
- [ ] Sandboxing prevents crashes

### Security

- [ ] No unauthorized tool access
- [ ] Approval cannot be bypassed
- [ ] Rate limits prevent abuse
- [ ] Audit logs are tamper-proof
- [ ] Sensitive data is not logged (arguments sanitized)

### Performance

- [ ] Tool execution completes within timeout
- [ ] Rate limit checks are fast (<10ms)
- [ ] Audit logging doesn't block execution
- [ ] Anomaly detection runs asynchronously

### Code Quality

- [ ] TypeScript strict mode passes
- [ ] All functions have proper types
- [ ] Structured logging throughout
- [ ] Relative imports only
- [ ] Follows existing patterns

## Expected Output

```text
server/services/tools/
├── gateway.ts            # Execution gateway (~250 lines)
├── approval.ts           # Approval engine (~200 lines)
├── sandbox.ts            # Execution sandbox (~180 lines)
├── audit.ts              # Audit logger (~150 lines)
├── rate-limiter.ts       # Rate limiting (~180 lines)
├── anomaly.ts            # Anomaly detector (~200 lines)
├── permissions.ts        # Permission manager (~150 lines)
└── types.ts              # Tool types (~80 lines)

tests/services/tools/
├── gateway.spec.ts       # Gateway tests (~200 lines)
├── approval.spec.ts      # Approval tests (~150 lines)
├── rate-limiter.spec.ts  # Rate limit tests (~150 lines)
└── anomaly.spec.ts       # Anomaly tests (~150 lines)
```

Total: ~2,040 lines across 12 files

## Execution Plan

### Phase 1: Core Gateway (Days 1-2)

- Implement tool execution gateway
- Add permission checks
- Build basic sandbox
- Error handling

### Phase 2: Approval Workflow (Days 3-4)

- Implement risk classification
- Create approval engine
- Build approval queue
- Handle approval responses

### Phase 3: Safety Features (Days 5-6)

- Add rate limiting
- Implement anomaly detection
- Build audit logging
- Test security scenarios

### Phase 4: Testing & Hardening (Days 7-8)

- Write comprehensive tests
- Security testing (penetration)
- Performance testing
- Documentation

## Success Metrics

- No unauthorized tool execution
- Approval workflow works reliably
- Rate limits prevent abuse (zero incidents)
- Anomalies are detected and reported
- 100% audit coverage (all executions logged)
- All tests passing

## Notes

### Default Permissions

```typescript
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  worker: ['read_file', 'list_directory', 'search_code'],
  manager: ['read_file', 'list_directory', 'search_code', 'write_file', 'http_get'],
  director: ['*'] // All tools (still require approval for high-risk)
}
```

### Approval Timeout

If approver doesn't respond within 5 minutes:

- Tool execution is automatically denied
- Requesting agent is notified
- Approver is reminded (one time only)
- Audit log records timeout event

## Gemini Grade Prediction

Expected: **B** (complex security requirements, many edge cases)

Potential issues:

- Permission logic (may miss edge cases)
- Rate limiting (timing precision)
- Anomaly detection (false positives)
- Sandbox implementation (resource tracking is simplified)

Manual review recommended for:

- Security logic (permission checks)
- Rate limit counters (race conditions)
- Audit log sanitization (prevent info leaks)
- Approval workflow (task creation/monitoring)
