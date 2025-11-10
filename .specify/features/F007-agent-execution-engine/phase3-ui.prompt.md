# F007 Phase 3: Dashboard UI Integration

## Task Description

Add start/stop buttons to agent cards in the dashboard UI to control agent execution loops via the API endpoints created in Phase 2.

## Objectives

- Add UI controls to start/stop agents from the dashboard
- Integrate with `/api/agents/:id/start` and `/api/agents/:id/stop` endpoints
- Show loading states during API calls
- Display success/error feedback to users
- Update agent status in real-time after actions

## Files to Modify

### 1. `app/composables/useAgent.ts`

Add two new methods:

- `startAgent(id: string)` - Calls POST `/api/agents/:id/start`
- `stopAgent(id: string)` - Calls POST `/api/agents/:id/stop`

Both methods should:

- Use fetch API to call endpoints
- Update local state on success (status change)
- Return `{ success: boolean, message: string }`
- Handle errors gracefully with logging

### 2. `app/pages/index.vue`

Modify agent card section to:

- Add start/stop buttons next to agent status
- Show button based on agent status:
  - "Start" button: visible when status is 'paused', 'bored', or 'stuck'
  - "Stop" button: visible when status is 'active'
- Add loading state per agent during API calls
- Display error messages inline if operations fail
- Use Tailwind CSS for styling (match existing design)

## UI Requirements

### Button States

**Start Button:**

- Label: "▶ Start"
- Color: Green (bg-green-500 hover:bg-green-600)
- Visible: When agent.status !== 'active'
- Disabled: When loading

**Stop Button:**

- Label: "⏸ Stop"
- Color: Red (bg-red-500 hover:bg-red-600)
- Visible: When agent.status === 'active'
- Disabled: When loading

### Loading State

- Replace button text with spinner/loading indicator
- Disable button during operation
- Use simple "..." or spinner emoji

### Error Display

- Show error message below agent card if operation fails
- Red text color (text-red-600)
- Auto-dismiss after 5 seconds or allow manual dismiss
- Format: "Failed to start agent: [error message]"

## Implementation Details

### Composable Methods

```typescript
// In useAgent composable

const startAgent = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`/api/agents/${id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()

    if (response.ok && data.success) {
      // Update local state
      updateAgent(id, { status: 'active', lastActiveAt: new Date() })
      return { success: true, message: data.message }
    }
    return { success: false, message: data.message || 'Failed to start agent' }
  } catch (error) {
    logger.error({ agentId: id, error }, 'Error starting agent')
    return { success: false, message: 'Network error' }
  }
}

const stopAgent = async (id: string): Promise<{ success: boolean; message: string }> => {
  // Similar implementation for stop
}
```

### Vue Template Addition

Add to agent card in the expanded team section:

```vue
<!-- Action Buttons -->
<div class="flex items-center gap-2">
  <!-- Start Button -->
  <button
    v-if="agent.status !== 'active'"
    @click="handleStartAgent(agent.id)"
    :disabled="loadingAgents.get(agent.id)"
    class="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600 disabled:opacity-50"
  >
    {{ loadingAgents.get(agent.id) ? '...' : '▶ Start' }}
  </button>
  
  <!-- Stop Button -->
  <button
    v-if="agent.status === 'active'"
    @click="handleStopAgent(agent.id)"
    :disabled="loadingAgents.get(agent.id)"
    class="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600 disabled:opacity-50"
  >
    {{ loadingAgents.get(agent.id) ? '...' : '⏸ Stop' }}
  </button>
  
  <!-- Status Badge -->
  <span :class="getStatusColor(agent.status)" class="rounded-full px-3 py-1 text-xs font-medium capitalize">
    {{ agent.status }}
  </span>
</div>

<!-- Error Message -->
<div v-if="errorMessages.get(agent.id)" class="mt-2 text-sm text-red-600">
  {{ errorMessages.get(agent.id) }}
</div>
```

### Script Methods

```typescript
const loadingAgents = ref<Map<string, boolean>>(new Map())
const errorMessages = ref<Map<string, string>>(new Map())

const handleStartAgent = async (agentId: string) => {
  loadingAgents.value.set(agentId, true)
  errorMessages.value.delete(agentId)

  const result = await startAgent(agentId)

  loadingAgents.value.set(agentId, false)

  if (!result.success) {
    errorMessages.value.set(agentId, `Failed to start: ${result.message}`)
    setTimeout(() => errorMessages.value.delete(agentId), 5000)
  }
}

const handleStopAgent = async (agentId: string) => {
  // Similar implementation
}
```

## Type Safety

All implementations must use:

- `import type { Agent, AgentStatus }` for types
- Relative imports: `@@/types` or `../../types`
- Proper error handling with try-catch
- Logger from `@/utils/logger` or `../../server/utils/logger`

## Testing Checklist

- [ ] Start button appears for paused/bored/stuck agents
- [ ] Stop button appears for active agents
- [ ] Loading state shows during API call
- [ ] Success updates agent status immediately
- [ ] Error message displays on failure
- [ ] Error auto-dismisses after 5 seconds
- [ ] Multiple agents can be controlled independently
- [ ] UI remains responsive during operations

## Success Criteria

- Buttons render correctly based on agent status
- API calls execute successfully
- Local state updates reflect server state
- Loading and error states provide good UX
- No TypeScript errors
- No ESLint warnings
- Follows existing UI/UX patterns

## References

- Existing composables pattern: `app/composables/useOrganization.ts`
- Existing UI patterns: Current agent cards in `app/pages/index.vue`
- API endpoints: `server/api/agents/[id].start.post.ts` and `[id].stop.post.ts`
- Integration tests: `tests/api/agent-engine.spec.ts`
