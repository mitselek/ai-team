# Task 01: Project Scaffold & Secrets Management (Issue #85)

## Context

Email MCP Server Phase 1: Create Node.js MCP server scaffolding with pluggable secrets provider interface.

Reference: `.github/prompts/email-mcp-server.prompt.md` - Goal, environment config, Phase 1 scope.

## Objective

Create production-ready project structure with:

- SecretsProvider interface supporting multiple backends
- LocalDevProvider (env vars for development)
- VaultProvider stub (defer to Phase 2)
- Comprehensive unit tests

## Deliverables

### Files to Create

```
src/
  secrets/
    provider.ts       - SecretsProvider interface
    local.ts          - LocalDevProvider implementation
    vault.ts          - VaultProvider stub (throws NotImplementedError)
    index.ts          - Exports

tests/
  secrets.spec.ts     - Unit tests for all providers

tsconfig.json         - Update: include src/ and tests/
package.json          - Update: add test script, dependencies
README.md             - Phase 1 overview (in root)
```

### Type Definitions

```typescript
// src/secrets/provider.ts

interface SecretsProvider {
  get(key: string): Promise<string>
}

class LocalDevProvider implements SecretsProvider {
  // Read from env vars: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
  async get(key: string): Promise<string>
}

class VaultProvider implements SecretsProvider {
  // Constructor takes vault config (url, path, etc)
  // All methods throw NotImplementedError
  async get(key: string): Promise<string>
}

// Export factory
export function createSecretsProvider(type: 'local' | 'vault'): SecretsProvider
```

## Testing Requirements

See `00-tests-arguments.md` - Secrets Management section:

- LocalDevProvider reads 3 env vars correctly
- VaultProvider throws NotImplementedError
- Interface is satisfied by both implementations

**Test File**: `tests/secrets.spec.ts` (minimal, focused)

**Success**: All env var tests pass, stub works, interface contract verified

## Reference Patterns

**Env var naming**: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
(from `email-mcp-server.prompt.md` Environment Configuration section)

**Error handling**: Throw Error on missing env var with clear message:

```typescript
if (!clientId) {
  throw new Error('GMAIL_CLIENT_ID env var not set')
}
```

**Logging pattern** (use logger.ts from app/utils/):

```typescript
import { useLogger } from '@/utils/logger'
const { info, error } = useLogger('secrets')

info(`Loading secrets from ${type}`)
```

## No Deliverables

- ❌ No Docker/docker-compose
- ❌ No Vault setup instructions (Phase 2)
- ❌ No OAuth bootstrap (handled in Issue #89)

## Success Criteria

- ✅ SecretsProvider interface defined
- ✅ LocalDevProvider reads GMAIL\_\* vars
- ✅ VaultProvider stub exists with NotImplementedError
- ✅ Factory function creates correct provider
- ✅ All env var tests passing (100%)
- ✅ TypeScript strict mode passes
- ✅ ESLint passes with no warnings
- ✅ No console.log - use logger only

## Acceptance Test

```bash
# From project root
npm test -- tests/secrets.spec.ts

# Should show:
# PASS tests/secrets.spec.ts
#   LocalDevProvider
#     ✓ reads GMAIL_CLIENT_ID from env
#     ✓ reads GMAIL_CLIENT_SECRET from env
#     ✓ reads GMAIL_REFRESH_TOKEN from env
#     ✓ throws on missing env var
#   VaultProvider
#     ✓ throws NotImplementedError
#   createSecretsProvider
#     ✓ returns LocalDevProvider for 'local'
#     ✓ throws for unknown type
```

## Technical Notes

- **Language**: TypeScript (strict mode)
- **Test framework**: Vitest (existing setup)
- **Logger**: Use `@/utils/logger` module (already exists in codebase)
- **No external secrets libraries** (keep minimal, intentional design)
- **Env var validation**: Fail fast with clear error messages

## Phase Dependencies

- ⏭️ No wait time - start immediately
- ← Blocks Issue #86 (Gmail auth needs secrets)
- ← Blocks Issue #87 (Pub/Sub needs secrets)

## Estimated Effort

2-3 hours

- 1h: Interface + implementations
- 1h: Unit tests
- 0.5h: Integration with tsconfig/package.json
