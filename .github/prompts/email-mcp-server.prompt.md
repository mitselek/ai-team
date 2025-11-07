# Email MCP Server (Gmail) — Implementation Prompt

## Goal

Implement a Dockerized Email MCP server in this repository that integrates with Gmail via OAuth2 to read and send email on behalf of a single shared mailbox (mitselek@gmail.com). Support webhook‑style push via Gmail Pub/Sub using a pull subscription (no public HTTPS endpoint required) with a fallback polling mode when push isn’t available. Align with our project constitution and repository standards.

## Context

- Repository: ai-team (Nuxt 3 app + server utilities + existing MCP code patterns)
- Conventions:
  - TypeScript strict, path aliases: `@` -> `app/`, `@@` -> repo root
  - ESLint flat config, Stylelint for CSS/Vue, Prettier v3 with Tailwind plugin
  - CI runs: format:check, eslint, stylelint, typecheck, test
  - Logging: pino logger wrappers with org/team/agent context
- Constitution: See `.specify/memory/constitution.md` — respect Type Safety, Test‑First, Composable‑First, Observable Development, Pragmatic Simplicity, and Security.

## Phase 1 Requirements

1. Providers & protocols

- Gmail only. Use Gmail API for read/labels/watch and Gmail send API for outbound. OAuth2.
- Prefer push via Pub/Sub (pull subscription) to process new mail; provide polling fallback.

2. Mailbox model

- Single shared mailbox: `mitselek@gmail.com`.

3. OAuth & secrets

- Flow: Interactive OAuth to obtain refresh token.
- Scopes: `https://www.googleapis.com/auth/gmail.modify` and `https://www.googleapis.com/auth/gmail.send`.
- Store `client_id`, `client_secret`, and `refresh_token` behind a simple `SecretsProvider` interface with an in‑repo, local‑dev implementation (file or env) and a stub for future Vault.
- Automated token health checks: on 401/invalid_grant, log structured warning, surface actionable remediation, and allow re‑auth bootstrap.

4. Inbound (watch + processing)

- Create/setup Pub/Sub topic and subscription (document steps). Use a pull subscription (service polls Pub/Sub). No public endpoint required.
- Implement a watcher that:
  - Calls Gmail `watch` to register labels and Pub/Sub topic
  - Polls the Pub/Sub subscription
  - On notification, uses `historyId`/message IDs to fetch new messages
- Fallback polling mode: If Pub/Sub is not configured, poll Gmail (incremental via `historyId` or `q`) at a safe interval.

5. Outbound

- Implement send via Gmail API with minimal features: to/cc/bcc, subject, text and optional HTML body, and simple attachments (phase 1: inline text only is acceptable if attachments complicate OAuth scopes).

6. Addressing & routing

- Support plus‑addressing `mitselek+<team_or_agent>@gmail.com` to route incoming messages to Post Office sub‑routines/agents.
- Labeling scheme on Gmail:
  - `AI/INBOUND`, `AI/QUEUED`, `AI/PROCESSED`, `AI/ERROR`
  - Optional per‑team label: `AI/TEAM/PostOffice`

7. Storage & privacy

- Persist minimal metadata + a concise body snippet locally (e.g., messageId, threadId, from, to, subject, receivedAt, labels, snippet). Fetch full body on demand for processing.
- Redact PII (emails, names) in logs. Store sensitive/full content only in the secure store abstraction when absolutely needed (encrypted at rest in a future Vault provider).

8. Volume & performance

- Target ~25 inbound and ~25 outbound per day.
- Latency targets: push path < 10s; polling fallback < 60s.

9. Failure handling

- Exponential backoff with jitter on 429/5xx.
- Quarantine: apply `AI/ERROR` label for messages that repeatedly fail processing; emit visible log with remediation suggestion.

10. Observability

- Tri‑level logging per constitution: org/team/agent context for each email event; concise summaries at org level; detailed at team/agent level.
- Basic metrics: counts for inbound processed, outbound sent, failures, and Pub/Sub polls.

11. Data model (minimal TS types)

- EmailEnvelope: { id, threadId, subject, from, to, cc?, date, labels }
- EmailMessage: EmailEnvelope + { snippet, hasHtml, sizeEstimate }
- RouteKey: derived from plus‑addressing token or default Post Office route
- SendRequest: { to, cc?, bcc?, subject, text?, html? }
- Result types with success/error discriminants.

12. MCP tools (exported operations)

- `email.send(request: SendRequest)` → { ok, id?, error? }
- `email.list(query?: string, labelIds?: string[], maxResults?: number)` → EmailEnvelope[]
- `email.get(id: string)` → EmailMessage
- `email.applyLabels(id: string, labels: string[])` → { ok, error? }
- `email.watch.start()` / `email.watch.stop()` → control watch lifecycle
- Optional: `email.route.parse(address: string)` → RouteKey

13. Project layout & build

- Create a new folder: `mcp-server-email-gmail/` with a Node/TypeScript service and tests.
- Include `Dockerfile` and minimal `docker-compose` service definition for local run.
- Keep repository conventions (ESLint, Prettier, TypeScript strict, path aliases). Reuse existing config where possible; if isolated, add local configs.

14. OAuth bootstrap utility

- Small CLI to perform the OAuth web flow locally and persist the refresh token via `SecretsProvider` (file or env). Provide step‑by‑step README.

15. Tests (Vitest)

- Unit tests for: label application, route parsing, redaction util, backoff strategy, and `SecretsProvider` contract.
- Mock Gmail client for tests; do not make live calls.

16. CI & quality gates

- Ensure `npm run format:check`, `npm run lint`, `npm run lint:css` (if applicable), `npm run typecheck`, and `npm test` pass locally.
- Add/update scripts if the server lives in its own package.json; otherwise integrate with repo scripts carefully.

## Security & Compliance

- Do not commit secrets. Provide `.env.example` for local dev only.
- Abstract secrets through `SecretsProvider` with a production‑ready stub for Vault.
- Redact PII in logs and never log tokens.

## Deliverables

- Code in `mcp-server-email-gmail/` with:
  - Source (TypeScript), tests, Dockerfile, and optional docker‑compose service
  - Minimal README with setup, OAuth bootstrap steps, Pub/Sub setup instructions (pull subscription), and run commands
- Add or update scripts so we can build/test locally
- Ensure no existing app behavior is broken
- Create a conventional commit: `feat(email-mcp): Gmail Email MCP server (pull-based Pub/Sub) with OAuth bootstrap and tests`
- Keep this prompt file (do not delete)

## Constitution Awareness

- File: `.specify/memory/constitution.md`
- Embed principles into code and docs:
  - Type Safety: strict TS types and discriminated unions
  - Test‑First: include unit tests for core utilities
  - Composable‑First: `SecretsProvider`, Gmail client wrapper, routing & redaction utils
  - Observable Development: tri‑level logs, clear metrics counters
  - Pragmatic Simplicity: keep phase 1 narrow; prepare extension points without over‑engineering

## Markdown Quality Standards

- Use blank lines before/after headings, lists, and code blocks
- Remove trailing spaces; avoid inline HTML unless needed
- Emojis: avoid in commit messages, code comments, console logs, and formal docs
- Include: “Review output for markdown linting issues and fix before presenting” as a validation step

## Recursive Propagation Clause

If you generate a prompt or template that itself produces markdown content or code, that output MUST also include:

- These markdown formatting requirements
- Constitutional compliance requirements (if code‑related)
- This recursive propagation clause itself

## Execution Steps

1. Scaffold `mcp-server-email-gmail/` with TS, tests, and Dockerfile
2. Implement `SecretsProvider` and a Gmail client wrapper
3. Implement inbound watch (Pub/Sub pull) and polling fallback
4. Implement outbound send
5. Add MCP tool endpoints
6. Add unit tests and ensure all quality gates pass
7. Document OAuth bootstrap and Pub/Sub configuration in README
8. Commit with the specified message and keep this file
