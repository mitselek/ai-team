# Tools API Reference

## Overview

This document covers the API-level tool definitions, type updates, and behavior for the F074 Agent Roster & Organizational Awareness feature.

## Tool Definitions

### get_organization_roster

Provides agents with real-time roster information for delegation decisions.

**Registration:** MCP tool registry (`app/server/services/mcp/register-tools.ts`)

**Executor:** Orchestrator-level (`app/server/services/tools/roster-executor.ts`)

**Input Schema:**

```typescript
{
  type: 'object',
  properties: {
    agentId: {
      type: 'string',
      description: 'Agent making the request (auto-injected by orchestrator)'
    },
    organizationId: {
      type: 'string',
      description: 'Organization ID (auto-injected by orchestrator)'
    },
    filter: {
      type: 'string',
      enum: ['all', 'my_team', 'available', 'by_expertise'],
      description: 'Filter type for roster results'
    },
    expertise: {
      type: 'string',
      description: 'Expertise area to filter by (required if filter=by_expertise)'
    }
  },
  required: ['agentId', 'organizationId']
}
```

**Output Schema:**

```typescript
{
  type: 'object',
  properties: {
    agent_context: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        role: { type: 'string' },
        team: { type: 'string' },
        current_workload: { type: 'number' },
        workload_capacity: { type: 'number' },
        expertise: { type: 'array', items: { type: 'string' } },
        status: { type: 'string', enum: ['idle', 'active', 'busy', 'offline'] }
      }
    },
    colleagues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          team: { type: 'string' },
          seniorId: { type: ['string', 'null'] },
          expertise: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['idle', 'active', 'busy', 'offline'] },
          current_workload: { type: 'number' },
          workload_capacity: { type: 'number' }
        }
      }
    }
  }
}
```

**Example Call:**

```typescript
const result = await callTool('get_organization_roster', {
  filter: 'by_expertise',
  expertise: 'PostgreSQL'
})
```

## Type Updates

### Agent Type

**Location:** `types/index.ts`

**Added Fields:**

```typescript
export interface Agent {
  // ... existing fields ...

  /**
   * Current workload (task count)
   * Range: 0-5
   * Default: 0
   * @since F074
   */
  currentWorkload?: number

  /**
   * Expertise areas (skills, tools, domains)
   * Used for delegation matching
   * Example: ['TypeScript', 'React', 'API Design']
   * @since F074
   */
  expertise?: string[]
}
```

**Backward Compatibility:**

Both fields are optional. Existing agents without these fields:

- `currentWorkload` defaults to 0
- `expertise` defaults to empty array `[]`

**Type Safety:**

```typescript
// Safe access
const workload = agent.currentWorkload ?? 0
const expertise = agent.expertise ?? []
```

## Workload Tracking Behavior

### Automatic Tracking

Workload is automatically managed by the system.

**Increment (+1):** When task assigned to agent

**Decrement (-1):** When task completed or cancelled

**Capacity:** Hard cap at 5 (maximum), floor at 0 (minimum)

### Workload Tracking API

**Location:** `app/server/services/workload-tracking.ts`

**Functions:**

#### incrementWorkload

```typescript
function incrementWorkload(agent: Agent, taskId?: string): number
```

**Behavior:**

- Adds 1 to `agent.currentWorkload`
- Caps at `MAX_WORKLOAD_CAPACITY` (5)
- Logs warning if at/near capacity
- Returns new workload value

**Example:**

```typescript
import { incrementWorkload } from '~/server/services/workload-tracking'

const newWorkload = incrementWorkload(agent, 'task-123')
// agent.currentWorkload updated from 2 to 3
```

#### decrementWorkload

```typescript
function decrementWorkload(agent: Agent, taskId?: string): number
```

**Behavior:**

- Subtracts 1 from `agent.currentWorkload`
- Floors at 0 (minimum)
- Logs warning if already at 0
- Returns new workload value

**Example:**

```typescript
import { decrementWorkload } from '~/server/services/workload-tracking'

const newWorkload = decrementWorkload(agent, 'task-123')
// agent.currentWorkload updated from 3 to 2
```

#### calculateStatusFromWorkload

```typescript
function calculateStatusFromWorkload(currentWorkload: number, agentStatus: Agent['status']): string
```

**Behavior:**

- Returns 'offline' if `agentStatus === 'paused'`
- Returns 'idle' if `currentWorkload <= 2`
- Returns 'active' if `currentWorkload === 3`
- Returns 'busy' if `currentWorkload >= 4`

**Example:**

```typescript
const status = calculateStatusFromWorkload(3, 'active')
// Returns: 'active'

const status = calculateStatusFromWorkload(5, 'active')
// Returns: 'busy'

const status = calculateStatusFromWorkload(2, 'paused')
// Returns: 'offline'
```

#### isNearCapacity

```typescript
function isNearCapacity(agent: Agent): boolean
```

**Returns:** `true` if `currentWorkload >= SOFT_LIMIT_THRESHOLD` (4)

**Use:** Check if agent approaching capacity

#### isAtCapacity

```typescript
function isAtCapacity(agent: Agent): boolean
```

**Returns:** `true` if `currentWorkload >= MAX_WORKLOAD_CAPACITY` (5)

**Use:** Check if agent at maximum capacity

### Constants

```typescript
export const MAX_WORKLOAD_CAPACITY = 5
export const SOFT_LIMIT_THRESHOLD = 4
```

### Integration Points

**Task Assignment (Processor):**

```typescript
// app/server/services/agent-engine/processor.ts (line ~239)
incrementWorkload(agent, taskId)
```

**Task Completion (Processor):**

```typescript
// app/server/services/agent-engine/processor.ts (line ~377)
decrementWorkload(agent, taskId)
```

**Task API (PATCH Endpoint):**

```typescript
// app/server/api/tasks/[id].patch.ts
if (assignedTo changed) {
  decrementWorkload(oldAgent, taskId)
  incrementWorkload(newAgent, taskId)
}

if (status === 'completed' || status === 'cancelled') {
  decrementWorkload(agent, taskId)
}
```

## Status Calculation Logic

### Status Values

| Status    | Condition         | Workload Range |
| --------- | ----------------- | -------------- |
| `idle`    | Low workload      | 0-2/5          |
| `active`  | Moderate workload | 3/5            |
| `busy`    | High workload     | 4-5/5          |
| `offline` | Agent paused      | N/A            |

### Calculation Function

```typescript
function calculateStatus(agent: Agent): string {
  if (agent.status === 'paused') {
    return 'offline'
  }

  const workload = agent.currentWorkload ?? 0

  if (workload <= 2) return 'idle'
  if (workload === 3) return 'active'
  if (workload >= 4) return 'busy'

  return 'idle' // Fallback
}
```

### Usage

Status is calculated dynamically in roster tool results. It's NOT stored in database.

**Why Not Store Status?**

- Status changes frequently (every task assignment/completion)
- Derived from workload + agent.status (single source of truth)
- Real-time calculation ensures accuracy

## Agent Creation API Updates

### POST /api/agents

**Endpoint:** Create new agent

**Request Body Updates:**

```typescript
{
  // ... existing fields ...

  currentWorkload?: number   // Optional, defaults to 0
  expertise?: string[]       // Optional, defaults to []
}
```

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org-abc",
    "teamId": "team-dev",
    "name": "Sarah",
    "role": "Backend Developer",
    "systemPrompt": "You are a backend developer.",
    "currentWorkload": 0,
    "expertise": ["Node.js", "PostgreSQL", "API Design"]
  }'
```

**Response:**

```json
{
  "id": "agent-sarah",
  "organizationId": "org-abc",
  "teamId": "team-dev",
  "name": "Sarah",
  "role": "Backend Developer",
  "systemPrompt": "You are a backend developer.\n\n[...organizational context...]",
  "status": "active",
  "currentWorkload": 0,
  "expertise": ["Node.js", "PostgreSQL", "API Design"],
  "createdAt": "2025-11-18T10:00:00Z"
}
```

**Note:** `systemPrompt` in response includes organizational context appended by `buildSystemPrompt()`.

### PATCH /api/agents/:id

**Endpoint:** Update existing agent

**Updatable Fields:**

```typescript
{
  currentWorkload?: number
  expertise?: string[]
  // ... other existing fields ...
}
```

**Example Request:**

```bash
curl -X PATCH http://localhost:3000/api/agents/agent-sarah \
  -H "Content-Type: application/json" \
  -d '{
    "expertise": ["Node.js", "PostgreSQL", "GraphQL", "Redis"]
  }'
```

## System Prompt Builder

### buildSystemPrompt Utility

**Location:** `app/server/utils/buildAgentPrompt.ts`

**Function:**

```typescript
async function buildSystemPrompt(agent: Agent, customPrompt: string): Promise<string>
```

**Parameters:**

- `agent`: Agent object (needs: name, role, teamId, seniorId, currentWorkload, expertise)
- `customPrompt`: Agent's custom system prompt (personality, role instructions)

**Returns:** Complete system prompt (custom + organizational context)

**Process:**

1. Load organizational context template (`.specify/templates/organizational-context.md`)
2. Lookup team name from `agent.teamId`
3. Lookup senior name from `agent.seniorId` (optional)
4. Format expertise list
5. Replace template variables:
   - `{agent_name}` → agent.name
   - `{agent_role}` → agent.role
   - `{agent_team}` → team.name
   - `{senior_name}` → senior.name or "None"
   - `{senior_id}` → agent.seniorId or ""
   - `{current_workload}` → agent.currentWorkload ?? 0
   - `{expertise_list}` → agent.expertise.join(', ') or "Not specified"
6. Merge: `customPrompt + "\n\n" + filledTemplate`

**Example Usage:**

```typescript
import { buildSystemPrompt } from '~/server/utils/buildAgentPrompt'

const agent = {
  id: 'agent-sarah',
  name: 'Sarah',
  role: 'Backend Developer',
  teamId: 'team-dev',
  seniorId: 'agent-alice',
  currentWorkload: 0,
  expertise: ['Node.js', 'PostgreSQL']
}

const customPrompt = 'You are a backend developer specializing in APIs.'
const fullPrompt = await buildSystemPrompt(agent, customPrompt)

// fullPrompt = custom + organizational context with variables filled
```

**Integration Points:**

- **Interview Workflow:** `app/server/services/interview/workflow.ts`
  - Calls `buildSystemPrompt()` when creating agent from interview
- **Agent API:** `app/server/api/agents/index.post.ts`
  - Calls `buildSystemPrompt()` when creating agent via API

## Testing

### Test Files

**Roster Tool:**

- `tests/services/tools/roster.spec.ts` (18 tests)
- `tests/services/orchestrator-roster.spec.ts` (14 tests)

**Workload Tracking:**

- `tests/services/workload-tracking.spec.ts` (15 tests)

**System Prompt Builder:**

- `tests/utils/buildAgentPrompt.spec.ts` (16 tests)

**Agent Creation:**

- `tests/integration/agent-creation-workflow.spec.ts` (14 tests)

**Delegation Scenarios:**

- `tests/services/agent-delegation.spec.ts` (17 tests)

**Edge Cases:**

- `tests/services/roster-edge-cases.spec.ts` (18 tests)

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test tests/services/tools/roster.spec.ts

# Workload tracking tests
npm test tests/services/workload-tracking.spec.ts

# System prompt tests
npm test tests/utils/buildAgentPrompt.spec.ts
```

## Migration Notes

### Updating Existing Agents

For agents created before F074:

**Add Organizational Context:**

```typescript
import { buildSystemPrompt } from '~/server/utils/buildAgentPrompt'

const agent = await getAgent(agentId)
const enhancedPrompt = await buildSystemPrompt(agent, agent.systemPrompt)

await updateAgent(agentId, {
  systemPrompt: enhancedPrompt
})
```

**Initialize Workload:**

```typescript
const activeTasks = tasks.filter((t) => t.assignedTo === agentId && t.status === 'in_progress')

await updateAgent(agentId, {
  currentWorkload: Math.min(activeTasks.length, 5)
})
```

**Add Expertise:**

Review agent's role and manually set expertise:

```typescript
await updateAgent(agentId, {
  expertise: ['Python', 'Machine Learning', 'TensorFlow']
})
```

## Security Considerations

### Organizational Isolation

- Agents only access roster within THEIR organization
- `organizationId` auto-injected by orchestrator
- No cross-organization visibility

### Data Visibility

Agents can see:

- Colleague names, roles, teams
- Colleague expertise and workload
- Colleague availability status

Agents CANNOT see:

- Colleague task details
- Colleague conversation logs
- Colleague system prompts
- Other organizations

### Capacity Enforcement

- Workload caps at 5 (maximum)
- Agents can self-regulate but orchestrator has final say
- Capacity warnings logged for monitoring

## Performance Notes

### Roster Queries

- In-memory lookup (agents + teams data)
- O(n) filtering where n = number of agents in org
- Typically fast (<10ms) for organizations <100 agents

### Workload Updates

- Direct field update (no complex calculation)
- Happens on task assignment/completion
- Minimal overhead

### Status Calculation

- Derived on-the-fly (not stored)
- Simple conditional logic
- No database writes for status changes

## Error Handling

### Agent Not Found

**Error:** "Agent not found"

**HTTP Status:** 404

**Cause:** Agent ID doesn't exist in organization

**Action:** Verify agent ID, check organizational isolation

### Team Not Found

**Error:** "Team {teamId} not found"

**HTTP Status:** 500

**Cause:** Agent's teamId invalid (data inconsistency)

**Action:** Fix agent's teamId or create team

### Organization Not Found

**Error:** "Organization not found"

**HTTP Status:** 404

**Cause:** Organization ID invalid

**Action:** Verify organization ID

## Related Documentation

- [Agent Creation Guide](../agents/creation.md)
- [Delegation Framework Guide](../agents/delegation.md)
- [Roster Tool Reference](../tools/roster.md)

## Developer References

### Key Files

- `types/index.ts` - Agent type definition
- `app/server/services/tools/roster.ts` - Roster tool logic
- `app/server/services/workload-tracking.ts` - Workload management
- `app/server/utils/buildAgentPrompt.ts` - System prompt builder
- `app/server/services/mcp/register-tools.ts` - Tool registration
- `.specify/templates/organizational-context.md` - Context template

### Constants

```typescript
// Workload
MAX_WORKLOAD_CAPACITY = 5
SOFT_LIMIT_THRESHOLD = 4

// Status values
;'idle' | 'active' | 'busy' | 'offline'
```
