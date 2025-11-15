# Fix Failing Security Tests - Issue nr 50

## Task Context

Issue nr 50: Fix 27 failing security tests in the filesystem security test suite.

**Current State**: 23/50 tests passing (46%)  
**Target State**: 46-47/50 tests passing (92-94%)  
**Estimated Effort**: 2.5 hours across 3 phases

## Critical Constraints

### DO NOT MODIFY

- **types/index.ts** - All type definitions are final
- **Test file structure** - Keep existing test organization
- **Security test expectations** - Tests define the contract, implementation must match
- **.specify/memory/constitution.md** - Follow all 12 principles

### MUST PRESERVE

- **Existing test coverage** - 523/550 tests must remain passing
- **Security controls** - All identity validation, permission checks, audit logging
- **API contracts** - No breaking changes to FilesystemService, PermissionService, AuditService
- **Type safety** - Maintain strict TypeScript compliance

## Implementation Plan (From Issue nr 50)

### Phase 1: Async/Await Fixes (30 min, 13 tests)

**Root Cause**: Permission checks return `Promise<boolean>` but some callers don't await.

**Files to Update**:

- `app/server/services/persistence/filesystem.service.ts`
- `app/server/services/orchestrator.ts` (if needed)
- `tests/security/filesystem-security.spec.ts` (if test expectations wrong)

**Changes Required**:

1. **Find all permission check calls** without await:

   ```typescript
   // WRONG - missing await
   const hasAccess = permissionService.checkFileAccess(agentId, path, operation)

   // CORRECT
   const hasAccess = await permissionService.checkFileAccess(agentId, path, operation)
   ```

2. **Ensure calling functions are async**:
   - If function calls `checkFileAccess`, it must be `async`
   - If function is already async, just add `await`
   - If function is sync, make it async and update callers

3. **Fix test expectations** (if tests are wrong):
   - Some tests may expect sync behavior
   - Update to properly await async assertions

**Success Criteria**:

- ✅ All 13 permission-related tests passing
- ✅ No `Promise {…}` in test output (means missing await)
- ✅ No race conditions introduced
- ✅ Proper error handling for rejected promises

**Validation Command**:

```bash
npm test tests/security/filesystem-security.spec.ts -- --reporter=verbose
```

**Expected Result**: Test count increases from 23/50 to 36/50 passing (72%)

---

### Phase 2: AuditService.query() Implementation (1.5 hours, 6 tests)

**Root Cause**: `AuditService.query()` method doesn't exist. Tests expect to query audit logs by filters.

**Files to Update**:

- `app/server/services/persistence/audit.ts`

**Changes Required**:

1. **Add query method to AuditService**:

   ```typescript
   async query(filters: AuditFilters): Promise<AuditEntry[]> {
     // Read audit log file
     const logContent = await readFile(this.logPath, 'utf-8')

     // Parse JSON Lines format (one JSON object per line)
     const lines = logContent.trim().split('\n').filter(line => line.length > 0)
     const entries: AuditEntry[] = lines.map(line => JSON.parse(line))

     // Apply filters
     return entries.filter(entry => {
       if (filters.agentId && entry.agentId !== filters.agentId) return false
       if (filters.operation && entry.operation !== filters.operation) return false
       if (filters.path && !entry.path.startsWith(filters.path)) return false
       if (filters.startDate && entry.timestamp < filters.startDate) return false
       if (filters.endDate && entry.timestamp > filters.endDate) return false
       return true
     })
   }
   ```

2. **Handle edge cases**:
   - Empty log file (no entries yet)
   - Invalid JSON lines (corrupted log)
   - Missing log file (not created yet)

3. **Add error handling**:
   ```typescript
   try {
     const logContent = await readFile(this.logPath, 'utf-8')
     // ... parse and filter
   } catch (error) {
     if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
       return [] // No log file yet, return empty array
     }
     throw error // Re-throw other errors
   }
   ```

**Success Criteria**:

- ✅ `AuditService.query()` method exists
- ✅ Supports all filter types (agentId, operation, path, dates)
- ✅ Returns empty array if no matches or no log file
- ✅ All 6 audit tests passing

**Validation Command**:

```bash
npm test tests/security/filesystem-security.spec.ts -- --grep="Audit Logging"
```

**Expected Result**: Test count increases from 36/50 to 42/50 passing (84%)

---

### Phase 3: Error Message Standardization (30 min, 4-5 tests)

**Root Cause**: Error messages don't match test expectations exactly.

**Files to Update**:

- `app/server/services/persistence/filesystem.service.ts`
- `app/server/services/persistence/permissions.ts`

**Changes Required**:

1. **Find error message mismatches** in test output:

   ```
   expected error including 'File type not allowed' but got 'File extension .exe not allowed'
   expected error including 'Path traversal detected' but got 'ENOENT: no such file or directory'
   ```

2. **Standardize error messages**:
   - Path traversal: "Path traversal attempt detected"
   - File type: "File type not allowed"
   - Absolute path: "Path must be relative"
   - Missing extension: "File type not allowed"
   - Boundary violation: "Access denied: outside workspace"

3. **Update error throws**:

   ```typescript
   // BEFORE
   throw new Error(`File extension ${ext} not allowed`)

   // AFTER
   throw new Error('File type not allowed')
   ```

4. **Add missing validations** (if tests reveal gaps):
   - Absolute path detection (`path.startsWith('/')`)
   - Missing extension detection (`!path.includes('.')`)
   - Special character filtering

**Success Criteria**:

- ✅ Error messages match test expectations exactly
- ✅ All validation tests passing
- ✅ Error messages are user-friendly
- ✅ 4-5 additional tests passing

**Validation Command**:

```bash
npm test tests/security/filesystem-security.spec.ts
```

**Expected Result**: Test count reaches 46-47/50 passing (92-94%)

---

## Overall Success Criteria

- ✅ **46-47 out of 50 tests passing** (92-94% pass rate)
- ✅ All async/await issues resolved
- ✅ AuditService fully functional with query support
- ✅ Error messages standardized and helpful
- ✅ **No regressions** in existing test suite (maintain 523/550 overall - 95.1%)
- ✅ TypeScript strict mode passing
- ✅ ESLint passing
- ✅ Constitution principles maintained

## Validation Checklist

After each phase, verify:

- [ ] Phase-specific tests passing (see phase success criteria)
- [ ] No new TypeScript errors: `npm run typecheck`
- [ ] No new lint errors: `npm run lint`
- [ ] No regressions in other tests: `npm test -- --run`
- [ ] Git working tree clean after commit

Final validation:

- [ ] Security test suite: 46-47/50 tests passing
- [ ] Overall test suite: ≥523/550 tests passing (≥95.1%)
- [ ] All quality gates passing (typecheck, lint, tests)
- [ ] Clean git history (3 commits: Phase 1, Phase 2, Phase 3)

## Test Files Reference

**Main test file**: `tests/security/filesystem-security.spec.ts` (713 lines, 50 tests)

**Test categories** (from Issue nr 49):

1. Path Traversal Attack Prevention (8 tests)
2. Agent Impersonation Prevention (5 tests)
3. Privilege Escalation Prevention (8 tests)
4. Workspace Boundary Violations (8 tests)
5. Quota Enforcement (4 tests)
6. Audit Logging Integrity (6 tests)
7. Error Information Disclosure Prevention (3 tests)
8. Concurrent Access Control (3 tests)
9. Integration with Orchestrator (3 tests)
10. File Type Validation (3 tests)

## Implementation Order

**IMPORTANT**: Implement phases sequentially, not in parallel.

1. **Phase 1 first** - Fixes foundational async issues that may affect later phases
2. **Phase 2 second** - Adds missing functionality
3. **Phase 3 last** - Polishes error messages

After **each phase**:

1. Run phase-specific validation command
2. Verify expected test count increase
3. Run full test suite to check for regressions
4. Commit with descriptive message
5. Only then proceed to next phase

## Git Workflow

**After Phase 1**:

```bash
git add app/server/services/persistence/filesystem.service.ts
git add app/server/services/orchestrator.ts  # if modified
git status  # Verify staged files
git commit -m "fix: add missing await to permission checks in filesystem operations

Resolves async/await issues causing 13 test failures in security test suite.
Permission checks now properly awaited, eliminating race conditions.

Phase 1 of Issue nr 50: 36/50 tests now passing (72%)"
git status  # MUST show "nothing to commit, working tree clean"
```

**After Phase 2**:

```bash
git add app/server/services/persistence/audit.ts
git status
git commit -m "feat: implement AuditService.query() for log filtering

Adds query method supporting filters: agentId, operation, path, date range.
Handles edge cases: empty logs, missing files, invalid JSON.

Phase 2 of Issue nr 50: 42/50 tests now passing (84%)"
git status  # Clean tree
```

**After Phase 3**:

```bash
git add app/server/services/persistence/filesystem.service.ts
git add app/server/services/persistence/permissions.ts
git status
git commit -m "fix: standardize error messages for security validation

Updates error messages to match test expectations:
- Path traversal: 'Path traversal attempt detected'
- File type: 'File type not allowed'
- Missing path validations added

Phase 3 of Issue nr 50: 46-47/50 tests now passing (92-94%)"
git status  # Clean tree
```

## Notes

- **Focus on tests** - Let the failing tests guide the fixes
- **One phase at a time** - Don't jump ahead or try to fix everything at once
- **Preserve existing behavior** - Only fix what's broken, don't refactor
- **Test frequently** - Run validation after each fix to catch regressions early
- **Constitutional compliance** - Follow Type Safety, Test-First, Observable Development principles

## Reference Documentation

- **Issue nr 50**: https://github.com/mitselek/ai-team/issues/50
- **Issue nr 49**: Security testing and documentation (parent)
- **Security audit**: `docs/security/SECURITY_AUDIT.md`
- **Security policy**: `SECURITY.md`
- **Constitution**: `.specify/memory/constitution.md`
