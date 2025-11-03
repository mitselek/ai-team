# Multi-Commit Task for Gemini

You are tasked with cleaning up the git working tree by creating logical, atomic commits for the AI Team project.

## Context
This is a Nuxt 3 + TypeScript project for building an asynchronous AI agent orchestration platform. The project follows strict code quality standards defined in `.specify/memory/constitution.md`.

## Your Task
Create multiple atomic commits until the working tree is clean. For EACH commit cycle:

1. **Analyze** unstaged/untracked files with `git status`
2. **Group** related changes into one logical unit (by feature, scope, or purpose)
3. **Stage** only those files with `git add <files>`
4. **Generate** a meaningful commit message following conventional commits format
5. **Execute** `git commit -m "message"`
6. **Repeat** until `git status` shows a clean working tree

## Grouping Strategy
Group files by:
- **Feature/Purpose**: Files that work together (e.g., API + tests, service + composable)
- **Type**: Documentation, configuration, prompts, tools
- **Scope**: Related to same component/module
- **Dependency**: Files that depend on each other

Each commit should be atomic and independently meaningful.

## Commit Message Guidelines
- Use conventional commits format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `style`
- Scope: affected area (e.g., `api`, `orchestrator`, `composables`, `tests`)
- Description: clear, concise summary in imperative mood
- Body (optional): explain WHAT and WHY (not HOW)
- Footer (optional): breaking changes, references

**Style Rules:**
- **NO emojis** in commit messages (only use if truly exceptional)
- **NO em-dashes (—)** - use regular hyphens (-) or colons (:) instead
- Keep it professional and parseable by tools
- Focus on clarity over decoration

## Example Workflow
```bash
# First check what's pending
git status

# Group 1: Documentation
git add .github/prompts/commit4gemini.prompt.md
git commit -m "docs(prompts): add Gemini commit automation prompt"

# Check again
git status

# Group 2: If more files remain, repeat...
# Continue until: "nothing to commit, working tree clean"
```

## Example Commit Messages
- `docs(prompts): add Gemini commit automation prompt`
- `feat(api): add organization endpoints with validation`
- `test(orchestrator): add task queue and monitoring tests`
- `chore(deps): add uuid package for ID generation`
- `docs(lessons): document Gemini CLI development insights`

## Files to Review
Run `git status` and `git diff --cached` to see:
- New composables, API routes, services
- Test files
- Documentation updates
- Package dependencies

## Quality Checks (Optional - only if code changes)
If committing code (not just docs/prompts), verify:
- `npm run typecheck` ✅
- `npm run lint` ✅ 
- `npm test -- --run` ✅

Skip checks for pure documentation/configuration changes.

## Execute
After generating the commit message, run:
```bash
git commit -m "your commit message here"
```

## Fire-and-Forget Safety
This prompt is designed for "fire-and-forget" operation. By capturing the initial git status, you won't be confused by files the user edits while you work. Only commit what was in the tree when you started.

Be thorough but concise. Focus on the value delivered, not implementation details.

**Goal**: Clean working tree with meaningful, atomic commit history.
**Approach**: Multiple small commits > one large commit
**Focus**: Each commit should tell a clear story
