# F074: Agent Roster & Organizational Awareness

## Status

Planning - Design Complete | GitHub Issue: [#74](https://github.com/mitselek/ai-team/issues/74)

## Objective

Enable agents to be aware of all colleagues in their organization, facilitating intelligent task delegation, collaboration, and workload management through a hybrid system prompt + runtime context architecture.

## Context

**Brainstorming Session:** November 18, 2025 with Elena Rodriguez (Prompt Engineering Specialist)

**Problem:** Agents currently operate in isolation without awareness of:

- Who else exists in the organization
- What expertise colleagues have
- Colleague availability and workload
- Organizational hierarchy and reporting relationships

**Use Cases:**

- Senior agents delegating tasks to team members
- Agents checking colleague availability before delegating
- Understanding who has specific expertise
- Respecting hierarchy (senior → junior delegation patterns)
- Cross-team collaboration decisions

## Architecture Decision

**Hybrid Approach: System Prompt + Runtime Context**

### Why Not Just System Prompt?

Colleague data is **dynamic** (status, workload, assignments change frequently). Baking stale data into system prompts leads to:

- ❌ Incorrect availability assumptions
- ❌ Wrong delegation decisions
- ❌ Outdated workload information
- ❌ Need to redeploy prompts when roster changes

### Why Not Just Runtime Context?

Agents need **persistent knowledge** of:

- ✅ Delegation principles and hierarchy rules
- ✅ Their own position in organization
- ✅ Decision-making framework
- ✅ Error handling patterns

### Solution: Hybrid

**System Prompt (Static):**

- Agent's identity, role, team, hierarchy position
- Delegation principles and framework
- Decision-making logic
- Error handling patterns
- Self-regulation guidelines

**Runtime Context (Dynamic):**

- Fresh colleague roster with current status/workload
- Agent's own current workload
- Task context (urgency, deadline, expertise needed)

## System Design

### 1. Organizational Context Template

New section appended to agent system prompts at creation:

```markdown
## YOUR ORGANIZATIONAL CONTEXT

You are: {agent_name}
Role: {agent_role}
Team: {agent_team}
Your Manager: {senior_name} (ID: {senior_id})
Current Workload: {current_workload}/5 tasks
Your Expertise: {expertise_list}

## DELEGATION FRAMEWORK

[Delegation principles, hierarchy rules, decision logic]
[See: organizational-context-template.md]
```

### 2. Roster Tool

New tool: `get_organization_roster`

**Tool Definition:**

```typescript
{
  name: 'get_organization_roster',
  description: 'Get current roster of all agents in organization with status and workload',
  inputSchema: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        enum: ['all', 'my_team', 'available', 'by_expertise'],
        description: 'Filter roster results'
      },
      expertise: {
        type: 'string',
        description: 'Filter by specific expertise (if filter=by_expertise)'
      }
    },
    required: []
  }
}
```

**Returns:**

```json
{
  "agent_context": {
    "id": "agent-id",
    "name": "Agent Name",
    "role": "Role",
    "team": "Team Name",
    "seniorId": "senior-id",
    "expertise": ["skill1", "skill2"],
    "status": "active",
    "current_workload": 3,
    "workload_capacity": 5
  },
  "colleagues": [
    {
      "id": "colleague-id",
      "name": "Colleague Name",
      "role": "Their Role",
      "team": "Their Team",
      "seniorId": "their-senior-id",
      "expertise": ["skill1", "skill2"],
      "status": "active",
      "current_workload": 2,
      "workload_capacity": 5,
      "availability_until": null
    }
  ]
}
```

### 3. Delegation Decision Framework

**Priority Order:**

1. **Best Same-Team Match**
   - Same team + required expertise + available (idle/active)
   - Workload < 5/5
   - Status ≠ offline

2. **Partial Expertise Same-Team**
   - Same team + related expertise + available
   - Can learn with guidance
   - Workload < 5/5

3. **Best Cross-Team Match**
   - Different team + required expertise + available
   - Workload < 5/5
   - Note coordination overhead

4. **Queue for Primary Expert**
   - Expert busy (5/5) but not offline
   - estimated_wait_time < urgency_timeline
   - Queue with wait time estimate

5. **Escalate**
   - No suitable colleague
   - All experts offline
   - Critical task can't wait
   - Escalate to manager/senior

### 4. Status & Availability

**Status Values:**

- `idle`: Low workload, available for tasks
- `active`: Moderate workload, can accept tasks
- `busy`: At/near capacity, evaluate carefully
- `offline`: Not available, do not delegate

**Workload:**

- Format: `X/5` where X = current tasks
- < 4/5: Good capacity
- 4/5: Approaching capacity
- 5/5: At capacity (only urgent tasks)

**Availability Until:**

- `null`: Available indefinitely
- `timestamp`: When agent expects to be free (if busy)

## Implementation Plan

### Phase 1: Core Infrastructure

**Task 1:** Create organizational context template

- File: `.specify/templates/organizational-context.md`
- Content: Delegation framework, hierarchy rules, decision logic
- Variables: {agent_name}, {agent_role}, {agent_team}, etc.

**Task 2:** Implement roster tool

- File: `app/server/services/tools/roster.ts`
- Tool executor for `get_organization_roster`
- Query agents + teams data
- Format response with status/workload

**Task 3:** Register roster tool

- Update tool registry in orchestrator
- Add to whitelist
- Add to MCP tool definitions

**Task 4:** System prompt builder utility

- File: `app/server/utils/buildAgentPrompt.ts`
- Function: `buildSystemPrompt(agent, customPrompt, orgContext)`
- Merge custom prompt + organizational context
- Fill template variables

### Phase 2: Integration

**Task 5:** Update agent creation workflow

- Modify HR interview finalization
- Call buildSystemPrompt when creating agent
- Store merged prompt in agent.systemPrompt

**Task 6:** Add workload tracking

- Add `currentWorkload` field to Agent type (optional, defaults to 0)
- Update when tasks assigned/completed
- Expose in roster tool response

**Task 7:** Update task assignment flow

- Track workload when tasks assigned
- Decrement when tasks completed
- Update agent status based on workload

### Phase 3: Testing & Refinement

**Task 8:** Test delegation scenarios

- Senior delegating to junior (same team)
- Peer coordination
- Cross-team delegation
- Queue vs escalate decisions
- Fallback logic

**Task 9:** Test edge cases

- Colleague not in roster
- All colleagues offline
- Delegation loops
- Workload overflow

**Task 10:** Documentation

- Update agent creation docs
- Document roster tool usage
- Add delegation best practices guide

## Data Model Changes

### Agent Type Updates

```typescript
interface Agent {
  // ... existing fields ...
  currentWorkload?: number // NEW: 0-5, defaults to 0
  expertise?: string[] // NEW: List of skills/domains
}
```

### No Breaking Changes

- `currentWorkload` optional (defaults to 0)
- `expertise` optional (can be extracted from systemPrompt or set manually)

## Delegation Decision Format

Agents should format delegation decisions as:

```text
DELEGATION DECISION:
Primary Choice: {name} ({reason})
Fallback: {backup} ({reason}) [if applicable]
Decision: DELEGATE | QUEUE | ESCALATE
Reasoning: {1-2 sentence explanation}
Wait Time: {if queuing}
Notes: {special context}
```

**Example:**

```text
DELEGATION DECISION:
Primary Choice: Alice (Frontend Dev, React expertise, same team, active, 2/5 tasks)
Fallback: Bob (Senior Frontend Dev, cross-team, available, 3/5 tasks)
Decision: DELEGATE to Alice
Reasoning: Alice has exact expertise match, low workload, same team (no coordination overhead).
This is a straightforward React component task.
```

## Orchestrator Responsibilities

**What Orchestrator Does:**

- Notifies receiving agent when task delegated
- Tracks delegation chains (prevents loops)
- Auto-escalates stale queued tasks
- Enforces final capacity limits
- Logs audit trail (who delegated what to whom)

**What Orchestrator Does NOT Do:**

- Make delegation decisions (that's the agent's job)
- Override agent's routing choice (unless capacity violated)

## Error Handling

**Agents handle these scenarios explicitly:**

1. **Colleague Not in Roster:**
   - "This colleague doesn't exist in my roster. Escalating to manager."

2. **Colleague Offline:**
   - "Target colleague is offline. Queuing task or escalating depending on urgency."

3. **No Suitable Expertise:**
   - "No colleague has required expertise. Escalating to manager for guidance."

4. **Delegation Loop Detected:**
   - "This task was delegated to me by {original_agent}. I should not delegate back. Escalating."

## Success Criteria

### Functional Requirements

- [x] Architecture designed (hybrid approach)
- [ ] Organizational context template created
- [ ] Roster tool implemented and registered
- [ ] System prompt builder utility created
- [ ] Agent creation workflow updated
- [ ] Workload tracking implemented
- [ ] Delegation framework documented

### Behavioral Requirements

- [ ] Agents can query colleague roster
- [ ] Agents receive accurate status/workload data
- [ ] Agents make delegation decisions using framework
- [ ] Delegation decisions are logged with reasoning
- [ ] Orchestrator tracks and prevents loops
- [ ] Agents handle unavailability gracefully
- [ ] Cross-team delegation works with coordination notes

### Quality Requirements

- [ ] Zero TypeScript errors
- [ ] All tests passing
- [ ] Roster tool tested with various filters
- [ ] Delegation scenarios tested (10+ scenarios)
- [ ] Edge cases handled
- [ ] Documentation complete

## Scale Considerations

**MVP (6-10 agents):**

- Return full roster (simple, works fine)

**Growth (20-50 agents):**

- Still return full roster
- Add filtering: my_team, available, by_expertise
- Agents filter locally using roster tool parameters

**Future (50+ agents):**

- Return filtered roster by default (my_team + frequent collaborators)
- Add query endpoint: `GET /api/agents?expertise=X&status=available`
- Consider caching roster data in agent sessions

## Dependencies

**Requires:**

- Agent data structure (exists)
- Team data structure (exists)
- Task assignment system (exists)
- Agent creation workflow (exists)

**Blocks:**

- Advanced delegation analytics
- Workload optimization algorithms
- Team capacity planning features

## Related Issues

- #60 (Parent - Agent Roster Page/Awareness)
- #74 (This feature - Agent Roster & Organizational Awareness)
- F008 (HR Interview Workflow - agent creation)
- F014 (Multi-model LLM Support)

## Lessons from Brainstorming

**What Worked:**

- Elena's methodical questioning clarified requirements
- Separating static (system prompt) from dynamic (runtime) data
- Establishing clear priority hierarchy for delegation
- Defining orchestrator vs agent responsibilities

**Key Insights:**

- Stale data in system prompts = bad decisions
- Agents need both framework (static) and data (dynamic)
- Delegation is a routing problem, not a notification problem
- Audit trail more important than real-time communication

**Architectural Decisions:**

- Hybrid approach (not pure prompt, not pure runtime)
- Tool-based roster access (fresh data every query)
- Orchestrator handles execution, agents handle routing
- Explicit decision logging for audit

## Next Steps

1. Create organizational context template
2. Implement roster tool
3. Build system prompt utility
4. Update agent creation workflow
5. Add workload tracking
6. Test delegation scenarios

---

**Design Session:** November 18, 2025  
**Consultant:** Elena Rodriguez (Prompt Engineering Specialist)  
**Status:** Ready for implementation
