# Test Generation Prompt for Gemini CLI

You are working on the "AI Team" project - a Nuxt 3 application with Vitest for testing.

## User Input

$ARGUMENTS

## Your Task

Generate comprehensive tests for the specified files/functionality based on the user input above.

## Critical Constraints

### DO NOT MODIFY
- **types/index.ts** - Use type definitions EXACTLY as defined
- **Implementation files** - You are testing existing code, not modifying it
- **Test setup files** - Do not modify tests/setup.ts

### MUST USE
- **Relative imports only** - No `~` aliases. Use `../../` paths
- **Type-only imports** - For types/interfaces use `import type { ... }`
- **Vitest** - Use describe, it, expect, beforeEach, afterEach, vi
- **Mock logger** - Always mock logger to avoid stream.write errors
- **Clean state** - Reset data arrays in beforeEach
- **All required fields** - Test objects must include ALL fields from type definitions

## Test Framework Setup

### Logger Mocking (REQUIRED)

Always add this at the top of test files:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the logger to avoid stream.write errors
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

### Data Cleanup (REQUIRED)

Always reset data arrays before each test:

```typescript
import { agents } from '../../server/data/agents' // or relevant data store

beforeEach(() => {
  // Clear data before each test
  agents.length = 0
})
```

## Error Handling in Tests

**API endpoints that return errors** (not throw):
- Handlers use `setResponseStatus(event, 400)` and `return { error: 'message' }`
- Tests should check the return value, NOT expect rejection:

```typescript
const result = await POST(mockEvent)
expect(result.error).toBeDefined()
expect(result.error).toContain('Missing required fields')
expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
```

**API endpoints that throw errors**:
```typescript
await expect(handler(mockEvent)).rejects.toThrow('Expected error')
```

## Test Types

### API Endpoint Tests (server/api/)

**Test Structure**:
1. Import the handler directly (not via HTTP)
2. Mock H3 functions if needed (readBody, setResponseStatus, getQuery)
3. Test success cases
4. Test validation errors (400 status)
5. Test server errors (500 status)
6. Test filtering/query parameters

**Error Handling Pattern**:
API handlers return error objects, they do NOT throw/reject. Test like this:

```typescript
// ❌ WRONG - Don't expect rejection
await expect(POST(mockEvent)).rejects.toThrow()

// ✅ CORRECT - Check return value
const result = await POST(mockEvent)
expect(result.error).toBeDefined()
expect(result.error).toContain('Missing required fields')
expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
```

**Example**:
```typescript
import GET from '../../server/api/resource/index.get'
import POST from '../../server/api/resource/index.post'
import { resources } from '../../server/data/resources'
import { setResponseStatus, readBody } from 'h3'

vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn(),
    setResponseStatus: vi.fn()
  }
})

describe('GET /api/resource', () => {
  it('should return empty array when no data exists', () => {
    const result = GET(mockEvent)
    expect(result).toEqual([])
  })

  it('should return all items', () => {
    resources.push(testItem1, testItem2)
    const result = GET(mockEvent)
    expect(result.length).toBe(2)
  })
})

describe('POST /api/resource', () => {
  it('should return 400 when name is missing', async () => {
    vi.mocked(readBody).mockResolvedValue({ /* missing name */ })
    const result = await POST(mockEvent)
    expect(result.error).toBeDefined()
    expect(result.error).toContain('name')
    expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
  })
})
```

### Composable Tests (app/composables/)

**Test Structure**:
1. Test CRUD operations
2. Test state management (useState)
3. Test error handling
4. Test filters/queries
5. Verify data persistence in state

**Example**:
```typescript
import { useResource } from '../../app/composables/useResource'

describe('useResource', () => {
  it('should create a resource', () => {
    const { createResource, resources } = useResource()
    const newResource = createResource('name', 'value')
    expect(newResource).toBeDefined()
    expect(resources.value.length).toBe(1)
  })
})
```

### Service Tests (server/services/)

**Test Structure**:
1. Test core business logic
2. Test edge cases
3. Test error conditions
4. Verify side effects (logging, data updates)
5. Test integration between functions

**Example**:
```typescript
import { someFunction } from '../../server/services/myservice'

describe('someFunction', () => {
  it('should process data correctly', () => {
    const result = someFunction(input)
    expect(result).toEqual(expectedOutput)
  })
})
```

## Test Coverage Guidelines

### Minimum Coverage
- **Success cases** - At least 1 happy path test per function/endpoint
- **Error cases** - Test all validation errors
- **Edge cases** - Empty data, null values, boundary conditions
- **All code paths** - Every if/else branch should be tested

### API Endpoints
- GET: Empty state, with data, all filters, combined filters
- POST: Valid creation, all required field validations, optional fields, defaults
- PATCH/PUT: Valid update, validation errors, not found
- DELETE: Successful delete, not found

### Composables
- Create, Read, Update, Delete operations
- Filter/query functions
- State updates
- Error handling

## Type-Safe Test Data

Always create test objects with ALL required fields:

```typescript
import type { Agent } from '../../types'

const testAgent: Agent = {
  id: 'test-id',
  name: 'Test Agent',
  role: 'worker',
  seniorId: null,
  teamId: 'team-1',
  organizationId: 'org-1',
  systemPrompt: 'Test prompt',
  tokenAllocation: 10000,
  tokenUsed: 0,
  status: 'active',
  createdAt: new Date(),
  lastActiveAt: new Date()
}
```

## Running Tests

Tests are executed with Vitest in run mode (non-interactive):

```bash
# Run all tests (no watch mode, no user input)
npm test

# Run specific test file
npm test -- tests/api/agents.spec.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode (for development only)
npm test -- --watch
```

**CRITICAL - Test Execution**: 
- **ALWAYS run tests after generation** to verify they work: `npm test`
- The `npm test` script uses `vitest run` which is **non-interactive** (no user input required)
- **NEVER use watch mode**: Don't run `npm test -- --watch` or `vitest` without `run`
- Tests should complete automatically without prompts
- If tests fail, fix the issues and run again until all pass

## Validation Checklist

Before finishing, verify:
- [ ] File created at correct path (tests/api/, tests/composables/, tests/services/)
- [ ] All imports use relative paths (../../)
- [ ] Type imports use `import type { }` syntax
- [ ] Logger is mocked with vi.mock at top of file
- [ ] beforeEach clears relevant data arrays
- [ ] All test data objects have ALL required fields from type definitions
- [ ] Tests cover success, error, and edge cases
- [ ] No console.log or console.error (use mocked logger)
- [ ] Tests can run with `npm test` (no user input required)
- [ ] TypeScript strict mode compatible

## Success Criteria

- Tests pass when run with `npm test`
- No type errors
- Comprehensive coverage (success + errors + edge cases)
- Follows patterns from existing tests (tests/api/organizations.spec.ts, tests/services/orchestrator.spec.ts)
- No interactive prompts or watch mode
- Clean, readable test descriptions

## Common Pitfalls to Avoid

- ❌ Don't forget to mock the logger (causes stream.write errors)
- ❌ Don't forget to clear data arrays in beforeEach
- ❌ Don't skip fields in test objects (missing fields = type errors)
- ❌ Don't import with ~ aliases (use relative paths)
- ❌ Don't use interactive test modes (use vitest run)
- ❌ Don't test implementation details (test behavior, not internals)
- ❌ Don't duplicate test setup (use beforeEach)
- ❌ Don't write flaky tests (avoid timing issues, random data)
- ❌ Don't expect API handlers to throw/reject (they return error objects)
- ❌ Don't use interactive test modes (always use `npm test` not `npm test -- --watch`)

## Reference Files

Look at these existing tests for patterns:
- `tests/api/organizations.spec.ts` - API endpoint testing pattern
- `tests/services/orchestrator.spec.ts` - Service testing with mocks
- `tests/setup.ts` - Global test configuration

## Notes

- Tests should be deterministic (same input → same output)
- Use descriptive test names: "should do X when Y"
- Group related tests in describe blocks
- Keep tests isolated (no dependencies between tests)
- Mock external dependencies (logger, HTTP calls, file system)
- Test one thing per test (single assertion focus)

## Output Formatting (MANDATORY)

When describing what you are doing, and when printing any logs or reasoning, follow these rules:

- Each step on its own line; add a blank line between unrelated steps
- Prefer bullet lists for multi-part outputs
- Use fenced code blocks for any code or commands, one command per line
  ```bash
  npm test
  npm test -- --coverage
  ```
- Keep lines under ~100 characters and wrap as needed
- Use a simple structure:
  - Action: <what is being done>
  - Result: <what happened>
  - Next: <what you will do next>
- Avoid run-on sentences without spaces or newlines
