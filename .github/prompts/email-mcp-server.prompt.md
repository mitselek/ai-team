# Email MCP Server (Gmail) — Implementation Prompt

## Goal

Implement an Email MCP server in this repository that integrates with Gmail via OAuth2 to read and send email on behalf of a configurable shared mailbox. Use Gmail Pub/Sub with a pull subscription for push-based event processing (no public HTTPS endpoint required). The server runs as a long-running daemon that continuously polls the Pub/Sub subscription for new messages. Align with our project constitution and repository standards.

## Context & Standards

### Repository Structure

- **Project**: ai-team (Nuxt 3 app + server utilities + existing MCP code patterns)
- **Key Paths**: `@` → `app/`, `@@` → repo root (TS path aliases)

### Development Standards

- **Language**: TypeScript with strict mode enabled
- **Linting**: ESLint flat config, Prettier v3 with Tailwind plugin
- **Testing**: Vitest framework with unit tests required
- **Quality Gates** (all must pass): `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`
- **Logging**: pino logger wrappers with org/team/agent context

### Constitutional Requirements

Reference `.specify/memory/constitution.md`:

- **Type Safety**: Strict TypeScript, discriminated unions, no `any` types
- **Test-First**: Unit tests for core utilities before implementation
- **Composable-First**: Modular design with clear interfaces (SecretsProvider, Gmail client)
- **Observable Development**: Tri-level logging; structured context
- **Pragmatic Simplicity**: Keep Phase 1 focused; design for extension
- **Security**: No committed secrets; abstract via SecretsProvider

## Phase 1 Requirements

### 1. Email Provider & OAuth Flow

**Provider**: Gmail only

- Use Gmail API for: read messages, manage labels, watch for changes, send email
- Authentication: OAuth2 with refresh token storage
- Required scopes: `https://www.googleapis.com/auth/gmail.modify` and `https://www.googleapis.com/auth/gmail.send`

**Secrets Management**:

- Implement `SecretsProvider` interface with two implementations:
  - **LocalDevProvider**: Store in file or env (for development)
  - **VaultProvider** (stub): Prepared for future Vault integration
- Never commit secrets; provide `.env.example` with placeholder values
- Implement automated token health checks: on 401/invalid_grant errors, log structured warning and surface actionable remediation steps

### 2. Mailbox Scope

- Single shared mailbox: configured via `GMAIL_ADDRESS` environment variable (e.g., `mitselek@gmail.com`)
- All operations performed on behalf of this account
- No multi-user or impersonation required in Phase 1
- Never hardcode the email address; always use env configuration

### 3. Inbound Message Processing

**Daemon Architecture**:

- Server runs as a long-running daemon process
- Continuously polls the Pub/Sub pull subscription in a loop
- On startup, calls Gmail `watch` API to register for Pub/Sub notifications on specific labels
- No public HTTPS endpoint required; server polls Pub/Sub internally

**Push Path Processing**:

- Implement polling of Pub/Sub pull subscription (blocking/waiting pattern)
- On notification, use `historyId` and message IDs to fetch new messages
- Target latency: < 10 seconds from email arrival to processing start
- Acknowledge messages after successful processing (prevents redelivery)

**Message Processing**:

- Fetch full message body on demand (lazy load)
- Apply labels: `AI/INBOUND`, `AI/QUEUED`, `AI/PROCESSED`, `AI/ERROR`
- Optional per-team label: `AI/TEAM/PostOffice`

### 4. Outbound Sending

- Implement send via Gmail API
- Support: to/cc/bcc, subject, text and optional HTML body
- Phase 1 acceptable: inline text bodies only (attachments deferred if they complicate OAuth scopes)
- Return: message ID on success, error details on failure

### 5. Plus-Addressing & Routing

**Plus Addressing**: Support `{GMAIL_ADDRESS}+<token>` pattern

- Example: `mitselek+hr-hiring@gmail.com` routes to HR hiring workflow (where `mitselek` is from `GMAIL_ADDRESS` env var)
- Implement `RouteKey` type derived from plus-addressing token
- Default route: Post Office when no token present

**Label Scheme**:

- Standard labels: `AI/INBOUND`, `AI/QUEUED`, `AI/PROCESSED`, `AI/ERROR`
- Team labels (optional): `AI/TEAM/{TeamName}`

### 6. Data Storage & Privacy

**Persistent Metadata** (minimal):

- Store locally: messageId, threadId, from, to, subject, receivedAt, labels, snippet
- Fetch full body on demand from Gmail (never batch-store)

**PII Redaction**:

- Redact email addresses and names in logs
- Log at: `[INFO] processed message {messageId: '...'} from {domain: 'example.com'}`
- Never log tokens or full bodies

**Encrypted Storage** (future):

- Prepare abstraction; current implementation uses file storage
- Future Vault provider will handle encryption at rest

### 7. Volume & Performance Targets

- Expected volume: ~25 inbound, ~25 outbound per day
- Push latency: < 10 seconds
- Polling latency: < 60 seconds
- Token refresh: automatic, transparent

### 8. Failure Handling

**Transient Failures** (429, 5xx):

- Implement exponential backoff with jitter
- Max retries: 3 attempts over ~30 seconds

**Permanent Failures**:

- Apply `AI/ERROR` label
- Log structured warning: `{level: 'warn', type: 'message_processing_failed', messageId, reason}`
- Surface remediation suggestion in logs

**Quarantine**:

- Messages with repeated failures moved to `AI/ERROR` label
- Do not retry indefinitely
- Operator can manually review and remediate

### 9. Observability & Metrics

**Tri-Level Logging** (per constitution):

- **Org level**: Daily summary (e.g., "Processed 24 inbound, 2 failures")
- **Team level**: Per-team aggregates with context
- **Agent level**: Detailed logs for specific message processing with full context

**Metrics to Track**:

- `email.inbound.processed` (counter)
- `email.outbound.sent` (counter)
- `email.errors.count` (counter by error type)
- `email.pubsub.polls` (counter)
- `email.latency.push` (histogram, milliseconds)

**Structured Logging Format**:

```json
{
  "level": "info",
  "type": "email:message:received",
  "messageId": "...",
  "from": "...",
  "orgId": "...",
  "teamId": "...",
  "timestamp": "2026-01-04T12:00:00Z"
}
```

### 10. Core Type Definitions (TypeScript)

```typescript
type EmailEnvelope = {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  cc?: string
  date: number
  labels: string[]
  snippet: string
}

type EmailMessage = EmailEnvelope & {
  hasHtml: boolean
  sizeEstimate: number
  bodyText?: string
  bodyHtml?: string
}

type RouteKey = string // derived from plus-addressing token

type SendRequest = {
  to: string
  cc?: string
  bcc?: string
  subject: string
  text?: string
  html?: string
}

type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E }
```

### 11. MCP Tool Endpoints

Export these operations as MCP tools:

```typescript
email.send(request: SendRequest): Result<{ id: string }>

email.list(query?: string, labelIds?: string[], maxResults?: number): Result<EmailEnvelope[]>

email.get(id: string): Result<EmailMessage>

email.applyLabels(id: string, labels: string[]): Result<void>

email.watch.start(): Result<void>

email.watch.stop(): Result<void>

email.route.parse(address: string): Result<RouteKey>
```

## Deliverables

- Code in `mcp-server-email-gmail/` with:
  - Source (TypeScript) and comprehensive tests
  - Minimal README with setup, OAuth bootstrap steps, Pub/Sub setup instructions (pull subscription), and run commands
- Add or update npm scripts for local development, testing, and running
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

### 13. Environment Configuration

**Required Environment Variables**:

- `GMAIL_ADDRESS`: Shared mailbox email address (e.g., `mitselek@gmail.com`)
- `GMAIL_CLIENT_ID`: OAuth client ID from Google Cloud Console
- `GMAIL_CLIENT_SECRET`: OAuth client secret
- `GMAIL_REFRESH_TOKEN`: Refresh token (obtained via oauth-bootstrap.ts)
- `GCP_PROJECT_ID`: Google Cloud project ID for Pub/Sub
- `PUBSUB_TOPIC_NAME`: Pub/Sub topic name (e.g., `gmail-notifications`)
- `PUBSUB_SUBSCRIPTION_NAME`: Pull subscription name (e.g., `gmail-notifications-sub`)

**Optional Environment Variables**:

- `LOG_LEVEL`: `debug`, `info`, `warn`, `error` (default: `info`)
- `DAEMON_POLL_TIMEOUT_MS`: Pub/Sub pull timeout in milliseconds (default: `10000`)
- `DAEMON_MAX_MESSAGES`: Max messages per pull batch (default: `10`)

### 14. Project Organization

**Directory Layout**:

```
mcp-server-email-gmail/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── secrets/
│   │   ├── provider.ts       # SecretsProvider interface
│   │   ├── local.ts          # LocalDevProvider implementation
│   │   └── vault.ts          # VaultProvider stub
│   ├── gmail/
│   │   ├── client.ts         # Gmail API wrapper
│   │   ├── auth.ts           # OAuth bootstrap & token management
│   │   └── types.ts          # Gmail API response types
│   ├── inbound/
│   │   ├── watch.ts          # Pub/Sub watch & polling
│   │   ├── processor.ts      # Message processing & labeling
│   │   └── parser.ts         # Email parsing & plus-addressing
│   ├── outbound/
│   │   └── sender.ts         # Sending implementation
│   ├── tools/
│   │   └── index.ts          # MCP tool definitions
│   ├── utils/
│   │   ├── redaction.ts      # PII redaction
│   │   ├── backoff.ts        # Exponential backoff strategy
│   │   └── logger.ts         # Structured logging with context
│   └── types.ts              # Core TypeScript types
├── tests/
│   ├── gmail.spec.ts         # Gmail client unit tests
│   ├── route-parser.spec.ts  # Plus-addressing routing tests
│   ├── redaction.spec.ts     # PII redaction tests
│   ├── backoff.spec.ts       # Backoff strategy tests
│   └── secrets.spec.ts       # SecretsProvider contract tests
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── README.md
├── .env.example
└── oauth-bootstrap.ts        # CLI for OAuth flow
```

**Key Files**:

- `oauth-bootstrap.ts`: Standalone script for interactive OAuth flow
- `README.md`: Setup, Pub/Sub configuration, running instructions
- `.env.example`: Template for required environment variables

### 15. Testing Strategy

**Required Unit Tests**:

- `gmail.spec.ts`: Gmail client methods (mock API responses)
- `route-parser.spec.ts`: Plus-addressing parsing & RouteKey derivation
- `redaction.spec.ts`: Email/name redaction in logs
- `backoff.spec.ts`: Exponential backoff logic with jitter
- `secrets.spec.ts`: SecretsProvider interface & LocalDevProvider

**Testing Approach**:

- Mock Gmail API responses; do not make live calls
- Use Vitest with descriptive test names
- Target coverage: > 80% for core utilities
- All tests must pass in CI
- Do not test Pub/Sub integration in unit tests (use integration tests instead)

### 16. Quality Gates & CI

**Local Development Checks** (before push):

```bash
npm run format:check  # Prettier formatting
npm run lint          # ESLint rules
npm run typecheck     # TypeScript strict mode
npm test              # Vitest
```

**All must pass before commit**.

**Repository Integration**:

- Ensure existing repo scripts still work
- If `mcp-server-email-gmail/` has isolated `package.json`, consider adding npm workspace references
- Keep path aliases `@` and `@@` available for imports

### 17. Daemon Lifecycle Management

**Process Health**:

- Implement graceful shutdown: on SIGTERM, acknowledge in-flight messages and close connections
- Log startup and shutdown events with full context
- Implement health check: log heartbeat every 5 minutes during normal operation
- Log error immediately if Pub/Sub connection fails

**Running the Daemon**:

```bash
# Development (with required env vars)
GMAIL_ADDRESS=mitselek@gmail.com npm start

# Production (with process manager like PM2)
pm2 start src/index.ts --name email-mcp -- --env-file .env
```

## Implementation Guidelines

### What to Build (Phase 1 Scope)

1. Core `SecretsProvider` interface with LocalDevProvider implementation
2. Gmail API wrapper (read, send, labels, watch)
3. Pub/Sub pull polling with Gmail watch integration
4. Polling fallback (if Pub/Sub unavailable)
5. Inbound message processor with label application
6. Plus-addressing route parser
7. Outbound send implementation
8. MCP tool endpoints
9. Comprehensive unit tests
10. OAuth bootstrap CLI
11. README with setup steps

### What NOT to Build (Defer to Phase 2)

- Multi-account support
- Attachment handling (inline text only)
- VaultProvider implementation (stub only)
- Advanced filtering or message templates
- Admin dashboard or UI
- Polling fallback if Pub/Sub unavailable
- Custom Pub/Sub topic creation (user must set up manually)

## Markdown Quality Standards

- Use blank lines before/after all headings, lists, and code blocks
- Remove trailing spaces; avoid inline HTML
- Avoid emojis in commit messages, code comments, logs, and formal docs
- Use text prefixes instead: `[ERROR]`, `[INFO]`, `[WARNING]`

## Recursive Propagation

If you generate code that itself produces templates or prompts, those outputs MUST also include:

- Markdown formatting requirements (blank lines before/after structure)
- Type safety requirements (strict TS, discriminated unions)
- Constitutional compliance checks

## Execution Steps

1. Scaffold `mcp-server-email-gmail/` with TS, tests, and npm scripts
2. Implement `SecretsProvider` and a Gmail client wrapper
3. Implement inbound watch (Pub/Sub pull) and polling fallback
4. Implement outbound send
5. Add MCP tool endpoints
6. Add unit tests and ensure all quality gates pass (format:check, lint, typecheck, test)
7. Document OAuth bootstrap and Pub/Sub configuration in README
8. Commit with the specified message and keep this file
