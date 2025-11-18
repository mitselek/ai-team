# Agent Creation Guide

## Overview

Agents in the AI Team system are persistent AI entities with organizational awareness, delegation capabilities, and workload management. This guide covers how agents are created and configured with organizational context.

## Agent Creation Methods

### Method 1: HR Interview Workflow (Recommended)

The HR interview workflow is the primary method for creating new agents. It ensures proper team assignment, expertise identification, and organizational integration.

**Process:**

1. **Interview Session**: Marcus (HR specialist) conducts a structured interview
2. **Profile Generation**: Interview transcript is analyzed to extract candidate profile
3. **Agent Creation**: Profile is converted to agent with organizational context
4. **System Prompt Construction**: Custom prompt + organizational context template

**Advantages:**

- Proper team assignment based on role/expertise
- Expertise automatically extracted from interview
- Manager/senior assignment follows org hierarchy
- Full organizational context included

**Example:**

```bash
# Start interview through API
curl -X POST http://localhost:3000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{"organizationId": "org123"}'

# Interview proceeds with Marcus...

# Agent created with:
# - name, role from interview
# - teamId from HR recommendation
# - expertise from skills discussion
# - systemPrompt = customPrompt + organizational context
# - currentWorkload = 0
```

### Method 2: Direct API Creation

For programmatic agent creation, use the agents API endpoint directly.

**Endpoint:** `POST /api/agents`

**Request Body:**

```typescript
{
  organizationId: string
  teamId: string
  name: string
  role: string
  systemPrompt: string      // Custom prompt only
  status?: 'active' | 'paused'
  currentWorkload?: number  // Optional, defaults to 0
  expertise?: string[]      // Optional, e.g., ['TypeScript', 'Vue', 'API Design']
  seniorId?: string        // Optional, reporting manager
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org123",
    "teamId": "team-dev",
    "name": "Sarah",
    "role": "Backend Developer",
    "systemPrompt": "You are a backend developer specializing in Node.js APIs.",
    "expertise": ["Node.js", "PostgreSQL", "REST APIs"],
    "currentWorkload": 0
  }'
```

**Note:** The API automatically calls `buildSystemPrompt()` to append organizational context to the provided `systemPrompt`.

## Organizational Context

### What is Organizational Context?

Every agent receives an organizational context section appended to their system prompt. This provides:

- Agent's identity (name, role, team)
- Manager/senior information
- Current workload status
- Expertise areas
- Access to colleague roster
- Delegation framework and decision logic
- Edge case handling guidance

### Template Location

The organizational context template is stored at:

```text
.specify/templates/organizational-context.md
```

### Template Variables

The template uses these variables, automatically filled at creation:

| Variable             | Source                     | Example                          |
| -------------------- | -------------------------- | -------------------------------- |
| `{agent_name}`       | Agent.name                 | "Sarah"                          |
| `{agent_role}`       | Agent.role                 | "Backend Developer"              |
| `{agent_team}`       | Team.name (via teamId)     | "Development"                    |
| `{senior_name}`      | Agent.name (via seniorId)  | "Alice"                          |
| `{senior_id}`        | Agent.seniorId             | "agent-alice"                    |
| `{current_workload}` | Agent.currentWorkload      | "0"                              |
| `{expertise_list}`   | Agent.expertise.join(', ') | "Node.js, PostgreSQL, REST APIs" |

### How System Prompts Are Constructed

**Step 1:** Agent provides custom system prompt (their personality, role-specific instructions)

**Step 2:** `buildSystemPrompt()` utility loads organizational context template

**Step 3:** Template variables are replaced with agent-specific data

**Step 4:** Custom prompt + organizational context are merged:

```typescript
finalPrompt = customPrompt + '\n\n' + filledOrgContext
```

**Result:** Agent has both their unique personality AND organizational awareness.

## Setting Agent Expertise

Expertise areas help the delegation system match tasks to agents.

### When to Set Expertise

- **Interview Workflow:** Automatically extracted from interview discussion
- **Direct API:** Include in request body
- **Post-Creation:** Update via PATCH endpoint

### Expertise Guidelines

**Be Specific:**

- ❌ "Programming"
- ✅ "TypeScript", "React", "Node.js"

**Include Tools and Domains:**

- Technical: "PostgreSQL", "Docker", "AWS"
- Domain: "Healthcare", "Finance", "E-commerce"
- Methodologies: "TDD", "Agile", "API Design"

**Keep It Manageable:**

- Aim for 3-7 expertise areas
- Focus on unique/advanced skills
- Avoid overly generic terms

### Expertise in Delegation

When agents query the roster with `filter: 'by_expertise'` and `expertise: 'PostgreSQL'`, the system:

1. Searches `agent.expertise` array for matches
2. Returns agents with that expertise
3. Agents use this to find specialized colleagues

## Workload Tracking

### Initial Workload

New agents start with `currentWorkload: 0` (no active tasks).

### Workload Scale

- **0-5 scale:** Represents current task count
- **0-2:** `idle` status (low workload, readily available)
- **3:** `active` status (moderate workload, can accept tasks)
- **4-5:** `busy` status (at/near capacity, evaluate carefully)
- **5:** Maximum capacity (soft limit with warnings)

### Automatic Tracking

Workload is automatically incremented/decremented:

- **+1** when task assigned to agent
- **-1** when task completed or cancelled
- **Capped** at 0 (minimum) and 5 (maximum)

### Workload in Delegation Decisions

Agents consider colleague workload when delegating:

- Prefer colleagues with `currentWorkload < 4`
- Avoid offline colleagues (`status: 'paused'`)
- Queue for busy experts if wait time acceptable
- Escalate if no suitable colleague available

See [Delegation Framework Guide](delegation.md) for details.

## Agent Status Values

| Status    | Meaning      | Roster Display       | Delegation Action       |
| --------- | ------------ | -------------------- | ----------------------- |
| `idle`    | Workload 0-2 | "Idle (2/5 tasks)"   | Suitable for new tasks  |
| `active`  | Workload 3   | "Active (3/5 tasks)" | Suitable for new tasks  |
| `busy`    | Workload 4-5 | "Busy (4/5 tasks)"   | Only if urgent or queue |
| `offline` | Agent paused | "Offline"            | Do not delegate         |

**Status Calculation:** Automatically derived from `currentWorkload` and `status` fields.

## Migration for Existing Agents

### Adding Organizational Context to Existing Agents

If you have agents created before F074 (roster system), you can add organizational context:

**Step 1:** Read agent's current systemPrompt

**Step 2:** Call `buildSystemPrompt(agent, currentPrompt)`

**Step 3:** Update agent with new prompt:

```typescript
import { buildSystemPrompt } from '~/server/utils/buildAgentPrompt'

// For existing agent
const agent = await getAgent(agentId)
const enhancedPrompt = await buildSystemPrompt(agent, agent.systemPrompt)

await updateAgent(agentId, {
  systemPrompt: enhancedPrompt
})
```

### Populating Expertise Field

For existing agents without expertise:

**Option 1:** Review agent's role and manually set:

```bash
curl -X PATCH http://localhost:3000/api/agents/{id} \
  -H "Content-Type: application/json" \
  -d '{"expertise": ["Python", "Machine Learning", "TensorFlow"]}'
```

**Option 2:** Ask the agent (if already running):

Prompt: "What are your primary areas of expertise? List 3-7 specific skills or domains."

Then update with response.

### Workload Initialization

Existing agents default to `currentWorkload: 0`. To initialize based on active tasks:

```typescript
const activeTasks = tasks.filter((t) => t.assignedTo === agentId && t.status === 'in_progress')

await updateAgent(agentId, {
  currentWorkload: Math.min(activeTasks.length, 5)
})
```

## Code Examples

### Example 1: Creating Agent via Interview

```typescript
// User initiates interview
const interview = await startInterview(organizationId)

// Marcus conducts interview...
// (handled by interview workflow)

// At finalization:
const profile = await analyzeInterviewTranscript(transcript)
const agent = await createAgentFromProfile(profile, organizationId)

// Agent now has:
// - systemPrompt with organizational context
// - expertise from interview
// - team assignment from HR recommendation
// - currentWorkload: 0
```

### Example 2: Creating Agent via API

```typescript
const response = await fetch('/api/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: 'org-abc',
    teamId: 'team-dev',
    name: 'Jordan',
    role: 'Frontend Developer',
    systemPrompt: 'You are a frontend specialist with React expertise.',
    expertise: ['React', 'TypeScript', 'CSS', 'Accessibility'],
    currentWorkload: 0,
    seniorId: 'agent-alice'
  })
})

const agent = await response.json()
// agent.systemPrompt includes organizational context
```

### Example 3: Updating Agent Expertise

```typescript
await fetch(`/api/agents/${agentId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    expertise: ['Vue', 'Nuxt', 'TypeScript', 'Vitest']
  })
})
```

## Best Practices

### DO:

- Use HR interview workflow for proper team assignment
- Set 3-7 specific expertise areas
- Include custom personality in systemPrompt
- Let organizational context handle delegation logic
- Initialize currentWorkload to 0 for new agents

### DON'T:

- Manually duplicate organizational context in custom prompts
- Set generic expertise ("developer", "engineer")
- Start agents with high workload unless intentional
- Skip team assignment (required for hierarchy)
- Modify organizational context template without testing

## Troubleshooting

### Agent Created Without Org Context

**Symptom:** Agent doesn't have delegation framework in prompt

**Cause:** Created with old API before F074 integration

**Fix:** Re-run `buildSystemPrompt()` and update agent

### Expertise Not Working in Roster Queries

**Symptom:** `by_expertise` filter returns empty

**Cause:** Expertise field not set or misspelled

**Fix:** Verify expertise array has exact matches (case-sensitive)

### Workload Not Updating

**Symptom:** Workload stuck at 0 despite tasks assigned

**Cause:** Task assignment not using workload-tracking utility

**Fix:** Ensure code calls `incrementWorkload()` on assignment

## Related Documentation

- [Delegation Framework Guide](delegation.md)
- [Roster Tool Reference](../tools/roster.md)
- [API Reference](../api/tools.md)

## Developer Notes

### Implementation Files

- `app/server/utils/buildAgentPrompt.ts` - System prompt builder
- `app/server/services/interview/workflow.ts` - Interview integration
- `app/server/api/agents/index.post.ts` - Direct agent creation API
- `.specify/templates/organizational-context.md` - Context template

### Testing

See `tests/utils/buildAgentPrompt.spec.ts` for system prompt builder tests.
See `tests/integration/agent-creation-workflow.spec.ts` for end-to-end tests.
