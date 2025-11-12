# Phase 2 Lessons Learned

**Date**: 2025-11-12 UTC
**Phase**: Bootstrap Plugin
**Duration**: ~17 minutes (10:10 - 10:27 UTC)

---

## What Went Well

### All Manual Implementation

- Bootstrap data definitions cleanly separated from in-memory stores
- Token budget validation (6M teams + 200K Marcus = 6.2M / 10M pool)
- Create initial organization function: straightforward implementation
- Load existing organizations function: proper error handling per-org
- Nitro plugin: simple orchestration logic

### Type System Correction

- Discovered duplicate InterviewSession type definitions
- Fixed by re-exporting from single source of truth (interview service)
- Prevented future type drift between persistence and interview modules

### Testing Success

- Fresh bootstrap: Created org, 6 teams, Marcus successfully
- Load existing: Properly loaded state after restart
- Multiple restarts: No data duplication verified
- Filesystem structure clean (9 files: 1 manifest + 6 teams + 1 agent + 1 gitkeep)

---

## Challenges & Solutions

### Challenge 1: Type Definition Duplication

**Problem**: Persistence layer defined its own InterviewSession type with incompatible status enum:

```typescript
// persistence/types.ts (wrong)
export type InterviewStatus = 'pending' | 'active' | 'completed' | 'cancelled'

// interview/types.ts (correct)
export type InterviewStatus = 'active' | 'pending_review' | 'completed' | 'cancelled'
```

**Impact**: TypeScript error when trying to push loaded interviews into interviewSessions array.

**Solution**: Re-export all interview types from persistence/types.ts:

```typescript
export type {
  InterviewSession,
  InterviewStatus,
  InterviewState,
  InterviewMessage
  // ... all interview types
} from '../interview/types'
```

**Lesson**: Don't duplicate type definitions across modules. Re-export from single source of truth.

---

## Technical Insights

### Bootstrap Pattern

The plugin uses simple existence check to decide between bootstrap vs load:

```typescript
const orgIds = await listOrganizations()
if (orgIds.length === 0) {
  await createInitialOrganization() // Bootstrap
} else {
  await loadExistingOrganizations() // Load
}
```

This works because:

- Filesystem is source of truth
- Empty filesystem = first run
- Any org exists = subsequent run
- No complex state management needed

### Error Handling Philosophy

Load function continues on individual org failures:

```typescript
for (const orgId of orgIds) {
  try {
    // load org, teams, agents, interviews
  } catch (error) {
    log.error({ orgId }, 'Failed to load organization, skipping')
    // Continue with other orgs
  }
}
```

This prevents one corrupt org from breaking entire startup.

### Token Budget Strategy

- Org pool: 10M tokens
- Core teams: 6M (60% allocated)
- Marcus: 200K
- Remaining: 3.8M for future agents
- Proportional allocation by team importance (Toolsmith gets 1.5M, Nurse gets 500K)

---

## Practices Confirmed

1. **Single Source of Truth for Types** - Re-export rather than duplicate
2. **Graceful Degradation** - Continue on partial failures during load
3. **Logging at Every Step** - Bootstrap plugin logs clearly show what happened
4. **Validation Before Commit** - Manual testing caught all issues before commit
5. **Simple is Better** - Nitro plugin was 30 lines, didn't need Gemini

---

## No Gemini Usage

Originally planned to use Gemini for Task 2.4 (Nitro plugin), but:

- All utilities already built (create-initial-org, load-organizations)
- Plugin just orchestrates: check existence → bootstrap or load
- 30 lines of straightforward code
- Faster to write manually than create prompt

**Decision**: Skip Gemini for simple glue code. Use for complex logic only.

---

## Metrics

- **Tasks**: 5/5 complete (all manual)
- **Lines Added**: ~220 (bootstrap-data: 85, create-initial-org: 80, load-organizations: 92, bootstrap plugin: 30, type fix: -42+1)
- **Files Created**: 4 new files
- **Files Modified**: 2 (filesystem.ts, types.ts for interview type re-export)
- **Tests**: 0 new (existing 17 tests still pass)
- **Manual Validation Time**: 15 minutes (3 test scenarios)
- **Total Phase Duration**: 17 minutes

---

## Validation Results

✅ **Test Scenario 1 - Fresh Bootstrap**:

- Server detected empty filesystem
- Created org `28b8c6e6-9b73-4a3e-af15-a31ca206414c`
- Created 6 teams (HR, Toolsmith, Library, Vault, Tools Library, Nurse)
- Created Marcus agent `7b126533-b32f-4437-9105-625c23a0399c`
- Bootstrap logs clear and informative

✅ **Test Scenario 2 - Load Existing**:

- Server restart detected 1 organization
- Loaded org with 6 teams, 1 agent, 0 interviews
- Same IDs preserved across restart
- Load logs show counts and names

✅ **Test Scenario 3 - Multiple Restarts**:

- 3+ restarts completed
- Teams: 6 (no duplication)
- Agents: 1 (no duplication)
- Filesystem: 9 files (no accumulation)

---

## Next Phase Readiness

✅ Bootstrap plugin working
✅ Organization state persists
✅ In-memory stores populated correctly
✅ All validation gates passed

> **Ready to proceed to Phase 3: Interview Persistence Hooks**

Phase 3 will add persistence hooks to interview session mutations so that interviews survive server restarts.
