# Development Workflow: Gemini Team Orchestration

## Overview

This document defines the formal iterative workflow for building the AI Team system using Gemini CLI as our parallel development force. This workflow aligns with the master plan in `SYSTEM_PROMPT.md` and leverages lessons learned from real-world Gemini CLI usage.

## Master Control Loop

```text
┌────────────────────────────────────────────────────────┐
│ PHASE 1: PLAN                                          │
│ - Review SYSTEM_PROMPT.md priorities                   │
│ - Select next feature(s) from MVP scope                │
│ - Define acceptance criteria                           │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ PHASE 2: SPECIFY                                       │
│ - Create feature folder (.specify/features/F00X/)      │
│ - Write test requirements (00-tests-arguments.md)      │
│ - Create task prompts (01-NN-*.prompt.md)              │
│ - Document expected outputs and validation criteria    │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ PHASE 3: EXECUTE                                       │
│ - Launch Gemini test generation (specification-driven) │
│ - Launch Gemini implementation tasks (parallel)        │
│ - Wait for completion (5-10 mins typical)              │
│ - DO NOT INTERRUPT (patience is key)                   │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ PHASE 4: ASSESS                                        │
│ - Verify all Gemini processes finished                 │
│ - Check generated files exist                          │
│ - Run quality checks (typecheck, lint, test)           │
│ - Review code diffs for correctness                    │
│ - Identify any bugs or issues                          │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ PHASE 5: LEARN                                         │
│ - Document new patterns in lessons-learned.md          │
│ - Update prompt templates with improvements            │
│ - Grade Gemini performance (A+ to F)                   │
│ - Note efficiency gains or bottlenecks                 │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│ PHASE 6: COMMIT                                        │
│ - Stage all feature files                              │
│ - Launch Gemini commit automation (fire-and-forget)    │
│ - Wait for commit to complete                          │
│ - Verify git log shows proper commit message           │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
                  [REPEAT]
```

## Phase 1: PLAN

### Inputs

- `SYSTEM_PROMPT.md` - Master vision and MVP priorities
- Current progress (% complete)
- Previous lessons learned

### Activities

1. Review MVP feature list from SYSTEM_PROMPT
2. Select next logical feature(s) based on dependencies
3. Define clear objectives and acceptance criteria
4. Estimate scope (number of files, complexity)

### Outputs

- Feature selection decision
- Rough task breakdown
- Dependency identification

### Example

```markdown
Selected: F004 Core Team Initialization
Objective: Auto-populate 6 default teams per organization
Dependencies: F002 Team System (complete)
Scope: 1 utility file, 6 team definitions, tests
Complexity: Medium (team type validation, leader assignment)
```

## Phase 2: SPECIFY

### Inputs

- Feature selection from Phase 1
- Type definitions from `types/index.ts`
- Existing code patterns

### Activities

1. Create feature folder: `.specify/features/F00X-feature-name/`
2. Write `README.md` with objectives, scope, execution plan
3. Write `00-tests-arguments.md` with comprehensive test requirements
4. Create implementation prompts: `01-task.prompt.md`, `02-task.prompt.md`, etc.
5. Use `dev-task.prompt.md` as template for implementation prompts

### Outputs

- Feature folder with all planning documents
- Test specifications (detailed requirements)
- Task prompts (ready to execute)

### Critical Constraints

#### Test Specifications MUST include

- All required fields from type definitions
- Success cases, error cases, edge cases
- Expected defaults and auto-generated values
- Validation logic requirements

#### Task Prompts MUST include

- "DO NOT MODIFY types/index.ts" constraint
- Full type definitions to use (copy from types/index.ts)
- Reference files for patterns
- Validation checklist

### Example Structure

```text
.specify/features/F004-core-team-init/
├── README.md                      # Feature overview
├── 00-tests-arguments.md          # Test requirements
├── 01-utility.prompt.md           # Create server/utils/initializeTeams.ts
└── 02-integration-test.prompt.md  # Test initialization logic
```

## Phase 3: EXECUTE

### Inputs

- Task prompts from Phase 2
- Test-generation template (`.github/prompts/test-generation.prompt.md`)

### Activities

#### Step 1: Test Generation (Specification-Driven)

```bash
cd /home/user/project  # ALWAYS from project root
gemini --yolo "$(cat .github/prompts/test-generation.prompt.md)" \
  "$(cat .specify/features/F00X/00-tests-arguments.md)" \
  > .specify/logs/F00X-tests-$(date +%H%M%S).log 2>&1 &
```

#### Step 2: Implementation (Parallel)

```bash
# Launch all independent tasks in parallel
gemini --yolo "$(cat .specify/features/F00X/01-task.prompt.md)" \
  > .specify/logs/F00X-01.log 2>&1 &
gemini --yolo "$(cat .specify/features/F00X/02-task.prompt.md)" \
  > .specify/logs/F00X-02.log 2>&1 &
# ... repeat for all tasks
```

#### Step 3: Wait

- Typical duration: 5-10 minutes
- DO NOT interrupt processes
- DO NOT check status frequently (let them work)
- Monitor with: `ps aux | grep gemini | grep -v grep`

### Critical Rules

1. **Run from project root** - Gemini workspace restrictions apply
2. **Parallel when independent** - Only launch parallel tasks with no dependencies
3. **Background execution** - Use `&` and redirect to logs
4. **No interruption** - Gemini self-corrects, needs time to work
5. **Log everything** - Redirect stdout and stderr to timestamped logs

### Common Pitfalls

- ❌ Running from subdirectory (files created in wrong location)
- ❌ Interrupting long-running tasks (appears stuck but working)
- ❌ Not redirecting output (terminal flooded with logs)
- ❌ Launching dependent tasks in parallel (race conditions)

## Phase 4: ASSESS

### Inputs

- Gemini log files (`.specify/logs/`)
- Generated code files
- Test results

### Activities

#### Step 1: Verify Completion

```bash
# Check all processes finished
ps aux | grep gemini | grep -v grep
# Should return empty when done

# Check generated files
ls -lh server/api/feature/*.ts tests/api/feature.spec.ts
wc -l <files>  # Get line counts
```

#### Step 2: Run Quality Checks

```bash
npm run typecheck  # TypeScript errors?
npm run lint       # Linting issues?
npm test           # All tests passing?
```

#### Step 3: Review Code

```bash
git diff           # What changed?
git status --short # What's new?
```

#### Step 4: Check Logs

```bash
tail -50 .specify/logs/F00X-*.log  # Any errors or warnings?
```

### Success Criteria

- ✅ All Gemini processes completed
- ✅ All expected files created
- ✅ TypeScript type check passes (or only pre-existing errors)
- ✅ Linting passes
- ✅ All tests passing (100%)
- ✅ Generated code follows patterns
- ✅ All type fields present

### Failure Recovery

#### If tests fail

- Gemini typically auto-fixes during generation
- Check logs for fix attempts
- Manual fixes acceptable (faster than re-prompting)

#### If types wrong

- Manual fix: Update imports, add missing fields
- Update prompt template to prevent recurrence

#### If files missing

- Check workspace scope (ran from root?)
- Check log for errors
- Re-run specific task if needed

## Phase 5: LEARN

### Inputs

- Assessment results from Phase 4
- Gemini log files
- Code review findings

### Activities

#### Step 1: Document Patterns

Add entry to `.specify/memory/lessons-learned.md`:

```markdown
### [Feature Name] - [Gemini Behavior Pattern]

**Context:** [What you tried to achieve]

#### What Worked Well

- ✅ [Success 1]
- ✅ [Success 2]

#### What Didn't Work

- ❌ [Issue 1]
- ❌ [Issue 2]

#### Best Practices Discovered

1. [Practice 1]
2. [Practice 2]

**Key Takeaway:** [One-sentence summary]

**Grade: [A+ to F]** - [Brief reasoning]
```

#### Step 2: Update Templates

If new constraints discovered:

- Update `.github/prompts/dev-task.prompt.md`
- Update `.github/prompts/test-generation.prompt.md`
- Add to "Critical Constraints" or "MUST USE" sections

#### Step 3: Grade Performance

- **A+**: Perfect execution, no issues
- **A**: Excellent, minor fixable issues
- **B**: Good, some manual fixes needed
- **C**: Adequate, required significant intervention
- **D**: Poor, mostly manual rewrite
- **F**: Failed, complete redo required

### Example Updates

#### New constraint discovered

```markdown
### MUST USE

- **Type-only imports** - For types/interfaces use `import type { }`
- **Logger mocking** - Always mock logger in tests # <- NEW
```

#### New best practice

```markdown
### Best Practices

- Generate tests first (specification-driven) # <- NEW
- Let Gemini auto-implement from test specs
- Review generated code for correctness
```

## Phase 6: COMMIT

### Inputs

- All staged changes from Phase 4
- Updated lessons from Phase 5

### Activities

#### Step 1: Verify Clean Status (Pre-Staging)

```bash
# Check current repository state
git status
# Review what's changed before staging
git diff --stat
```

#### Step 2: Stage Files

```bash
git add <feature-files>              # Implementation
git add tests/api/<feature>.spec.ts  # Tests
git add .specify/features/F00X/      # Feature planning
git add .specify/memory/lessons-learned.md  # If updated
```

#### Step 3: Verify Staged Changes

```bash
# Confirm staged files are correct
git status
# Review staged changes
git diff --cached --stat
```

#### Step 4: Launch Commit Automation

```bash
cd /home/user/project
gemini --yolo "$(cat .github/prompts/commit4gemini.prompt.md)" \
  > gemini-commit-$(date +%Y%m%d-%H%M%S).log 2>&1 &
```

#### Step 5: Wait & Verify

```bash
# Wait ~1-2 minutes
ps aux | grep gemini | grep commit4gemini

# Check result
git log --oneline -1
# Should show conventional commit format

# CRITICAL: Verify clean tree
git status
# MUST show "nothing to commit, working tree clean"
# If not clean, investigate what's uncommitted and why
```

### Git Status Requirements (CRITICAL)

**BEFORE commit**:

- ✅ Run `git status` to see all changes
- ✅ Run `git diff --stat` to review modifications
- ✅ Stage ONLY intended files (don't use `git add .`)
- ✅ Run `git status` again to verify staged files
- ✅ Review `git diff --cached` to confirm staged changes

**AFTER commit**:

- ✅ Run `git status` to verify clean working tree
- ✅ MUST show "nothing to commit, working tree clean"
- ✅ If uncommitted files remain, determine if intentional or error
- ✅ Unstaged files indicate incomplete commit or new untracked work

**Why this matters**:

- Prevents accidental omission of files
- Catches unintended modifications
- Ensures atomic commits (all related changes together)
- Provides clean checkpoint for next iteration
- Makes git history reliable and predictable

### Commit Quality

#### Good commits (Gemini consistently produces)

- Conventional format: `feat(scope): description`
- Clear, concise descriptions
- Groups related changes
- No emojis or em-dashes
- Professional tone

#### Fire-and-Forget Reliability

- Grade: A+ (consistently reliable)
- Multiple commits if needed (logical grouping)
- Self-verifies with `git status`

## Iteration Tracking

### Progress Metrics

Track after each iteration:

```markdown
**Feature**: F00X Feature Name
**Files Generated**: N files, XXX lines
**Tests**: XX tests, all passing
**Quality**: typecheck ✅, lint ✅, tests ✅
**Gemini Grade**: A+ (or A, B, C, D, F)
**Time**: ~X minutes
**Issues**: [None | Minor fixes | Major fixes]
**Progress**: XX% MVP complete
```

### MVP Completion Tracking

Reference SYSTEM_PROMPT.md "MVP Scope & Priorities":

#### Essential v1 Features

- [ ] Basic org/team/agent hierarchy
- [ ] Task delegation and queue management
- [ ] Simple tool execution with approval workflow
- [ ] Token tracking and spending display
- [ ] Activity logs (tri-level hierarchy)
- [ ] Core teams pre-configured with generated leaders
- [ ] GitHub repository integration
- [ ] Force-directed org chart visualization
- [ ] Multi-organization support

Update this checklist after each iteration.

## Workflow Optimization

### Parallel Execution

#### Maximum parallelism

- Test generation: 1 process
- Implementation tasks: 4-6 processes (if independent)
- Commit automation: 1 process

**Total concurrent:** ~5-7 Gemini processes typical

### Time Budgets

- Planning (Phase 1): 5-10 minutes
- Specification (Phase 2): 15-30 minutes
- Execution (Phase 3): 5-10 minutes (automated)
- Assessment (Phase 4): 5-10 minutes
- Learning (Phase 5): 10-15 minutes
- Commit (Phase 6): 1-2 minutes (automated)

**Total per feature:** 40-70 minutes (human time ~50%, Gemini time ~50%)

### Efficiency Tips

1. **Write detailed test specs** - Better specs = better code
2. **Copy type definitions** - Include full types in prompts
3. **Reference similar code** - Point to existing patterns
4. **Trust the process** - Don't interrupt Gemini
5. **Batch similar features** - Group related work
6. **Learn continuously** - Update templates after each iteration

## Emergency Procedures

### If Gemini Gets Stuck

```bash
# Check if actually stuck or just slow
tail -f .specify/logs/F00X-task.log

# If truly stuck (>15 mins, no progress)
kill <process-id>

# Clean up partial work
git checkout -- <broken-files>
rm <new-files-that-are-wrong>

# Improve prompt and re-run
# Add more constraints or examples
```

### If Tests Fail After Implementation

#### Gemini usually auto-fixes during generation

If not:

1. Read test failure messages
2. Fix manually (faster than re-prompting)
3. Document fix needed in lessons-learned
4. Update template to prevent recurrence

### If Types Drift

#### CRITICAL - Stop immediately

```bash
git diff types/index.ts

# If changed:
git checkout types/index.ts  # Restore
kill <gemini-processes>      # Stop all
```

Then:

1. Add stronger "DO NOT MODIFY types/index.ts" to prompts
2. Include FULL type definitions in prompts
3. Re-run with improved constraints

## Success Patterns

### Proven Workflows

1. **Specification-Driven Development** (Grade A+)
   - Write detailed test requirements
   - Let Gemini generate tests + implementation
   - Tests guide correctness
   - Result: Working, tested code

2. **Parallel Implementation** (Grade A)
   - Independent tasks in parallel
   - 4-6 concurrent processes
   - Saves 70% time vs sequential

3. **Fire-and-Forget Commits** (Grade A+)
   - Stage changes, launch Gemini
   - Continue planning next feature
   - Commit completes in background

4. **Template + Arguments** (Grade A)
   - Reusable templates in .github/prompts/
   - Feature-specific arguments in .specify/features/
   - Combine with: `"$(cat template)" "$(cat arguments)"`

### Anti-Patterns to Avoid

1. ❌ **Strict TDD** (Red→Green→Refactor doesn't fit AI workflow)
2. ❌ **Micro-management** (Checking Gemini progress every 30 seconds)
3. ❌ **Vague specifications** (Gemini guesses, often wrong)
4. ❌ **Sequential execution** (Parallel is 70% faster)
5. ❌ **Interrupting processes** (Let them self-correct)
6. ❌ **Running from subdirectories** (Workspace scope issues)

## Conclusion

This workflow embodies lessons from F001, F002, and F003:

- **Specification-driven**: Tests define requirements
- **Parallel execution**: Multiple Gemini processes work simultaneously
- **Continuous learning**: Each iteration improves templates
- **Fire-and-forget**: Trust automation where proven reliable
- **Quality gates**: Always verify typecheck, lint, tests
- **Pragmatic**: Manual fixes acceptable when faster than re-prompting

**Result**: Rapid, high-quality development of the AI Team vision from SYSTEM_PROMPT.md

**Grade: Workflow itself - A+** (Proven with 3 features, 57 tests, 100% pass rate)
