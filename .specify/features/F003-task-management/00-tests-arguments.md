# F003 Task Management System - Test Requirements

## Files to Test

### 1. GET API Endpoint (`server/api/tasks/index.get.ts`)

**Test Coverage:**

- Returns empty array when no tasks exist
- Returns all tasks when no filters applied
- Filters by organizationId correctly
- Filters by assignedToId correctly
- Filters by createdById correctly
- Filters by status correctly
- Filters by priority correctly
- Combines multiple filters (e.g., organizationId + status)

**Test Data:**

```typescript
const testTask1: Task = {
  id: 'task-1',
  title: 'Implement feature X',
  description: 'Build the new feature for org-1',
  assignedToId: 'agent-1',
  createdById: 'agent-2',
  organizationId: 'org-1',
  status: 'pending',
  priority: 'high',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  completedAt: null
}

const testTask2: Task = {
  id: 'task-2',
  title: 'Review code',
  description: 'Review PR #123',
  assignedToId: 'agent-2',
  createdById: 'agent-1',
  organizationId: 'org-1',
  status: 'in-progress',
  priority: 'medium',
  createdAt: new Date('2025-01-02'),
  updatedAt: new Date('2025-01-02'),
  completedAt: null
}

const testTask3: Task = {
  id: 'task-3',
  title: 'Deploy to production',
  description: 'Deploy version 2.0',
  assignedToId: 'agent-1',
  createdById: 'agent-3',
  organizationId: 'org-2',
  status: 'completed',
  priority: 'urgent',
  createdAt: new Date('2025-01-03'),
  updatedAt: new Date('2025-01-05'),
  completedAt: new Date('2025-01-05')
}
```

### 2. POST API Endpoint (`server/api/tasks/index.post.ts`)

**Test Coverage:**

- Creates task with all required fields
- Returns 400 when title missing
- Returns 400 when description missing
- Returns 400 when assignedToId missing
- Returns 400 when createdById missing
- Returns 400 when organizationId missing
- Returns 400 when priority missing
- Applies default: status='pending'
- Applies default: completedAt=null
- Auto-generates: id (uuid format)
- Auto-generates: createdAt (Date)
- Auto-generates: updatedAt (Date, equals createdAt initially)
- Returns 201 status on success
- Created task has ALL 11 fields

**Validation Tests:**

```typescript
// Required fields
requiredFields = ['title', 'description', 'assignedToId', 'createdById', 'organizationId', 'priority']

// Valid payload
{
  title: 'Test Task',
  description: 'Test description',
  assignedToId: 'agent-1',
  createdById: 'agent-2',
  organizationId: 'org-1',
  priority: 'medium'
}

// Expected defaults
status: 'pending'
completedAt: null
```

### 3. PATCH API Endpoint (`server/api/tasks/[id].patch.ts`)

**Test Coverage:**

- Updates task fields successfully
- Auto-updates updatedAt to current time
- Sets completedAt when status changes to 'completed'
- Does NOT change completedAt for other status changes
- Returns 404 when task not found
- Returns 200 with updated task
- Partial updates work (only provided fields change)
- Can update title, description, assignedToId, status, priority

**Update Logic Tests:**

```typescript
// Status change to 'completed'
PATCH { status: 'completed' }
// Should set completedAt to new Date()

// Status change to other values
PATCH { status: 'in-progress' }
// Should NOT change completedAt

// Partial update
PATCH { title: 'New Title' }
// Should only update title and updatedAt
```

### 4. DELETE API Endpoint (`server/api/tasks/[id].delete.ts`)

**Test Coverage:**

- Deletes task successfully
- Returns 404 when task not found
- Returns 204 on success
- Task actually removed from array

## Type Definition (Reference)

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

## Test File Location

`tests/api/tasks.spec.ts`

## Expected Test Count

~30 tests total:

- 8 GET endpoint tests
- 14 POST endpoint tests
- 8 PATCH endpoint tests
- 4 DELETE endpoint tests

## Special Considerations

1. **Date Handling**: Use `new Date()` for timestamps, mock or use fixed dates in tests
2. **completedAt Logic**: Critical - only set when status becomes 'completed'
3. **updatedAt Logic**: Must change on every PATCH
4. **UUID Validation**: Check that id is valid uuid format
5. **All 11 Fields**: Every created/updated task must have all fields
