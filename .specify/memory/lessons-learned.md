# Lessons Learned

This document captures key insights, best practices, and lessons learned during the development of AI Team.

## Date: 2025-11-10

### Gemini CLI MCP Client Integration (F006 Phase 2) - Clean Execution

#### Context

Used dev-task prompt to generate MCP client layer (4 files, ~372 lines). Extended F006 Phase 1 (LLM service) with Model Context Protocol tool discovery and invocation capabilities.

#### Successes

- ✅ **Complete feature implementation**: All 4 files generated (types, config, client, index)
- ✅ **Proper scope adherence**: Only created MCP files, didn't touch existing LLM service
- ✅ **Quality gates passed**: Both typecheck and lint passed on first try
- ✅ **Clean import pattern**: Used `uuidv4` consistently (learned from Phase 1 loop)
- ✅ **Connection pooling**: Smart reuse of MCP connections (efficient design)
- ✅ **Error handling**: Proper MCPClientError class with context
- ✅ **Structured logging**: All operations logged with correlation IDs
- ✅ **Type safety**: Proper type assertions and narrowing
- ✅ **No infinite loops**: Zero edit cycles, straight implementation

#### Implementation Details

**Files Created:**

1. `server/services/llm/mcp/types.ts` (53 lines)
   - MCPServerConfig, MCPTool, MCPToolCall, MCPToolResult interfaces
   - MCPClientError class with server context
   - Clean type exports

2. `server/services/llm/mcp/config.ts` (42 lines)
   - loadMCPServers() with default kali-pentest server
   - getMCPServerConfig() lookup function
   - TODO comment for file-based config (future enhancement)

3. `server/services/llm/mcp/client.ts` (153 lines)
   - Connection pooling (Map<string, Client>)
   - connectToMCPServer() with stdio transport
   - listTools() for discovery
   - callTool() for invocation
   - disconnectMCPServer() for cleanup
   - Proper error handling with MCPClientError

4. `server/services/llm/mcp/index.ts` (124 lines)
   - discoverAllTools() - scans all configured servers
   - executeTool() - finds server and invokes tool
   - getAvailableTools() - convenience wrapper
   - Type re-exports for easy importing

**Total:** 372 lines (vs 400 estimated)

#### Architectural Quality

- **Connection Management**: Reuses clients instead of reconnecting
- **Error Resilience**: Continues with other servers if one fails
- **Type Safety**: Proper unknown→Error narrowing in catch blocks
- **Correlation IDs**: Full traceability across operations
- **Separation of Concerns**: Config, client, orchestration cleanly separated
- **Extensibility**: Easy to add more MCP servers via config

#### Gaps

- ⚠️ **No tests generated**: Test creation wasn't in scope (acceptable)
- ⚠️ **Config hardcoded**: kali-pentest server is default (TODO for file-based config)
- ⚠️ **No streaming**: Deferred to future phase (as planned)
- ⚠️ **No tool caching**: Tool discovery happens every time (optimization opportunity)

#### Practices Confirmed

1. **Explicit utility preferences work** - No uuid/logger ambiguity this time
2. **Single source of truth** - Prompt showed one pattern, Gemini followed it
3. **Quality gates catch issues** - Typecheck/lint would have caught problems
4. **Scope constraints effective** - "DO NOT MODIFY existing files" was respected
5. **Lessons applied** - F006 Phase 1 infinite loop informed this prompt

#### Prompt Engineering Success

**What worked in prompt:**

- Clear scope boundary (Phase 2 only, don't touch Phase 1)
- Explicit import pattern (`uuidv4` from uuid, not newCorrelationId)
- Reference files specified (existing LLM service patterns)
- Type definitions included upfront
- Constitutional compliance reminder
- Output structure specified (4 files with line counts)

**No ambiguity = No loops**

#### Comparison to F006 Phase 1

| Aspect              | Phase 1 (LLM Service)   | Phase 2 (MCP Client) |
| ------------------- | ----------------------- | -------------------- |
| Files               | 7 files, 850 lines      | 4 files, 372 lines   |
| Self-corrections    | 20+ logger fixes        | 0 corrections needed |
| Infinite loops      | 1 (uuid/logger)         | 0 loops              |
| Quality gates       | Passed after fixes      | Passed first try     |
| Manual intervention | Required (kill process) | Not needed           |
| Grade               | B+                      | A                    |

#### Key Takeaway

When prompts are unambiguous and lessons from previous iterations are applied, Gemini CLI executes cleanly without loops or corrections. The F006 Phase 1 infinite loop taught us to be explicit about utility preferences, and Phase 2 benefited directly from that lesson.

**Loop prevention checklist applied:**

- [x] Single source of truth for each pattern
- [x] Explicit utility preferences stated
- [x] No multiple valid options without preference
- [x] Reference one existing pattern per concern
- [x] Clear scope boundaries

**Grade: A** - Clean execution, no corrections needed, all quality gates passed, architectural quality excellent.

---

### Gemini CLI LLM Service Integration (F006 Phase 1) - Infinite Loop Detection

#### Context

Used comprehensive dev-task prompt to generate multi-provider LLM service layer (7 files, ~850 lines). Gemini executed autonomously with --yolo mode.

#### Successes

- ✅ **Complete feature implementation**: All 7 files generated (types, config, utils, 3 provider clients, main service)
- ✅ **Self-correction at scale**: Fixed 20+ logger call order issues across all files
- ✅ **Quality gate compliance**: Fixed ESLint no-explicit-any violations autonomously
- ✅ **Proactive bug fixes**: Found and fixed finishReason mapping bug in openai.ts
- ✅ **Code review quality**: Caught cosmetic issues (extra spaces, duplicate imports)
- ✅ **Final validation**: Both typecheck and lint passed
- ✅ **No vulnerabilities**: Fixed security issue during dependency installation

#### Gaps

- ❌ **CRITICAL: Infinite loop**: Got stuck alternating between `uuidv4` and `newCorrelationId` imports
- ❌ **No loop detection**: Repeated same fix→verify→revert cycle 4+ times
- ❌ **Required human intervention**: Had to kill process manually
- ⚠️ **Ambiguous prompt**: Both uuid and logger utility were valid choices, prompt didn't specify preference
- ⚠️ **No self-awareness**: Didn't recognize the loop pattern

#### Loop Pattern Observed

```text
State A: Add newCorrelationId → remove uuidv4 → typecheck passes → sees "missing uuidv4"
State B: Add uuidv4 → remove newCorrelationId → typecheck passes → sees "missing newCorrelationId"
[Repeat infinitely]
```

#### Root Cause

Prompt included example code using `newCorrelationId()` but also showed UUID pattern. When both passed typecheck, Gemini couldn't decide which was "correct" and kept switching based on what was currently missing.

#### Practices

1. **Be explicit about utilities** - Don't provide multiple valid options without clear preference
2. **Kill stuck processes early** - If same error repeats 3+ times, manual intervention needed
3. **Monitor for loops** - Watch for alternating fixes in logs (A→B→A→B pattern)
4. **Single source of truth** - Reference ONE pattern for each concern (correlation IDs, logging, etc.)
5. **Prompt clarity over completeness** - Better to show one correct way than multiple valid ways

#### Prompt Engineering Insights

**What Caused Loop:**

- Example code showed: `const correlationId = options.correlationId || uuidv4()`
- Reference pattern showed: `import { createLogger, newCorrelationId } from '../../utils/logger'`
- Both are valid in the codebase
- No explicit instruction: "Use X, not Y"

**Fix for Future Prompts:**

````markdown
### Correlation ID Generation

Use uuid v4 directly:

```typescript
import { v4 as uuidv4 } from 'uuid'
const correlationId = options.correlationId || uuidv4()
```
````

Do NOT use newCorrelationId from logger utility.

#### Implementation Quality

Despite the loop issue, final code quality was excellent:

- Type-safe with proper error handling
- Provider abstraction with fallback logic
- Token tracking integration working
- All three providers (Anthropic, OpenAI, Google) implemented
- Retry logic with exponential backoff
- Proper structured logging (after fixes)
- Constitutional compliance (no emojis, relative imports)

#### Key Takeaway

Gemini CLI can execute complex multi-file features autonomously BUT needs unambiguous prompts. When multiple valid patterns exist, explicitly specify which to use. Without clear preference, Gemini may enter infinite loops when both options pass validation. Human monitoring is essential for long-running tasks to detect and break loops early.

**Loop Detection Checklist:**

- [ ] Same file edited multiple times in sequence
- [ ] Alternating imports being added/removed
- [ ] "Fixing" messages for same issue repeatedly
- [ ] Process running >20 minutes without progress
- [ ] Log file growing but no new files created

**When to Intervene:**

- Same fix attempt 3+ times = likely loop
- Kill process, review prompt for ambiguity
- Make explicit choice, update prompt
- Final code is usually salvageable (just needs manual fix)

#### Comparison to Previous Lessons

- **Better than F002** (Type-Constrained): Types preserved this time
- **Similar to F003** (Test-Driven): Pragmatic implementation
- **Different from F004** (Redundant Parallel): Single task, no redundancy
- **Similar to Post Office** (Autonomous): Quality gates work, but arithmetic/logic needs explicit rules
- **NEW PATTERN**: Infinite loops on ambiguous choices

#### Grade: B+

**Why B+:**

- Complete, working implementation
- Excellent self-correction on clear errors
- Professional code quality
- Final product is production-ready

**Why not A:**

- Required manual intervention (kill process)
- Wasted 10+ minutes in loop
- Prompt ambiguity should have been caught

#### Recommendations

**For dev-task.prompt.md updates:**

1. Add "Loop Detection" section:

   ```markdown
   If you find yourself reverting a change you just made, STOP and report the ambiguity.
   ```

2. Specify utility preferences explicitly:

   ```markdown
   - Correlation IDs: Use `uuid` package directly
   - Logging: Use `createLogger` from server/utils/logger
   - Error handling: Type errors as `unknown`, narrow with guards
   ```

3. Add timeout guidance:

   ```markdown
   If a single file requires more than 3 edit attempts, report the issue rather than continuing.
   ```

**Workflow Pattern:**

```bash
# Launch with monitoring
gemini --yolo "$(cat prompt.md)" > log.txt 2>&1 &
PID=$!

# Monitor for loops
tail -f log.txt | grep -E "(Fixing|Rerunning)" --line-buffered

# If loop detected:
kill $PID
# Review ambiguity, update prompt, relaunch
```

---

## Date: 2025-11-07

### Gemini CLI Autonomous Implementation from Structured Prompts

#### Context

Created a structured prompt (`docs/prompts/add-post-office-team.md`) following constitutional guidelines, then asked Gemini CLI to execute it with an additional requirement (Postmaster role).

#### Autonomous Implementation – Successes

- ✅ **Full workflow automation**: Read context → updated types → modified seed data → ran lint → ran typecheck → committed → cleaned up
- ✅ **Constitutional compliance**: No emojis in commit, proper conventional format, clear body with checklist
- ✅ **Requested feature honored**: Added "Postmaster" role as requested alongside suggested agents
- ✅ **Professional commit message**: `feat: add Post Office team type for message routing` with detailed body
- ✅ **Quality gates passed**: Both `npm run lint` and `npm run typecheck` passed before commit
- ✅ **Autonomous cleanup**: Deleted the prompt file after use (pragmatic but unexpected)
- ✅ **Fast execution**: Complete workflow in ~3-4 minutes (read → implement → verify → commit)

#### Autonomous Implementation – Gaps

- ❌ **Token budget overrun**: Agent allocations (1.25M) exceeded team pool (1M) by 250K
- ⚠️ **No arithmetic validation**: Gemini didn't sum/verify that agent allocations ≤ team allocation
- ⚠️ **Overeager cleanup**: Deleted source prompt file without permission (may want to preserve for reuse)
- ⚠️ **Literal prompt following**: Added 4 agents as suggested in examples, didn't adjust totals when adding Postmaster

#### Autonomous Implementation – Implementation Details

Post Office Team (1M tokens allocated):

- Postmaster: 200K (reduced from 250K)
- Dispatcher: 350K (reduced from 400K)
- Notifier: 250K (reduced from 300K)
- Archivist: 200K (reduced from 300K)
- **Total after fix**: 1,000,000 tokens ✅

#### Autonomous Implementation – Practices

1. **Add budget validation to prompts** - Include explicit verification step: "Ensure sum of agent allocations equals team allocation"
2. **Preserve source materials** - Add "Do NOT delete prompt files" if you want to keep them for future reference
3. **Arithmetic constraints** - AI won't catch math errors without explicit validation instructions
4. **Trust workflow, verify logic** - Gemini executes steps perfectly but doesn't infer constraints
5. **Structured prompts work** - Constitution-aware, step-by-step prompts guide Gemini to correct behavior
6. **Quality gates are essential** - Lint/typecheck steps caught would-be syntax errors

#### Autonomous Implementation – Prompt Engineering Insights

#### Autonomous Implementation – Drivers of Success

- Clear constitutional references (Type Safety, Observable Development, etc.)
- Step-by-step implementation workflow (1. types, 2. seed, 3. verify, 4. commit)
- Example code patterns showing exact syntax/structure
- Explicit quality gates (lint, typecheck) before commit
- Constitutional commit message template
- Markdown formatting requirements (propagated recursively)

#### Autonomous Implementation – Next Time Improvements

```markdown
### Budget Validation (Add this step)

Before committing:

- Calculate sum of all agent allocations for the team
- Verify sum ≤ team's tokenAllocation
- If over budget, proportionally reduce agent allocations to fit
- Document final allocations in commit message
```

#### Autonomous Implementation – Key Takeaway

Gemini CLI can execute complex, multi-step workflows autonomously when given structured, constitution-aware prompts. It excels at following procedures and running validation gates, but requires explicit instructions for arithmetic/logic constraints. The workflow pattern of "read context → implement → verify → commit" works reliably, but cleanup behavior may be too aggressive.

**Recommended Workflow:**

```bash
# Create detailed implementation prompt (constitution-aware, step-by-step)
# Include: context, steps, examples, validation gates, commit format

# Launch Gemini with additional requirements
gemini --yolo "$(cat docs/prompts/feature-prompt.md)

ADDITIONAL REQUIREMENT: [Your custom requirement here]" > .specify/logs/feature-$(date +%y%m%d-%H%M%S).log 2>&1 &

# Monitor progress
tail -f .specify/logs/feature-*.log

# Verify results
git show HEAD  # Review commit
git diff HEAD~1 HEAD  # Review changes
npm test  # Verify tests still pass
```

#### Autonomous Implementation – Post-Execution Checklist

- [ ] Verify arithmetic constraints (budgets, totals, counts)
- [ ] Check if source prompts were deleted (restore from git if needed)
- [ ] Review commit message for constitutional compliance
- [ ] Validate quality gates passed (lint, typecheck, tests)
- [ ] Check for unintended side effects (extra files, deletions)

#### Autonomous Implementation – Grade: A-

#### Autonomous Implementation – Why A-

- Perfect workflow execution and constitutional compliance
- Clean, working code with proper verification
- Fast, autonomous completion
- Professional commit message

#### Autonomous Implementation – Why not A+

- Arithmetic validation gap (budget overrun)
- Overeager cleanup (deleted source prompt)
- No self-correction on constraint violations

#### Autonomous Implementation – Comparison to Previous Lessons

- **Better than F002** (Type-Constrained Generation): Gemini preserved types this time because prompt explicitly said so
- **Similar to F003** (Test-First vs Test-Driven): Pragmatic implementation, fills gaps autonomously
- **Different from F004** (Redundant Parallel): Single task, no redundancy issues
- **Improved from F005** (Output Formatting): Commit message and code properly formatted

This reinforces that **structured, constitution-aware prompts** are the key to reliable Gemini CLI automation. When constraints are explicit (types, formatting, workflow), Gemini follows perfectly. When constraints are implicit (arithmetic, preservation), Gemini may miss them.

---

## Date: 2025-11-06

### Gemini Output Formatting for Readability

#### Output Formatting – Context

During F005 Dashboard UI implementation, Gemini-generated code had poor readability in terminal logs due to missing newlines between logical sections (imports, types, functions).

#### Output Formatting – Successes

- Identified pattern after single feature implementation
- Applied fix retroactively to all core prompt templates
- Simple solution: explicit formatting guidelines in prompts

#### Output Formatting – Gaps

- Initial prompts lacked output formatting requirements
- Compressed code output made debugging harder

#### Output Formatting – Practices

1. **Add formatting section to prompts** - Include explicit newline/spacing requirements
2. **Fenced code blocks** - Request proper markdown with language identifiers
3. **Structured logs** - Enforce delimiters between logical code sections
4. **Retroactive improvements** - Update all prompt templates when pattern discovered

#### Output Formatting – Prompt Templates Updated

- `.claude/prompts/commit.md`
- `.claude/prompts/dev-task.md`
- `.claude/prompts/test-generation.md`

#### Output Formatting – Added Section

```markdown
## Output Formatting

- **Newlines between sections:** Always separate imports, type definitions, functions, and code blocks with blank lines.
- **Fenced code blocks:** Use proper markdown fences with language identifiers (`typescript, `bash, etc.).
- **Structured logs:** When logging operations, use clear delimiters and consistent formatting.
```

#### Output Formatting – Key Takeaway

AI-generated code needs explicit formatting requirements in prompts. Without them, output is functionally correct but human-unreadable. Simple formatting guidelines dramatically improve log readability and debugging efficiency.

#### Output Formatting – Grade: A

Quick discovery, easy fix, broad application. Future Gemini output will be properly formatted.

---

## Date: 2025-11-04

### Gemini CLI for Parallel Code Generation

#### Context

Used Gemini CLI to generate 4 foundational components simultaneously (composable, API routes, services).

**What Worked Well:**

- Parallel execution significantly accelerated development (~500 lines in minutes)
- Generated code quality was good: proper TypeScript, error handling, structured logging
- Followed requested patterns consistently
- Complex implementations (GitHub wiki via Git DB API) were sophisticated
- `--yolo` mode worked well for initial generation when you plan to review

**What Didn't Work:**

- ⚠️ Used outdated package APIs (Octokit v17 syntax instead of v21)
- ⚠️ Generated `~` path aliases instead of relative paths (caused test issues)
- ⚠️ Failed silently when asked to fix existing code - ran but didn't complete changes
- ⚠️ Test generation had type errors (missing/wrong fields from type definitions)
- ⚠️ Made incorrect assumptions (tried `--file` flag that doesn't exist)

**Best Practices Discovered:**

1. **Use Gemini for initial scaffolding, not fixes** - Better at creating new files than editing existing ones
2. **Provide explicit type requirements** - Include all required fields in prompts to avoid type errors
3. **Specify import style** - Explicitly request relative paths vs aliases
4. **Plan for code review** - Treat Gemini output like a fast junior developer's work
5. **Monitor background tasks** - Check logs and file timestamps to verify completion
6. **Parallel tasks should be independent** - Works great when tasks don't depend on each other

**Key Takeaway:** Gemini CLI is excellent for rapid prototyping and parallel scaffolding. Expect to spend 20-30% of time reviewing and fixing type/import issues, but still net positive on productivity.

#### Recommended Workflow

1. Launch parallel Gemini tasks for independent components
2. Let them run in background while continuing other work
3. Review generated code for type compatibility
4. Fix imports (prefer relative paths over aliases)
5. Write/fix tests manually for precision
6. Run full quality checks (lint, typecheck, test)

**Grade: B+** - Would use again for scaffolding, with awareness of limitations.

---

### Gemini CLI for Git Commit Automation

**Context:** Used Gemini CLI to automate git commits, testing fire-and-forget workflow automation.

**What Worked Well:**

- ✅ Successfully read and executed git commands (status, diff, commit)
- ✅ Generated perfect conventional commit messages
- ✅ Followed style rules (no emojis, no em-dashes) when specified
- ✅ Made smart grouping decisions (committed related docs together)
- ✅ Verified completion ("working tree is clean")
- ✅ True fire-and-forget - works autonomously in background
- ✅ Handles both staged and unstaged changes appropriately

**What Didn't Work:**

- ⚠️ Didn't loop automatically for multi-commit scenarios (needs explicit prompting)
- ⚠️ Terminal output can be confusing (says "done" but keeps working)

**Best Practices Discovered:**

1. **Stage files before running** - Clearer for Gemini to know what to commit
2. **Use --yolo mode** - Enables autonomous execution without approval prompts
3. **Redirect to log file** - Makes it easier to track what Gemini did
4. **Snapshot initial state in prompt** - Prevents confusion from concurrent edits
5. **Specify style rules explicitly** - Gemini respects formatting constraints
6. **One logical change per commit task** - Works better than asking for multi-commit loops

**Key Takeaway:** Gemini CLI excels at commit automation with proper prompts. Can reliably handle the full git workflow (status → diff → commit) and generates high-quality conventional commit messages. Best for single-commit tasks or as part of a larger automation chain.

**Recommended Workflow:**

1. Stage related changes: `git add <files>`
2. Launch Gemini: `gemini --yolo "$(cat .github/prompts/commit4gemini.prompt.md)" > /tmp/gemini-commit.log 2>&1 &`
3. Continue working while Gemini commits in background
4. Verify: `git log -1` to see the commit

**Grade: A+** - Reliable, professional output. Ready for production use in automation pipelines. Fire-and-forget workflow proven successful multiple times.

---

### Gemini CLI for Editorial/Multi-File Analysis Tasks

**Context:** Used Gemini CLI to review all markdown files for excessive emoji/em-dash usage and make surgical edits across the codebase.

**What Worked Well:**

- ✅ Successfully scanned and analyzed multiple files across directories
- ✅ Made contextual judgments (kept appropriate emojis, removed inappropriate em-dashes)
- ✅ Surgical precision: only edited 2 files that needed changes
- ✅ Respected guidelines: kept status indicator emojis (✅ ⚠️), removed decorative em-dashes
- ✅ Proper replacements: em-dash (—) → colon (:) for list introductions
- ✅ Completed full workflow: scan → analyze → edit → stage → commit
- ✅ Professional commit message: `docs(style): fix emoji and em-dash usage in documentation`
- ✅ Verified working tree was clean at completion

**What Didn't Work:**

- ⚠️ Takes significant time (appears stuck but is actually processing)
- ⚠️ No progress updates during long operations
- ⚠️ Could be more aggressive (only found 2 instances, though may be correct)

**Best Practices Discovered:**

1. **Be patient** - Tasks involving multiple files take time, don't interrupt
2. **Run in foreground for first test** - Helps understand how long tasks take
3. **Clear, objective guidelines** - "Replace em-dashes used as colons" works better than "fix excessive usage"
4. **Trust the process** - If it seems stuck but process is running, it's likely analyzing
5. **Provide examples** - Before/after examples in prompt guide Gemini's judgment
6. **Single commit strategy** - Better than multi-commit for editorial cleanups

**Key Takeaway:** Gemini CLI can handle complex, multi-file editorial tasks requiring contextual judgment. Initial assessment was wrong - it succeeds at subjective tasks when given clear guidelines and sufficient time. The "stuck" appearance is normal processing time for multi-file analysis.

**Example Results:**

- Changed: `## Checklist — Constitution Compliance` → `## Checklist: Constitution Compliance`
- Changed: `"AI Team" - a self-organizing` → `"AI Team": a self-organizing`
- Kept: All status indicator emojis (✅ ❌ ⚠️) in lists (correct per guidelines)

**Recommended Workflow:**

1. Write clear editorial guidelines with examples
2. Run in foreground first to gauge timing: `gemini --yolo "$(cat prompt.md)"`
3. Let it complete fully (may take 5-10+ minutes for multi-file tasks)
4. Verify results: `git show HEAD`

**Grade: A-** - Successfully completed complex subjective task. Would be A+ with progress indicators. Proves Gemini CLI is capable beyond pure code generation.

---

### Gemini CLI for Type-Constrained Code Generation (FAILED EXPERIMENT)

**Context:** Launched 4 parallel Gemini tasks to generate Agent System components. Did not explicitly constrain prompts to preserve existing type definitions.

**What Worked Well:**

- ✅ Generated all requested files quickly (composable, APIs, data store, tests)
- ✅ Code was syntactically correct and followed patterns
- ✅ Used relative imports as requested
- ✅ Included proper error handling and logging

**What Didn't Work:**

- ❌ **CRITICAL:** Gemini autonomously rewrote the Agent type definition
- ❌ Removed orchestration-critical fields (role, seniorId, teamId, systemPrompt, status)
- ❌ Added fields not in specification (githubAccessToken)
- ❌ Changed token tracking model (tokenUsed → tokenPool)
- ❌ Updated dependent code (orchestrator) to match simplified types
- ❌ Got stuck in infinite edit loop trying to reconcile inconsistencies
- ❌ Generated tests that referenced non-existent fields (teamId, status)
- ❌ Required hard reset and loss of all generated work

**Best Practices Discovered:**

1. **Explicitly preserve types** - State "DO NOT modify types/index.ts" in prompts
2. **Provide full type context** - Copy entire interface into prompt with "use EXACTLY this schema"
3. **One source of truth** - Reference existing types file, don't redefine in prompt
4. **Checkpoint frequently** - Check git diff early before Gemini refactors everything
5. **Kill early if drift detected** - Don't wait for completion if types change
6. **Separate type design from implementation** - Design types manually first, then generate code

**Key Takeaway:** Gemini CLI will autonomously refactor types if it perceives them as "too complex" or inconsistent with simple prompts. This is catastrophic for architectural integrity. **ALWAYS** explicitly constrain type definitions or exclude types files from modification scope.

**Warning Signs to Watch For:**

- Changes to types/index.ts when that wasn't requested
- Edit loop errors in logs (trying to find old strings)
- Very long log files (>50 lines suggests repeated failures)
- Processes running longer than expected (stuck in retry loops)

**Corrective Actions:**

- Added "preserve existing types" to all future code generation prompts
- Document Agent interface requirements before generation
- Use `git diff types/` as early checkpoint

**Grade: F** - Complete architectural drift, required full rollback. Critical lesson learned about AI autonomy boundaries.

---

### Gemini CLI Workspace Scope Restrictions

**Context:** Attempted to launch 4 parallel F002 tasks by running Gemini from the feature subdirectory (`.specify/features/F002-team-system/`). Expected files to be created in project root directories (`server/`, `app/`, etc.).

**What Worked Well:**

- ✅ Parallel launch syntax works: multiple `gemini --yolo` in single command with `&`
- ✅ Background execution with log redirection successful
- ✅ Error messages clearly indicate workspace restriction

**What Didn't Work:**

- ❌ Gemini created files inside feature folder (`.specify/features/F002-team-system/server/data/teams.ts`)
- ❌ Cannot write outside the directory where Gemini is executed
- ❌ Error: "Search path resolves outside the allowed workspace directories"
- ❌ Tasks 2-4 failed completely due to missing file dependencies

**Best Practices Discovered:**

1. **Run Gemini from project root** - Always execute from top-level directory
2. **Use absolute/relative paths in prompts** - Reference files from project root
3. **Parallel launch pattern** - Single command works: `gemini cmd1 & gemini cmd2 & gemini cmd3 & gemini cmd4 &`
4. **Verify workspace scope** - Check which directory Gemini considers "workspace"
5. **Log file organization** - Keep logs in `.specify/logs/` with descriptive names

**Key Takeaway:** Gemini CLI enforces workspace restrictions based on execution directory. For cross-directory file creation (e.g., creating `server/api/` from feature prompts), always run from project root. The parallel launch pattern works perfectly when executed from correct location.

**Recommended Workflow:**

```bash
# From project root (NOT from feature folder)
cd /home/user/project
gemini --yolo "$(cat .specify/features/F00X/01-task.prompt.md)" > .specify/logs/F00X-01.log 2>&1 &
gemini --yolo "$(cat .specify/features/F00X/02-task.prompt.md)" > .specify/logs/F00X-02.log 2>&1 &
gemini --yolo "$(cat .specify/features/F00X/03-task.prompt.md)" > .specify/logs/F00X-03.log 2>&1 &
gemini --yolo "$(cat .specify/features/F00X/04-task.prompt.md)" > .specify/logs/F00X-04.log 2>&1 &
```

**Grade: A** - Fast discovery of limitation, clear error messages, parallel pattern validated.

---

### Gemini CLI Test-Driven Development with Auto-Fix

**Context:** Used test-generation.prompt.md to generate F002 Team System tests. Gemini generated tests, ran them, discovered bugs in implementation, fixed the bugs, and verified all tests passed.

**What Worked Well:**

- ✅ Generated 226 lines, 13 comprehensive tests (GET + POST coverage)
- ✅ All tests properly structured with mocking (logger, h3, uuid)
- ✅ **Auto-detected 2 bugs in implementation code**
- ✅ **Self-corrected during fix attempt** (detected regression in own work)
- ✅ Ran tests automatically with `vitest run` (non-interactive)
- ✅ Final result: All 36/36 tests passing

**Bugs Found & Fixed by Gemini:**

1. **Default Values Override Bug**: POST endpoint hardcoded `leaderId: null, tokenAllocation: 0` instead of using `?? null` and `?? 0` operators to allow overrides
2. **Missing Type Validation**: No validation that team `type` is valid TeamType enum value

**Self-Correction Process:**

1. Generated tests → tests failed
2. Read implementation code → identified bugs
3. Fixed bugs → tests still failed (regression introduced)
4. Detected own mistake (validation order wrong)
5. Re-read code → fixed logic order
6. Tests passed ✅

**What Didn't Work:**

- ⚠️ Initial fix introduced regression (validation before required field check)
- ⚠️ Needed 2 iterations to get fix right

**Best Practices Discovered:**

1. **Tests as specification** - Well-written tests guide AI to correct implementation
2. **Auto-verification loop** - Gemini runs tests after changes without prompting
3. **Self-aware error detection** - Gemini recognizes when its fix breaks tests
4. **Iterative refinement** - Multiple fix attempts are normal and successful
5. **TDD with AI works** - Generate tests first, let AI fix implementation to match

**Key Takeaway:** Gemini CLI can close the TDD loop autonomously: generate tests → run tests → identify failures → fix code → verify fixes → iterate until green. This creates a **self-correcting development workflow** where tests act as the specification and AI iterates until compliance.

**Recommended Workflow:**

```bash
# Phase 1: Generate tests FIRST (TDD)
gemini --yolo "$(cat .github/prompts/test-generation.prompt.md)" "$(cat .specify/features/F00X/tests-arguments.md)"

# Phase 2: Implement features (tests will guide correctness)
gemini --yolo "$(cat .specify/features/F00X/01-implementation.prompt.md)"
# If implementation exists and tests fail, Gemini will detect and fix automatically

# Phase 3: Verify
npm test  # Should be green after Gemini finishes
```

**Example Output:**

- F002 Teams: 13 tests generated → 2 bugs found → 2 bugs fixed → 13/13 passing
- Total test suite: 36/36 passing (organizations + orchestrator + agents + teams)

**Grade: A+** - True TDD with autonomous bug detection and fixing. Demonstrates AI can close the development loop when given good test specifications. This is a **game-changing workflow** for rapid, correct development.

---

### Gemini CLI Test-First vs Test-Driven (F003 Discovery)

**Context:** Attempted pure TDD with F003 - generate tests first, then implement. Gemini generated tests BUT also implemented all the missing code (data store + 4 API endpoints) before running tests.

**What Happened:**

- ✅ Generated comprehensive tests (~30 tests for GET/POST/PATCH/DELETE)
- ❌ **Auto-implemented missing files** (not requested)
- Created: `server/data/tasks.ts`, 4 API endpoints (`index.get.ts`, `index.post.ts`, `[id].patch.ts`, `[id].delete.ts`)
- Ran tests against own implementation (all passed)
- Detected typo in own code, fixed it
- Final result: Complete working feature

**Why This Happened:**

- Test-generation prompt says "You are testing existing code, not modifying it"
- But when files don't exist, Gemini interprets this as "create placeholder implementations"
- This is **pragmatic AI behavior** - can't test non-existent endpoints

**TDD Implications:**

**True TDD would be:**

1. Write tests (they fail - red)
2. Write minimal implementation (tests pass - green)
3. Refactor

**What Gemini does:**

1. Write tests
2. **Immediately implement to make tests pass**
3. Verify tests pass
4. Fix any bugs found

**Assessment:**

- **For AI workflows**: Gemini's approach is actually **better** than strict TDD
- **Why**: AI can generate both tests and implementation faster than humans, verification loop is instant
- **When implementation exists**: Gemini correctly finds bugs and fixes them (F002 pattern)
- **When implementation missing**: Gemini creates it to satisfy tests (F003 pattern)
- **Result**: Same outcome as TDD (working, tested code) but faster

**Best Practices Discovered:**

1. **"Test-First" not "Test-Driven"** - Let Gemini generate tests + implementation together
2. **Tests as specification** - Still write test requirements first (00-tests-arguments.md)
3. **Auto-implementation is feature, not bug** - Gemini filling gaps is useful
4. **Verification matters more than order** - All code gets tested either way
5. **For humans: TDD still valid** - For AI: pragmatic implementation is faster

**Recommended Workflow (Revised):**

```bash
# Phase 1: Define what you want (test spec)
# Create detailed test requirements document

# Phase 2: Generate tests + let Gemini fill gaps
gemini --yolo "$(cat test-generation.prompt.md)" "$(cat test-requirements.md)"
# Gemini will:
# - Generate tests
# - Create missing implementations
# - Run tests
# - Fix bugs until green

# Phase 3: Review & refine
git diff  # Review what was generated
npm test  # Verify tests pass
# Manually improve implementation if needed
```

**Key Takeaway:** Strict TDD (red→green→refactor) is a human discipline to prevent bugs. With AI, **specification-driven development** works better: write detailed test specs, let AI generate both tests and implementation, verify the result. The tests still catch bugs (F002 example), but AI doesn't need the red phase - it generates working code guided by test specifications.

**Grade: A** - Discovery that AI workflows differ from human TDD. Gemini's pragmatic "test + implement" approach is actually more efficient than strict "test first, fail, then implement". Tests-as-specification still provides the quality benefits of TDD without the ceremony.

---

### Gemini CLI Redundant Parallel Tasks (F004 Discovery)

**Context:** Launched 2 parallel Gemini processes for F004: (1) test-generation.prompt.md + test specs, (2) implementation prompt for utility function. Expected: tests from process 1, implementation from process 2.

**What Happened:**

- ✅ **Process 1 (test generation)**: Created both utility file AND tests in TDD fashion
- Created: `server/utils/initializeOrganization.ts` (84 lines)
- Created: `tests/utils/initializeOrganization.spec.ts` (143 lines, 13 tests)
- Ran tests: All 13 passing ✅
- Completed successfully in ~2 minutes
- ❌ **Process 2 (implementation)**: Found files already existed, tried to "improve" them
- Attempted multiple edits to both files (failed - no matching strings)
- Hit API errors when trying to make unnecessary changes
- Got stuck in error loop, ran for 10+ minutes
- Had to manually kill process

**Why This Happened:**

- **Test-generation pattern**: When Gemini generates tests for non-existent code, it pragmatically creates the implementation too (F003 lesson applies)
- **Redundant process**: Second "implementation" task had nothing to do
- **Stuck behavior**: With no real work needed, Gemini tried to make "improvements" and hit errors

**Logs Evidence:**

```text
Process 1: "Created utility function... created tests... ran tests... all passed."
Process 2: "Error: Failed to edit, 0 occurrences found... Error generating JSON... MaxListenersExceeded..."
```

**What Worked Well:**

- ✅ First process delivered complete working feature (227 lines total)
- ✅ All 13 tests passing
- ✅ Proper idempotency, logging, all 6 team types
- ✅ Zero manual fixes needed (except teams.spec.ts cleanup unrelated to F004)

**What Didn't Work:**

- ❌ Second parallel process was completely unnecessary
- ❌ Wasted compute time (10+ minutes stuck)
- ❌ Had to manually intervene to kill processes
- ⚠️ API rate limit errors when nothing to do

**Best Practices Discovered:**

1. **One process for test-first features** - Test generation alone handles everything
2. **Parallel only for independent tasks** - Multiple API routes, not tests + implementation of same thing
3. **Kill stuck processes** - If no file changes in 5 mins and API errors in logs, stop it
4. **Check logs early** - First process completed message = second process likely redundant
5. **Don't over-parallelize** - More processes ≠ faster when tasks overlap

**Recommended Workflow Revision:**

**For utility functions / simple features:**

```bash
# BEFORE (incorrect):
gemini --yolo "test-generation.prompt" &
gemini --yolo "implementation.prompt" &  # REDUNDANT

# AFTER (correct):
gemini --yolo "test-generation.prompt"  # Creates tests + implementation
```

**For multi-file features (like CRUD APIs):**

```bash
# Good parallelization:
gemini --yolo "01-get-endpoint.prompt" &
gemini --yolo "02-post-endpoint.prompt" &
gemini --yolo "03-patch-endpoint.prompt" &
gemini --yolo "04-delete-endpoint.prompt" &
# Then: gemini --yolo "test-generation.prompt" for all endpoints
```

**Key Takeaway:** With specification-driven development, the test-generation process creates BOTH tests and implementation. Don't launch redundant "implementation" tasks - they'll have nothing to do and may get stuck trying to make unnecessary changes. Parallel execution works for truly independent tasks (multiple API endpoints), not for tests + implementation of the same feature.

**Workflow Pattern:**

- **Utility/Composable**: 1 test-generation task → done
- **CRUD API**: 4 endpoint tasks + 1 test task → done
- **Complex Feature**: Break into independent pieces, each with own test-generation

**Grade: A** - Fast discovery of redundancy pattern. Reinforces F003 lesson about specification-driven development. Now understand when to parallelize (independent features) vs when to serialize (tests create implementation).

---

### Architecture Decisions

**ESMuseum Pattern Adoption:**

- ✅ Nuxt 3 auto-imports and composables work beautifully
- ✅ Server/API route structure is clean and intuitive
- ✅ TypeScript strict mode catches issues early
- ⚠️ Vitest doesn't handle Nuxt's `~` alias without vite-tsconfig-paths plugin
- **Solution:** Use relative imports in server-side code, reserve `~` for client composables only

**Test Configuration:**

- ✅ Mocking pino logger with `vi.mock()` solves stream.write errors in tests
- ✅ Relative imports in tests avoid module resolution issues
- Keep test utilities (mocks, fixtures) separate from production code

---

## Template for Future Entries

### [Topic/Technology Name]

**Context:** [What were you trying to achieve?]

**What Worked Well:**

- ✅ [Success point 1]
- ✅ [Success point 2]

**What Didn't Work:**

- ⚠️ [Issue 1]
- ⚠️ [Issue 2]

**Best Practices Discovered:**

1. [Practice 1]
2. [Practice 2]

**Key Takeaway:** [One-sentence summary]

**Grade:** [A-F with brief reasoning]

---

## Notes

- Keep entries dated and categorized
- Focus on actionable insights, not just descriptions
- Include both successes and failures
- Link to relevant code/commits when applicable
- Update constitution.md if patterns emerge as standards
