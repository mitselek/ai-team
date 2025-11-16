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
