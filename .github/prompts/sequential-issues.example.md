# Sequential Issues Slash Command - Usage Example

## Scenario: Issue #8 Breakdown

Issue #8 (intelligent team assignment) was broken down into 7 sequential sub-issues:

- Issue #32: Add teamAssignment type
- Issue #33: Create team analysis helper
- Issue #34: Update HR specialist prompt
- Issue #35: Parse team recommendation
- Issue #36: Use recommended team
- Issue #37: Add to transcript
- Issue #38: Write tests

## Usage

```bash
/sequential-issues 32 33 34 35 36 37 38
```

Or if your shell supports it:

```bash
/sequential-issues 32-38
```

## What Happens

### Issue #32: Add teamAssignment Type

```text
== ISSUE #32: ADD TEAMASSIGNMENT TO HRRECOMMENDATION TYPE ==

Objective: Update HRRecommendation interface with optional teamAssignment field

Context gathering:
- Reading app/server/services/interview/types.ts (lines 150-180)
- Reading app/server/services/interview/hr-specialist.ts
- Reading app/server/services/interview/workflow.ts

Ready to generate tests.

== TEST GENERATION ==

Generating: tests/services/interview/types.spec.ts
[Gemini working... 6 minutes]

Created: tests/services/interview/types.spec.ts (89 lines)
Test suites: 2
Test cases: 6

== ASSESS TESTS ==

TypeCheck: ✅ PASS
Lint: ✅ PASS
Tests: ❌ FAIL (expected - no implementation)

Failing tests (6 total):
- should include teamAssignment field
- should validate teamId format
[... more ...]

== COMMIT TESTS ==

Staged: tests/services/interview/types.spec.ts
Commit: a1b2c3d test(interview): add tests for teamAssignment type (Issue #32 - TDD)
Status: Working tree clean

== IMPLEMENTATION ==

Modifying: app/server/services/interview/types.ts
[Gemini working... 4 minutes]

Modified:
- app/server/services/interview/types.ts (+8, -0)

== ASSESS IMPLEMENTATION ==

TypeCheck: ✅ PASS
Lint: ✅ PASS
Tests: ✅ PASS (6/6 tests passing)

Test results:
✓ should include teamAssignment field
✓ should validate teamId format
✓ should validate teamName is string
✓ should validate rationale is string
✓ should allow optional teamAssignment
✓ should handle missing teamAssignment

== COMMIT IMPLEMENTATION ==

Staged: app/server/services/interview/types.ts
Commit: d4e5f6g feat(interview): add teamAssignment to HRRecommendation (closes #32)
Status: Working tree clean

Issue #32 complete. Next: Issue #33
```

### Issues #33-#37

[Similar process for each issue - 7 phases, 2 commits]

### Issue #38: Write Tests

```text
== ISSUE #38: WRITE TESTS FOR TEAM ASSIGNMENT LOGIC ==

[... same 7-phase process ...]

Issue #38 complete.

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

## Time Breakdown

Per issue (~25 minutes average):

- ANALYZE: 3 minutes
- TEST GEN: 6 minutes (automated)
- ASSESS TESTS: 2 minutes
- COMMIT TESTS: 1 minute
- IMPLEMENT: 5 minutes (automated)
- ASSESS IMPL: 2 minutes
- COMMIT IMPL: 1 minute

**7 issues total**: ~2.5-3 hours (mostly automated)

## Benefits

### Minimal Interruption

- Runs automatically through all issues
- Only stops for critical blockers (missing dependencies, type conflicts)
- Fixes minor issues inline (import paths, lint errors)

### Clean Git History

- 2 commits per issue (test + implementation)
- Conventional commit format
- Each commit passes all quality gates
- Clear linking to GitHub issues

### Quality Assurance

- Tests written first (TDD contract)
- Implementation must match test expectations
- All quality checks pass before committing
- Clean working tree after each commit

### Progress Tracking

- Clear phase transitions
- Status updates at key points
- Final summary of all work completed
- Easy to resume if interrupted

## When to Use

### Ideal For

- Complex features broken into sequential sub-issues
- Issues with clear dependencies (1→2→3→...)
- Well-defined acceptance criteria
- Features requiring comprehensive testing

### Not Ideal For

- Independent parallel issues (use separate prompts)
- Exploratory work (requirements unclear)
- Issues requiring significant human decision-making
- Cross-cutting refactors affecting many files

## Tips

### Before Starting

1. **Break down complex issue** into sequential sub-issues
2. **Define clear acceptance criteria** in each sub-issue
3. **Include code examples** in issue descriptions
4. **Mark dependencies** between issues
5. **Verify issue order** is correct

### During Execution

1. **Trust the process** - don't interrupt Gemini
2. **Monitor progress** - but don't micromanage
3. **Review commits** after completion
4. **Check git log** to see the story

### After Completion

1. **Review all changes**: `git log --oneline -14`
2. **Run final tests**: `npm test`
3. **Create PR** with summary of implemented issues
4. **Close parent issue** with comment linking to commits

## Troubleshooting

### If Process Stops

Check the error message:

- **Dependency missing**: Add the missing code, restart from that issue
- **Type conflict**: Fix types/index.ts, restart from that issue
- **Test failure**: Review implementation, fix manually if needed
- **Git conflict**: Resolve conflict, continue

### If Tests Keep Failing

1. Review test expectations vs implementation
2. Check if acceptance criteria were clear
3. Fix manually (faster than re-prompting)
4. Continue to next issue

### If Commit Fails

1. Check git status for unexpected changes
2. Verify working tree was clean before commit
3. Fix manually and continue

## Related Documentation

- `.specify/WORKFLOW.md` - Detailed workflow phases
- `.github/prompts/sequential-issues.prompt.md` - Full prompt
- `.github/prompts/dev-task.prompt.md` - Individual task template
- `.github/prompts/test-generation.prompt.md` - Test generation template
