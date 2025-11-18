# Delegation Framework Guide

## Overview

The AI Team delegation framework enables agents to intelligently route tasks to colleagues based on expertise, workload, availability, and organizational hierarchy. This guide covers delegation principles, decision-making logic, and best practices.

## Core Concepts

### What is Delegation?

Delegation is the process of assigning a task to a colleague who is better suited to handle it. Reasons to delegate:

- Colleague has better expertise
- You're at/near capacity
- Task requires specialized skills
- Load balancing across team

### Hybrid System Architecture

The delegation system uses a **hybrid approach**:

1. **System Prompt (Static):** Delegation framework, hierarchy rules, decision logic
2. **Roster Tool (Dynamic):** Real-time colleague data (status, workload, expertise)

**Why Hybrid?**

- System prompt provides persistent framework and principles
- Roster tool provides fresh data (status/workload changes frequently)
- Best of both: consistent logic + accurate state

## The 5-Priority Decision Framework

Agents follow a 5-priority hierarchy when making delegation decisions:

### Priority 1: Best Same-Team Match

**Criteria:**

- Same team as delegator
- Has required expertise
- Status: `idle` or `active`
- Workload < 5/5

**Why First?**

- Lowest coordination overhead
- Shared context and team goals
- Faster communication

**Example:**

```text
Task: "Review React component for accessibility"
Agent: Sarah (Frontend Dev, Development team)
Decision: Delegate to Jordan (Frontend Dev, Development team, React expertise, 2/5 tasks)
Reasoning: Same team, exact expertise match, low workload
```

### Priority 2: Partial Expertise Same-Team

**Criteria:**

- Same team
- Has partial/related expertise (can learn)
- Status: `idle` or `active`
- Workload < 5/5

**Why Second?**

- Still low coordination overhead
- Learning opportunity for colleague
- Builds team capacity

**Example:**

```text
Task: "Implement Nuxt composable"
Agent: Sarah (Frontend Dev, Vue/React expertise)
Decision: Delegate to Alex (Frontend Dev, Vue expertise, 1/5 tasks)
Reasoning: Same team, has Vue background (can learn Nuxt), very low workload
Note: "You'll need to ramp up on Nuxt patterns, but your Vue expertise will help"
```

### Priority 3: Best Cross-Team Match

**Criteria:**

- Different team
- Has required expertise
- Status: `idle` or `active`
- Workload < 5/5

**Why Third?**

- Expertise match important
- Cross-team coordination needed
- May require manager loop-in

**Example:**

```text
Task: "Optimize PostgreSQL query performance"
Agent: Sarah (Frontend Dev, Development team)
Decision: Delegate to Database Team Lead (Backend Team, PostgreSQL expert, 3/5 tasks)
Reasoning: Only person with required database expertise
Note: "Cross-team delegation - looping in your manager for context"
```

### Priority 4: Queue for Primary Expert

**Criteria:**

- Expert has required expertise
- Expert is busy (workload = 5/5) but not offline
- Estimated wait time < urgency timeline

**Decision Logic:**

| Task Urgency                | Expert Available In | Action                  |
| --------------------------- | ------------------- | ----------------------- |
| Critical (30 min deadline)  | 1 hour              | Escalate (can't wait)   |
| Urgent (2 hour deadline)    | 1 hour              | Queue (acceptable wait) |
| Moderate (4 hour deadline)  | 2 hours             | Queue (acceptable wait) |
| Routine (no tight deadline) | 3-4 hours           | Queue (fine to wait)    |

**Example:**

```text
Task: "Fix production database migration bug" (Urgent, 2-hour deadline)
Agent: Sarah (Frontend Dev)
Decision: QUEUE for Database Lead (busy 5/5, available in ~1.5 hours)
Reasoning: Database Lead is only person with required expertise. Task is urgent but
1.5-hour wait is acceptable given 2-hour deadline. Orchestrator will notify when capacity opens.
```

### Priority 5: Escalate

**Criteria:**

- No suitable colleague found
- All experts offline or unavailable
- Task critical and can't wait
- Expertise gap in organization

**When to Escalate:**

- Required expertise doesn't exist in roster
- All suitable colleagues offline
- Wait time exceeds urgency
- Circular delegation detected
- Delegator lacks authority for cross-team work

**Example:**

```text
Task: "Design machine learning model for recommendations" (Critical)
Agent: Sarah (Frontend Dev)
Decision: ESCALATE to Team Lead
Reasoning: No ML specialists in roster. Task is critical (30-min deadline).
Need manager guidance on external resources or priority reassignment.
```

## Hierarchy Rules

### Delegation Authority

**Senior to Junior:**

- Seniors can delegate to direct reports
- Seniors can delegate to junior team members
- Phrasing: Direct ("Please handle X")

**Peer to Peer:**

- Frame as collaboration, not command
- Phrasing: "Would you be able to help with X?"
- Respect colleague autonomy

**Junior to Senior:**

- Frame as escalation or request for help
- Phrasing: "I need guidance on X" or "Could you take over X?"
- Don't treat as routine delegation

**Cross-Team:**

- Allowed but requires coordination
- Loop in managers for context
- Note potential delays

## Availability Interpretation

Agents query the roster to check colleague availability:

| Status    | Workload | Meaning                         | Action                  |
| --------- | -------- | ------------------------------- | ----------------------- |
| `idle`    | 0-2/5    | Low workload, readily available | Delegate                |
| `active`  | 3/5      | Moderate workload, can accept   | Delegate                |
| `busy`    | 4-5/5    | Near/at capacity                | Only if urgent or queue |
| `offline` | N/A      | Agent paused                    | Do not delegate         |

### Status Calculation

Status is automatically calculated from:

- **Workload:** `agent.currentWorkload` (0-5)
- **Agent State:** `agent.status` ('active' or 'paused')

```typescript
if (agent.status === 'paused') return 'offline'
if (currentWorkload <= 2) return 'idle'
if (currentWorkload === 3) return 'active'
if (currentWorkload >= 4) return 'busy'
```

## Making Delegation Decisions

### Step 1: Identify Task Requirements

Before querying roster, understand the task:

```text
- What expertise is needed? (e.g., "PostgreSQL", "React", "API Design")
- How urgent is this? (critical | urgent | moderate | routine)
- What's the deadline? (e.g., "30 minutes", "2 hours", "end of day")
- Can someone learn, or must they have expertise?
```

### Step 2: Query the Roster

Use `get_organization_roster` tool with appropriate filter:

```typescript
// Option 1: Find expert
{
  filter: 'by_expertise',
  expertise: 'PostgreSQL'
}

// Option 2: Check team capacity
{
  filter: 'my_team'
}

// Option 3: Find available colleagues
{
  filter: 'available'  // Returns idle + active only
}

// Option 4: Full roster
{
  filter: 'all'
}
```

### Step 3: Apply Decision Framework

Follow the 5-priority hierarchy:

1. Best same-team match?
2. Partial expertise same-team?
3. Best cross-team match?
4. Queue for expert?
5. Escalate?

### Step 4: Check Constraints

Before finalizing:

- [ ] Colleague exists in roster (don't hallucinate)
- [ ] You have delegation authority
- [ ] Colleague status permits work
- [ ] Not delegating to self
- [ ] No circular delegation (task originally from this colleague)

### Step 5: Log Decision

Format delegation decision clearly:

```text
DELEGATION DECISION:
Primary Choice: {colleague_name} ({reason})
Fallback: {backup_colleague} ({reason}) [if applicable]
Decision: DELEGATE | QUEUE | ESCALATE
Reasoning: {1-2 sentence explanation}
Wait Time (if queuing): {estimated time}
Notes: {special context}
```

## Decision Format Examples

### Example 1: Direct Delegation

```text
DELEGATION DECISION:
Primary Choice: Alex Chen (Backend Dev, PostgreSQL expert, same team, idle, 1/5 tasks)
Fallback: Jordan Lee (Backend Dev, database experience, same team, active, 3/5 tasks)
Decision: DELEGATE to Alex
Reasoning: Alex has exact expertise match, very low workload, same team. This is a
straightforward database query optimization task that matches his skills perfectly.
```

### Example 2: Queue Decision

```text
DELEGATION DECISION:
Primary Choice: Sam Rivera (Security Lead, penetration testing expert, busy 5/5 tasks)
Fallback: None suitable (junior devs lack security expertise)
Decision: QUEUE for Sam
Wait Time: ~2 hours (estimated based on task completion patterns)
Reasoning: Sam is the only person with penetration testing certification. Task is
moderate urgency with 4-hour deadline, so 2-hour wait is acceptable. Orchestrator
will notify Sam when capacity opens.
```

### Example 3: Escalation

```text
DELEGATION DECISION:
Primary Choice: None found
Fallback: N/A
Decision: ESCALATE to Alice Johnson (Team Lead)
Reasoning: This requires Kubernetes infrastructure expertise. No K8s specialists in
roster, and task is critical (production outage, 30-min deadline). Need manager to
either handle directly or bring in external expert.
```

### Example 4: Cross-Team Delegation

```text
DELEGATION DECISION:
Primary Choice: Taylor Morgan (Design Team, UX Researcher, active, 3/5 tasks)
Fallback: Escalate to Team Lead if Taylor unavailable
Decision: DELEGATE to Taylor (cross-team)
Reasoning: This user research task requires UX expertise that doesn't exist on
Development team. Taylor has availability and right skills. Looping in both team
leads for coordination.
Notes: Cross-team collaboration - may have slight communication overhead
```

## Self-Regulation & Workload Management

### Understanding Your Workload

Agents know their own `current_workload` from the organizational context:

```text
Current Workload: 3/5 tasks
```

### Capacity Guidelines

- **0-2/5:** Readily available, accept new tasks
- **3/5:** Moderate load, can accept appropriate tasks
- **4/5:** Near capacity, evaluate carefully before accepting
- **5/5:** At capacity, only accept critical tasks

### When to Delegate

Consider delegating when:

- You're at 4/5+ workload
- Task outside your expertise
- Colleague better suited
- Learning opportunity for junior

### Accepting Beyond Capacity

Agents CAN accept tasks beyond 5/5 if critical:

```text
"I'm at capacity (5/5 tasks), but this is critical—I'll handle it."
```

**Note:** Orchestrator has final say on capacity enforcement.

## Communication & Orchestrator

### Agent Responsibilities

- Make delegation decisions
- Log reasoning clearly
- Query roster for current data
- Follow hierarchy rules

### Orchestrator Responsibilities

- Route tasks to assigned agents
- Maintain task queues
- Track delegation chains
- Prevent loops
- Enforce capacity limits
- Auto-escalate stale queued tasks
- Notify agents of new assignments

### What Agents DON'T Do

- Don't notify colleagues directly (orchestrator handles)
- Don't modify colleague workload (automatic)
- Don't bypass queue system
- Don't create tasks for others without delegation decision

## Edge Cases & Error Handling

### Colleague Not in Roster

**Symptom:** You think a colleague exists, but they're not in roster results

**Action:**

```text
DELEGATION DECISION:
Decision: ESCALATE to manager
Reasoning: Expected colleague '{name}' not found in roster. Need clarification on
their availability or if they've left the organization.
```

### All Colleagues Offline

**Symptom:** Roster shows all potential delegates as `status: 'offline'`

**Action:**

```text
DELEGATION DECISION:
Decision: QUEUE or ESCALATE (based on urgency)
Reasoning: All colleagues with required expertise are offline. For urgent tasks,
escalating to manager. For routine tasks, queueing for when colleagues return.
```

### No Suitable Expertise

**Symptom:** No one in organization has required skills

**Action:**

```text
DELEGATION DECISION:
Decision: ESCALATE to manager
Reasoning: No colleague has {expertise} skills. Need manager guidance on:
- Bringing in external consultant
- Deprioritizing task
- Training team member
```

### Circular Delegation Detected

**Symptom:** Task was originally delegated TO you by the colleague you're considering

**Action:**

```text
DELEGATION DECISION:
Decision: ESCALATE to manager
Reasoning: This task was delegated to me by {colleague}. Delegating back would
create a loop. Need manager to clarify ownership or reassign.
```

### Delegation Loop (Orchestrator Prevention)

**Note:** Orchestrator tracks delegation chains and prevents:

- A → B → A loops
- A → B → C → A loops
- Longer chains

Agents should still log if they detect potential loops, but orchestrator is primary defense.

## Best Practices

### Things to Do

- Query roster before delegating (get fresh data)
- Follow the 5-priority framework
- Log reasoning clearly
- Consider workload AND expertise
- Respect hierarchy rules
- Frame peer delegation as collaboration
- Escalate when appropriate

### Things to Avoid

- Hallucinate colleagues not in roster
- Delegate to offline colleagues
- Ignore urgency in queue decisions
- Skip reasoning in delegation logs
- Delegate upward without framing as request
- Create delegation loops
- Bypass orchestrator for task routing

## Testing Delegation Scenarios

See `tests/services/agent-delegation.spec.ts` for test scenarios covering:

- Same-team delegation
- Cross-team delegation
- Workload-based decisions
- Queue vs escalate logic
- Fallback scenarios

## Code Examples

### Example 1: Query Roster for Expert

```typescript
const rosterResponse = await callTool('get_organization_roster', {
  filter: 'by_expertise',
  expertise: 'PostgreSQL'
})

// Response:
{
  agent_context: { /* your context */ },
  colleagues: [
    {
      id: 'agent-alex',
      name: 'Alex Chen',
      role: 'Backend Developer',
      team: 'Development',
      expertise: ['Node.js', 'PostgreSQL', 'API Design'],
      status: 'idle',
      current_workload: 1,
      workload_capacity: 5,
      seniorId: 'agent-alice'
    }
  ]
}
```

### Example 2: Check Team Capacity

```typescript
const rosterResponse = await callTool('get_organization_roster', {
  filter: 'my_team'
})

// Analyze team workload
const team = rosterResponse.colleagues
const availableColleagues = team.filter((c) => c.status !== 'offline' && c.current_workload < 4)

if (availableColleagues.length === 0) {
  // Escalate or queue
}
```

### Example 3: Find Available Colleagues

```typescript
const rosterResponse = await callTool('get_organization_roster', {
  filter: 'available' // Only idle + active
})

// All colleagues in response can accept new tasks
```

## Delegation Metrics (Future)

Future enhancements may track:

- Delegation success rate (task completed successfully)
- Average wait time for queued tasks
- Cross-team delegation frequency
- Escalation reasons
- Expertise gap identification

## Related Documentation

- [Agent Creation Guide](creation.md)
- [Roster Tool Reference](../tools/roster.md)
- [API Reference](../api/tools.md)

## Developer Notes

### Implementation Files

- `.specify/templates/organizational-context.md` - Delegation framework prompt
- `app/server/services/tools/roster.ts` - Roster tool logic
- `app/server/services/orchestrator.ts` - Task routing and queue management
- `tests/services/agent-delegation.spec.ts` - Delegation test scenarios

### Key Constants

```typescript
MAX_WORKLOAD_CAPACITY = 5
SOFT_LIMIT_THRESHOLD = 4
```
