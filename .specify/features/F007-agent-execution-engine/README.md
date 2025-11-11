# F007: Agent Execution Engine

## Status

Planning

## Objective

Create the core autonomous agent execution engine that enables agents to continuously process tasks, make decisions, delegate work, and update their status. This is the "brain" that transforms agents from static data structures into autonomous actors.

## Scope

### In Scope

- Task queue polling loop (agents check for assigned work)
- LLM-based task processing (read → plan → execute)
- Decision-making logic (delegate vs execute directly)
- Competency-based delegation assessment
- Status transitions (active → bored → stuck → paused)
- Token budget enforcement (stop when allocation exhausted)
- Senior-subordinate communication (reporting, escalation)
- Task completion and result reporting
- Error handling and recovery
- Structured logging with agent context

### Out of Scope (Future)

- Tool execution (F010 - Tool Execution System)
- Interview process (F008 - HR Interview Workflow)
- Memory compression (F016 - The Nurse)
- Multi-turn conversation optimization (F018)
- Streaming responses (F019)
- Performance optimization (parallel execution)

## Dependencies

### Required (Complete)

- F001 Agent System ✅ (Agent type, status field, hierarchy)
- F003 Task Management ✅ (Task type, status tracking)
- F006 LLM Integration ✅ (generateCompletion function)
- F006 Phase 2 MCP Client ✅ (tool invocation - in progress)

### Uses

- `server/services/llm/` (LLM service)
- `server/data/agents.ts` (agent data store)
- `server/data/tasks.ts` (task data store)
- `types/index.ts` (Agent, Task, AgentStatus, TaskStatus)
- `server/utils/logger.ts` (structured logging)

## Architecture

### High-Level Design

```text
┌─────────────────────────────────────────────┐
│  Agent Manager (Orchestrator)               │
│  - Starts all active agents                 │
│  - Monitors agent health                    │
│  - Handles graceful shutdown                │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Agent Execution Loop (per agent)           │
│  - Poll for tasks (assigned to this agent)  │
│  - Process task with LLM                    │
│  - Make delegation decision                 │
│  - Execute or delegate                      │
│  - Update status                            │
│  - Repeat every N seconds                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Task Processor                             │
│  - Read task description                    │
│  - Generate execution plan (LLM)            │
│  - Break into subtasks if needed            │
│  - Invoke tools via MCP (F006 Phase 2)      │
│  - Update task progress                     │
│  - Report completion                        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Delegation Engine                          │
│  - Assess task complexity                   │
│  - Evaluate agent competency                │
│  - Match task to subordinate                │
│  - Create delegation task                   │
│  - Monitor subordinate progress             │
└─────────────────────────────────────────────┘
```

### State Machine (Agent Status)

```text
         [Start]
            ↓
        ┌─────────┐
        │ active  │ ←──────────┐
        └─────────┘            │
            ↓                  │
      [No tasks for N mins]    │
            ↓                  │
        ┌─────────┐            │
        │  bored  │            │
        └─────────┘            │
            ↓                  │
    [Report to senior]         │
            ↓                  │
   [Receive new task] ─────────┘

         [Task blocked]
            ↓
        ┌─────────┐
        │  stuck  │
        └─────────┘
            ↓
    [Escalate to senior]
            ↓
   [Senior resolves] ────────────┐
                                 │
        ┌─────────┐              │
        │ paused  │ ←────────────┘
        └─────────┘
     [Manual resume]
```

## Implementation Tasks

### Task 1: Agent Manager Service

**File:** `server/services/agent-engine/manager.ts`

**Responsibilities:**

- Start agent execution loops for all active agents
- Track running agent processes
- Monitor agent health (heartbeat)
- Handle graceful shutdown (stop all agents)
- Restart failed agents
- Expose management API (start/stop/restart)

### Task 2: Agent Execution Loop

**File:** `server/services/agent-engine/loop.ts`

**Responsibilities:**

- Poll task queue for agent's tasks (every N seconds)
- Check token budget before processing
- Process task with LLM if budget allows
- Update agent lastActiveAt timestamp
- Detect idle state (no tasks) → boredom
- Handle errors and retry logic
- Log all operations with agent context

### Task 3: Task Processor

**File:** `server/services/agent-engine/processor.ts`

**Responsibilities:**

- Read task description and context
- Generate execution plan using LLM
- Break complex tasks into subtasks
- Invoke tools via MCP client (when needed)
- Update task status (in-progress → completed)
- Handle task failure (mark as failed, report to senior)
- Return structured results

### Task 4: Delegation Engine

**File:** `server/services/agent-engine/delegation.ts`

**Responsibilities:**

- Assess if agent should delegate (vs execute directly)
- Evaluate subordinate competencies
- Match task requirements to subordinate skills
- Create delegation task in subordinate's queue
- Monitor delegated task progress
- Escalate to senior if no suitable subordinate

### Task 5: Status Manager

**File:** `server/services/agent-engine/status.ts`

**Responsibilities:**

- Manage agent status transitions
- Detect boredom (idle for N minutes)
- Detect stuck state (task blocked)
- Report status changes to senior
- Handle escalations (create escalation tasks)
- Update agent status in data store

### Task 6: Token Budget Enforcer

**File:** `server/services/agent-engine/budget.ts`

**Responsibilities:**

- Check token budget before each operation
- Calculate remaining tokens
- Enforce spending limits (stop if exhausted)
- Warn when approaching limit (90%, 95%)
- Report to senior when budget exhausted
- Support budget top-ups (senior can allocate more)

## Technical Specification

### Agent Execution Loop

```typescript
interface AgentLoop {
  agentId: string
  pollInterval: number // milliseconds (default: 30000 = 30 seconds)
  isRunning: boolean
  lastPoll: Date
}

async function startAgentLoop(agentId: string): Promise<void> {
  const agent = agents.find((a) => a.id === agentId)
  if (!agent || agent.status === 'paused') return

  const log = logger.child({ agentId, correlationId: uuidv4() })

  while (true) {
    try {
      // Check token budget
      if (agent.tokenUsed >= agent.tokenAllocation) {
        await handleBudgetExhausted(agent)
        break
      }

      // Poll for tasks
      const tasks = await getTasksForAgent(agentId)

      if (tasks.length === 0) {
        // Check for boredom
        const idleTime = Date.now() - agent.lastActiveAt.getTime()
        if (idleTime > BOREDOM_THRESHOLD) {
          await handleBoredom(agent)
        }
      } else {
        // Process first task
        const task = tasks[0]
        await processTask(agent, task)
      }

      // Wait before next poll
      await sleep(POLL_INTERVAL)
    } catch (error) {
      log.error({ error }, 'Agent loop error')
      await sleep(ERROR_RETRY_DELAY)
    }
  }
}
```

### Task Processing

```typescript
async function processTask(agent: Agent, task: Task): Promise<void> {
  const log = logger.child({ agentId: agent.id, taskId: task.id })

  // Update task status
  task.status = 'in-progress'
  task.assignedTo = agent.id

  log.info('Processing task', {
    taskTitle: task.title,
    priority: task.priority
  })

  try {
    // Decide: delegate or execute?
    const shouldDelegate = await assessDelegation(agent, task)

    if (shouldDelegate) {
      const subordinate = await selectSubordinate(agent, task)
      if (subordinate) {
        await delegateTask(task, agent, subordinate)
        return
      }
      // No suitable subordinate, execute ourselves
    }

    // Execute task with LLM
    const prompt = buildTaskPrompt(task)
    const response = await generateCompletion(prompt, {
      agentId: agent.id,
      correlationId: log.correlationId
    })

    // Update task with results
    task.status = 'completed'
    task.result = response.content
    task.completedAt = new Date()

    // Report to senior
    if (agent.seniorId) {
      await reportCompletion(agent, task)
    }

    log.info('Task completed', { tokensUsed: response.tokensUsed.total })
  } catch (error) {
    log.error({ error }, 'Task processing failed')
    task.status = 'failed'
    task.result = `Error: ${error.message}`

    // Escalate to senior
    if (agent.seniorId) {
      await escalateFailure(agent, task, error)
    }
  }
}
```

### Delegation Assessment

```typescript
async function assessDelegation(agent: Agent, task: Task): Promise<boolean> {
  // Simple heuristic: if agent has subordinates and task is complex
  const subordinates = agents.filter((a) => a.seniorId === agent.id)
  if (subordinates.length === 0) return false

  // Use LLM to assess task complexity
  const prompt = `Assess if this task should be delegated:
Task: ${task.title}
Description: ${task.description}

Agent role: ${agent.role}
Available subordinates: ${subordinates.map((s) => `${s.name} (${s.role})`).join(', ')}

Should this agent delegate the task? Answer YES or NO with brief reasoning.`

  const response = await generateCompletion(prompt, {
    agentId: agent.id,
    temperature: 0.3, // Low temperature for consistent decisions
    maxTokens: 200
  })

  return response.content.toUpperCase().includes('YES')
}
```

### Boredom Detection

```typescript
const BOREDOM_THRESHOLD = 15 * 60 * 1000 // 15 minutes

async function handleBoredom(agent: Agent): Promise<void> {
  if (agent.status === 'bored') return // Already bored

  const log = logger.child({ agentId: agent.id })
  log.warn('Agent is bored (no tasks assigned)')

  // Update status
  agent.status = 'bored'

  // Report to senior
  if (agent.seniorId) {
    const senior = agents.find((a) => a.id === agent.seniorId)
    if (senior) {
      await createTask({
        id: uuidv4(),
        title: `Agent ${agent.name} is bored`,
        description: `${agent.name} (${agent.role}) has no tasks assigned for ${BOREDOM_THRESHOLD / 60000} minutes. Please review workload distribution.`,
        assignedTo: senior.id,
        createdBy: agent.id,
        priority: 'low',
        status: 'pending',
        organizationId: agent.organizationId,
        createdAt: new Date()
      })
    }
  }
}
```

### Stuck Detection

```typescript
async function handleStuck(agent: Agent, task: Task, error: Error): Promise<void> {
  const log = logger.child({ agentId: agent.id, taskId: task.id })
  log.warn('Agent is stuck on task', { error: error.message })

  // Update status
  agent.status = 'stuck'
  task.status = 'blocked'

  // Escalate to senior
  if (agent.seniorId) {
    const senior = agents.find((a) => a.id === agent.seniorId)
    if (senior) {
      await createTask({
        id: uuidv4(),
        title: `Agent ${agent.name} is stuck`,
        description: `${agent.name} is blocked on task: ${task.title}\n\nError: ${error.message}\n\nPlease assist or reassign.`,
        assignedTo: senior.id,
        createdBy: agent.id,
        priority: 'high',
        status: 'pending',
        organizationId: agent.organizationId,
        createdAt: new Date(),
        metadata: {
          blockedTaskId: task.id,
          blockedAgentId: agent.id
        }
      })
    }
  }
}
```

## Acceptance Criteria

### Functionality

- [ ] Agent manager can start/stop all agents
- [ ] Each agent polls its task queue independently
- [ ] Tasks are processed with LLM integration
- [ ] Token budget is enforced (stop when exhausted)
- [ ] Delegation logic works (managers delegate to subordinates)
- [ ] Boredom detection triggers after idle period
- [ ] Stuck detection triggers on task failure
- [ ] Status transitions are logged correctly
- [ ] Senior agents receive reports from subordinates
- [ ] Agents update lastActiveAt on each operation

### Error Handling

- [ ] Failed tasks are marked appropriately
- [ ] Errors are logged with full context
- [ ] Stuck agents escalate to seniors
- [ ] Agent loops recover from errors (retry)
- [ ] Graceful shutdown works (no orphaned tasks)

### Performance

- [ ] Poll interval is configurable (default 30s)
- [ ] Multiple agents run concurrently (no blocking)
- [ ] Token tracking is accurate
- [ ] No memory leaks (long-running processes)

### Code Quality

- [ ] TypeScript strict mode passes
- [ ] All functions have proper type signatures
- [ ] Structured logging with agent context
- [ ] Error handling with try-catch
- [ ] Relative imports only
- [ ] Follows existing patterns (logger, correlationId)

## Expected Output

```text
server/services/agent-engine/
├── manager.ts            # Agent manager (~150 lines)
├── loop.ts               # Execution loop (~200 lines)
├── processor.ts          # Task processor (~250 lines)
├── delegation.ts         # Delegation logic (~200 lines)
├── status.ts             # Status manager (~150 lines)
├── budget.ts             # Budget enforcer (~100 lines)
└── types.ts              # Engine types (~50 lines)

tests/services/agent-engine/
├── manager.spec.ts       # Manager tests (~150 lines)
├── loop.spec.ts          # Loop tests (~200 lines)
├── processor.spec.ts     # Processor tests (~200 lines)
└── delegation.spec.ts    # Delegation tests (~150 lines)
```

Total: ~1,800 lines across 11 files

## Execution Plan

### Phase 1: Core Loop (Days 1-2)

- Implement agent manager (start/stop/monitor)
- Create execution loop (poll + process)
- Add token budget enforcement
- Basic error handling

### Phase 2: Task Processing (Days 3-4)

- Implement task processor with LLM
- Add result reporting
- Handle task failures
- Integrate with MCP tools

### Phase 3: Delegation (Days 5-6)

- Build delegation assessment logic
- Implement subordinate selection
- Create delegation tasks
- Monitor delegated work

### Phase 4: Status Management (Days 7-8)

- Add boredom detection
- Implement stuck detection
- Build escalation mechanism
- Test status transitions

### Phase 5: Testing & Integration (Days 9-10)

- Write comprehensive tests
- Integration testing with real LLM
- Performance testing (multiple agents)
- Documentation

## Success Metrics

- Agents process tasks autonomously
- Delegation logic reduces senior workload
- Boredom/stuck detection works reliably
- Token budgets are enforced
- No agent loops or hangs
- All tests passing (100% coverage on critical paths)
- Ready for F008 (HR Interview) integration

## Notes

### Configuration

```typescript
// server/config/agent-engine.ts
export const AGENT_ENGINE_CONFIG = {
  pollInterval: 30000, // 30 seconds
  boredomThreshold: 900000, // 15 minutes
  stuckRetryLimit: 3, // Retry 3 times before stuck
  maxConcurrentAgents: 10, // Concurrent agent loops
  taskBatchSize: 1 // Process 1 task at a time
}
```

### Design Philosophy

- **Autonomous by default**: Agents act independently
- **Fail-safe**: Errors don't crash the system
- **Observable**: Every operation is logged
- **Scalable**: Design for 50+ agents from start
- **Recoverable**: System can restart without losing state

### Future Enhancements (Post-F007)

- Parallel task processing (multiple tasks per agent)
- Priority-based scheduling (high priority first)
- Agent specialization (learn from task history)
- Performance optimization (reduce LLM calls)
- Load balancing (distribute tasks evenly)

## Gemini Grade Prediction

Expected: **B+** (complex orchestration, many moving parts)

Potential issues:

- Async loop management (infinite loops, timing)
- Status transitions (state machine complexity)
- Delegation logic (LLM-based decisions may be inconsistent)
- Error handling (many failure modes)

Manual review recommended for:

- Loop termination conditions
- Status transition logic
- Token budget calculations
- Escalation message clarity
