````prompt
# Sequential Issue Implementation Workflow

You are working on the "AI Team" project - a Nuxt 3 application for asynchronous AI agent orchestration. You will implement a sequence of GitHub issues following an iterative workflow with minimal human interruption.

## User Input

$ISSUE_NUMBERS (example: "32 33 34 35 36 37 38" or "32-38")

## Your Mission

Implement the specified GitHub issues **sequentially** in the order provided, following the Split TDD approach from WORKFLOW.md. Each issue will follow this cycle:

```text
ISSUE N:
  1. ANALYZE → Read issue, gather context
  2. TEST → Generate tests first (TDD)
  3. ASSESS → Verify tests, commit
  4. IMPLEMENT → Write production code
  5. ASSESS → Verify implementation, commit
  6. CONTINUE → Move to next issue
```

## Critical Workflow Principles

### Split TDD Approach (MANDATORY)

1. **Tests First**: Generate tests for the issue BEFORE implementation
2. **Commit Tests**: Tests become the frozen contract
3. **Implement Second**: Production code adapts to test expectations
4. **Benefits**: Clear interface contract, self-healing code, better error messages

### Minimal Interruption Philosophy

- Work through ALL issues in sequence automatically
- Only stop if CRITICAL blocking issue (cannot proceed)
- Minor fixes handled inline (don't ask for permission)
- Progress updates at major phase transitions
- Final summary when all issues complete

### Quality Gates (NON-NEGOTIABLE)

Before ANY commit:
- ✅ `npm run typecheck` must pass
- ✅ `npm run lint` must pass
- ✅ `npm test` must pass (or tests explicitly expected to fail for TDD)

## Phase-by-Phase Instructions

### PHASE 1: ANALYZE (Per Issue)

**Input**: GitHub issue number

**Steps**:

1. Fetch issue details:
   ```bash
   gh issue view [NUMBER] --json title,body,labels
   ```

2. Parse the issue body to extract:
   - Objective
   - Changes Required (files, code examples)
   - Acceptance Criteria
   - Dependencies

3. Gather context from codebase:
   - Read affected files (implementation targets)
   - Read related files for patterns (reference code)
   - Understand type definitions if needed
   - Check for dependencies on previous issues

4. Print analysis summary:
   ```text
   == ISSUE #N: [TITLE] ==

   Objective: [one sentence]

   Files to modify:
   - path/to/file.ts (add function X)
   - path/to/other.ts (update interface Y)

   Context gathered:
   - Read implementation.ts (lines 1-100)
   - Read types.ts (interface definition)
   - Read reference-pattern.ts (similar code)

   Ready to generate tests.
   ```

**Output**: Clear understanding of what needs to be built

### PHASE 2: TEST GENERATION (Split TDD)

**Input**: Issue requirements and gathered context

**Steps**:

1. Determine test file path based on code location:
   - API: `tests/api/[feature].spec.ts`
   - Service: `tests/services/[feature]/[module].spec.ts`
   - Composable: `tests/composables/[name].spec.ts`
   - Utility: `tests/utils/[name].spec.ts`

2. Use test-generation prompt with issue acceptance criteria:
   ```bash
   # Create test spec from issue requirements
   cat > /tmp/test-spec.md << 'EOF'
   ## Feature: [Issue Title]

   ### Test Requirements
   [Extract from acceptance criteria]

   ### Files Under Test
   [List implementation files]

   ### Test Cases Required
   - Success case: [from acceptance criteria]
   - Error case: [validation errors]
   - Edge case: [boundary conditions]
   EOF

   gemini --yolo "$(cat .github/prompts/test-generation.prompt.md)" \
     "$(cat /tmp/test-spec.md)" \
     > test-gen-issue-[N].log 2>&1
   ```

3. **Wait for completion** (5-10 minutes, DO NOT INTERRUPT)

4. Verify test file created:
   ```bash
   ls -lh tests/[path]/[file].spec.ts
   wc -l tests/[path]/[file].spec.ts
   ```

5. Print test generation summary:
   ```text
   == TEST GENERATION COMPLETE ==

   Created: tests/path/to/feature.spec.ts (142 lines)
   Test suites: 3
   Test cases: 12

   Next: Assess tests
   ```

**Output**: Test file created, implementation contract defined

### PHASE 3: ASSESS TESTS

**Input**: Generated test file

**Steps**:

1. Run quality checks (tests WILL fail - that's expected TDD):
   ```bash
   npm run typecheck  # Must pass
   npm run lint       # Must pass
   npm test           # Expected to fail (no implementation yet)
   ```

2. Review test file for issues:
   - Import paths correct? (@@/types for root types, relative for services)
   - Logger mocked properly?
   - All required type fields present?
   - Test descriptions clear?

3. Fix any issues found:
   - Fix import paths if wrong
   - Fix type issues
   - Fix test structure
   - DO NOT modify implementation (doesn't exist yet)

4. Re-run quality checks:
   ```bash
   npm run typecheck  # Must pass now
   npm run lint       # Must pass now
   npm test           # Still failing (expected)
   ```

5. Print assessment summary:
   ```text
   == TESTS ASSESSED ==

   TypeCheck: ✅ PASS
   Lint: ✅ PASS
   Tests: ❌ FAIL (expected - no implementation)

   Failing tests (8 total):
   - should create agent from interview
   - should assign correct team
   [... more ...]

   Tests define the contract. Ready to commit.
   ```

**Output**: Clean, passing type/lint checks, failing tests define contract

### PHASE 4: COMMIT TESTS

**Input**: Assessed test file

**Steps**:

1. Stage test file only:
   ```bash
   git add tests/[path]/[file].spec.ts
   ```

2. Verify staged changes:
   ```bash
   git status
   git diff --cached --stat
   ```

3. Create commit with conventional format:
   ```bash
   git commit -m "test(scope): add tests for [feature] (Issue #N - TDD)"
   ```

4. Verify commit and clean tree:
   ```bash
   git log --oneline -1
   git status  # Should show "working tree clean"
   ```

5. Print commit summary:
   ```text
   == TESTS COMMITTED ==

   Commit: abc1234 test(interview): add tests for team assignment (Issue #32 - TDD)
   Files: 1 changed, 142 insertions(+)
   Status: Working tree clean

   Test contract frozen. Next: Implementation
   ```

**Output**: Tests committed, contract frozen, ready for implementation

### PHASE 5: IMPLEMENTATION

**Input**: Issue requirements, committed tests, gathered context

**Steps**:

1. Create implementation task spec from issue:
   ```bash
   cat > /tmp/impl-spec.md << 'EOF'
   ## Implementation: [Issue Title]

   ### Objective
   [From issue]

   ### Files to Modify
   [From issue "Changes Required" section]

   ### Code Changes
   [Include code examples from issue]

   ### Acceptance Criteria
   [From issue - these are now validated by tests]

   ### Reference Files
   [Similar code for patterns]

   ### Type Definitions
   [Include relevant types from types/index.ts]

   ### Validation
   The tests in tests/[path]/[file].spec.ts MUST pass after implementation.
   EOF
   ```

2. Use dev-task prompt with implementation spec:
   ```bash
   gemini --yolo "$(cat .github/prompts/dev-task.prompt.md)" \
     "$(cat /tmp/impl-spec.md)" \
     > impl-issue-[N].log 2>&1
   ```

3. **Wait for completion** (5-10 minutes, DO NOT INTERRUPT)

4. Verify implementation files created/modified:
   ```bash
   git status
   git diff --stat
   ```

5. Print implementation summary:
   ```text
   == IMPLEMENTATION COMPLETE ==

   Modified:
   - app/server/services/interview/hr-specialist.ts (+45, -10)
   - app/server/services/interview/workflow.ts (+23, -5)

   New:
   - app/server/services/interview/team-analyzer.ts (87 lines)

   Next: Assess implementation
   ```

**Output**: Production code created/modified

### PHASE 6: ASSESS IMPLEMENTATION

**Input**: Generated implementation code

**Steps**:

1. Run full quality checks (tests SHOULD pass now):
   ```bash
   npm run typecheck  # Must pass
   npm run lint       # Must pass
   npm test           # Must pass now
   ```

2. Review implementation:
   - All acceptance criteria met?
   - Tests passing?
   - Code follows patterns?
   - Import paths correct?

3. Fix issues if found:
   - Fix type errors
   - Fix failing tests (update implementation, NOT tests)
   - Fix lint issues
   - Re-run checks until all pass

4. Print assessment summary:
   ```text
   == IMPLEMENTATION ASSESSED ==

   TypeCheck: ✅ PASS
   Lint: ✅ PASS
   Tests: ✅ PASS (8/8 tests passing)

   Test results:
   ✓ should create agent from interview
   ✓ should assign correct team for backend role
   ✓ should assign correct team for frontend role
   [... 5 more ...]

   All acceptance criteria met. Ready to commit.
   ```

**Output**: All checks passing, implementation complete

### PHASE 7: COMMIT IMPLEMENTATION

**Input**: Assessed implementation

**Steps**:

1. Stage implementation files:
   ```bash
   git add [implementation files from issue]
   ```

2. Verify staged changes:
   ```bash
   git status
   git diff --cached --stat
   ```

3. Create commit referencing issue:
   ```bash
   git commit -m "feat(scope): implement [feature] (closes #N)"
   ```

4. Verify commit and clean tree:
   ```bash
   git log --oneline -1
   git status  # Must show "working tree clean"
   ```

5. Print commit summary:
   ```text
   == IMPLEMENTATION COMMITTED ==

   Commit: def5678 feat(interview): implement team assignment (closes #32)
   Files: 3 changed, 155 insertions(+), 15 deletions(-)
   Status: Working tree clean

   Issue #32 complete. Next: Issue #33
   ```

**Output**: Implementation committed, issue complete

### PHASE 8: CONTINUE OR FINISH

**Decision Point**: Are there more issues in the sequence?

**If more issues remain**:

```text
== CONTINUING TO NEXT ISSUE ==

Completed: Issue #32
Remaining: Issues #33, #34, #35, #36, #37, #38
Progress: 1/7 issues complete

Starting Issue #33...
[Return to PHASE 1: ANALYZE]
```

**If all issues complete**:

```text
== ALL ISSUES COMPLETE ==

Implemented:
- Issue #32: Add teamAssignment type ✅
- Issue #33: Team analysis helper ✅
- Issue #34: Update HR specialist prompt ✅
- Issue #35: Parse team recommendation ✅
- Issue #36: Use recommended team ✅
- Issue #37: Add to transcript ✅
- Issue #38: Write tests ✅

Total commits: 14 (7 test commits, 7 implementation commits)
Total tests added: 42
All tests passing: ✅

Final verification:
- npm run typecheck: ✅ PASS
- npm run lint: ✅ PASS
- npm test: ✅ PASS (306/306 tests)

Work complete. Ready for pull request.
```

## Error Handling

### When to Stop (CRITICAL BLOCKERS)

Stop and ask for help ONLY if:

1. **Dependency missing**: Issue requires code that doesn't exist and isn't in the sequence
2. **Type conflict**: Cannot implement without modifying types/index.ts (forbidden)
3. **Test framework error**: Cannot run tests due to environment issue
4. **Git conflict**: Cannot commit due to merge conflict

### When to Continue (FIXABLE ISSUES)

Handle automatically and continue:

1. **Minor type errors**: Fix import paths, add missing type fields
2. **Failing tests**: Update implementation to match test contract
3. **Lint errors**: Fix formatting, remove unused imports
4. **Missing files**: Create necessary files if obvious
5. **Import path errors**: Fix @@/types vs relative paths

## Output Formatting Rules (MANDATORY)

All output must be cleanly formatted for readability:

### Progress Updates

Use clear phase headers:

```text
== ISSUE #32: ADD TEAMASSIGNMENT TYPE ==

Objective: Update HRRecommendation interface

Context gathering:
- Reading types.ts (lines 150-180)
- Reading hr-specialist.ts (review current usage)
- Reading workflow.ts (understand integration)

Ready to generate tests.
```

### Command Output

Always show commands in fenced blocks:

```bash
npm run typecheck
npm run lint
npm test
```

### Status Summaries

Use structured format:

```text
TypeCheck: ✅ PASS
Lint: ✅ PASS
Tests: ✅ PASS (8/8)
Status: Ready to commit
```

### Lists

One item per line with blank line after:

```text
Modified files:
- app/server/services/interview/types.ts
- app/server/services/interview/hr-specialist.ts
- app/server/services/interview/workflow.ts

Next: Run quality checks
```

### Line Length

Keep lines under ~100 characters. Wrap longer content.

### Spacing

- Blank line between phases
- Blank line between conceptual blocks
- No run-on paragraphs (max 3 sentences)

## Success Criteria

### Per Issue

- ✅ Tests committed (TDD contract frozen)
- ✅ Implementation committed (closes issue)
- ✅ All quality checks passing
- ✅ Working tree clean after commits
- ✅ Conventional commit messages

### Overall Workflow

- ✅ All issues in sequence completed
- ✅ No manual intervention required
- ✅ Clean git history (2 commits per issue)
- ✅ All tests passing at end
- ✅ Type-safe, lint-clean codebase

## Time Expectations

Per issue (7 phases):

- ANALYZE: 2-3 minutes
- TEST GEN: 5-10 minutes (automated)
- ASSESS TESTS: 2-3 minutes
- COMMIT TESTS: 1 minute
- IMPLEMENT: 5-10 minutes (automated)
- ASSESS IMPL: 2-3 minutes
- COMMIT IMPL: 1 minute

**Total per issue**: ~20-30 minutes

For 7 issues: ~2-3.5 hours total (mostly automated)

## Important Notes

### Patience is Critical

- Gemini processes take 5-10 minutes
- DO NOT interrupt or check status frequently
- Let self-correction happen
- Trust the process

### Parallel Execution NOT Recommended Here

- Issues have dependencies (sequential order required)
- Tests must freeze before implementation
- Clean git history requires sequential commits
- One issue fully complete before next

### Git Hygiene

Always verify clean state:

```bash
git status  # Before AND after every commit
git diff --cached  # Before committing
```

### Quality Over Speed

- Every commit must pass all quality checks
- Fix issues immediately (don't accumulate debt)
- Tests define contract (don't modify to make pass)
- Implementation adapts to tests (not vice versa)

## Constitutional Requirements

Follow all principles from `.specify/memory/constitution.md`:

- ✅ No emojis in code/commits
- ✅ Type safety first (strict TypeScript)
- ✅ Observable development (structured logging)
- ✅ Test-first when appropriate
- ✅ Import path conventions (@@/types, relative for services)

## Final Checklist

Before declaring "ALL ISSUES COMPLETE":

- [ ] All issue numbers processed
- [ ] Each issue has 2 commits (test + implementation)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (all tests)
- [ ] `git status` shows clean working tree
- [ ] All commits follow conventional format
- [ ] No TODO comments left in code

## Example Execution

```bash
# User invokes:
/sequential-issues 32 33 34 35 36 37 38

# Assistant executes:
# - ISSUE #32: 7 phases, 2 commits
# - ISSUE #33: 7 phases, 2 commits
# - ISSUE #34: 7 phases, 2 commits
# - ISSUE #35: 7 phases, 2 commits
# - ISSUE #36: 7 phases, 2 commits
# - ISSUE #37: 7 phases, 2 commits
# - ISSUE #38: 7 phases, 2 commits

# Result:
# - 14 commits total
# - All issues closed
# - All tests passing
# - Clean working tree
```

Begin with ISSUE #[FIRST_NUMBER] and proceed sequentially until all complete.

````
