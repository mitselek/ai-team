# F001: Agent System

**Status**: Not Started  
**Priority**: High  
**Depends On**: Organization management (completed)

## Overview

Implement the Agent System - the core entity for hierarchical AI agent orchestration. Agents are the workers in the AI Team, with roles, hierarchies (via seniorId), token allocations, and status tracking.

## Objectives

- Enable agent creation and management (CRUD operations)
- Support hierarchical relationships (agents report to senior agents)
- Track agent activity and status (active, bored, stuck, paused)
- Manage token allocation and usage per agent
- Filter agents by organization, team, and status

## Scope

### In Scope

- In-memory data storage for agents
- Client-side composable for SSR-safe state management
- Server API endpoints (GET, POST)
- Complete Agent interface implementation (all 12 fields)
- Basic filtering by organizationId, teamId, status

### Out of Scope (Future)

- Agent UPDATE endpoint (PATCH)
- Agent DELETE endpoint (DELETE)
- Advanced queries (by role, token usage, hierarchy depth)
- Agent enrollment workflow
- Task assignment logic
- GitHub-backed persistence

## Implementation Tasks

Task prompts are designed to be executed in parallel with Gemini CLI:

1. **01-data-store.prompt.md** - In-memory Agent[] array (~5 lines)
2. **02-composable.prompt.md** - useAgent composable with CRUD (~100 lines)
3. **03-get-api.prompt.md** - GET /api/agents with filters (~30 lines)
4. **04-post-api.prompt.md** - POST /api/agents with validation (~70 lines)

### Execution

```bash
# Launch all 4 tasks in parallel
cd /home/michelek/Documents/github/ai-team

gemini --yolo "$(cat .specify/features/F001-agent-system/01-data-store.prompt.md)" > /tmp/f001-task1.log 2>&1 &
gemini --yolo "$(cat .specify/features/F001-agent-system/02-composable.prompt.md)" > /tmp/f001-task2.log 2>&1 &
gemini --yolo "$(cat .specify/features/F001-agent-system/03-get-api.prompt.md)" > /tmp/f001-task3.log 2>&1 &
gemini --yolo "$(cat .specify/features/F001-agent-system/04-post-api.prompt.md)" > /tmp/f001-task4.log 2>&1 &

# Check completion
ps aux | grep "gemini" | grep -v grep | wc -l
# Should return 0 when done

# Verify generated files
ls -lh app/composables/useAgent.ts server/api/agents/ server/data/agents.ts

# Run quality checks
npm run typecheck
npm run lint
```

## Type Reference

All tasks use this complete Agent interface:

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

## Acceptance Criteria

- [ ] All 4 files generated successfully
- [ ] `npm run typecheck` passes (strict mode)
- [ ] `npm run lint` passes (no errors)
- [ ] All Agent objects include all 12 required fields
- [ ] All imports use relative paths (no ~ aliases)
- [ ] Follows patterns from Organization system
- [ ] Structured logging throughout
- [ ] Proper error handling with try-catch

## Testing Strategy

After implementation:

1. Create `tests/api/agents.spec.ts` - API endpoint tests
2. Create `tests/composables/useAgent.spec.ts` - Composable tests
3. Mock logger in tests with `vi.mock('../../server/utils/logger')`
4. Verify CRUD operations work correctly
5. Test filtering by organizationId, teamId, status

## Lessons Applied

From `.specify/memory/lessons-learned.md`:

1. **Type Preservation** - All prompts explicitly state "DO NOT MODIFY types/index.ts"
2. **Complete Type Context** - Full Agent interface with all 12 fields in every prompt
3. **Pattern Matching** - Reference existing files (useOrganization, organizations API)
4. **Relative Imports** - No ~ aliases, explicit relative paths
5. **Bounded Scope** - Each prompt creates ONLY one specific file
6. **Validation Checklist** - Self-checking before completion

## Related Files

**Generated** (when complete):

- `app/composables/useAgent.ts`
- `server/api/agents/index.get.ts`
- `server/api/agents/index.post.ts`
- `server/data/agents.ts`

**Tests** (to be created):

- `tests/api/agents.spec.ts`
- `tests/composables/useAgent.spec.ts`

**Dependencies**:

- `types/index.ts` (Agent interface - DO NOT MODIFY)
- `server/utils/logger.ts` (structured logging)
- `app/utils/logger.ts` (client logging)

## Notes

- This is F001 because it's the first major feature using structured Gemini CLI workflow
- Each prompt is single-use and disposable (kept for reference/debugging)
- If generation fails, review logs in /tmp/f001-task\*.log
- Parallel execution is safe - all tasks are independent
- Expected total generation time: 2-5 minutes for all 4 tasks

## Success Metrics

- Time saved: ~2-4 hours of manual coding
- Code quality: Should match or exceed manual implementation
- Type safety: Zero type errors with strict mode
- Gemini grade: Target A or A- (learned from previous B+ attempt)
