# Roster Tool Reference

## Overview

The `get_organization_roster` tool provides agents with real-time information about their colleagues in the organization. This enables intelligent delegation decisions based on expertise, workload, and availability.

## Tool Definition

**Tool Name:** `get_organization_roster`

**Purpose:** Query organization members for delegation and collaboration

**Category:** Organizational Awareness

**MCP Integration:** Registered in MCP tool registry, executed via orchestrator

## Parameters

### `filter` (optional)

Filter type to apply to roster results.

**Type:** `'all' | 'my_team' | 'available' | 'by_expertise'`

**Default:** `'all'`

**Options:**

- `all`: Return all agents in organization
- `my_team`: Return only agents on same team as requester
- `available`: Return only agents with status `idle` or `active`
- `by_expertise`: Return agents with specific expertise (requires `expertise` parameter)

### `expertise` (optional, required if filter='by_expertise')

Expertise area to search for.

**Type:** `string`

**Example:** `"PostgreSQL"`, `"React"`, `"API Design"`

**Behavior:** Case-sensitive exact match against agent expertise arrays

## Response Format

### Success Response

```typescript
{
  agent_context: {
    id: string
    name: string
    role: string
    team: string
    current_workload: number       // 0-5
    workload_capacity: number      // Always 5
    expertise: string[]
    status: 'idle' | 'active' | 'busy' | 'offline'
  },
  colleagues: [
    {
      id: string
      name: string
      role: string
      team: string
      seniorId: string | null
      expertise: string[]
      status: 'idle' | 'active' | 'busy' | 'offline'
      current_workload: number     // 0-5
      workload_capacity: number    // Always 5
    }
  ]
}
```

### Field Descriptions

#### Agent Context (Your Info)

- `id`: Your agent ID
- `name`: Your display name
- `role`: Your role/title
- `team`: Your team name
- `current_workload`: Your current task count (0-5)
- `workload_capacity`: Maximum capacity (always 5)
- `expertise`: Your expertise areas
- `status`: Your current status

#### Colleagues (Other Agents)

- `id`: Colleague's agent ID
- `name`: Colleague's display name
- `role`: Colleague's role/title
- `team`: Colleague's team name
- `seniorId`: Colleague's manager/senior ID (null if none)
- `expertise`: Colleague's expertise areas
- `status`: Colleague's current status
- `current_workload`: Colleague's task count (0-5)
- `workload_capacity`: Maximum capacity (always 5)

### Status Values

| Status    | Workload | Meaning                             |
| --------- | -------- | ----------------------------------- |
| `idle`    | 0-2/5    | Low workload, readily available     |
| `active`  | 3/5      | Moderate workload, can accept tasks |
| `busy`    | 4-5/5    | Near/at capacity                    |
| `offline` | N/A      | Agent paused, unavailable           |

**Status Calculation:**

```typescript
if (agent.status === 'paused') return 'offline'
if (currentWorkload <= 2) return 'idle'
if (currentWorkload === 3) return 'active'
if (currentWorkload >= 4) return 'busy'
```

## Usage Examples

### Example 1: Query All Colleagues

Get full organizational roster.

**Request:**

```typescript
await callTool('get_organization_roster', {
  filter: 'all'
})
```

**Response:**

```json
{
  "agent_context": {
    "id": "agent-sarah",
    "name": "Sarah",
    "role": "Frontend Developer",
    "team": "Development",
    "current_workload": 3,
    "workload_capacity": 5,
    "expertise": ["React", "TypeScript", "CSS"],
    "status": "active"
  },
  "colleagues": [
    {
      "id": "agent-alex",
      "name": "Alex",
      "role": "Backend Developer",
      "team": "Development",
      "seniorId": "agent-alice",
      "expertise": ["Node.js", "PostgreSQL", "API Design"],
      "status": "idle",
      "current_workload": 1,
      "workload_capacity": 5
    },
    {
      "id": "agent-jordan",
      "name": "Jordan",
      "role": "DevOps Engineer",
      "team": "Infrastructure",
      "seniorId": "agent-sam",
      "expertise": ["Docker", "Kubernetes", "AWS"],
      "status": "busy",
      "current_workload": 5,
      "workload_capacity": 5
    }
  ]
}
```

### Example 2: Query Team Members

Get only colleagues on your team.

**Request:**

```typescript
await callTool('get_organization_roster', {
  filter: 'my_team'
})
```

**Response:**

```json
{
  "agent_context": {
    /* ... */
  },
  "colleagues": [
    {
      "id": "agent-alex",
      "name": "Alex",
      "role": "Backend Developer",
      "team": "Development",
      "status": "idle",
      "current_workload": 1,
      "workload_capacity": 5
    }
    // Only Development team members
  ]
}
```

### Example 3: Find Available Colleagues

Get colleagues who can accept new tasks (idle or active).

**Request:**

```typescript
await callTool('get_organization_roster', {
  filter: 'available'
})
```

**Response:**

```json
{
  "agent_context": {
    /* ... */
  },
  "colleagues": [
    {
      "id": "agent-alex",
      "name": "Alex",
      "role": "Backend Developer",
      "status": "idle",
      "current_workload": 1
    },
    {
      "id": "agent-taylor",
      "name": "Taylor",
      "role": "Designer",
      "status": "active",
      "current_workload": 3
    }
    // Only idle + active colleagues (excludes busy and offline)
  ]
}
```

### Example 4: Find Expert by Expertise

Find colleagues with specific expertise.

**Request:**

```typescript
await callTool('get_organization_roster', {
  filter: 'by_expertise',
  expertise: 'PostgreSQL'
})
```

**Response:**

```json
{
  "agent_context": {
    /* ... */
  },
  "colleagues": [
    {
      "id": "agent-alex",
      "name": "Alex",
      "role": "Backend Developer",
      "team": "Development",
      "expertise": ["Node.js", "PostgreSQL", "API Design"],
      "status": "idle",
      "current_workload": 1,
      "workload_capacity": 5
    },
    {
      "id": "agent-database-lead",
      "name": "Morgan",
      "role": "Database Lead",
      "team": "Infrastructure",
      "expertise": ["PostgreSQL", "MySQL", "Redis"],
      "status": "busy",
      "current_workload": 5,
      "workload_capacity": 5
    }
  ]
}
```

**Note:** Expertise match is case-sensitive and exact.

## Common Use Cases

### Use Case 1: Delegate Task Based on Expertise

**Scenario:** You need to delegate a PostgreSQL task

**Workflow:**

1. Query roster by expertise: `filter: 'by_expertise', expertise: 'PostgreSQL'`
2. Filter results by availability (`status !== 'offline'`)
3. Prefer same-team colleagues (`colleague.team === agent_context.team`)
4. Choose colleague with lowest workload
5. Make delegation decision

### Use Case 2: Check Team Capacity

**Scenario:** Understand team workload before accepting new project

**Workflow:**

1. Query team roster: `filter: 'my_team'`
2. Calculate average workload: `sum(workloads) / count`
3. Count available members: `filter(status === 'idle' or 'active')`
4. Determine if team has capacity

### Use Case 3: Find Cross-Team Expert

**Scenario:** Need expertise not available on your team

**Workflow:**

1. Query all colleagues: `filter: 'all'`
2. Filter by expertise manually (expertise array includes required skill)
3. Prefer colleagues with lower workload
4. Note cross-team delegation in decision log

### Use Case 4: Load Balance Across Peers

**Scenario:** Multiple suitable colleagues, want to balance workload

**Workflow:**

1. Query available colleagues: `filter: 'available'`
2. Filter by same role/level (peer delegation)
3. Sort by `current_workload` ascending
4. Delegate to colleague with lowest workload

## Expertise Matching

### How Expertise Matching Works

**Exact Match:** Query parameter must exactly match value in agent's expertise array

**Case Sensitive:** "postgresql" ≠ "PostgreSQL"

**Full Word:** "SQL" won't match "PostgreSQL"

### Expertise Best Practices

**Be Consistent:**

- Use standardized expertise terms across organization
- Example: Always "PostgreSQL", never "Postgres" or "pg"

**Use Tool/Framework Names:**

- ✅ "React", "Vue", "Angular"
- ❌ "Frontend frameworks"

**Combine with Manual Filtering:**

If exact match too restrictive, query `filter: 'all'` and manually check expertise arrays for partial matches.

### Example: Flexible Expertise Search

```typescript
// Query all
const response = await callTool('get_organization_roster', { filter: 'all' })

// Manually filter for related expertise
const databaseExperts = response.colleagues.filter((c) =>
  c.expertise.some((e) => e.includes('PostgreSQL') || e.includes('MySQL') || e.includes('Database'))
)
```

## Context Auto-Injection

### Agent ID and Organization ID

The orchestrator automatically injects context:

- `agentId`: Your agent ID
- `organizationId`: Your organization ID

**You don't need to provide these parameters.** They're added by the orchestrator.

### How It Works

**Your Call:**

```typescript
await callTool('get_organization_roster', {
  filter: 'my_team'
})
```

**Orchestrator Expands:**

```typescript
await executeTool('get_organization_roster', {
  agentId: 'agent-sarah', // Auto-injected
  organizationId: 'org-abc', // Auto-injected
  filter: 'my_team'
})
```

**Result:** Your identity and org are automatically known.

## Error Handling

### Empty Results

**Scenario:** Query returns empty colleagues array

**Meaning:** No colleagues match filter criteria

**Action:**

- Broaden filter (e.g., `'all'` instead of `'my_team'`)
- Check if expertise spelled correctly
- Escalate if no suitable colleague exists

### Agent Not Found

**Error:** "Agent not found"

**Cause:** Your agent ID not in organization

**Action:** Contact system administrator (data inconsistency)

### Organization Not Found

**Error:** "Organization not found"

**Cause:** Organization ID invalid

**Action:** Contact system administrator (data inconsistency)

## Performance Considerations

### Query Cost

- Roster queries are lightweight (in-memory data)
- No rate limiting currently
- OK to query multiple times per task

### Caching

- No client-side caching (data changes frequently)
- Query fresh data for each delegation decision
- Status and workload change often

### When to Query

**Query Before Each Delegation:**

- Status/workload may have changed since last query
- Fresh data ensures accurate decisions

**Don't Query Excessively:**

- If making multiple delegation decisions, query once and reuse results
- Avoid querying in tight loops

## Security & Isolation

### Organizational Boundaries

- Agents only see colleagues in THEIR organization
- No cross-organization visibility
- Enforced by orchestrator context injection

### Data Visibility

Agents can see:

- Colleague names, roles, teams
- Colleague expertise and workload
- Colleague status (idle/active/busy/offline)

Agents CANNOT see:

- Colleague task details
- Colleague conversation history
- Colleague system prompts
- Other organizations

## Integration with Delegation Framework

The roster tool is designed to work with the delegation framework:

**Step 1:** Agent identifies task requirements (expertise, urgency)

**Step 2:** Agent queries roster with appropriate filter

**Step 3:** Agent applies 5-priority decision framework to results

**Step 4:** Agent logs delegation decision

**Step 5:** Orchestrator routes task based on decision

See [Delegation Framework Guide](../agents/delegation.md) for full workflow.

## Testing

### Test Coverage

See `tests/services/tools/roster.spec.ts` for comprehensive tests:

- Agent context formatting
- Filter logic (all, my_team, available, by_expertise)
- Status calculation
- Empty roster handling
- Missing agent error handling

### Manual Testing

```bash
# Via API (if agent running)
curl -X POST http://localhost:3000/api/agent-engine/call-tool \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-sarah",
    "toolName": "get_organization_roster",
    "params": {
      "filter": "by_expertise",
      "expertise": "PostgreSQL"
    }
  }'
```

## Related Documentation

- [Agent Creation Guide](../agents/creation.md)
- [Delegation Framework Guide](../agents/delegation.md)
- [API Reference](../api/tools.md)

## Developer Notes

### Implementation Files

- `app/server/services/tools/roster.ts` - Core roster logic
- `app/server/services/tools/roster-executor.ts` - Orchestrator adapter
- `app/server/services/mcp/register-tools.ts` - MCP registration
- `tests/services/tools/roster.spec.ts` - Unit tests
- `tests/services/orchestrator-roster.spec.ts` - Integration tests

### Key Functions

```typescript
getRosterTool(): ToolDefinition
calculateStatus(agent: Agent): string
formatAgentContext(agent: Agent, teamName: string): AgentContext
formatColleague(agent: Agent, teamName: string): ColleagueInfo
filterAgents(agents: Agent[], filter: string, params: RosterParams): Agent[]
```

### Constants

```typescript
MAX_WORKLOAD_CAPACITY = 5
SOFT_LIMIT_THRESHOLD = 4
```
