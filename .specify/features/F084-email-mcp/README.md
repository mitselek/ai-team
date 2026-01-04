# F084: Email MCP Server (Gmail) Implementation

## Feature Overview

Implement an Email MCP server that integrates with Gmail via OAuth2 to read and send email on behalf of a configurable shared mailbox. The server runs as a long-running daemon that continuously polls Gmail Pub/Sub for new messages.

## Goal

Enable the AI Team orchestrator to send and receive emails through a shared Gmail account, supporting plus-addressing for automatic routing to teams/agents.

## Scope

**Phase 1 (Current)**:

- Pub/Sub-only inbound processing (no polling fallback)
- Single configurable mailbox (via env var)
- Plus-addressing routing
- Comprehensive unit tests
- OAuth bootstrap CLI
- Daemon with graceful shutdown

**Phase 2 (Defer)**:

- Multi-account support
- Attachment handling
- VaultProvider implementation
- Polling fallback
- Custom Pub/Sub topic creation

## Acceptance Criteria

- ✅ All 5 sub-issues completed and passing quality gates
- ✅ All type definitions match Phase 1 requirements
- ✅ 100% of unit tests passing
- ✅ npm run format:check, lint, typecheck, test all pass
- ✅ OAuth bootstrap CLI works end-to-end
- ✅ Daemon starts and polls Pub/Sub without errors
- ✅ Graceful shutdown on SIGTERM
- ✅ PII redaction working in logs
- ✅ Structured logging with org/team/agent context

## Execution Plan

**Sub-Issue #85** (2-3 hours): Project Scaffold & Secrets Management

- SecretsProvider interface + LocalDevProvider
- VaultProvider stub
- Directory structure + npm config

**Sub-Issue #86** (3-4 hours): Gmail API Wrapper & Auth

- Gmail client wrapper (read, send, labels, watch)
- OAuth token management with auto-refresh
- Health checks on 401 errors

**Sub-Issue #87** (3-4 hours): Pub/Sub Inbound Processing

- Pub/Sub pull subscription polling (daemon loop)
- Message processor with labeling
- Plus-addressing parser + PII redaction utility

**Sub-Issue #88** (3-4 hours): Outbound & MCP Tools

- Email send with exponential backoff
- 7 MCP tool endpoints
- Backoff utility with jitter

**Sub-Issue #89** (4-5 hours): OAuth Bootstrap CLI & Documentation

- Interactive OAuth flow
- Comprehensive README (setup, Pub/Sub config, running)
- Daemon main entry (src/index.ts)
- Integration tests

**Total Estimated**: 16-20 hours (can be parallelized to ~8 hours)

## Execution Order

```
#85 (Scaffold) ──────┐
                     ├─→ #87 (Inbound)  ──┐
#86 (Gmail/Auth) ────┤                    ├─→ #88 (Outbound) ──→ #89 (CLI/Docs)
                     │                    │
                     └────────────────────┘
```

**Parallel Groups**:

- Group 1: #85 and #86 (independent)
- Group 2: #87 (requires #86)
- Group 3: #88 (requires #86, #87)
- Group 4: #89 (requires all)

## Reference Files

- Prompt template: `.github/prompts/dev-task.prompt.md`
- Email spec: `.github/prompts/email-mcp-server.prompt.md`
- Workflow guide: `.github/prompts/WORKFLOW.prompt.md`
- Constitution: `.specify/memory/constitution.md`

## Key Technical Decisions

1. **Daemon Architecture**: Long-running process polling Pub/Sub continuously (not scheduled task)
2. **Pub/Sub-Only**: No polling fallback in Phase 1 (simpler, can add Phase 2)
3. **ConfigurableAddress**: Gmail address via `GMAIL_ADDRESS` env var (not hardcoded)
4. **Split TDD**: Generate tests first, then implement against frozen test spec
5. **Structured Logging**: Tri-level (org/team/agent) with PII redaction

## Success Metrics

- All 5 sub-issues passing CI
- 8+ unit test files, > 80% coverage
- 0 type errors, 0 lint errors
- OAuth bootstrap CLI functional
- Daemon runs without crashing
- Graceful shutdown verified
