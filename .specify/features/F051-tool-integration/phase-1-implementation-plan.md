# Phase 1: Type Definitions & Configuration - Implementation Plan

**Issue:** #52  
**Estimated Time:** 2-3 hours  
**Dependencies:** None (foundational phase)  
**Status:** Ready to implement

---

## Overview

Establish type definitions and configuration structure for MCP tools. This phase creates the foundation that all subsequent phases will build upon.

## Pre-Implementation Checklist

- [ ] Read brainstorming session document (`.specify/features/F051-tool-integration/brainstorming-session.md`)
- [ ] Ensure clean git state: `git status` shows no uncommitted changes
- [ ] Create feature branch: `git checkout -b feature/issue-52-phase1-types`
- [ ] Verify tests pass: `npm test` (baseline)
- [ ] Verify typecheck passes: `npm run typecheck` (baseline)

---

## Task 1: Add MCPTool Interface to Core Types

**File:** `types/index.ts`

**Current State:** Review existing type exports

**Action:** Add MCPTool interface and update existing interfaces

**Exact Changes:**

1. Find the exports section (likely near the end of file)
2. Add the MCPTool interface definition:

   ```typescript
   /**
    * MCP Tool Definition (Model Context Protocol)
    *
    * Canonical format for tool definitions across all LLM providers.
    * This is the Single Source of Truth - provider-specific formats
    * are translated from this standard.
    */
   export interface MCPTool {
     /** Unique tool name (e.g., 'read_file', 'write_file') */
     name: string

     /** Clear description of tool's purpose and usage */
     description: string

     /** JSON Schema defining the tool's input parameters */
     inputSchema: {
       type: 'object'
       properties: Record<string, unknown>
       required?: string[]
     }
   }
   ```

3. Update the Organization interface - find existing Organization interface and add:

   ```typescript
   export interface Organization {
     // ... existing fields ...

     /**
      * Available MCP tools for this organization.
      * Agents can use tools from this list unless blocked by blacklists.
      */
     tools?: MCPTool[]
   }
   ```

4. Update the Team interface - find existing Team interface and add:

   ```typescript
   export interface Team {
     // ... existing fields ...

     /**
      * Tools that this team cannot use.
      * Merged with agent-level blacklist for final access control.
      */
     toolBlacklist?: string[]
   }
   ```

5. Update the Agent interface - find existing Agent interface and add:

   ```typescript
   export interface Agent {
     // ... existing fields ...

     /**
      * Tools that this agent cannot use.
      * Combines with team blacklist if agent is in a team.
      */
     toolBlacklist?: string[]
   }
   ```

**Verification:**

```bash
npm run typecheck
# Should pass with no errors
```

**Checkpoint:** Commit if typecheck passes

```bash
git add types/index.ts
git commit -m "Add MCPTool interface and tool blacklist fields to Organization/Team/Agent"
```

---

## Task 2: Update LLM Service Types

**File:** `app/server/services/llm/types.ts`

**Current State:** Read existing LLMServiceOptions and LLMResponse interfaces

**Action:** Add tools support to LLM service layer

**Exact Changes:**

1. Import MCPTool type at top of file:

   ```typescript
   import type { MCPTool } from '@@/types'
   ```

2. Find LLMServiceOptions interface and add:

   ```typescript
   export interface LLMServiceOptions {
     // ... existing fields (model, maxTokens, temperature, etc.) ...

     /**
      * Optional MCP tools available to the LLM.
      * When provided, the LLM can request tool execution.
      */
     tools?: MCPTool[]
   }
   ```

3. Add ToolCall interface (new interface):

   ```typescript
   /**
    * Represents a tool call request from the LLM.
    * Standardized format across all providers.
    */
   export interface ToolCall {
     /** Unique identifier for this tool call */
     id: string

     /** Name of the tool to execute */
     name: string

     /** Arguments to pass to the tool */
     arguments: Record<string, unknown>
   }
   ```

4. Find LLMResponse interface and add:

   ```typescript
   export interface LLMResponse {
     content: string

     /**
      * Tool calls requested by the LLM.
      * Empty/undefined means final text response, no tools needed.
      */
     toolCalls?: ToolCall[]

     // ... existing fields (provider, model, tokensUsed, etc.) ...
   }
   ```

**Verification:**

```bash
npm run typecheck
# Should pass with no errors
```

**Checkpoint:** Commit if typecheck passes

```bash
git add app/server/services/llm/types.ts
git commit -m "Add tools support to LLM service types (LLMServiceOptions, ToolCall, LLMResponse)"
```

---

## Task 3: Add Tools to Organization Configuration

**File:** `data/organizations/org-1/org.json`

**Current State:** Read existing org.json structure

**Action:** Add tools array with 5 filesystem tool definitions

**Exact Changes:**

1. Open the file and locate the root organization object
2. Add a `tools` array after existing fields (before closing brace)
3. Copy tool definitions from MCPFileServer (use these exact definitions):

```json
{
  "id": "org-1",
  "name": "AI Team Management",
  "description": "...",
  "createdAt": "...",

  "tools": [
    {
      "name": "read_file",
      "description": "Read file content from agent/team workspace",
      "inputSchema": {
        "type": "object",
        "properties": {
          "agentId": {
            "type": "string",
            "description": "The ID of the agent requesting access"
          },
          "path": {
            "type": "string",
            "description": "Path to the file (e.g., /agents/{agentId}/private/file.md)"
          }
        },
        "required": ["agentId", "path"]
      }
    },
    {
      "name": "write_file",
      "description": "Write file content to agent/team workspace",
      "inputSchema": {
        "type": "object",
        "properties": {
          "agentId": {
            "type": "string",
            "description": "The ID of the agent requesting access"
          },
          "path": {
            "type": "string",
            "description": "Path to the file (e.g., /agents/{agentId}/private/file.md)"
          },
          "content": {
            "type": "string",
            "description": "Content to write to the file"
          }
        },
        "required": ["agentId", "path", "content"]
      }
    },
    {
      "name": "delete_file",
      "description": "Delete file from agent/team workspace",
      "inputSchema": {
        "type": "object",
        "properties": {
          "agentId": {
            "type": "string",
            "description": "The ID of the agent requesting access"
          },
          "path": {
            "type": "string",
            "description": "Path to the file (e.g., /agents/{agentId}/private/file.md)"
          }
        },
        "required": ["agentId", "path"]
      }
    },
    {
      "name": "list_files",
      "description": "List files in a directory within agent/team workspace",
      "inputSchema": {
        "type": "object",
        "properties": {
          "agentId": {
            "type": "string",
            "description": "The ID of the agent requesting access"
          },
          "path": {
            "type": "string",
            "description": "Path to the directory (e.g., /agents/{agentId}/private)"
          }
        },
        "required": ["agentId", "path"]
      }
    },
    {
      "name": "get_file_info",
      "description": "Get metadata for a file in agent/team workspace",
      "inputSchema": {
        "type": "object",
        "properties": {
          "agentId": {
            "type": "string",
            "description": "The ID of the agent requesting access"
          },
          "path": {
            "type": "string",
            "description": "Path to the file (e.g., /agents/{agentId}/private/file.md)"
          }
        },
        "required": ["agentId", "path"]
      }
    }
  ]
}
```

**Note:** Ensure JSON is valid (check commas, brackets)

**Verification:**

```bash
# Validate JSON syntax
node -e "JSON.parse(require('fs').readFileSync('data/organizations/org-1/org.json', 'utf8'))"

# Should output nothing if valid, error if invalid
```

**Checkpoint:** Commit if valid

```bash
git add data/organizations/org-1/org.json
git commit -m "Add 5 filesystem tool definitions to org-1 configuration"
```

---

## Task 4: Create Unit Tests for Type Safety

**File:** `tests/types/mcp-tools.spec.ts` (NEW FILE)

**Action:** Create tests validating type definitions compile and work correctly

**Exact Changes:**

Create new file with this content:

```typescript
import { describe, it, expect } from 'vitest'
import type { MCPTool, Organization, Team, Agent } from '@@/types'
import type { LLMServiceOptions, LLMResponse, ToolCall } from '../../app/server/services/llm/types'

describe('MCP Tool Type Definitions', () => {
  describe('MCPTool Interface', () => {
    it('should accept valid MCP tool definition', () => {
      const tool: MCPTool = {
        name: 'test_tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string' }
          },
          required: ['param1']
        }
      }

      expect(tool.name).toBe('test_tool')
      expect(tool.inputSchema.type).toBe('object')
    })
  })

  describe('Organization with Tools', () => {
    it('should accept organization with tools array', () => {
      const org: Partial<Organization> = {
        id: 'org-test',
        name: 'Test Org',
        tools: [
          {
            name: 'read_file',
            description: 'Read file',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        ]
      }

      expect(org.tools).toHaveLength(1)
      expect(org.tools![0].name).toBe('read_file')
    })

    it('should accept organization without tools (optional field)', () => {
      const org: Partial<Organization> = {
        id: 'org-test',
        name: 'Test Org'
        // tools is optional
      }

      expect(org.tools).toBeUndefined()
    })
  })

  describe('Team with Tool Blacklist', () => {
    it('should accept team with toolBlacklist', () => {
      const team: Partial<Team> = {
        id: 'team-test',
        name: 'Test Team',
        toolBlacklist: ['delete_file', 'write_file']
      }

      expect(team.toolBlacklist).toContain('delete_file')
    })

    it('should accept team without toolBlacklist (optional field)', () => {
      const team: Partial<Team> = {
        id: 'team-test',
        name: 'Test Team'
        // toolBlacklist is optional
      }

      expect(team.toolBlacklist).toBeUndefined()
    })
  })

  describe('Agent with Tool Blacklist', () => {
    it('should accept agent with toolBlacklist', () => {
      const agent: Partial<Agent> = {
        id: 'agent-test',
        name: 'Test Agent',
        toolBlacklist: ['delete_file']
      }

      expect(agent.toolBlacklist).toContain('delete_file')
    })

    it('should accept agent without toolBlacklist (optional field)', () => {
      const agent: Partial<Agent> = {
        id: 'agent-test',
        name: 'Test Agent'
        // toolBlacklist is optional
      }

      expect(agent.toolBlacklist).toBeUndefined()
    })
  })

  describe('LLM Service Types', () => {
    it('should accept LLMServiceOptions with tools', () => {
      const options: Partial<LLMServiceOptions> = {
        model: 'claude-sonnet-4',
        tools: [
          {
            name: 'read_file',
            description: 'Read file',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          }
        ]
      }

      expect(options.tools).toHaveLength(1)
    })

    it('should accept LLMServiceOptions without tools (optional)', () => {
      const options: Partial<LLMServiceOptions> = {
        model: 'claude-sonnet-4'
        // tools is optional
      }

      expect(options.tools).toBeUndefined()
    })

    it('should accept ToolCall with required fields', () => {
      const toolCall: ToolCall = {
        id: 'call_123',
        name: 'read_file',
        arguments: { path: '/test.txt', agentId: 'agent-1' }
      }

      expect(toolCall.id).toBe('call_123')
      expect(toolCall.name).toBe('read_file')
    })

    it('should accept LLMResponse with toolCalls', () => {
      const response: Partial<LLMResponse> = {
        content: 'I need to read a file',
        toolCalls: [
          {
            id: 'call_123',
            name: 'read_file',
            arguments: { path: '/test.txt', agentId: 'agent-1' }
          }
        ]
      }

      expect(response.toolCalls).toHaveLength(1)
    })

    it('should accept LLMResponse without toolCalls (final text response)', () => {
      const response: Partial<LLMResponse> = {
        content: 'Here is your answer'
        // toolCalls is optional (undefined = final response)
      }

      expect(response.toolCalls).toBeUndefined()
    })
  })
})
```

**Verification:**

```bash
npm test tests/types/mcp-tools.spec.ts
# All tests should pass
```

**Checkpoint:** Commit if tests pass

```bash
git add tests/types/mcp-tools.spec.ts
git commit -m "Add unit tests for MCP tool type definitions"
```

---

## Task 5: Validate Organization Configuration Loading

**File:** `tests/data/organization-tools.spec.ts` (NEW FILE)

**Action:** Test that organization config loads correctly with tools

**Exact Changes:**

Create new file with this content:

```typescript
import { describe, it, expect } from 'vitest'
import { loadOrganization } from '../../app/server/data/organizations'

describe('Organization Configuration with Tools', () => {
  it('should load org-1 with tools array', async () => {
    const org = await loadOrganization('org-1')

    expect(org).toBeDefined()
    expect(org.tools).toBeDefined()
    expect(Array.isArray(org.tools)).toBe(true)
  })

  it('should have 5 filesystem tools defined', async () => {
    const org = await loadOrganization('org-1')

    expect(org.tools).toHaveLength(5)

    const toolNames = org.tools!.map((t) => t.name)
    expect(toolNames).toContain('read_file')
    expect(toolNames).toContain('write_file')
    expect(toolNames).toContain('delete_file')
    expect(toolNames).toContain('list_files')
    expect(toolNames).toContain('get_file_info')
  })

  it('should have valid tool definitions with required fields', async () => {
    const org = await loadOrganization('org-1')

    org.tools!.forEach((tool) => {
      expect(tool.name).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(tool.inputSchema).toBeDefined()
      expect(tool.inputSchema.type).toBe('object')
      expect(tool.inputSchema.properties).toBeDefined()
    })
  })

  it('should have agentId and path in all tool input schemas', async () => {
    const org = await loadOrganization('org-1')

    org.tools!.forEach((tool) => {
      expect(tool.inputSchema.properties.agentId).toBeDefined()
      expect(tool.inputSchema.properties.path).toBeDefined()
      expect(tool.inputSchema.required).toContain('agentId')
      expect(tool.inputSchema.required).toContain('path')
    })
  })

  it('write_file should have content parameter', async () => {
    const org = await loadOrganization('org-1')
    const writeTool = org.tools!.find((t) => t.name === 'write_file')

    expect(writeTool).toBeDefined()
    expect(writeTool!.inputSchema.properties.content).toBeDefined()
    expect(writeTool!.inputSchema.required).toContain('content')
  })
})
```

**Verification:**

```bash
npm test tests/data/organization-tools.spec.ts
# All tests should pass
```

**Checkpoint:** Commit if tests pass

```bash
git add tests/data/organization-tools.spec.ts
git commit -m "Add tests for organization configuration tool loading"
```

---

## Final Phase 1 Verification

Run complete test suite to ensure no regressions:

```bash
# Type checking
npm run typecheck
# Should pass with no errors

# All tests
npm test
# Should maintain or improve pass rate (currently 537/550)

# Linting
npm run lint
# Should pass with no new errors
```

---

## Completion Checklist

- [ ] All type definitions added to `types/index.ts`
- [ ] LLM service types updated in `app/server/services/llm/types.ts`
- [ ] Organization config updated with 5 tools in `data/organizations/org-1/org.json`
- [ ] Unit tests created and passing (`tests/types/mcp-tools.spec.ts`)
- [ ] Integration tests created and passing (`tests/data/organization-tools.spec.ts`)
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (all tests)
- [ ] `npm run lint` passes
- [ ] All commits made with clear messages
- [ ] No breaking changes to existing code

---

## Success Criteria

✅ **TypeScript Compilation:** No type errors  
✅ **Test Suite:** All new tests pass, no regressions  
✅ **Configuration:** org-1 loads with 5 filesystem tools  
✅ **Optional Fields:** toolBlacklist fields work when missing  
✅ **Documentation:** All new types have JSDoc comments

---

## Merge to Main

```bash
# Ensure all commits are clean
git log --oneline

# Push feature branch
git push origin feature/issue-52-phase1-types

# Create PR (or merge directly if authorized)
gh pr create --title "[#52] Phase 1: Type Definitions & Configuration" --body "Implements Issue #52 - Phase 1 of Issue #51

- Added MCPTool interface to types
- Updated Organization/Team/Agent with tools/toolBlacklist
- Updated LLM service types for tool support
- Added 5 filesystem tools to org-1 configuration
- Complete test coverage for type safety

All tests passing, no breaking changes."

# Or direct merge:
git checkout main
git merge feature/issue-52-phase1-types
git push origin main
```

---

## Next Phase

Once Phase 1 is complete and merged, proceed to:
**Phase 2: Provider Translation Layer** (Issue #53)

See: `.specify/features/F051-tool-integration/phase-2-implementation-plan.md`
