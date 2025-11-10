# F007 Agent Execution Engine - Phase 2: API & Dashboard Integration

## Context

Phase 1 (commit 83a06d4) implemented the backend agent execution engine with autonomous polling loops, LLM-based task processing, delegation, and budget management. Phase 2 adds API endpoints and dashboard controls to start/stop agent loops.

## Constitution Compliance

- **Type Safety**: All TypeScript types properly defined
- **Relative Imports**: Use `../../../` paths, no `~` aliases
- **Structured Logging**: Use `createLogger()` from `server/utils/logger.ts`
- **Error Handling**: Try/catch with proper error types
- **No Emojis**: Professional code comments only
- **Testing**: Write comprehensive tests with proper mocks

## Phase 2 Requirements

### 1. Fix Test Mocks (Priority 1)

**Problem:** 5 tests failing due to logger mocking issues.

**Tasks:**

- Fix `tests/services/agent-engine/delegation.spec.ts`: Mock logger properly
- Fix `tests/services/agent-engine/processor.spec.ts`: Mock logger and LLM service
- Fix `tests/services/agent-engine/manager.spec.ts`: Mock logger and agents array
- All 7 tests should pass ✅

**Logger Mock Pattern:**

```typescript
vi.mock('../../../server/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  }))
}))
```

### 2. API Endpoints (Priority 2)

Create 2 new API endpoints in `server/api/agents/`:

**File: `server/api/agents/[id]/start.post.ts`**

```typescript
// POST /api/agents/:id/start
// Starts agent execution loop
// Returns: { success: boolean, message: string }
```

**File: `server/api/agents/[id]/stop.post.ts`**

```typescript
// POST /api/agents/:id/stop
// Stops agent execution loop
// Returns: { success: boolean, message: string }
```

**Implementation:**

- Use `start()` and `stop()` from `server/services/agent-engine/manager.ts`
- Validate agent exists (return 404 if not)
- Return appropriate status codes (200, 404, 500)
- Add structured logging for all operations

### 3. Dashboard Integration (Priority 3)

Update `app/pages/index.vue` to add agent controls:

**Add per-agent:**

- Start button (green) - only show if status is 'paused'
- Stop button (red) - only show if status is 'active'
- Disable buttons while request is in-flight
- Show success/error toast notifications

**UI Enhancement:**

```vue
<!-- For each agent card -->
<div class="flex gap-2">
  <button
    v-if="agent.status === 'paused'"
    @click="startAgent(agent.id)"
    :disabled="isLoading"
    class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded"
  >
    Start Loop
  </button>
  <button
    v-if="agent.status === 'active'"
    @click="stopAgent(agent.id)"
    :disabled="isLoading"
    class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
  >
    Stop Loop
  </button>
</div>
```

**Methods:**

```typescript
async function startAgent(agentId: string) {
  isLoading.value = true
  try {
    await $fetch(`/api/agents/${agentId}/start`, { method: 'POST' })
    // Show success toast
    // Refresh agents data
  } catch (error) {
    // Show error toast
  } finally {
    isLoading.value = false
  }
}
```

### 4. Integration Tests (Priority 4)

Create `tests/api/agent-engine.spec.ts`:

**Test Cases:**

- POST /api/agents/:id/start - success (agent paused → active)
- POST /api/agents/:id/start - already running (idempotent)
- POST /api/agents/:id/stop - success (agent active → paused)
- POST /api/agents/:id/stop - not running (idempotent)
- POST /api/agents/invalid-id/start - 404 error
- POST /api/agents/invalid-id/stop - 404 error

## Implementation Order

1. **Fix test mocks** - Get existing tests passing ✅
2. **Create API endpoints** - Backend functionality complete ✅
3. **Test API endpoints** - Verify API works correctly ✅
4. **Dashboard integration** - Add UI controls ✅
5. **Manual testing** - Start dev server, test in browser ✅

## Acceptance Criteria

- [ ] All 7 agent-engine tests passing (no logger mock errors)
- [ ] 2 API endpoints created (start, stop)
- [ ] 6 API integration tests passing
- [ ] Dashboard has start/stop buttons per agent
- [ ] Buttons correctly shown/hidden based on agent status
- [ ] Toast notifications for success/error
- [ ] TypeScript check passes: `npm run typecheck`
- [ ] ESLint passes: `npm run lint`
- [ ] All tests pass: `npm test`

## Files to Create/Modify

**Create:**

- `server/api/agents/[id]/start.post.ts` (~40 lines)
- `server/api/agents/[id]/stop.post.ts` (~40 lines)
- `tests/api/agent-engine.spec.ts` (~150 lines)

**Modify:**

- `tests/services/agent-engine/delegation.spec.ts` (fix mocks)
- `tests/services/agent-engine/processor.spec.ts` (fix mocks)
- `tests/services/agent-engine/manager.spec.ts` (fix mocks)
- `app/pages/index.vue` (add buttons + methods, ~50 lines added)

**Total:** ~330 lines of new/modified code

## Output Formatting

- Use blank lines between imports, types, functions
- Use proper markdown code fences with language identifiers
- Log operations clearly with delimiters

## Notes

- Agent loops run continuously once started (30-second polling)
- Stop is graceful (sets status to 'paused', loop exits)
- Multiple start calls are idempotent (no duplicate loops)
- Dashboard buttons provide manual control for testing
- Future: Auto-start agents on server startup (F007 Phase 3)
