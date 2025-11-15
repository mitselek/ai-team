# Phase 3: Orchestrator Validation - Implementation Plan

**Issue:** #54  
**Estimated Time:** 2-3 hours  
**Dependencies:** Phase 1 complete (#52)  
**Status:** Blocked until Phase 1 merged (can run parallel with Phase 2)

---

## Overview

Add tool availability validation to the orchestrator service. This phase implements the blacklist filtering logic that determines which tools an agent can access based on organization, team, and agent-level restrictions.

## Pre-Implementation Checklist

- [ ] Verify Phase 1 is complete and merged to main
- [ ] Review brainstorming document (`.specify/features/F051-tool-integration/brainstorming-session.md`)
- [ ] Create feature branch: `git checkout -b feature/issue-54-phase3-validation`
- [ ] Pull latest main: `git pull origin main`
- [ ] Verify tests pass: `npm test` (baseline from Phase 1)
- [ ] Verify typecheck passes: `npm run typecheck`

---

## Task 1: Add Tool Validation Functions to Orchestrator

**File:** `app/server/services/orchestrator.ts`

**Current State:** Review existing orchestrator structure (likely handles agent/task routing)

**Action:** Add functions to validate tool access based on blacklists

### Step 1.1: Add Import Statements

Find imports at top of file, add:

```typescript
import type { MCPTool, Organization, Team, Agent } from '@@/types'
```

### Step 1.2: Add getAvailableTools Function

Add this function (location: after imports, before main orchestrator logic):

```typescript
/**
 * Get tools available to an agent based on organization, team, and agent blacklists.
 *
 * Validation chain:
 * 1. Start with organization's tools (whitelist)
 * 2. Remove tools in team's blacklist (if agent is in a team)
 * 3. Remove tools in agent's blacklist
 * 4. Return filtered list
 *
 * @param organization - Organization containing base tool list
 * @param agent - Agent requesting tools
 * @param team - Optional team the agent belongs to
 * @returns Array of tools the agent can access
 */
export function getAvailableTools(
  organization: Organization,
  agent: Agent,
  team?: Team
): MCPTool[] {
  // Start with organization tools (or empty array if none defined)
  const orgTools = organization.tools || []

  // Build combined blacklist
  const blacklist = new Set<string>()

  // Add team blacklist if agent is in a team
  if (team?.toolBlacklist) {
    team.toolBlacklist.forEach((toolName) => blacklist.add(toolName))
  }

  // Add agent blacklist
  if (agent.toolBlacklist) {
    agent.toolBlacklist.forEach((toolName) => blacklist.add(toolName))
  }

  // Filter org tools by blacklist
  return orgTools.filter((tool) => !blacklist.has(tool.name))
}
```

### Step 1.3: Add validateToolAccess Function

Add this function after `getAvailableTools`:

```typescript
/**
 * Validate that an agent has access to a specific tool.
 *
 * Used during tool execution to ensure agent isn't trying to use
 * a blacklisted tool.
 *
 * @param toolName - Name of the tool to validate
 * @param organization - Organization containing base tool list
 * @param agent - Agent requesting tool access
 * @param team - Optional team the agent belongs to
 * @returns true if agent can access the tool, false otherwise
 */
export function validateToolAccess(
  toolName: string,
  organization: Organization,
  agent: Agent,
  team?: Team
): boolean {
  const availableTools = getAvailableTools(organization, agent, team)
  return availableTools.some((tool) => tool.name === toolName)
}
```

### Step 1.4: Add getToolDefinition Function

Add this function after `validateToolAccess`:

```typescript
/**
 * Get a specific tool definition by name.
 *
 * Used to retrieve full tool metadata when executing a tool call.
 *
 * @param toolName - Name of the tool to find
 * @param organization - Organization containing tool definitions
 * @returns Tool definition or undefined if not found
 */
export function getToolDefinition(
  toolName: string,
  organization: Organization
): MCPTool | undefined {
  const orgTools = organization.tools || []
  return orgTools.find((tool) => tool.name === toolName)
}
```

**Verification:**

```bash
npm run typecheck
# Should pass with no errors
```

**Checkpoint:** Commit if typecheck passes

```bash
git add app/server/services/orchestrator.ts
git commit -m "Add tool validation functions to orchestrator (getAvailableTools, validateToolAccess, getToolDefinition)"
```

---

## Task 2: Unit Tests for Validation Logic

**File:** `tests/services/orchestrator-tools.spec.ts` (NEW FILE)

**Action:** Test tool filtering with various blacklist configurations

**Exact Changes:**

Create new file with this content:

```typescript
import { describe, it, expect } from 'vitest'
import {
  getAvailableTools,
  validateToolAccess,
  getToolDefinition
} from '../../app/server/services/orchestrator'
import type { MCPTool, Organization, Team, Agent } from '@@/types'

describe('Orchestrator Tool Validation', () => {
  // Sample data
  const sampleTools: MCPTool[] = [
    {
      name: 'read_file',
      description: 'Read file',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'write_file',
      description: 'Write file',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'delete_file',
      description: 'Delete file',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'list_files',
      description: 'List files',
      inputSchema: { type: 'object', properties: {}, required: [] }
    },
    {
      name: 'get_file_info',
      description: 'Get file info',
      inputSchema: { type: 'object', properties: {}, required: [] }
    }
  ]

  const sampleOrg: Organization = {
    id: 'org-test',
    name: 'Test Org',
    description: 'Test org',
    createdAt: '2025-01-01',
    tools: sampleTools
  } as Organization

  const sampleAgent: Agent = {
    id: 'agent-test',
    name: 'Test Agent',
    role: 'developer',
    model: 'claude-sonnet-4',
    organizationId: 'org-test'
  } as Agent

  describe('getAvailableTools', () => {
    it('should return all org tools when no blacklists', () => {
      const available = getAvailableTools(sampleOrg, sampleAgent)

      expect(available).toHaveLength(5)
      expect(available.map((t) => t.name)).toEqual([
        'read_file',
        'write_file',
        'delete_file',
        'list_files',
        'get_file_info'
      ])
    })

    it('should filter tools based on agent blacklist', () => {
      const agentWithBlacklist: Agent = {
        ...sampleAgent,
        toolBlacklist: ['delete_file', 'write_file']
      }

      const available = getAvailableTools(sampleOrg, agentWithBlacklist)

      expect(available).toHaveLength(3)
      expect(available.map((t) => t.name)).toEqual(['read_file', 'list_files', 'get_file_info'])
      expect(available.map((t) => t.name)).not.toContain('delete_file')
      expect(available.map((t) => t.name)).not.toContain('write_file')
    })

    it('should filter tools based on team blacklist', () => {
      const team: Team = {
        id: 'team-test',
        name: 'Test Team',
        organizationId: 'org-test',
        toolBlacklist: ['delete_file']
      } as Team

      const available = getAvailableTools(sampleOrg, sampleAgent, team)

      expect(available).toHaveLength(4)
      expect(available.map((t) => t.name)).not.toContain('delete_file')
    })

    it('should combine team and agent blacklists', () => {
      const team: Team = {
        id: 'team-test',
        name: 'Test Team',
        organizationId: 'org-test',
        toolBlacklist: ['delete_file']
      } as Team

      const agentWithBlacklist: Agent = {
        ...sampleAgent,
        toolBlacklist: ['write_file']
      }

      const available = getAvailableTools(sampleOrg, agentWithBlacklist, team)

      expect(available).toHaveLength(3)
      expect(available.map((t) => t.name)).toEqual(['read_file', 'list_files', 'get_file_info'])
    })

    it('should handle empty organization tools', () => {
      const orgWithoutTools: Organization = {
        ...sampleOrg,
        tools: undefined
      }

      const available = getAvailableTools(orgWithoutTools, sampleAgent)

      expect(available).toHaveLength(0)
    })

    it('should handle blacklist with non-existent tool names', () => {
      const agentWithBlacklist: Agent = {
        ...sampleAgent,
        toolBlacklist: ['non_existent_tool', 'another_fake_tool']
      }

      const available = getAvailableTools(sampleOrg, agentWithBlacklist)

      // Should still return all 5 tools (blacklist entries don't match)
      expect(available).toHaveLength(5)
    })
  })

  describe('validateToolAccess', () => {
    it('should return true for accessible tool', () => {
      const canAccess = validateToolAccess('read_file', sampleOrg, sampleAgent)

      expect(canAccess).toBe(true)
    })

    it('should return false for blacklisted tool', () => {
      const agentWithBlacklist: Agent = {
        ...sampleAgent,
        toolBlacklist: ['delete_file']
      }

      const canAccess = validateToolAccess('delete_file', sampleOrg, agentWithBlacklist)

      expect(canAccess).toBe(false)
    })

    it('should return false for non-existent tool', () => {
      const canAccess = validateToolAccess('fake_tool', sampleOrg, sampleAgent)

      expect(canAccess).toBe(false)
    })

    it('should respect team blacklist', () => {
      const team: Team = {
        id: 'team-test',
        name: 'Test Team',
        organizationId: 'org-test',
        toolBlacklist: ['write_file']
      } as Team

      const canAccess = validateToolAccess('write_file', sampleOrg, sampleAgent, team)

      expect(canAccess).toBe(false)
    })
  })

  describe('getToolDefinition', () => {
    it('should return tool definition by name', () => {
      const tool = getToolDefinition('read_file', sampleOrg)

      expect(tool).toBeDefined()
      expect(tool!.name).toBe('read_file')
      expect(tool!.description).toBe('Read file')
    })

    it('should return undefined for non-existent tool', () => {
      const tool = getToolDefinition('fake_tool', sampleOrg)

      expect(tool).toBeUndefined()
    })

    it('should return undefined when org has no tools', () => {
      const orgWithoutTools: Organization = {
        ...sampleOrg,
        tools: undefined
      }

      const tool = getToolDefinition('read_file', orgWithoutTools)

      expect(tool).toBeUndefined()
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle HR team with restricted delete access', () => {
      const hrTeam: Team = {
        id: 'team-hr',
        name: 'HR Team',
        organizationId: 'org-test',
        toolBlacklist: ['delete_file'] // HR can't delete files
      } as Team

      const hrAgent: Agent = {
        ...sampleAgent,
        id: 'agent-hr',
        name: 'Marcus'
      }

      const available = getAvailableTools(sampleOrg, hrAgent, hrTeam)

      expect(available.map((t) => t.name)).toContain('read_file')
      expect(available.map((t) => t.name)).toContain('write_file')
      expect(available.map((t) => t.name)).not.toContain('delete_file')
    })

    it('should handle junior developer with write/delete restrictions', () => {
      const juniorAgent: Agent = {
        ...sampleAgent,
        id: 'agent-junior',
        name: 'Junior Dev',
        toolBlacklist: ['write_file', 'delete_file'] // Read-only access
      }

      const available = getAvailableTools(sampleOrg, juniorAgent)

      expect(available.map((t) => t.name)).toEqual(['read_file', 'list_files', 'get_file_info'])
    })

    it('should handle leadership team with full access', () => {
      const leadershipTeam: Team = {
        id: 'team-leadership',
        name: 'Leadership',
        organizationId: 'org-test'
        // No toolBlacklist = full access
      } as Team

      const leaderAgent: Agent = {
        ...sampleAgent,
        id: 'agent-leader',
        name: 'Team Lead'
        // No toolBlacklist = full access
      }

      const available = getAvailableTools(sampleOrg, leaderAgent, leadershipTeam)

      expect(available).toHaveLength(5) // All tools available
    })
  })
})
```

**Verification:**

```bash
npm test tests/services/orchestrator-tools.spec.ts
# All tests should pass (25+ tests)
```

**Checkpoint:** Commit if tests pass

```bash
git add tests/services/orchestrator-tools.spec.ts
git commit -m "Add comprehensive unit tests for orchestrator tool validation"
```

---

## Task 3: Integration Test with Real Data

**File:** `tests/integration/tool-access-control.spec.ts` (NEW FILE)

**Action:** Test validation with actual organization data

**Exact Changes:**

Create new file with this content:

```typescript
import { describe, it, expect } from 'vitest'
import { getAvailableTools, validateToolAccess } from '../../app/server/services/orchestrator'
import { loadOrganization } from '../../app/server/data/organizations'
import { loadAgents } from '../../app/server/data/agents'
import { loadTeams } from '../../app/server/data/teams'

describe('Tool Access Control Integration', () => {
  it('should load org-1 with filesystem tools and validate agent access', async () => {
    const org = await loadOrganization('org-1')
    const agents = await loadAgents('org-1')
    const teams = await loadTeams('org-1')

    expect(org.tools).toBeDefined()
    expect(org.tools).toHaveLength(5)

    // Test with first agent (if any exist)
    if (agents.length > 0) {
      const agent = agents[0]
      const agentTeam = agent.teamId ? teams.find((t) => t.id === agent.teamId) : undefined

      const available = getAvailableTools(org, agent, agentTeam)

      expect(available).toBeDefined()
      expect(Array.isArray(available)).toBe(true)

      // Should have access to at least some tools (unless heavily blacklisted)
      if (!agent.toolBlacklist && !agentTeam?.toolBlacklist) {
        expect(available).toHaveLength(5) // Full access
      }
    }
  })

  it('should validate read_file access for all agents', async () => {
    const org = await loadOrganization('org-1')
    const agents = await loadAgents('org-1')
    const teams = await loadTeams('org-1')

    agents.forEach((agent) => {
      const agentTeam = agent.teamId ? teams.find((t) => t.id === agent.teamId) : undefined

      const canRead = validateToolAccess('read_file', org, agent, agentTeam)

      // Most agents should be able to read files
      // (unless specifically blacklisted)
      if (
        !agent.toolBlacklist?.includes('read_file') &&
        !agentTeam?.toolBlacklist?.includes('read_file')
      ) {
        expect(canRead).toBe(true)
      }
    })
  })

  it('should respect team-level blacklists', async () => {
    const org = await loadOrganization('org-1')
    const teams = await loadTeams('org-1')

    // Find a team with blacklist (or this test will skip)
    const restrictedTeam = teams.find((t) => t.toolBlacklist && t.toolBlacklist.length > 0)

    if (restrictedTeam) {
      const mockAgent = {
        id: 'test-agent',
        name: 'Test Agent',
        role: 'developer',
        model: 'claude-sonnet-4',
        organizationId: 'org-1',
        teamId: restrictedTeam.id
      } as any

      const available = getAvailableTools(org, mockAgent, restrictedTeam)

      restrictedTeam.toolBlacklist!.forEach((blacklistedTool) => {
        expect(available.map((t) => t.name)).not.toContain(blacklistedTool)
      })
    }
  })
})
```

**Verification:**

```bash
npm test tests/integration/tool-access-control.spec.ts
# All tests should pass
```

**Checkpoint:** Commit if tests pass

```bash
git add tests/integration/tool-access-control.spec.ts
git commit -m "Add integration tests for tool access control with real data"
```

---

## Task 4: Add Error Handling and Logging

**File:** `app/server/services/orchestrator.ts` (update existing file)

**Action:** Add validation error responses and logging

**Exact Changes:**

Find the validation functions you added earlier. Add this after `validateToolAccess`:

```typescript
/**
 * Validate tool access and throw error if denied.
 *
 * Use this in tool execution paths to reject unauthorized tool calls.
 *
 * @param toolName - Name of the tool to validate
 * @param organization - Organization containing base tool list
 * @param agent - Agent requesting tool access
 * @param team - Optional team the agent belongs to
 * @throws Error if access denied
 */
export function assertToolAccess(
  toolName: string,
  organization: Organization,
  agent: Agent,
  team?: Team
): void {
  const hasAccess = validateToolAccess(toolName, organization, agent, team)

  if (!hasAccess) {
    const teamInfo = team ? ` (team: ${team.name})` : ''
    throw new Error(
      `[SECURITY] Agent ${agent.name} (${agent.id})${teamInfo} denied access to tool: ${toolName}`
    )
  }
}
```

Add logger import at top if not already present:

```typescript
import { logger } from '../utils/logger'
```

Add logging to `getAvailableTools` function (at the end, before return):

```typescript
export function getAvailableTools(
  organization: Organization,
  agent: Agent,
  team?: Team
): MCPTool[] {
  // ... existing code ...

  // Log tool access for observability
  logger.info('[TOOLS] Tool access calculated', {
    agentId: agent.id,
    agentName: agent.name,
    teamId: team?.id,
    orgToolCount: orgTools.length,
    blacklistCount: blacklist.size,
    availableCount: filteredTools.length,
    blacklistedTools: Array.from(blacklist)
  })

  return filteredTools
}
```

**Verification:**

```bash
npm run typecheck
# Should pass
```

**Checkpoint:** Commit if typecheck passes

```bash
git add app/server/services/orchestrator.ts
git commit -m "Add assertToolAccess function and logging for tool access control"
```

---

## Task 5: Update Tests for Error Handling

**File:** `tests/services/orchestrator-tools.spec.ts` (update existing file)

**Action:** Add tests for `assertToolAccess` function

**Exact Changes:**

Add this test suite at the end of the file (before the closing `})`):

```typescript
describe('assertToolAccess', () => {
  it('should not throw for accessible tool', () => {
    expect(() => {
      assertToolAccess('read_file', sampleOrg, sampleAgent)
    }).not.toThrow()
  })

  it('should throw for blacklisted tool', () => {
    const agentWithBlacklist: Agent = {
      ...sampleAgent,
      toolBlacklist: ['delete_file']
    }

    expect(() => {
      assertToolAccess('delete_file', sampleOrg, agentWithBlacklist)
    }).toThrow('[SECURITY]')

    expect(() => {
      assertToolAccess('delete_file', sampleOrg, agentWithBlacklist)
    }).toThrow('denied access')
  })

  it('should throw for non-existent tool', () => {
    expect(() => {
      assertToolAccess('fake_tool', sampleOrg, sampleAgent)
    }).toThrow('[SECURITY]')
  })

  it('should include agent and team info in error message', () => {
    const team: Team = {
      id: 'team-test',
      name: 'Test Team',
      organizationId: 'org-test',
      toolBlacklist: ['write_file']
    } as Team

    try {
      assertToolAccess('write_file', sampleOrg, sampleAgent, team)
      fail('Should have thrown error')
    } catch (error: any) {
      expect(error.message).toContain(sampleAgent.name)
      expect(error.message).toContain(sampleAgent.id)
      expect(error.message).toContain(team.name)
      expect(error.message).toContain('write_file')
    }
  })
})
```

Don't forget to import `assertToolAccess` at the top:

```typescript
import {
  getAvailableTools,
  validateToolAccess,
  getToolDefinition,
  assertToolAccess
} from '../../app/server/services/orchestrator'
```

**Verification:**

```bash
npm test tests/services/orchestrator-tools.spec.ts
# All tests should pass (29+ tests now)
```

**Checkpoint:** Commit if tests pass

```bash
git add tests/services/orchestrator-tools.spec.ts
git commit -m "Add tests for assertToolAccess error handling"
```

---

## Final Phase 3 Verification

Run complete test suite to ensure no regressions:

```bash
# Type checking
npm run typecheck
# Should pass with no errors

# All tests
npm test
# Should maintain or improve pass rate

# Linting
npm run lint
# Should pass with no new errors
```

---

## Completion Checklist

- [ ] `getAvailableTools` function implemented with blacklist logic
- [ ] `validateToolAccess` function implemented for access checks
- [ ] `getToolDefinition` function implemented for tool lookup
- [ ] `assertToolAccess` function implemented for error handling
- [ ] Logging added for observability
- [ ] Unit tests created and passing (29+ tests)
- [ ] Integration tests created and passing
- [ ] Error messages include security context
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (all tests)
- [ ] `npm run lint` passes
- [ ] All commits made with clear messages

---

## Success Criteria

✅ **Blacklist Filtering:** Team + agent blacklists correctly combined  
✅ **Access Validation:** Agents blocked from blacklisted tools  
✅ **Error Handling:** Security errors thrown with context  
✅ **Observability:** Tool access logged for debugging  
✅ **Test Coverage:** All validation paths tested

---

## Merge to Main

```bash
# Ensure all commits are clean
git log --oneline

# Push feature branch
git push origin feature/issue-54-phase3-validation

# Create PR
gh pr create --title "[#54] Phase 3: Orchestrator Validation" --body "Implements Issue #54 - Phase 3 of Issue #51

Depends on: #52

- Added getAvailableTools with blacklist filtering
- Added validateToolAccess for access checks
- Added getToolDefinition for tool lookup
- Added assertToolAccess for security enforcement
- Comprehensive test coverage (29+ unit tests)
- Integration tests with real organization data
- Observable logging for tool access

All tests passing, ready to integrate with processor loop."

# Or direct merge:
git checkout main
git merge feature/issue-54-phase3-validation
git push origin main
```

---

## Next Phase

Once Phase 3 is complete and merged, proceed to:
**Phase 4: Processor Integration & Loop** (Issue #55)

**NOTE:** Phase 4 depends on both Phase 2 (translation) and Phase 3 (validation) being complete, as it ties everything together.

See: `.specify/features/F051-tool-integration/phase-4-implementation-plan.md`
