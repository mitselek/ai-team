# F003: Task Management System

**Status**: 🟡 In Progress  
**Priority**: High (Core MVP - enables agent delegation)  
**Dependencies**: F001 Agent System (✅), F002 Team System (✅)

## Objective

Implement the Task management system with composable, API endpoints, and in-memory data store. Tasks are the primary mechanism for agent delegation and work tracking in the hierarchical orchestration system.

## Scope

### Type Definition (Reference)

```typescript
export interface Task {
  id: string
  title: string
  description: string
  assignedToId: string
  createdById: string
  organizationId: string
  status: TaskStatus
  priority: TaskPriority
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}

export type TaskStatus = 'pending' | 'in-progress' | 'blocked' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
```

### Implementation Tasks

**TDD Approach**: Write tests FIRST, then implementation

1. **00-tests.prompt.md** - `tests/api/tasks.spec.ts`
   - GET: Filter by organizationId, assignedToId, createdById, status, priority
   - POST: Create with validation, defaults (status='pending', completedAt=null)
   - PATCH: Update task fields, auto-update updatedAt, set completedAt when status='completed'
   - DELETE: Remove task from array

2. **01-data-store.prompt.md** - `server/data/tasks.ts`
   - In-memory array storage
   - Export empty array
   - JSDoc with GitHub persistence TODO

3. **02-composable.prompt.md** - `app/composables/useTask.ts`
   - SSR-safe Vue composable
   - CRUD operations: createTask, getTask, listTasks, updateTask, deleteTask
   - ALL 11 Task fields required in operations
   - Structured logging with correlationId

4. **03-get-api.prompt.md** - `server/api/tasks/index.get.ts`
   - List tasks with optional filters
   - Filter by: organizationId, assignedToId, createdById, status, priority
   - Return filtered array

5. **04-post-api.prompt.md** - `server/api/tasks/index.post.ts`
   - Create new task
   - Validate required fields: title, description, assignedToId, createdById, organizationId, priority
   - Defaults: status='pending', completedAt=null
   - Auto-generate: id (uuid), createdAt, updatedAt (both new Date())
   - Return 201 with ALL 11 fields

6. **05-patch-api.prompt.md** - `server/api/tasks/[id].patch.ts`
   - Update existing task
   - Auto-update: updatedAt to new Date()
   - Auto-set: completedAt when status changes to 'completed'
   - Return 404 if task not found
   - Return 200 with updated task

7. **06-delete-api.prompt.md** - `server/api/tasks/[id].delete.ts`
   - Delete task by id
   - Return 404 if not found
   - Return 204 on success

## Acceptance Criteria

- ✅ All 11 Task fields present in ALL operations
- ✅ Type-only imports for TypeScript types
- ✅ Relative imports (../../)
- ✅ Structured logging throughout
- ✅ npm run typecheck passes
- ✅ npm run lint passes
- ✅ npm test passes (all tests)
- ✅ Tests written BEFORE implementation
- ✅ completedAt logic: null by default, set to Date when status='completed'
- ✅ updatedAt auto-updated on PATCH

## Execution

### Phase 1: Tests First (TDD)

```bash
# Generate tests FIRST
cd /home/michelek/Documents/github/ai-team
gemini --yolo "$(cat .github/prompts/test-generation.prompt.md)" "$(cat .specify/features/F003-task-management/00-tests-arguments.md)" > .specify/logs/F003-tests.log 2>&1 &
```

### Phase 2: Implementation (Parallel)

```bash
# After tests are written, implement in parallel
gemini --yolo "$(cat .specify/features/F003-task-management/01-data-store.prompt.md)" > .specify/logs/F003-01.log 2>&1 &
gemini --yolo "$(cat .specify/features/F003-task-management/02-composable.prompt.md)" > .specify/logs/F003-02.log 2>&1 &
gemini --yolo "$(cat .specify/features/F003-task-management/03-get-api.prompt.md)" > .specify/logs/F003-03.log 2>&1 &
gemini --yolo "$(cat .specify/features/F003-task-management/04-post-api.prompt.md)" > .specify/logs/F003-04.log 2>&1 &
gemini --yolo "$(cat .specify/features/F003-task-management/05-patch-api.prompt.md)" > .specify/logs/F003-05.log 2>&1 &
gemini --yolo "$(cat .specify/features/F003-task-management/06-delete-api.prompt.md)" > .specify/logs/F003-06.log 2>&1 &
```

Wait 5-10 minutes, then verify tests pass.
