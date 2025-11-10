# AI Team Project Constitution

Version: 1.0.0 | Ratified: 2025-11-03 | Last Amended: 2025-11-03

## Core Principles

### I. Type Safety

- Use TypeScript strictly for all Node/Nuxt code; Python code must use type hints and mypy where feasible
- Avoid `any`; when unavoidable, document the reason and the removal plan
- Treat type definitions as API contracts between modules and teams
- Validate all untrusted inputs at boundaries; prefer unknown → narrow via guards

### II. Composable-First Development

- Encapsulate business logic in composables and small modules
- Structure:
  - Frontend logic: `app/composables/*`
  - Server utilities and services: `server/utils/*` and `server/services/*`
  - Orchestration primitives: `server/orchestration/*`
- Composables must be single-responsibility, testable, and typed

### III. Test-First Mindset

- For critical orchestration and governance logic, write tests before implementation
- Bug fixes require a failing test first
- Coverage targets (guidance):
  - Orchestration primitives and schedulers: 100%
  - Access control, approvals, rate-limiters, and spend controls: 95%+
  - Server API contracts: 90%+
  - UI components: pragmatic unit tests where valuable

### IV. Observable Development

- Prefer structured logging over console logs
- Three-tier logging by design: org-level (concise), team-level (detailed), leaf-level (verbatim)
- Include context keys consistently: orgId, teamId, agentId, taskId, toolId, correlationId
- Sensitive data never logged; secrets are redacted at source

### V. Pragmatic Simplicity

- Build the simplest version that satisfies requirements and is safe to operate
- Optimize only after measurement; log potential optimizations in `.specify/memory/opportunities.md`
- Prefer established libraries over bespoke solutions

### VI. Strategic Integration Testing

- Focus on critical flows:
  - Project initiation → task breakdown → delegation → completion
  - Tool request → approval → execution → audit trail
  - Spend monitoring → throttling → alerting
  - GitHub integration (issues/PRs/wiki)
- Avoid over-testing trivial UI and pure formatting helpers

### VII. API-First Server Design

- Nuxt server routes under `server/api/*` expose typed, well-documented endpoints
- Validate inputs, return structured JSON, use proper status codes
- Keep business logic in services, not in route handlers

### VIII. Orchestration-First Architecture

- Agents are long-lived, persistent identities
- Orchestration is asynchronous; agents maintain their own task queues
- Manager agents delegate intelligently; leaves execute
- Implement boredom and stuck detection with escalation pathways
- Forward-only logging; actions are not reversible

### IX. Tool Governance and Safety

- All tools carry an access level: common | organization | team | personal
- Dangerous operations require approval, sandboxing, and rate limiting
- Toolsmith team owns tool creation, validation, and versioning
- Every internal tool use is auditable; anomalies create tickets automatically

### X. Security and Secrets

- Vault team holds and issues credentials; agents never hold provider API keys directly
- System relays requests on behalf of agents
- Enforce least privilege; rotate secrets on schedule

### XI. GitHub-Centric Persistence

- Each organization has its own GitHub repository
- Agents may open issues/PRs/commits without manual approval unless restricted by policy
- Knowledge base in the org wiki; architecture and contracts documented in `docs/`

### XII. Resource Awareness (Budget PC)

- Support local LLMs where possible; select models per role based on cost/latency/quality
- Real-time spend dashboard; throttle when approaching limits
- Bound concurrency by available CPU/RAM; make limits configurable

## Development Workflow

### Feature Workflow (Spec-Kit Inspired)

1. Specify: Create a spec under `.specify/features/` when building substantial features
2. Plan: Draft an implementation plan with architecture, contracts, and risks
3. Tasks: Break into typed, testable tasks with acceptance criteria
4. Implement: Ship incrementally, tests first for critical paths
5. Review: Enforce constitutional compliance in code review

### Code Review Requirements

- New/changed endpoints and services must be typed, validated, and logged
- Orchestration, approvals, and spending logic require tests
- No new usage of `any` without justification
- No secrets or sensitive data in logs or code

### Git Strategy

- `main`: production-ready
- `feature/*`: features
- `fix/*`: bug fixes
- `refactor/*`: internal improvements

### Deployment & CI/CD

- Use GitHub Actions for CI and tool build pipelines
- All tests must pass; lint and type checks are enforced
- Post-deploy, monitor logs and dashboards for anomalies

## Tech Stack Governance

### Approved Core Dependencies

- Framework: Nuxt 3 (Vue 3, TypeScript strict)
- Styling: Tailwind CSS (Nuxt module)
- Styling Policy: Use `@nuxtjs/tailwindcss` with config at `.config/tailwind.config.{js,ts}` and CSS entry `app/assets/tailwind.css`. Manual PostCSS fallback (custom plugin chain without the Nuxt module) is permitted only for a documented build incompatibility; it must include a rationale in `.specify/memory/lessons-learned.md` and be reverted (return to module) within 24h or converted into an approved exception.
- Visualization: D3.js
- HTTP: ofetch/axios (server-side), native fetch (client)
- GitHub Integration: @octokit/rest
- Testing: Vitest (+ @nuxt/test-utils if needed)
- Logging: pino or equivalent structured logger (server)

### LLM and Tools

- Support multiple providers and local models; provider keys are managed by Vault
- Access to models and tools is role-based and audited

### Adding Dependencies

Evaluate before adding:

1. Necessity over novelty
2. Maintenance and community health
3. Package size and runtime cost
4. TypeScript support
5. Security posture

Document decisions for significant additions in `.specify/features/` or `.specify/memory/`.

### Documentation Structure

- `.specify/memory/lessons-learned.md` for development insights and AI workflow patterns
- `.claude/` for AI tooling configuration only (prompts, settings)
- `docs/` for user-facing product documentation

### Markdown Standards

- **MD040/fenced-code-language**: All fenced code blocks MUST have a language identifier
- Use proper language tags: `typescript`, `bash`, `json`, `markdown`, `text`, etc.
- Never use unmarked code fences (` ``` ` without language)
- Example: ` ```typescript ` not ` ``` `

### Upgrade Policy

- Track Nuxt stable releases; upgrade deliberately with a test plan
- Document breaking changes and migration steps

## Governance

### Constitution Authority

This constitution governs development practices and architecture. Reviews must ensure compliance with its principles.

### Amendment Process

1. Propose change in `.specify/memory/` with rationale
2. Review and approval by project maintainer
3. Version bump and documentation updates

### Exception Handling

Exceptions permitted when:

- External constraints force deviation (document and isolate)
- Rapid prototyping is necessary (must be resolved before merging to `main`)

All exceptions must be documented, tracked, and reviewed.
