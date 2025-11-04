# Example: Agent System Development Task

This shows how to use the dev-task.prompt.md template for creating the Agent System.

## Usage

```bash
# Fill in the template with specific task details
gemini --yolo "$(cat .github/prompts/agent-system-task.prompt.md)" &
```

## Task Breakdown

Instead of one big "create agent system" task, break into 4 focused tasks:

### Task 1: Agent Data Store

**File**: `server/data/agents.ts`
**Scope**: Simple array export, matching organizations.ts pattern
**Complexity**: Low (5 lines)

### Task 2: Agent Composable

**File**: `app/composables/useAgent.ts`
**Scope**: CRUD operations (createAgent, getAgent, listAgents, updateAgent, deleteAgent)
**Reference**: `app/composables/useOrganization.ts`
**Complexity**: Medium (80-100 lines)

### Task 3: GET Agents API

**File**: `server/api/agents/index.get.ts`
**Scope**: List agents with optional filters (organizationId, teamId, status)
**Reference**: `server/api/organizations/index.get.ts`
**Complexity**: Low (30-40 lines)

### Task 4: POST Agents API

**File**: `server/api/agents/index.post.ts`
**Scope**: Create new agent with validation
**Reference**: `server/api/organizations/index.post.ts`
**Complexity**: Medium (60-70 lines)

## Agent Interface (for reference)

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

## Complete Task 1 Example

````markdown
# Development Task: Agent Data Store

## Your Task

Create an in-memory storage array for agents, following the same pattern as server/data/organizations.ts.

## Critical Constraints

### DO NOT MODIFY

- types/index.ts - Use Agent interface exactly as defined

### MUST USE

- Relative import: `import type { Agent } from '../../types'`
- Empty array initialization: `export const agents: Agent[] = []`
- TODO comment about GitHub-backed persistence

## Type Definitions to Use

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
````

## Reference Files

- server/data/organizations.ts (exact pattern to follow)

## Expected Output

Create ONLY: `server/data/agents.ts`

File should be ~6 lines:

- Import statement
- JSDoc comment
- TODO comment
- Export const agents array

## Success Criteria

- File created at server/data/agents.ts
- Uses relative import
- Exports empty Agent[] array
- Includes TODO comment about persistence

```text
## Key Benefits of This Approach

1. **Explicit type preservation** - Types copied into prompt, marked as "DO NOT MODIFY"
2. **Bounded scope** - "Create ONLY" makes it clear what's in/out of scope
3. **Reference patterns** - Points to exact files to copy style from
4. **Validation checklist** - Gemini can self-check before finishing
5. **Small tasks** - Each file generated independently, easier to verify
6. **Example-driven** - Shows expected length and structure

## Workflow

1. Create 4 separate prompt files (agent-data.prompt.md, agent-composable.prompt.md, etc.)
2. Launch in parallel: All 4 tasks independent, no dependencies
3. Check results: Each file small enough to quickly review
4. Fix issues: Easier to fix one 40-line file than one 300-line refactor
5. Commit atomically: Each component can be committed separately if needed
```
