# F068 Implementation Plan - Sequential Sub-Issues

**Parent Issue:** [#68](https://github.com/mitselek/ai-team/issues/68)  
**Strategy:** Sequential, safe implementation with backward compatibility  
**Status:** Planning

## Overview

Breaking F068 Workspace Security Refactor into 5 sequential sub-issues.
Each can be implemented, tested, and merged independently.

## Sub-Issue Breakdown

### F068-1: Create WorkspacePermissionService (Foundation)

**Goal:** Build new permission validation service in orchestrator layer

**Deliverables:**

- New file: `app/server/services/orchestrator/workspace-permission.ts`
- Permission checking logic based on UUID + scope
- Comprehensive unit tests
- No changes to existing code

**Acceptance Criteria:**

- [ ] Service validates folderId ownership (agent/team UUID)
- [ ] Service validates scope-based access (private/shared)
- [ ] Handles folder existence checks
- [ ] Handles folder creation rules (own/team folders)
- [ ] 100% test coverage for permission logic
- [ ] No breaking changes to existing code

**Dependencies:** None

**Estimated Effort:** Small (1-2 hours)

---

### F068-2: Add Scope Parameter to Tool Definitions

**Goal:** Extend tool signatures with scope parameter (backward compatible)

**Deliverables:**

- Update `app/server/services/mcp/register-tools.ts`
- Add `scope` parameter with default value for backward compatibility
- Rename `filename` to `path` with alias support
- Update tool descriptions

**Acceptance Criteria:**

- [ ] All `*_by_id` tools have `scope` parameter
- [ ] `scope` has default value (e.g., 'shared') for backward compatibility
- [ ] `path` parameter accepts both old `filename` and new `path`
- [ ] Existing tool calls still work
- [ ] TypeScript types updated
- [ ] All tests pass

**Dependencies:** None (backward compatible)

**Estimated Effort:** Small (1 hour)

---

### F068-3: Update Tool Executors and MCP Layer

**Goal:** Update tool executors to accept and use new parameters

**Deliverables:**

- Update `app/server/services/tools/f059-workspace-tools.ts`
- Update `app/server/services/mcp/file-server.ts`
- Remove folderId cache/generation logic
- Construct paths using UUID + scope + path

**Acceptance Criteria:**

- [ ] Tool executors accept `scope` and `path` parameters
- [ ] MCP layer constructs paths: `{orgId}/workspaces/{folderId}/{scope}/{path}`
- [ ] folderId cache removed
- [ ] Backward compatibility maintained (handle missing scope gracefully)
- [ ] All tests updated and passing

**Dependencies:** F068-2 (tool definitions updated)

**Estimated Effort:** Medium (2-3 hours)

---

### F068-4: Integrate Permission Checking in Orchestrator

**Goal:** Add permission validation before MCP tool calls

**Deliverables:**

- Update `app/server/services/orchestrator.ts`
- Add permission check before file tool execution
- Use WorkspacePermissionService from F068-1
- Return permission errors to agent

**Acceptance Criteria:**

- [ ] Orchestrator validates permissions before MCP calls
- [ ] Permission failures return clear error messages
- [ ] Existing MCP permission checks still active (defense in depth)
- [ ] All tests pass
- [ ] No breaking changes to tool behavior

**Dependencies:** F068-1 (WorkspacePermissionService exists), F068-3 (executors updated)

**Estimated Effort:** Medium (2-3 hours)

---

### F068-5: Remove Old Permission Logic and Cleanup

**Goal:** Remove path-based permission checking from MCP layer

**Deliverables:**

- Simplify `app/server/services/persistence/file-workspace.ts`
- Remove `WorkspaceAccessService` calls from MCP
- Remove `extractWorkspaceInfo()` method
- Remove agentId/organizationId parameters from FilesystemService
- Update all tests

**Acceptance Criteria:**

- [ ] FilesystemService has no permission checking
- [ ] `WorkspaceAccessService.extractWorkspaceInfo()` removed
- [ ] MCP layer only executes filesystem operations
- [ ] All tests updated and passing
- [ ] No path parsing to extract IDs
- [ ] Clean separation: Orchestrator = security, MCP = execution

**Dependencies:** F068-4 (orchestrator permission checking active)

**Estimated Effort:** Medium (2-3 hours)

---

## Implementation Order

```text
F068-1 (Foundation)
   ↓
F068-2 (Tool Definitions) - Can run parallel to F068-1
   ↓
F068-3 (Tool Executors)
   ↓
F068-4 (Orchestrator Integration)
   ↓
F068-5 (Cleanup)
```

## Testing Strategy

**Per Sub-Issue:**

- Unit tests for new code
- Integration tests updated for changes
- All existing tests must pass before merge

**Final Validation (After F068-5):**

- Full regression test suite
- Security validation tests
- Performance testing
- Manual testing of all file operation scenarios

## Rollback Plan

Each sub-issue is independently reversible:

- F068-1: Delete new service file
- F068-2: Revert tool definitions (backward compatible, no breaking change)
- F068-3: Revert executors
- F068-4: Remove orchestrator permission checks
- F068-5: Restore old permission logic

## Success Metrics

- [ ] All sub-issues implemented and merged
- [ ] Zero regressions in existing functionality
- [ ] 100% test coverage maintained
- [ ] No path parsing to extract IDs
- [ ] Clear separation of concerns achieved
- [ ] Security vulnerability resolved

## Notes

- Each sub-issue should be a separate GitHub issue
- Each should reference parent issue #68
- Use labels: `security`, `refactor`, `f068-sub-issue`
- Create feature branches: `feature/f068-1-permission-service`, etc.
