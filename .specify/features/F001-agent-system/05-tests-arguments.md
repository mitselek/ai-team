# F002 Agent System - Test Requirements

## Specific Requirements

**Test Coverage**:

### GET /api/agents tests (6 tests)

1. Empty state - Should return empty array when no agents exist
2. With agents - Should return all agents when some exist
3. Filter by organizationId - Should filter agents by organizationId
4. Filter by teamId - Should filter agents by teamId
5. Filter by status - Should filter agents by status
6. Multiple filters - Should filter by organizationId AND status together

### POST /api/agents tests (8 tests)

1. Valid agent - Should create agent with all required fields
2. Missing name - Should return 400 when name is missing
3. Missing role - Should return 400 when role is missing
4. Missing organizationId - Should return 400 when organizationId is missing
5. Missing teamId - Should return 400 when teamId is missing
6. Missing systemPrompt - Should return 400 when systemPrompt is missing
7. Optional fields - Should use defaults for seniorId (null) and tokenAllocation (10000)
8. Auto-generated fields - Should set tokenUsed=0, status='active', createdAt, lastActiveAt

## Type Definition

Use this EXACT Agent interface (all 12 fields required):

```typescript
export interface Agent {
  id: string;
  name: string;
  role: string;
  seniorId: string | null;
  teamId: string;
  organizationId: string;
  systemPrompt: string;
  tokenAllocation: number;
  tokenUsed: number;
  status: AgentStatus;
  createdAt: Date;
  lastActiveAt: Date;
}

export type AgentStatus = "active" | "bored" | "stuck" | "paused";
```

## Reference Files

Follow patterns from:

- `tests/api/organizations.spec.ts` - API testing structure
- `tests/services/orchestrator.spec.ts` - Logger mocking and data cleanup

## Test Data Example

Every test agent object must have ALL 12 fields:

```typescript
const testAgent: Agent = {
  id: "agent-1",
  name: "Test Agent",
  role: "worker",
  seniorId: null,
  teamId: "team-1",
  organizationId: "org-1",
  systemPrompt: "You are a test agent",
  tokenAllocation: 10000,
  tokenUsed: 0,
  status: "active",
  createdAt: new Date(),
  lastActiveAt: new Date(),
};
```

## Implementation Notes

- Import API handlers directly: `import GET from '../../server/api/agents/index.get'`
- Test handlers directly (not via HTTP requests)
- Mock H3 functions for POST tests (readBody, setResponseStatus)
- Clear agents array in beforeEach: `agents.length = 0`
- Expected file size: ~150-200 lines
- All tests must pass with `npm test`
