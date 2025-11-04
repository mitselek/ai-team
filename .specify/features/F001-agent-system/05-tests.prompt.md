# Development Task: Agent System Tests

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration.

## Your Task

Create comprehensive tests for the Agent System API endpoints, following the exact pattern from `tests/api/organizations.spec.ts`.

## Critical Constraints

### DO NOT MODIFY
- **types/index.ts** - Use Agent interface EXACTLY as defined with ALL 12 fields
- **server/api/agents/** - API endpoints are already implemented, just test them
- **server/data/agents.ts** - Data store is already implemented

### MUST USE
- **Relative imports only** - No `~` aliases
  - API handlers: `import { /* handler name */ } from '../../server/api/agents/index.get'`
  - Data: `import { agents } from '../../server/data/agents'`
  - Types: `import type { Agent } from '../../types'`
- **Vitest** - describe, it, expect, beforeEach, afterEach
- **Mock logger** - Add `vi.mock('../../server/utils/logger')` at top to avoid stream.write errors
- **Clean state** - Use beforeEach to reset agents array
- **All Agent fields** - Test objects must include all 12 required fields

## Type Definition to Use

```typescript
export interface Agent {
  id: string
  name: string
  role: string
  seniorId: string | null
  teamId: string
  organizationId: string
  systemPrompt: string
  tokenAllocation: number
  tokenUsed: number
  status: AgentStatus
  createdAt: Date
  lastActiveAt: Date
}

export type AgentStatus = 'active' | 'bored' | 'stuck' | 'paused'
```

## Reference Files

Follow this pattern EXACTLY:
- `tests/api/organizations.spec.ts` - Copy structure, mocking, and test style
- `tests/services/orchestrator.spec.ts` - Shows how to mock logger and reset data

## Expected Output

Create ONLY: `tests/api/agents.spec.ts`

Required test suite structure:

### GET /api/agents tests
1. **Empty state** - Should return empty array when no agents exist
2. **With agents** - Should return all agents when some exist
3. **Filter by organizationId** - Should filter agents by organizationId
4. **Filter by teamId** - Should filter agents by teamId
5. **Filter by status** - Should filter agents by status
6. **Multiple filters** - Should filter by organizationId AND status together

### POST /api/agents tests
1. **Valid agent** - Should create agent with all required fields
2. **Missing name** - Should return 400 when name is missing
3. **Missing role** - Should return 400 when role is missing
4. **Missing organizationId** - Should return 400 when organizationId is missing
5. **Missing teamId** - Should return 400 when teamId is missing
6. **Missing systemPrompt** - Should return 400 when systemPrompt is missing
7. **Optional fields** - Should use defaults for seniorId (null) and tokenAllocation (10000)
8. **Auto-generated fields** - Should set tokenUsed=0, status='active', dates

## Implementation Details

**Logger Mock** (at top of file):
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  }),
  newCorrelationId: () => 'test-correlation-id'
}))
```

**beforeEach setup**:
```typescript
beforeEach(() => {
  // Clear agents array before each test
  agents.length = 0
})
```

**Sample test agent object** (with ALL 12 fields):
```typescript
const testAgent: Agent = {
  id: 'agent-1',
  name: 'Test Agent',
  role: 'worker',
  seniorId: null,
  teamId: 'team-1',
  organizationId: 'org-1',
  systemPrompt: 'You are a test agent',
  tokenAllocation: 10000,
  tokenUsed: 0,
  status: 'active',
  createdAt: new Date(),
  lastActiveAt: new Date()
}
```

**Testing GET endpoint**:
```typescript
// Import the handler
import GET from '../../server/api/agents/index.get'

// Call directly (not via HTTP)
const result = GET(mockEvent)
expect(result).toEqual([/* expected agents */])
```

**Testing POST endpoint**:
```typescript
// Import the handler
import POST from '../../server/api/agents/index.post'

// Mock event with body
const mockEvent = {
  node: {
    req: {},
    res: {}
  }
} as any

// Mock readBody
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn(() => Promise.resolve({
      name: 'Test Agent',
      role: 'worker',
      // ... other fields
    }))
  }
})

const result = await POST(mockEvent)
expect(result.name).toBe('Test Agent')
expect(agents.length).toBe(1)
```

## Validation Checklist

Before finishing, verify:
- [ ] File created at `tests/api/agents.spec.ts`
- [ ] All imports use relative paths (../../)
- [ ] Type imports use `import type { }` syntax
- [ ] Logger is mocked with vi.mock at top of file
- [ ] beforeEach clears agents array
- [ ] All test agent objects have 12 required fields
- [ ] At least 6 GET tests (empty, with data, 3 filters, combined)
- [ ] At least 8 POST tests (success + 5 validation errors + defaults + auto-generated)
- [ ] Follows pattern from organizations.spec.ts
- [ ] No console.log or console.error (use mocked logger)

## Success Criteria

- File created at exact path: `tests/api/agents.spec.ts`
- All tests passing when run with `npm test`
- No type errors
- Comprehensive coverage of GET and POST endpoints
- ~150-200 lines total
- TypeScript strict mode compatible

## Notes

- Focus on API endpoint testing, not composable testing (that's separate)
- Test the actual API handlers directly, not via HTTP requests
- Use the organizations tests as your template - copy that style
- Remember to mock H3 functions (readBody, setResponseStatus) for POST tests
- Every agent object must have ALL 12 fields from the Agent interface
- Don't test implementation details, test behavior (inputs → outputs)

## Common Pitfalls to Avoid

- ❌ Don't forget to mock the logger (causes stream.write errors)
- ❌ Don't forget to clear agents array in beforeEach
- ❌ Don't skip fields in test agent objects (missing fields = type errors)
- ❌ Don't import with ~ aliases (use relative paths)
- ❌ Don't test internal logic (test public API behavior only)
