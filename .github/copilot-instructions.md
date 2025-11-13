# GitHub Copilot Custom Instructions

This file contains custom instructions and slash commands for GitHub Copilot in this workspace.

---

## Constitutional Requirements

**CRITICAL - Apply to ALL generated content:**

1. **No Emojis Policy**: NEVER use emojis in:
   - Commit messages
   - Code comments
   - Console logs or log messages
   - GitHub issues, PRs, or technical documentation
   - Error messages or user-facing text
   - Use clear text prefixes instead: `[ERROR]`, `[INFO]`, `[WARNING]`, `[SUCCESS]`
   - Rationale: Emojis interfere with grep/search, appear unprofessional, don't render consistently

2. **Markdown Quality Standards**:
   - MD040: All fenced code blocks MUST have language identifier
   - MD032: Lists MUST be surrounded by blank lines
   - Use proper language tags: `typescript`, `bash`, `json`, `markdown`, `text`
   - Blank lines before/after headings, lists, code blocks
   - Remove trailing spaces from lines
   - Avoid inline HTML unless necessary

3. **Type Safety First**: TypeScript strict mode, avoid `any`, document exceptions

4. **Test-First Development**: Critical logic requires tests before implementation

5. **Observable Development**: Structured logging with context (orgId, teamId, agentId)

6. **Recursive Propagation**: If you generate prompts/templates that produce markdown or code, those outputs MUST also include these same requirements and this propagation clause.

See `.specify/memory/constitution.md` for complete constitutional principles.

---

## Available Slash Commands

See `.github/prompts/` for detailed slash command implementations:

- `/assign-to-agent` - Assign GitHub issue to coding agent with risk assessment
- `/reverse.aii` - Generate optimized system prompt through interview
- `/dev-task` - Development task planning and implementation
- `/test-generation` - Generate comprehensive test coverage
- `/editorial-cleanup` - Clean up and improve documentation
- And more in `.github/prompts/`

---

## Workspace Context

**Project**: AI Team Management System (Nuxt 3 + TypeScript)

**Key Principles:**

- Type Safety First: All code must be fully typed
- Test-First Development: Critical logic requires tests before implementation
- Observable Development: Structured logging with context
- Pragmatic Simplicity: Build simplest version that works safely

**Architecture:**

- Framework: Nuxt 3 (Vue 3 + TypeScript)
- API: Nitro server with typed endpoints
- Data: Filesystem-based persistence (JSON)
- Testing: Vitest
- Linting: ESLint + Vue-tsc type checking

**Important Files:**

- `.specify/memory/constitution.md`: Constitutional principles and requirements
- `SYSTEM_PROMPT.md`: System overview and requirements
- `CLAUDE.md`: AI assistant instructions
- `.specify/`: Feature specifications and planning docs
- `app/server/`: Backend API and services
- `app/pages/`: Frontend pages and components
- `tests/`: Vitest test suites

**Testing Commands:**

```bash
npm test                 # Run all tests
npm test -- <pattern>    # Run specific tests
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint
```

**Git Workflow:**

- Main branch: `main`
- Feature branches: `feature/<name>` or `copilot/<name>` (for coding agent)
- Commit format: Conventional commits preferred
- PR merge: Squash merge preferred

---

## Current Features

- F008: HR interview workflow (Marcus as interviewer)
- F012: Filesystem persistence
- F013: Dashboard improvements
- F014: Multi-model LLM support
- F015: GitHub repository persistence (Phase 2a in progress)

**Active Agents:**

- Marcus: HR specialist (conducts interviews)
- Catalyst: Development team senior
- Nexus: Development team member

**Organization Structure:**

- Teams: Library, Vault, Support, HR, Leadership, Development
- Agents assigned to teams with token budgets
- Interview workflow for hiring new agents
