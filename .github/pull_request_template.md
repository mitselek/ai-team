# Pull Request

## Summary

Describe the change and the problem it solves.

## Checklist — Constitution Compliance

Refer to `.specify/memory/constitution.md` and confirm the following:

- [ ] Type Safety: No new `any` types introduced without explicit, documented justification
- [ ] Test-First for critical paths: Added/updated tests for orchestration, approvals, rate limiting, and spend controls (as applicable)
- [ ] API-First: Server routes validate inputs, return structured JSON, and use proper status codes
- [ ] Observable: Structured logging added/updated (orgId/teamId/agentId/taskId/toolId/correlationId as relevant)
- [ ] Security & Secrets: No secrets in code/logs; Vault integration respected
- [ ] GitHub-Centric: If applicable, docs updated under `docs/` and workflow integrations noted
- [ ] Markdown Quality: Headings/lists/code blocks separated by blank lines; no trailing spaces

## Tests

Explain test coverage and how to reproduce locally.

```bash
npm ci
npm run typecheck
npm run lint
npm test
```

## Screenshots / Demos (if UI)

Add screenshots or describe UI changes.

## Notes

List known limitations or follow-ups.
