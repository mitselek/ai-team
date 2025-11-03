# Lessons Learned

This document captures key insights, best practices, and lessons learned during the development of AI Team.

## Date: 2025-11-04

### Gemini CLI for Parallel Code Generation

**Context:** Used Gemini CLI to generate 4 foundational components simultaneously (composable, API routes, services).

**What Worked Well:**

- ✅ Parallel execution significantly accelerated development (~500 lines in minutes)
- ✅ Generated code quality was good: proper TypeScript, error handling, structured logging
- ✅ Followed requested patterns consistently
- ✅ Complex implementations (GitHub wiki via Git DB API) were sophisticated
- ✅ `--yolo` mode worked well for initial generation when you plan to review

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

**Recommended Workflow:**

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
