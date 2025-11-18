# Architectural Decisions

This document serves as an index to major architectural design sessions and decisions made during the development of AI Team.

## Purpose

Captures the "why" behind significant architectural choices. Each entry links to detailed brainstorming sessions where requirements, constraints, and design alternatives were explored.

## Brainstorming Sessions

### Agent Filesystem Access System (November 14, 2025)

**Session Document:** [`.github/ISSUE_TEMPLATE/agent-filesystem-access.md`](../../.github/ISSUE_TEMPLATE/agent-filesystem-access.md)

**Context:** First major brainstorming session using structured methodology (one question at a time, building understanding incrementally).

**Key Decisions:**

- Workspace structure: Agent (private/shared) and Team (private/shared) folders
- Permission model: Owner-based for agents, role-based for teams
- Configurable quotas: File count, storage size, per-file limits
- MCP architecture: Orchestrator as security gateway, MCP file server for operations
- File type whitelist: Text, documents, data, images (security constraint)
- Audit logging: Track all operations with agent identity

**Implementation Status:** Completed as F012 (filesystem persistence) and related features.

**Outcome:** Led to creation of [`brainstorm.prompt.md`](../../.github/prompts/brainstorm.prompt.md) workflow template based on session success.

---

### Tool Integration into Agent Execution Loop (November 2025)

**Session Document:** [`.specify/features/F051-tool-integration/brainstorming-session.md`](../features/F051-tool-integration/brainstorming-session.md)

**Context:** Design session for integrating MCP tools into agent task execution. Required understanding how LLM decides tool usage, how to validate permissions, and how to handle results.

**Key Decisions:**

1. **Autonomy:** LLM decides tool usage autonomously (no pre-defined workflows)
2. **Validation Chain:** agentId → org tools → team blacklist → agent blacklist → permissions
3. **Tool Access:** All agents get all org tools (filtered by blacklists)
4. **MCP as Canonical:** MCP format is single source of truth, translate per-provider
5. **Error Handling:** Return errors to LLM in conversation for recovery
6. **Conversation State:** Processor maintains full history array
7. **Loop Protection:** Max 20 tool calls per task (MVP, needs research)
8. **Result Handling:** Simple extraction (extensible for summarization later)
9. **Tool Loading:** At agent initialization with reload mechanisms
10. **Provider Translation:** In provider files (anthropic.ts, openai.ts, google.ts)
11. **Configuration Model:** org.tools (whitelist), team/agent.toolBlacklist (restrictions)
12. **Security:** Orchestrator validates every tool call, maintains audit trail

**External Research:** Validated against 30+ citations from existing MCP implementations (GitHub Copilot, Claude Desktop, etc.).

**Implementation Status:** Planned in 4 phases (Issues #52-#55), estimated 13-17 hours.

**Open Questions:** Loop protection mechanisms (Issue #56 for future brainstorming).

---

### Agent Workspace Awareness - Folder-Based Operations (November 16, 2025)

**Session Document:** [`.specify/features/F059-workspace-awareness/brainstorming-session.md`](../features/F059-workspace-awareness/brainstorming-session.md)

**GitHub Issue:** [#59](https://github.com/mitselek/ai-team/issues/59)

**Status:** ✅ Design Complete - Ready for Implementation

**Context:** During F051 design review, discovered agents lack knowledge of workspace structure. Path-based file operations require explicit user guidance. "Permission errors" often mask "unknown path" issues.

**Key Decisions:**

1. **Discovery-First Workflow:** Replace path construction with folder discovery using unique folderIds
2. **Five Discovery Scopes:** `my_private`, `my_shared`, `team_private`, `team_shared`, `org_shared` (matches agent mental model)
3. **Folder-Based Addressing:** `list_folders(scope)` returns folderIds, operations use `folderId + filename`
4. **FolderId Strategy:** Ephemeral (UUID v4) for MVP, 30-minute TTL in in-memory cache
5. **Context-Only Pattern:** `agentId` from ExecutionContext, not tool parameters (matches F051 filesystem tools)
6. **Library Team Handling:** No special scope - appears in `org_shared` like other teams
7. **Migration Path:** Two-phase: (1) Filesystem structure migration (agents/ → workspaces/), (2) Tool migration (co-existence → deprecate → remove)
8. **Error Messages:** Actionable errors that guide agents (suggest `list_folders()`, show available files)
9. **Subfolder Strategy:** Flatten filenames in MVP (e.g., `"reports/weekly.md"`), can add nested discovery later
10. **Auto-Create Folders:** Folders created on first write operation (no explicit create_folder tool)
11. **Rich Metadata:** Discovery returns filename, size, modified timestamp, mimeType for informed decisions
12. **Unified Workspace Structure:** `/workspaces/{uuid}/private|shared/` for both agents and teams
13. **Five New Tools:** `list_folders`, `read_file_by_id`, `write_file_by_id`, `delete_file_by_id`, `get_file_info_by_id`
14. **org_shared Exclusion:** Agent's own shared folder NOT included in org_shared (use `my_shared` instead)

**Whitelist Architecture (Future Refactoring):**

During brainstorming, identified opportunity to improve F051 tool access control from blacklist to whitelist:

**Current F051 Approach (PR #58):**

- Tools defined in `org.tools: MCPTool[]` (mixed definition + config)
- Access control via blacklists (default-allow)
- Decision: Merge PR #58 as-is, refactor separately

**Future Whitelist Design:**

- Tool Registry: System-level registry in code (`app/server/services/mcp/tool-registry.ts`)
- Three-level whitelists: `org.toolWhitelist`, `team.toolWhitelist`, `agent.toolWhitelist`
- Access Logic: Intersection of all three levels (default-deny, principle of least privilege)
- Separation: Tool definitions (code) vs access control (config)

**Refactoring Plan:**

- Merge F051 PR #58 to main (blacklist working, 100% test coverage)
- Create separate issue for whitelist refactoring with backward compatibility
- F059 can implement with either pattern (will use current blacklist pattern initially)

**Implementation Phases:**

1. **Phase 1:** Type Definitions & FolderId Strategy (3-4 hours)
2. **Phase 2:** Folder Discovery (`list_folders`) (5-6 hours)
3. **Phase 3:** File Operations by ID (4 new tools) (6-7 hours)
4. **Phase 4:** Migration & Documentation (2-3 hours)

**Total Estimated Time:** 16-20 hours

**Implementation Status:** Design finalized November 16, 2025. Ready for sub-issue creation.

**Future Enhancements:**

- Pagination for large `org_shared` results (if needed)
- Nested folder discovery with depth parameter (if agents struggle with flat lists)
- Batch file operations (read/write multiple files)

---

### Agent Roster & Organizational Awareness (November 18, 2025)

**Session Document:** [`.specify/features/F074-agent-roster/README.md`](../features/F074-agent-roster/README.md)

**GitHub Issue:** [#74](https://github.com/mitselek/ai-team/issues/74)

**Status:** ✅ Design Complete - Ready for Implementation

**Context:** Agents operate in isolation without awareness of colleagues, expertise, availability, or organizational hierarchy. Cannot make intelligent delegation decisions or collaborate effectively.

**Consultant:** Elena Rodriguez (Prompt Engineering Specialist) - Expert consultation on prompt design and agent awareness patterns.

**Key Decisions:**

1. **Hybrid Architecture:** System Prompt (static framework) + Runtime Context (dynamic roster)
   - System Prompt Only: Stale data (status/workload changes frequently) → bad delegation decisions
   - Runtime Only: No persistent delegation framework or principles → inconsistent behavior
   - Hybrid: Best of both worlds - framework persists, data stays fresh

2. **Organizational Context Template:** Appended to agent system prompts at creation
   - Agent's identity, role, team, hierarchy position
   - Delegation principles and framework
   - 5-priority decision logic
   - Error handling patterns
   - Self-regulation guidelines (workload awareness)

3. **Roster Tool:** `get_organization_roster` - Runtime query for fresh colleague data
   - Filters: `all` | `my_team` | `available` | `by_expertise`
   - Returns: id, name, role, team, expertise, status, workload, seniorId
   - Fresh data every query (no caching of colleague status)

4. **5-Priority Delegation Framework:**
   1. Best same-team match (expertise + available)
   2. Partial expertise same-team (can learn with guidance)
   3. Best cross-team match (note coordination overhead)
   4. Queue for primary expert (if wait time < urgency timeline)
   5. Escalate to senior/manager (no suitable match or critical urgency)

5. **Agent Status Values:**
   - `idle`: Low workload, available for tasks
   - `active`: Moderate workload, can accept tasks
   - `busy`: At/near capacity (4-5/5 tasks), evaluate carefully
   - `offline`: Not available, do not delegate

6. **Workload Tracking:** X/5 task capacity model
   - < 4/5: Good capacity for delegation
   - 4/5: Approaching capacity, consider carefully
   - 5/5: At capacity, only urgent tasks or queue
   - Tracked at orchestrator level on task assignment/completion

7. **Delegation Decision Format:** Structured logging for audit trail

   ```text
   DELEGATION DECISION:
   Primary Choice: {name} ({reason})
   Fallback: {backup} ({reason})
   Decision: DELEGATE | QUEUE | ESCALATE
   Reasoning: {1-2 sentence explanation}
   Wait Time: {if queuing}
   ```

8. **Orchestrator vs Agent Responsibilities:**
   - **Agent:** Make routing decisions, apply delegation framework, log reasoning
   - **Orchestrator:** Notify receiving agent, track delegation chains, prevent loops, enforce capacity limits, auto-escalate stale queued tasks, maintain audit trail
   - Clear boundary: Agents decide routing, orchestrator handles execution

9. **Error Handling Patterns:**
   - Colleague not in roster → Escalate to manager
   - Colleague offline → Queue or escalate depending on urgency
   - No suitable expertise → Escalate to manager for guidance
   - Delegation loop detected → Escalate to prevent infinite loops

10. **Data Model Changes (Non-Breaking):**
    - `Agent.currentWorkload?: number` (0-5, defaults to 0)
    - `Agent.expertise?: string[]` (skills/domains)
    - Both optional, backward compatible

11. **System Prompt Builder:** New utility `buildAgentPrompt(agent, customPrompt, orgContext)`
    - Merges custom agent prompt + organizational context template
    - Fills template variables: {agent_name}, {agent_role}, {agent_team}, {senior_name}, etc.
    - Single source of truth for agent prompt construction

12. **Scale Considerations:**
    - MVP (6-10 agents): Return full roster (simple, works fine)
    - Growth (20-50 agents): Still full roster, agents filter using tool parameters
    - Future (50+ agents): Return filtered roster by default (my_team + frequent collaborators)

**Implementation Phases:**

1. **Phase 1 - Core Infrastructure (4 tasks):**
   - Create organizational context template
   - Implement roster tool executor
   - Register roster tool in orchestrator
   - Build system prompt utility

2. **Phase 2 - Integration (3 tasks):**
   - Update agent creation workflow
   - Add workload tracking to Agent type
   - Connect task assignment flow to workload updates

3. **Phase 3 - Testing & Refinement (3 tasks):**
   - Test delegation scenarios (senior→junior, peer, cross-team, queue, escalate)
   - Test edge cases (unknown colleague, offline, loops, overflow, expertise mismatch)
   - Update documentation (agent creation, roster tool usage, delegation best practices)

**Total Estimated Time:** 4-6 hours (can be done YOLO mode like F068)

**Implementation Status:** Design finalized November 18, 2025 as F074. GitHub issue #74 created. Ready for implementation.

**Key Insights from Brainstorming:**

- Elena's methodical questioning clarified requirements effectively
- Separation of static (framework) vs dynamic (data) prevents stale information problems
- Delegation is a routing problem, not a notification problem
- Explicit decision logging more important than real-time communication for distributed agent systems
- Audit trail enables debugging of complex delegation chains

**Dependencies:**

- Requires: Agent data structure, Team data structure, Task assignment system, Agent creation workflow (all exist)
- Blocks: Advanced delegation analytics, Workload optimization algorithms, Team capacity planning

**Related Features:**

- F008: HR Interview Workflow (agent creation)
- F014: Multi-model LLM Support (affects agent execution)
- #60: Agent Roster Page (parent issue - UI aspect separate from this backend feature)

---

## Decision Patterns

### Security-First Approach

Multiple decisions reflect security-first mindset:

- Orchestrator as security gateway (filesystem, tool integration)
- Explicit permission validation at every boundary
- Audit logging for all sensitive operations
- File type whitelists rather than blacklists
- Agent identity validation with LOUD failures

### Composable Architecture

Consistent pattern of separation:

- MCP servers provide tools (implementation)
- Orchestrator validates access (security)
- Processor manages conversation (coordination)
- LLM makes decisions (reasoning)

Each component has clear boundaries and responsibilities.

### Progressive Enhancement

Features designed with MVP + extensibility:

- Tool integration: Simple extraction now, summarization later
- Loop protection: Fixed limit (MVP), intelligent detection (future)
- Filesystem quotas: Warn at 100%, block at 110% (gives grace period)

### External Validation

When uncertain about patterns:

- Research existing implementations (MCP servers, GitHub Copilot)
- Validate against industry standards (JSON Schema, MCP protocol)
- Document research findings (e.g., MCP Filesystem Tools report)

## Related Documents

- **Constitution:** [`.specify/memory/constitution.md`](constitution.md) - Governance and principles
- **Lessons Learned:** [`.specify/memory/lessons-learned.md`](lessons-learned.md) - Development insights
- **Feature Specs:** [`.specify/features/`](../features/) - Detailed feature planning
- **Brainstorming Workflow:** [`.github/prompts/brainstorm.prompt.md`](../../.github/prompts/brainstorm.prompt.md) - Methodology

## Adding New Decisions

When conducting brainstorming sessions:

1. Create detailed session document (in feature folder or ISSUE_TEMPLATE)
2. Add entry to this index with:
   - Date
   - Link to session document
   - Context (why the session was needed)
   - Key decisions (numbered list)
   - Implementation status
   - Open questions (if any)
3. Update related feature specs with references
4. Consider updating [`lessons-learned.md`](lessons-learned.md) if workflow insights emerge

## Archive Policy

Architectural decisions remain in this index even after implementation. The "why" is valuable for:

- Understanding design constraints when modifying features
- Avoiding repeated debates on settled questions
- Onboarding new contributors
- Documenting evolution of system thinking
