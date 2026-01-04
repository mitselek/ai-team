# Task 05: OAuth Bootstrap CLI & Documentation (Issue #89)

## Context

Email MCP Server Phase 1: Create OAuth2 token bootstrap CLI and production-ready daemon entry point + documentation.

Reference: `.github/prompts/email-mcp-server.prompt.md` - OAuth workflow, environment setup, Phase 1 overview.

Prerequisites: All Issues #85-#88 must be complete.

## Objective

Create user-facing tools for:

- Interactive OAuth2 token bootstrap (gets refresh token from Google)
- Production daemon entry point (runs Email MCP server)
- Comprehensive README with setup instructions
- Integration tests (no live calls)

## Deliverables

### Files to Create

```
scripts/
  oauth-bootstrap.ts    - OAuth interactive CLI

src/
  index.ts              - Daemon entry point (main)

tests/
  integration.spec.ts   - End-to-end flow (mocked)

README.md               - Setup, usage, architecture guide
```

### OAuth Bootstrap CLI

```typescript
// scripts/oauth-bootstrap.ts

import { createInterface } from 'readline'
import { SecretsProvider, LocalDevProvider } from '@/secrets'

interface BootstrapConfig {
  clientId: string
  clientSecret: string
  redirectUrl: string // e.g., http://localhost:3000/callback
}

class OAuthBootstrap {
  constructor(config: BootstrapConfig)

  // Step 1: Generate authorization URL
  getAuthorizationUrl(scopes: string[]): string {
    // Return URL user visits to grant permission
    // https://accounts.google.com/o/oauth2/v2/auth?...
  }

  // Step 2: Exchange auth code for tokens
  async exchangeCodeForToken(authCode: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
  }> {
    // POST to https://oauth2.googleapis.com/token
    // Return tokens
  }

  // Step 3: Save tokens to .env
  async saveTokens(refreshToken: string): Promise<void> {
    // Write to .env file
    // Validate by reading back
  }
}

// Main CLI interaction
async function main() {
  console.log('Gmail Email MCP Server - OAuth Bootstrap')
  console.log()

  // Get config from env or user input
  const config = await getUserConfig()

  const bootstrap = new OAuthBootstrap(config)

  // Step 1: User visits URL
  const authUrl = bootstrap.getAuthorizationUrl([
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.labels'
  ])

  console.log('1. Visit this URL to authorize:')
  console.log(authUrl)
  console.log()

  // Step 2: User pastes auth code
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const authCode = await new Promise<string>((resolve) => {
    readline.question('2. Paste the authorization code: ', (code) => {
      resolve(code)
      readline.close()
    })
  })

  // Step 3: Exchange code
  const tokens = await bootstrap.exchangeCodeForToken(authCode)
  console.log('✓ Got tokens')

  // Step 4: Save to .env
  await bootstrap.saveTokens(tokens.refresh_token)
  console.log('✓ Saved GMAIL_REFRESH_TOKEN to .env')
  console.log()
  console.log('Ready! Run: npm run daemon')
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('Error:', error.message)
    process.exit(1)
  })
}
```

### Daemon Entry Point

```typescript
// src/index.ts

import { SecretsProvider, LocalDevProvider } from '@/secrets'
import { GmailClient } from '@/gmail'
import { startPubSubDaemon } from '@/inbound'
import { EmailSender } from '@/outbound'
import { MCP_TOOLS } from '@/tools'
import { useLogger } from '@/utils/logger'

const { info, error } = useLogger('email-mcp-daemon')

export async function startDaemon() {
  try {
    // Initialize
    info('Starting Email MCP Server', { version: '0.1.0' })

    const secrets = new LocalDevProvider()
    const gmailClient = new GmailClient({ secretsProvider: secrets })
    const sender = new EmailSender(gmailClient)

    // Start Pub/Sub daemon
    const daemon = await startPubSubDaemon(
      'PostOffice', // default route
      async (msg) => {
        // Handle inbound message
        info('Received message', {
          messageId: msg.messageId,
          routeKey: msg.routeKey
        })
      }
    )

    // Graceful shutdown
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT']
    for (const signal of signals) {
      process.on(signal, async () => {
        info(`Received ${signal}, shutting down...`)
        await daemon.stop()
        process.exit(0)
      })
    }

    info('Email MCP Server running', {
      mailbox: process.env.GMAIL_ADDRESS,
      tools: MCP_TOOLS.length
    })
  } catch (err) {
    error('Failed to start daemon', {
      error: err instanceof Error ? err.message : String(err)
    })
    process.exit(1)
  }
}

// Start if run directly
if (import.meta.main) {
  startDaemon()
}

export { GmailClient, EmailSender, startPubSubDaemon }
```

### Integration Tests

```typescript
// tests/integration.spec.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { startDaemon } from '@/index'
import { EmailSender } from '@/outbound'
import type { GmailClient } from '@/gmail'

describe('Email MCP Server Integration', () => {
  describe('Daemon startup', () => {
    it('initializes secrets, client, and daemon', async () => {
      // Mock all external dependencies
      // Verify initialization order
      // Verify no errors on startup
    })

    it('registers graceful shutdown handlers', async () => {
      // Verify SIGTERM listener added
      // Verify SIGINT listener added
    })
  })

  describe('Send email flow', () => {
    let sender: EmailSender
    let gmailClient: GmailClient

    beforeEach(() => {
      // Mock GmailClient
      gmailClient = createMockGmailClient()
      sender = new EmailSender(gmailClient)
    })

    it('sends email with to/subject', async () => {
      const result = await sender.send({
        to: 'user@example.com',
        subject: 'Test'
      })
      expect(result.ok).toBe(true)
      expect(result.messageId).toBeDefined()
    })

    it('sends email with cc/bcc', async () => {
      const result = await sender.send({
        to: 'user1@example.com',
        cc: 'user2@example.com',
        bcc: 'user3@example.com',
        subject: 'Test'
      })
      expect(result.ok).toBe(true)
    })

    it('sends email with text and html', async () => {
      const result = await sender.send({
        to: 'user@example.com',
        subject: 'Test',
        text: 'Plain text body',
        html: '<p>HTML body</p>'
      })
      expect(result.ok).toBe(true)
    })

    it('returns error on invalid email', async () => {
      const result = await sender.send({
        to: 'not-an-email',
        subject: 'Test'
      })
      expect(result.ok).toBe(false)
      expect(result.error?.type).toBe('validation')
    })
  })

  describe('OAuth bootstrap', () => {
    it('generates authorization URL with scopes', () => {
      // Mock OAuth provider
      // Verify URL format
      // Verify scopes included
    })

    it('exchanges auth code for tokens', async () => {
      // Mock token endpoint
      // Verify token response
      // Verify refresh_token in response
    })

    it('saves tokens to .env', async () => {
      // Mock filesystem
      // Verify .env written
      // Verify GMAIL_REFRESH_TOKEN set
    })
  })

  describe('PubSub message flow', () => {
    it('routes by plus-address', async () => {
      // Mock Pub/Sub message
      // Route: mitselek+hr-hiring@gmail.com
      // Verify route handler called with RouteKey="hr-hiring"
    })

    it('redacts PII from logs', async () => {
      // Mock message with email addresses
      // Mock logger
      // Verify no email addresses in logged message
      // Verify no full body in logs
    })
  })
})

function createMockGmailClient(): GmailClient {
  // Stub that returns success responses
  return {
    readMessage: vi.fn(),
    listMessages: vi.fn(),
    sendEmail: vi.fn().mockResolvedValue({
      ok: true,
      messageId: 'mock-message-id'
    }),
    applyLabels: vi.fn(),
    watchLabels: vi.fn()
  } as any
}
```

### README.md

````markdown
# Email MCP Server

Email management daemon for shared Gmail mailbox with MCP (Model Context Protocol) tools for LLM agents.

## Quick Start

### Prerequisites

- Node.js 18+
- Gmail account
- Google OAuth2 credentials (see below)

### 1. Get Google OAuth2 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "Email MCP Server"
3. Enable APIs:
   - Gmail API
   - Cloud Pub/Sub API
4. Create OAuth2 credentials:
   - Type: Desktop (oAuth client ID)
   - Save Client ID and Client Secret
5. Set redirect URI: http://localhost:3000/callback

### 2. Bootstrap OAuth Tokens

```bash
# Run interactive OAuth setup
npx ts-node scripts/oauth-bootstrap.ts

# Paste Client ID and Secret when prompted
# Visit URL from CLI
# Grant permissions in browser
# Paste authorization code back into CLI
# .env file updated with GMAIL_REFRESH_TOKEN
```
````

### 3. Set Environment Variables

```bash
# .env
GMAIL_ADDRESS=yourname@gmail.com
GMAIL_CLIENT_ID=<from Google Console>
GMAIL_CLIENT_SECRET=<from Google Console>
GMAIL_REFRESH_TOKEN=<from oauth-bootstrap.ts>
```

### 4. Start Daemon

```bash
npm install
npm run daemon
```

Expected output:

```
[INFO] Starting Email MCP Server v0.1.0
[INFO] Email MCP Server running {mailbox: yourname@gmail.com, tools: 1}
```

## Architecture

### Components

1. **Secrets** - Pluggable provider (LocalDev, Vault in Phase 2)
2. **Gmail Client** - Type-safe Gmail API wrapper with auto token refresh
3. **Pub/Sub Inbound** - Cloud Pub/Sub polling with plus-address routing
4. **Outbound Sender** - Structured email sending with exponential backoff
5. **MCP Tools** - Tool definitions for LLM agents

### Data Flow

```
Gmail Message
    ↓
Pub/Sub Topic (via Gmail Watch)
    ↓
Pub/Sub Subscription
    ↓
Email MCP Daemon (polling)
    ↓
Extract RouteKey from plus-address (mitselek+route-key@...)
    ↓
Route Handler (agent-specific logic)
    ↓
Call MCP Tools (via LLM)
    ↓
Send reply (via send_email tool)
    ↓
Gmail Send
```

### Plus-Addressing Routes

Use different plus-addresses to route to different handlers:

- `yourname+hr-hiring@gmail.com` → HR hiring assistant
- `yourname+vault@gmail.com` → Vault agent
- `yourname+tasks@gmail.com` → Task assignment agent
- `yourname@gmail.com` → Default PostOffice handler

### Logging

Structured logging with PII redaction:

- ✓ Safe: messageId, snippet, labels, from (redacted)
- ✗ Never: full email body, personal names in plain text

See [Logging and Observability](../../../../docs/LOGGING.md#pii-redaction) and [Email MCP Logging](../../../mcp-server-kali-pentest/EMAIL_MCP_README.md#logging-and-observability) for implementation details.

## Phase 1 (Current)

- ✅ Secrets management interface
- ✅ Gmail API client with token refresh
- ✅ Pub/Sub polling with plus-address routing
- ✅ Email sending with backoff
- ✅ MCP tool definitions
- ✅ OAuth bootstrap CLI
- ✅ Integration tests

## Phase 2 (Future)

- Vault integration for production secrets
- Attachment downloading
- Message modification (archive, move labels)
- Scheduled sends
- Gmail filter automation
- Webhook alternative to polling

## Testing

```bash
# Unit tests
npm test

# Integration tests (mocked API)
npm test -- tests/integration.spec.ts

# Type check
npm run typecheck

# Lint
npm run lint
```

## Troubleshooting

### "GMAIL_REFRESH_TOKEN not set"

Run oauth-bootstrap.ts again:

```bash
npx ts-node scripts/oauth-bootstrap.ts
```

### "Rate limited (429)"

Daemon automatically retries with exponential backoff. Check logs for retry timing.

### "invalid_grant" on token refresh

OAuth token expired or revoked. Re-run oauth-bootstrap.ts to get new token.

## Architecture Decision Records

See `.specify/features/F084-email-mcp/` for:

- 00-tests-arguments.md - Test requirements
- 01-scaffold-secrets.prompt.md - Secrets design
- 02-gmail-auth.prompt.md - Gmail client design
- 03-pubsub-inbound.prompt.md - Routing and redaction
- 04-outbound-tools.prompt.md - Backoff and MCP tools
- 05-oauth-cli-docs.prompt.md - This file

## License

MIT

````

## Testing Requirements

See `00-tests-arguments.md` - Integration Test Structure section:

**Integration Tests** (`tests/integration.spec.ts`):
- Daemon startup initializes all components
- OAuth URL generation has correct scopes
- Token exchange works with mocked endpoint
- Send email flow end-to-end (mocked)
- Plus-address routing works
- PII redaction in logs

**Success**: All integration tests pass, no live API calls

## Reference Patterns

**CLI Patterns** (interactive prompts):
```typescript
import { createInterface } from 'readline'

const readline = createInterface({
  input: process.stdin,
  output: process.stdout
})

const answer = await new Promise<string>(resolve => {
  readline.question('Prompt: ', input => {
    resolve(input)
    readline.close()
  })
})
````

**Environment Variables** (load from .env):

```typescript
import 'dotenv/config'

const clientId = process.env.GMAIL_CLIENT_ID
if (!clientId) throw new Error('GMAIL_CLIENT_ID not set')
```

**Graceful Shutdown**:

```typescript
const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT']
for (const signal of signals) {
  process.on(signal, async () => {
    info(`Shutting down on ${signal}`)
    await daemon.stop()
    process.exit(0)
  })
}
```

## No Deliverables

- ❌ No web dashboard (Phase 2)
- ❌ No API server (Phase 2)
- ❌ No containerization (Phase 2)
- ❌ No advanced OAuth flows (PKCE, etc - Phase 2)

## Success Criteria

- ✅ oauth-bootstrap.ts creates authorization URL
- ✅ oauth-bootstrap.ts exchanges auth code for tokens
- ✅ oauth-bootstrap.ts saves GMAIL_REFRESH_TOKEN to .env
- ✅ Daemon entry point (src/index.ts) initializes all components
- ✅ Daemon starts Pub/Sub daemon on startup
- ✅ Daemon registers SIGTERM and SIGINT handlers
- ✅ README includes quick start guide
- ✅ README includes architecture diagram
- ✅ README includes plus-addressing examples
- ✅ README includes troubleshooting section
- ✅ All integration tests passing (100%)
- ✅ TypeScript strict mode passes
- ✅ ESLint passes with no warnings
- ✅ No console.log - use logger only

## Acceptance Test

```bash
# From project root
npm test -- tests/integration.spec.ts

# Should show:
# PASS tests/integration.spec.ts
#   Email MCP Server Integration
#     Daemon startup
#       ✓ initializes secrets, client, and daemon
#       ✓ registers graceful shutdown handlers
#     Send email flow
#       ✓ sends email with to/subject
#       ✓ sends email with cc/bcc
#       ✓ sends email with text and html
#       ✓ returns error on invalid email
#     OAuth bootstrap
#       ✓ generates authorization URL with scopes
#       ✓ exchanges auth code for tokens
#       ✓ saves tokens to .env
#     PubSub message flow
#       ✓ routes by plus-address
#       ✓ redacts PII from logs
```

## Technical Notes

- **Language**: TypeScript (strict mode)
- **CLI library**: Use native readline (no external deps)
- **Config**: dotenv for .env file
- **Entry point**: src/index.ts (use import.meta.main for CLI)
- **Scopes**: Gmail.readonly, Gmail.send, Gmail.labels
- **Log level**: INFO for normal operation, WARN/ERROR for issues
- **Integration tests**: No live API calls, all mocked

## Phase Dependencies

- ⏭️ Waits for Issue #85-#88 (needs all components)
- ← Final step before Phase 1 complete
- ← Enable Phase 2 planning

## Estimated Effort

3-4 hours

- 1h: OAuth bootstrap CLI
- 1h: Daemon entry point + shutdown
- 1h: Integration tests
- 1h: README + setup guide

## Post-Completion

After all 5 sub-issues (#85-#89) complete:

```bash
# Verify all tests pass
npm test

# Run daemon for manual verification
npm run daemon

# Commit all Phase 1 work
git add .
git commit -m "feat(F084): Email MCP Server Phase 1 complete

- Issue #85: Secrets management interface
- Issue #86: Gmail API client with token refresh
- Issue #87: Pub/Sub inbound processing with routing
- Issue #88: Email sender with MCP tools
- Issue #89: OAuth bootstrap CLI and daemon

Closes #85, #86, #87, #88, #89
Closes #84 (meta-issue)
"
```

Then transition to Phase 2 planning:

- Vault integration
- Webhook alternative
- Feature expansion
