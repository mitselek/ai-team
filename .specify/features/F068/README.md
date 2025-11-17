# F068: Workspace Security Refactor - Implementation Guide

**Parent Issue:** [#68](https://github.com/mitselek/ai-team/issues/68)  
**Status:** Phase 1 - Ready to Execute  
**Created:** November 18, 2025

## Quick Reference

This folder contains complete specifications for the workspace security refactor.

### Files

- **`overview.md`** - Complete feature specification, architecture, and acceptance criteria
- **`implementation-plan.md`** - Sequential sub-issue breakdown (#69-#73)
- **`brainstorm-session.md`** - Original security analysis and design session
- **`00-tests-arguments.md`** - Test requirements for F068-1 (WorkspacePermissionService)
- **`01-workspace-permission-service.prompt.md`** - Implementation prompt for F068-1
- **`README.md`** - This file

## Current Phase: F068-1 (Issue #69)

**Task:** Create WorkspacePermissionService (Foundation)

**Objective:** Build new permission validation service WITHOUT modifying existing code.

**Deliverables:**

1. New file: `app/server/services/orchestrator/workspace-permission.ts`
2. Tests: `tests/services/orchestrator/workspace-permission.spec.ts`

**Dependencies:** None

## Execution Plan (WORKFLOW Phase 3)

Following `.github/prompts/WORKFLOW.prompt.md`:

### Step 1: Generate Tests (TDD Approach - RECOMMENDED)

```bash
cd /home/michelek/Documents/github/ai-team

gemini --yolo "$(cat .github/prompts/test-generation.prompt.md)" \
  "$(cat .specify/features/F068/00-tests-arguments.md)" \
  > .specify/logs/F068-1-tests-$(date +%H%M%S).log 2>&1 &
```

**Wait for completion** (~5-10 minutes)

### Step 2: Assess Tests

```bash
# Check test generation complete
ps aux | grep gemini | grep -v grep

# Review generated tests
cat tests/services/orchestrator/workspace-permission.spec.ts | head -100

# Run tests (will fail - expected)
npm test -- tests/services/orchestrator/workspace-permission.spec.ts
```

### Step 3: Commit Tests (Split TDD Checkpoint)

```bash
git add tests/services/orchestrator/workspace-permission.spec.ts
git status
git commit -m "test(orchestrator): add WorkspacePermissionService tests (F068-1 - TDD)"
```

### Step 4: Generate Implementation

```bash
gemini --yolo "$(cat .specify/features/F068/01-workspace-permission-service.prompt.md)" \
  > .specify/logs/F068-1-impl-$(date +%H%M%S).log 2>&1 &
```

**Wait for completion** (~5-10 minutes)

### Step 5: Assess Implementation

```bash
# Verify file created
ls -lh app/server/services/orchestrator/workspace-permission.ts

# Check TypeScript
npm run typecheck

# Run tests
npm test -- tests/services/orchestrator/workspace-permission.spec.ts

# All tests should pass
```

### Step 6: Commit Implementation

```bash
git add app/server/services/orchestrator/workspace-permission.ts
git status
git commit -m "feat(orchestrator): implement WorkspacePermissionService (F068-1)

- UUID-based permission validation
- Support private/shared scope access rules
- Agent own, team, and cross-team permissions
- Leadership team read access to all shared
- Folder existence and creation validation
- Structured logging for audit trail

Closes #69, related to #68"
```

## Sub-Issue Sequence

```text
✅ F068-1 (#69) - WorkspacePermissionService (Current)
   ↓
⏸️ F068-2 (#70) - Add Scope Parameter to Tool Definitions
   ↓
⏸️ F068-3 (#71) - Update Tool Executors and MCP Layer
   ↓
⏸️ F068-4 (#72) - Integrate Permission Checking in Orchestrator
   ↓
⏸️ F068-5 (#73) - Remove Old Permission Logic and Cleanup
```

## Success Metrics (F068-1)

- [ ] Test file created: `tests/services/orchestrator/workspace-permission.spec.ts`
- [ ] Implementation file created: `app/server/services/orchestrator/workspace-permission.ts`
- [ ] All tests passing (100%)
- [ ] TypeScript compilation successful
- [ ] No modifications to existing files
- [ ] Structured logging present
- [ ] All permission rules implemented correctly
- [ ] Ready for integration in F068-4

## Testing Strategy

**Unit Tests (F068-1):**

- Agent own folder (private/shared)
- Team folder (private/shared)
- Other agent folder (shared only)
- Other team folder (shared only)
- Leadership permissions
- Folder existence checks
- Folder creation rules
- Edge cases (invalid IDs, missing data)

**Expected Coverage:** 100% for new WorkspacePermissionService

## Notes

- **Split TDD Approach:** Generate and commit tests first, then implementation
- **No Breaking Changes:** This phase doesn't touch existing code
- **Defense in Depth:** Old permission checks remain active until F068-5
- **Backward Compatible:** Service built standalone, integrated later

## Constitutional Principles Applied

- **Principle III:** Test-First Mindset (TDD approach)
- **Principle V:** Pragmatic Simplicity (single responsibility service)
- **Principle VII:** Observable Development (structured logging)
- **Principle I:** No Emojis (clean commit messages, logs)
- **Principle II:** Markdown Quality (all docs properly formatted)

## References

- Workflow: `.github/prompts/WORKFLOW.prompt.md`
- Constitution: `.specify/memory/constitution.md`
- Test template: `.github/prompts/test-generation.prompt.md`
- Dev task template: `.github/prompts/dev-task.prompt.md`
