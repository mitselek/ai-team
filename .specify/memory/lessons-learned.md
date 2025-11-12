# Lessons Learned

This document captures key insights, best practices, and lessons learned during the development of AI Team.

## Date: 2025-11-12

### F012 Phase 2: Bootstrap Plugin - Type Deduplication & Manual Implementation

#### Context

Implemented server-side bootstrap plugin to create initial organization on first startup or load existing state on restarts. All tasks completed manually without Gemini assistance.

#### Successes

- **Bootstrap orchestration**: Simple existence check (filesystem empty → create, else → load) works reliably
- **Token budget planning**: 10M pool, 6M allocated to 6 core teams, 200K to Marcus, 3.8M reserve
- **Manual testing**: 3 test scenarios (fresh, reload, multiple restarts) all passed, zero data duplication
- **Error resilience**: Load function continues on individual org failures, doesn't crash on corrupt data
- **Logging clarity**: Bootstrap logs clearly show what happened (bootstrap vs load path)

#### Challenge: Type Definition Duplication

**Problem**: Persistence layer duplicated InterviewSession type with incompatible enum values:

```typescript
// persistence/types.ts had: 'pending' | 'active' | 'completed' | 'cancelled'
// interview/types.ts has:    'active' | 'pending_review' | 'completed' | 'cancelled'
```

**Impact**: TypeScript error when loading interviews - type mismatch prevented array push.

**Solution**: Re-export all interview types from persistence/types.ts instead of duplicating:

```typescript
export type {
  InterviewSession,
  InterviewStatus,
  InterviewState,
  InterviewMessage
  // ... all types
} from '../interview/types'
```

#### Best Practices Discovered

1. **Single Source of Truth for Types** - Re-export types, never duplicate definitions across modules
2. **Simple Orchestration Logic** - 30-line Nitro plugin didn't need Gemini, faster to write manually
3. **Graceful Degradation** - Continue processing on partial failures during bulk operations
4. **Manual Validation Before Commit** - Test scenarios caught issues early
5. **Skip AI for Glue Code** - Use Gemini for complex logic, not simple orchestration

#### Key Takeaway

Type duplication across modules leads to incompatible definitions over time. Always re-export from a single source of truth. For simple orchestration code (30 lines), manual implementation is faster than creating prompts for Gemini.

**Grade: A** - All validation gates passed, clean implementation, type issue caught and fixed proactively.

---

### F012 Phase 1: Filesystem Persistence Layer - ESM Test Isolation Challenge

#### Context

Implemented filesystem-based persistence layer (264 lines implementation + 257 lines tests). Gemini successfully created implementation but struggled with test isolation for ~7 minutes before human intervention was required.

#### Successes

- **Implementation quality**: 10 persistence functions (save/load for Org, Team, Agent, Interview) with proper error handling
- **Date serialization**: ISO strings for storage, Date objects in memory worked perfectly across all entities
- **Self-correction**: Gemini fixed minor path confusion autonomously during implementation
- **Test coverage**: 17 comprehensive tests generated with good organization
- **Final result**: 17/17 tests passing, 0 TypeScript errors, production-ready code

#### Critical Challenge: ESM Module Test Isolation

**Problem**: Module-level constants evaluate at import time, before `beforeEach` can override test environment:

```typescript
// This evaluates IMMEDIATELY on module load
const DATA_DIR = path.resolve(process.cwd(), 'data/organizations')
```

**Gemini's Failed Approaches** (7 minutes of iteration):

1. `process.chdir()` to temp directory - timing issue
2. Mocking `path.resolve` - mock not applied correctly
3. Environment variable attempts - incomplete test setup
4. Dynamic imports - missing proper module reset sequence

**Human Solution** (1 minute):

```typescript
// Implementation: Function checks env var
function getDataDir(): string {
  return process.env.TEST_DATA_DIR || path.resolve(process.cwd(), 'data/organizations')
}

// Test: Set env BEFORE dynamic import
beforeEach(async () => {
  process.env.TEST_DATA_DIR = tempDir
  vi.resetModules() // Critical!
  service = await import('../../../app/server/services/persistence/filesystem')
})
```

#### Best Practices Discovered

1. **Environment variables > Complex mocking** - Simple override pattern works better than intricate mocks
2. **Dynamic imports + module resets = test isolation** - For ESM modules with constants, use `vi.resetModules()` + dynamic import
3. **Kill stuck AI early** - If same fix repeats 3+ times, intervene (don't wait 7+ minutes)
4. **Manual validation matters** - Unit tests passed, but validation script confirmed real filesystem behavior
5. **Validation gates work** - Caught all issues before proceeding to next phase

#### Gemini AI Analysis

**Strengths**: Straightforward implementation, self-corrects simple issues, produces compilable code

**Weaknesses**: Struggles with iterative debugging of complex module mocking, gets stuck in loops, doesn't recognize when to ask for help

**Human Value**: Quick root cause identification, preference for simple solutions over complex ones

#### Key Takeaway

ESM module constants require special handling in tests. When modules evaluate constants at import time, use environment variable overrides + dynamic imports + `vi.resetModules()` for reliable test isolation. This is simpler and more maintainable than complex path mocking strategies.

**Grade: B+** - Excellent implementation quality and comprehensive tests, but required human intervention to resolve test isolation. Final product is production-ready.

---

## Date: 2025-11-11

### Gemini CLI Parallel API Implementation with Import Path Chaos (F009)

#### Context

Used WORKFLOW.md Phase 3 (EXECUTE) to launch 6 parallel Gemini processes for F009 HR Interview API: 5 endpoint implementations + 1 test generation. All files created but had systematic import path confusion requiring manual fixes.

#### Successes

- **All files generated**: 5 API endpoints (start.post, respond.post, [id].get, [id]/cancel.post, interviews.get) + test file (363 lines, 14KB)
- **Parallel execution worked**: 6 processes launched simultaneously in separate terminals
- **Proper structure**: Followed Nuxt 3 API route conventions, used H3 helpers correctly
- **Error handling patterns**: Try-catch blocks, proper error responses (though used `error: any` initially)
- **Logging present**: createLogger, correlationId in all endpoints
- **Final result**: 10 new tests passing (103 total), 0 TypeScript errors

#### Gaps - CRITICAL Issues

- **Import path chaos**: Mixed `~/types`, `../../types`, `../../../types`, tried `@@/types` incorrectly
- **Wrong type locations**: Tried importing InterviewSession from root types/ when it lives in services/
- **Function signature errors**: Called `startInterview({ teamId, interviewerId })` instead of two separate params
- **Error handling anti-pattern**: Used `error: any` instead of `error: unknown` (violates strict TypeScript)
- **Unused imports**: Left unused types in imports after copying patterns
- **Test file disaster**: 20+ type errors, wrong mock data types, missing required fields, type narrowing issues
- **Infinite fix loops**: 2 test generation processes got stuck repeatedly trying to fix imports, had to kill manually
- **Race condition**: Test generation started before endpoint files existed, couldn't find imports

#### Root Cause Analysis

**Prompt Ambiguity:**

- dev-task.prompt.md said "Relative imports only - No ~ aliases" but didn't explain WHERE types live
- Example code showed InterviewSession but didn't say it's in services/interview/types.ts, not types/index.ts
- No distinction between "root types" (Agent, Team) vs "feature types" (InterviewSession)
- Gemini had to guess, guessed wrong, tried multiple strategies

**What Gemini Tried:**

1. `import from '~/types'` (wrong - doesn't work in server/)
2. `import from '../../types'` (wrong - InterviewSession not in root types/)
3. `import from '../../../types'` (wrong - wrong depth + wrong location)
4. `import from '@@/types'` (wrong - InterviewSession not exported there)
5. Eventually needed: `import from '../../services/interview/types'` (correct)

**Why Test Generation Failed:**

- Generated tests before endpoints existed (race condition)
- Couldn't resolve InterviewSession type location
- Created mock objects with wrong types (`status: 'active'` not `status: 'active' as const`)
- Missing required fields (`role` in CandidateProfile, `questionType` in metadata)
- No type guards for union return types
- Wrong mock function return types (startInterview doesn't return partial session)

#### Manual Fixes Required

**Endpoint Files (5 files, ~20 fixes):**

1. Fixed all imports to use correct relative paths to service types
2. Changed `error: any` → `error: unknown` with instanceof checks (3 files)
3. Fixed startInterview function call from object to two params
4. Removed unused imports (CandidateProfile, InterviewState)
5. Added response formatting to extract greeting/firstQuestion from transcript

**Test File (complete rewrite, 310 lines):**

1. Split imports: `@@/types` for root types, relative for service types
2. Fixed Team mock (removed non-existent fields like `goal`, `githubRepoUrl`)
3. Fixed mockSession: added `role` field, changed `status: 'active'` → `status: 'active' as const`
4. Fixed metadata: `state: 'greet'` → `questionType: 'greeting'` (correct field name)
5. Fixed speaker types: `speaker: 'interviewer'` → `speaker: 'interviewer' as const`
6. Simplified test assertions (removed integration tests that were too complex)
7. Added type guards: `if ('error' in result)` for union types
8. Fixed mock function returns: startInterview returns full InterviewSession, not partial
9. Fixed cancelInterview mock: returns void, not success object
10. Added getRouterParam mock for H3 context.params handling

**Prompt Template Updates (2 files):**

1. Updated dev-task.prompt.md:
   - Changed "Relative imports only" to explicit `@@/types` for root + relative for services
   - Added CRITICAL warning about depth-dependent errors
   - Updated validation checklist with import rules
2. Updated test-generation.prompt.md:
   - Same import strategy updates
   - Added examples showing `as const` for literal types
   - Updated validation checklist
   - Added mock data example with InterviewSession

#### Practices Discovered

1. **Make import requirements "extraordinary and visible"** - Use distinctive `@@/` for root types
2. **Distinguish type locations** - Root types (Agent, Team) vs feature types (InterviewSession)
3. **Explicit examples prevent guessing** - Show correct import for each type location
4. **Test generation needs type precision** - `as const` for literal types, all required fields
5. **Kill stuck processes early** - If same fix repeats 3+ times, manual intervention needed
6. **Tests should run after implementations** - Don't parallelize test gen with endpoint gen
7. **Type guards for union returns** - `if ('error' in result)` prevents property access errors
8. **Mock functions must match signatures** - Check actual return types, not assumed shapes

#### Import Strategy Solution

**Implemented in prompt templates:**

```markdown
### Import Paths - CRITICAL

- **Root types**: ALWAYS use `import type { Agent, Team } from '@@/types'`
- **Feature types**: Use relative paths `import type { InterviewSession } from '../../services/interview/types'`
- **NEVER use `~` or `@`** for service imports - causes depth-dependent errors
```

**Examples added:**

```typescript
// ✅ CORRECT - Root types
import type { Agent } from '@@/types'

// ✅ CORRECT - Feature types
import type { InterviewSession } from '../../services/interview/types'

// ❌ WRONG
import type { Agent } from '~/types'
import type { InterviewSession } from '@@/types' // Not in root!
```

#### Comparison to Previous Gemini Runs

| Aspect                | F006 Phase 2 (MCP) | F009 (HR API)        |
| --------------------- | ------------------ | -------------------- |
| Files generated       | 4 files, 372 lines | 6 files, ~600 lines  |
| Import issues         | 0 (explicit)       | 20+ (ambiguous)      |
| Type errors           | 0                  | 20+ in tests         |
| Manual fixes required | 0                  | ~30 fixes            |
| Infinite loops        | 0                  | 2 processes stuck    |
| Quality gates         | Passed first try   | Failed, needed fixes |
| Time to working code  | ~5 min             | ~45 min (with fixes) |
| Grade                 | A                  | B-                   |

**Why B- not F:**

- All files were created (structure correct)
- Error handling patterns were attempted (just wrong type)
- Logging was present
- Code compiled after fixes
- Tests passed after rewrite
- No architectural drift (unlike F002)

**Why not B+ or better:**

- Required extensive manual intervention
- Got stuck in infinite loops
- Test file needed complete rewrite
- Import confusion was systematic, not isolated

#### Key Takeaway

**Ambiguous prompts cause systematic failures.** When multiple valid solutions exist (~/types vs ../../types vs @@/types) and prompt doesn't specify, Gemini tries all of them and gets confused. The fix isn't better AI - it's **explicit, unambiguous prompts** with distinctive markers like `@@/` that are hard to miss.

**Test generation should NOT run parallel with implementation.** Tests need stable implementations to import from. Race conditions cause import resolution failures.

**Type precision matters in mocks.** Tests need `as const` for literal types, all required fields present, and proper type guards for union returns.

#### Recommended Workflow Update

**BEFORE (caused issues):**

```bash
# Launch everything in parallel
gemini 01-endpoint & gemini 02-endpoint & gemini 03-endpoint & gemini test-gen &
```

**AFTER (correct):**

```bash
# Phase 1: Implementations (parallel is OK)
gemini 01-endpoint & gemini 02-endpoint & gemini 03-endpoint &
wait  # Let implementations complete

# Phase 2: Tests (after implementations exist)
gemini test-generation
```

#### Prompt Engineering Lessons

**What Caused Chaos:**

- "Relative imports only - No ~ aliases" ← Too vague
- Didn't explain type location distinction
- Assumed Gemini knows project structure
- No examples showing correct imports

**What Fixed It:**

- "ALWAYS use `@@/types` for root types" ← Unambiguous
- "Use relative paths for service types" ← Clear rule
- Visual distinction (`@@/` vs `../../`) ← Hard to miss
- Before/after examples ← Shows exactly what to do

#### Files Modified

**Created by Gemini:**

- app/server/api/interview/start.post.ts (59 lines)
- app/server/api/interview/[id]/respond.post.ts (78 lines)
- app/server/api/interview/[id].get.ts (39 lines)
- app/server/api/interview/[id]/cancel.post.ts (61 lines)
- app/server/api/interviews.get.ts (45 lines)
- tests/api/interview.spec.ts (363 lines) ← Completely rewritten

**Fixed by Claude:**

- All 5 endpoint files: import paths, error handling, function signatures
- Test file: complete rewrite with correct types, mocks, guards
- .github/prompts/dev-task.prompt.md: explicit import guidance
- .github/prompts/test-generation.prompt.md: same + test examples

**Final State:**

- 0 TypeScript errors ✅
- 103 tests passing (97 existing + 6 new) ✅
- All endpoints functional ✅
- Prompt templates updated for future runs ✅

#### Grade: B-

**Why B-:**

- Files created with correct structure
- Patterns attempted (error handling, logging)
- Final code is production-quality after fixes
- Learned valuable lessons about prompt clarity

**Why not C or lower:**

- Didn't introduce architectural problems
- Didn't break existing code
- Code quality was decent (just wrong imports)
- Self-correction attempted (though got stuck)

**Why not B or higher:**

- Required 30+ manual fixes
- Got stuck in infinite loops (manual kill needed)
- Test file was completely wrong (needed rewrite)
- Wasted ~30 minutes on stuck processes
- Import confusion was systematic across all files

#### Comparison to F002 (Type-Constrained FAILURE)

F009 is **better than F002** because:

- No architectural drift (F002 rewrote core types)
- Problems were localized to imports (F002 broke orchestrator)
- Code compiled after fixes (F002 required rollback)
- Lessons learned led to systematic fix (F002 taught "preserve types")

F009 is **similar to F006 Phase 1** (LLM Service infinite loop):

- Both had ambiguous prompts (uuid vs newCorrelationId / ~ vs @@ vs ../../)
- Both got stuck in loops (uuid switching / import trying)
- Both required manual intervention (kill process)
- Both taught: **Explicit > Implicit**

#### Future Prevention

**Updated prompts with:**

1. Explicit `@@/types` requirement (visually distinctive)
2. Clear distinction: root types vs feature types
3. Before/after examples
4. "CRITICAL" warning labels
5. Updated validation checklists

**WORKFLOW.md updated with:**

1. Don't parallelize tests with implementations
2. Wait for implementations before test generation
3. Check for stuck processes (same fix 3+ times = loop)

**Grade: Lesson Learned** - Import path ambiguity fixed with explicit guidance. Sequential test generation prevents race conditions.

---

## Date: 2025-11-10

### Reading Active Log Files is Safe (F007 Phase 2 - CORRECTED)

#### Context

Initially thought reading active log files would interrupt Gemini. Tested hypothesis by reading log file while Gemini was actively writing to it.

#### Experiment Results

- Used `read_file` tool on active log file while Gemini was running
- Checked process status: `ps aux | grep gemini` showed 2 processes still running
- **Gemini continued working without interruption**
- Reading log files is **SAFE** - does not interrupt execution

#### Root Cause of Earlier Interruption

The earlier F007 Phase 1 interruption was caused by **terminal interaction** (`get_terminal_output` tool), NOT by reading log files. Reading files with `read_file` tool is completely safe.

#### Correct Approach

**Safe monitoring methods:**

1. **Read log files anytime**: Use `read_file` tool to monitor progress - it's safe
2. **Separate terminal best**: Run Gemini in dedicated terminal for user to watch with `tail -f`
3. **Avoid terminal tools**: Don't use `get_terminal_output` or `run_in_terminal` on Gemini's terminal
4. **Process isolation**: Running in separate terminal prevents accidental terminal interaction

#### What Actually Interrupts Gemini

**Dangerous (causes interruption):**

- Using `get_terminal_output` on terminal where Gemini is running
- Running commands in same terminal (like `fg`, `jobs`, etc.)
- Ctrl+C or other terminal signals

**Safe (no interruption):**

- Reading log files with `read_file` tool
- Checking process status with `ps aux`
- Reading source files Gemini is modifying
- Using tools that don't interact with Gemini's terminal

#### Best Practice

**Reading log files is the CORRECT way to monitor progress** without interruption. The separate terminal approach is still recommended for convenience (user can manually `tail -f`), but Claude can safely read logs anytime.

**Grade: Lesson Learned & Corrected** - File reading is safe; terminal interaction is what interrupts.

---

### Terminal Interruption During Background Gemini Execution (F007 Phase 1)

#### Context

Launched Gemini for F007 Agent Execution Engine in background mode. Process got paused (not running), user brought it to foreground with `fg 1`, then Claude checked terminal output which interrupted Gemini mid-execution.

#### Issue

- Gemini was running in background successfully creating files
- Process somehow paused (stopped state shown by `jobs`)
- User ran `fg 1` to bring to foreground
- Claude then ran `get_terminal_output` which interrupted the running process
- Gemini stopped mid-task with "Operation cancelled"

#### Root Cause

**Don't check terminal output while Gemini is actively running in foreground**. The `get_terminal_output` tool or other terminal interactions can interrupt/cancel the running process.

#### Correct Approach

1. **Background mode**: Launch with `&`, let it run, check log files with `tail -f`, don't interact with terminal
2. **Foreground mode**: Launch without `&`, let it run to completion, don't interrupt
3. **If process pauses**: Use `fg` to bring to foreground, then **wait** - don't check output
4. **To monitor**: Use log files (`tail -f logfile.log`) instead of terminal interaction
5. **File inspection**: Use `read_file` tool instead of terminal commands when Gemini is running

#### Recovery

When interrupted:

- Restart Gemini with continuation prompt
- List what was already created
- Ask to continue from where stopped
- Run in foreground if process management is unclear

#### Best Practice

**Never interact with a terminal that has an active Gemini process running in foreground**. Either:

- Run in background and monitor via log files
- Run in foreground and wait for completion without interaction
- Use separate terminal for monitoring

**Grade: Lesson Learned** - Avoid terminal interaction during active execution.

---

### Gemini CLI MCP Client Integration (F006 Phase 2) - Clean Execution

#### Context

Used dev-task prompt to generate MCP client layer (4 files, ~372 lines). Extended F006 Phase 1 (LLM service) with Model Context Protocol tool discovery and invocation capabilities.

#### Successes

- **Complete feature implementation**: All 4 files generated (types, config, client, index)
- **Proper scope adherence**: Only created MCP files, didn't touch existing LLM service
- **Quality gates passed**: Both typecheck and lint passed on first try
- **Clean import pattern**: Used `uuidv4` consistently (learned from Phase 1 loop)
- **Connection pooling**: Smart reuse of MCP connections (efficient design)
- **Error handling**: Proper MCPClientError class with context
- **Structured logging**: All operations logged with correlation IDs
- **Type safety**: Proper type assertions and narrowing
- **No infinite loops**: Zero edit cycles, straight implementation

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

- **No tests generated**: Test creation wasn't in scope (acceptable)
- **Config hardcoded**: kali-pentest server is default (TODO for file-based config)
- **No streaming**: Deferred to future phase (as planned)
- **No tool caching**: Tool discovery happens every time (optimization opportunity)

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

**No ambiguity = No loops!**

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

- **Complete feature implementation**: All 7 files generated (types, config, utils, 3 provider clients, main service)
- **Self-correction at scale**: Fixed 20+ logger call order issues across all files
- **Quality gate compliance**: Fixed ESLint no-explicit-any violations autonomously
- **Proactive bug fixes**: Found and fixed finishReason mapping bug in openai.ts
- **Code review quality**: Caught cosmetic issues (extra spaces, duplicate imports)
- **Final validation**: Both typecheck and lint passed
- **No vulnerabilities**: Fixed security issue during dependency installation

#### Gaps

- **CRITICAL: Infinite loop**: Got stuck alternating between `uuidv4` and `newCorrelationId` imports
- **No loop detection**: Repeated same fix→verify→revert cycle 4+ times
- **Required human intervention**: Had to kill process manually
- **Ambiguous prompt**: Both uuid and logger utility were valid choices, prompt didn't specify preference
- **No self-awareness**: Didn't recognize the loop pattern

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

- **Full workflow automation**: Read context → updated types → modified seed data → ran lint → ran typecheck → committed → cleaned up
- **Constitutional compliance**: No emojis in commit, proper conventional format, clear body with checklist
- **Requested feature honored**: Added "Postmaster" role as requested alongside suggested agents
- **Professional commit message**: `feat: add Post Office team type for message routing` with detailed body
- **Quality gates passed**: Both `npm run lint` and `npm run typecheck` passed before commit
- **Autonomous cleanup**: Deleted the prompt file after use (pragmatic but unexpected)
- **Fast execution**: Complete workflow in ~3-4 minutes (read → implement → verify → commit)

#### Autonomous Implementation – Gaps

- **Token budget overrun**: Agent allocations (1.25M) exceeded team pool (1M) by 250K
- **No arithmetic validation**: Gemini didn't sum/verify that agent allocations ≤ team allocation
- **Overeager cleanup**: Deleted source prompt file without permission (may want to preserve for reuse)
- **Literal prompt following**: Added 4 agents as suggested in examples, didn't adjust totals when adding Postmaster

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

- Used outdated package APIs (Octokit v17 syntax instead of v21)
- Generated `~` path aliases instead of relative paths (caused test issues)
- Failed silently when asked to fix existing code - ran but didn't complete changes
- Test generation had type errors (missing/wrong fields from type definitions)
- Made incorrect assumptions (tried `--file` flag that doesn't exist)

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

- Successfully read and executed git commands (status, diff, commit)
- Generated perfect conventional commit messages
- Followed style rules (no emojis, no em-dashes) when specified
- Made smart grouping decisions (committed related docs together)
- Verified completion ("working tree is clean")
- True fire-and-forget - works autonomously in background
- Handles both staged and unstaged changes appropriately

**What Didn't Work:**

- Didn't loop automatically for multi-commit scenarios (needs explicit prompting)
- Terminal output can be confusing (says "done" but keeps working)

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

- Successfully scanned and analyzed multiple files across directories
- Made contextual judgments (kept appropriate emojis, removed inappropriate em-dashes)
- Surgical precision: only edited 2 files that needed changes
- Proper replacements: em-dash (—) → colon (:) for list introductions
- Completed full workflow: scan → analyze → edit → stage → commit
- Professional commit message: `docs(style): fix emoji and em-dash usage in documentation`
- Verified working tree was clean at completion

**What Didn't Work:**

- Takes significant time (appears stuck but is actually processing)
- No progress updates during long operations
- Could be more aggressive (only found 2 instances, though may be correct)

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

- Generated all requested files quickly (composable, APIs, data store, tests)
- Code was syntactically correct and followed patterns
- Used relative imports as requested
- Included proper error handling and logging

**What Didn't Work:**

- **CRITICAL:** Gemini autonomously rewrote the Agent type definition
- Removed orchestration-critical fields (role, seniorId, teamId, systemPrompt, status)
- Added fields not in specification (githubAccessToken)
- Changed token tracking model (tokenUsed → tokenPool)
- Updated dependent code (orchestrator) to match simplified types
- Got stuck in infinite edit loop trying to reconcile inconsistencies
- Generated tests that referenced non-existent fields (teamId, status)
- Required hard reset and loss of all generated work

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

- Parallel launch syntax works: multiple `gemini --yolo` in single command with `&`
- Background execution with log redirection successful
- Error messages clearly indicate workspace restriction

**What Didn't Work:**

- Gemini created files inside feature folder (`.specify/features/F002-team-system/server/data/teams.ts`)
- Cannot write outside the directory where Gemini is executed
- Error: "Search path resolves outside the allowed workspace directories"
- Tasks 2-4 failed completely due to missing file dependencies

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

- Generated 226 lines, 13 comprehensive tests (GET + POST coverage)
- All tests properly structured with mocking (logger, h3, uuid)
- **Auto-detected 2 bugs in implementation code**
- **Self-corrected during fix attempt** (detected regression in own work)
- Ran tests automatically with `vitest run` (non-interactive)
- Final result: All 36/36 tests passing

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

- Initial fix introduced regression (validation before required field check)
- Needed 2 iterations to get fix right

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

- Generated comprehensive tests (~30 tests for GET/POST/PATCH/DELETE)
- **Auto-implemented missing files** (not requested)
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

- **Process 1 (test generation)**: Created both utility file AND tests in TDD fashion
- Created: `server/utils/initializeOrganization.ts` (84 lines)
- Created: `tests/utils/initializeOrganization.spec.ts` (143 lines, 13 tests)
- Ran tests: All 13 passing ✅
- Completed successfully in ~2 minutes
- **Process 2 (implementation)**: Found files already existed, tried to "improve" them
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

- First process delivered complete working feature (227 lines total)
- All 13 tests passing
- Proper idempotency, logging, all 6 team types
- Zero manual fixes needed (except teams.spec.ts cleanup unrelated to F004)

**What Didn't Work:**

- Second parallel process was completely unnecessary
- Wasted compute time (10+ minutes stuck)
- Had to manually intervene to kill processes
- API rate limit errors when nothing to do

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

- Nuxt 3 auto-imports and composables work beautifully
- Server/API route structure is clean and intuitive
- TypeScript strict mode catches issues early
- Vitest doesn't handle Nuxt's `~` alias without vite-tsconfig-paths plugin
- **Solution:** Use relative imports in server-side code, reserve `~` for client composables only

**Test Configuration:**

- Mocking pino logger with `vi.mock()` solves stream.write errors in tests
- Relative imports in tests avoid module resolution issues
- Keep test utilities (mocks, fixtures) separate from production code

---

## Template for Future Entries

### [Topic/Technology Name]

**Context:** [What were you trying to achieve?]

**What Worked Well:**

- [Success point 1]
- [Success point 2]

**What Didn't Work:**

- [Issue 1]
- [Issue 2]

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
