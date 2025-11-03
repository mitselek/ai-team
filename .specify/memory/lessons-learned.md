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

**Grade: A+** - Reliable, professional output. Ready for production use in automation pipelines.

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
