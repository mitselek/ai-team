# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Team is an asynchronous AI agent orchestration platform where AI agents collaborate as persistent team members with hierarchical organization, intelligent task delegation, and GitHub-based persistence. This is a Nuxt 3 (Vue 3 + TypeScript) application with a Nitro server backend.

## Development Commands

### Essential Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Testing
npm test                    # Run all tests once
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report

# Production build
npm run build
npm run preview            # Preview production build
```

### Running Single Tests

```bash
# Run a specific test file
npx vitest run tests/api/agents.spec.ts

# Run tests matching a pattern
npx vitest run -t "agent creation"

# Run a specific test file in watch mode
npx vitest --watch tests/api/agents.spec.ts
```

## Architecture Overview

### Core Concepts

**Hierarchical Agent System**: Agents form a tree structure where managers (senior agents) delegate to subordinates. Each agent (except root) has exactly one senior. Agents maintain their own task queues and exhibit organic behaviors (boredom when idle, escalation when stuck).

**GitHub-Centric Persistence**: Each organization has a dedicated GitHub repository for agent definitions, tools (code), knowledge base (wiki), and project artifacts. Currently uses in-memory storage (MVP), with GitHub integration planned.

**Six Core Teams**: Every organization auto-initializes with pre-configured teams:

- HR/Recruiter: Conducts agent interviews, prevents redundancy
- Toolsmith: Creates and maintains internal tools with approval workflow
- Library: Manages knowledge base and archiving
- Vault: Central secret management and API key distribution
- Tools Library: Governs tool approval and availability
- The Nurse: Monitors agent cognitive load and provides memory management

**Token Pool Management**: Hierarchical allocation from organization → team → agent with real-time tracking and throttling.

**Tri-Level Logging**: Org-level (concise), team-level (detailed), leaf-level (verbatim) with hierarchical access control.

### Directory Structure

```text
app/
├── composables/        # Vue composables (auto-imported)
│   ├── useAgent.ts
│   ├── useOrganization.ts
│   └── useTeam.ts
├── pages/              # File-based routing
│   └── index.vue
└── utils/              # Client-side utilities

server/
├── api/                # API routes (auto-registered)
│   ├── agents/        # Agent CRUD endpoints
│   ├── organizations/ # Organization CRUD endpoints
│   ├── tasks/         # Task management endpoints
│   └── teams/         # Team CRUD endpoints
├── data/              # In-memory data stores (MVP - replace with GitHub)
│   ├── agents.ts
│   ├── organizations.ts
│   ├── tasks.ts
│   └── teams.ts
├── services/          # Business logic services
│   ├── github.ts      # GitHub API integration
│   └── orchestrator.ts # Agent task queues, delegation, boredom/stuck detection
└── utils/             # Server utilities
    ├── initializeOrganization.ts # Core team setup
    └── logger.ts      # Structured logging (pino)

types/
└── index.ts           # Core type definitions (Agent, Organization, Team, Task, Tool, LogEntry)

tests/
├── api/               # API endpoint tests
├── services/          # Service tests
├── utils/             # Utility tests
└── setup.ts           # Test environment setup

.specify/              # Feature specifications and workflow
├── features/          # Feature folders (F001, F002, etc.)
├── memory/
│   ├── constitution.md    # Development principles and standards
│   └── lessons-learned.md # Gemini CLI workflow learnings
└── WORKFLOW.md        # Gemini-driven development workflow

.github/
└── prompts/           # Custom slash commands and templates
    ├── test-generation.prompt.md
    ├── dev-task.prompt.md
    └── commit4gemini.prompt.md
```

### Type System

All core types are defined in `types/index.ts`. **NEVER modify this file** without explicit instruction. Import types using type-only imports:

```typescript
import type { Agent, Organization, Team, Task, Tool } from '~/types'
```

#### Key Types

- `Agent`: id, name, role, seniorId, teamId, systemPrompt, tokenAllocation/Used, status (active|bored|stuck|paused)
- `Organization`: id, name, githubRepoUrl, tokenPool, rootAgentId
- `Team`: id, name, organizationId, leaderId, tokenAllocation, type (hr|toolsmith|library|vault|tools-library|nurse|custom)
- `Task`: id, title, description, assignedToId, createdById, status (pending|in-progress|blocked|completed|cancelled), priority
- `Tool`: id, name, description, code, createdBy, accessLevel (common|organization|team|personal), approved

### Data Flow Pattern

1. **Frontend**: Pages use composables for reactive state management
2. **Composables**: Call server API endpoints using `$fetch`
3. **API Routes**: Validate inputs, delegate to services
4. **Services**: Business logic, orchestration, GitHub integration
5. **Data Stores**: In-memory storage (MVP - transitioning to GitHub)

### Orchestration Services

The `server/services/orchestrator.ts` provides core orchestration primitives:

- `AgentTaskQueue`: Per-agent task queue management
- `assessDelegation()`: Determines if task should be delegated to subordinate
- `detectBoredom()`: Checks if agent inactive > 10 minutes
- `detectStuck()`: Checks if task in-progress > 30 minutes
- `trackTokenUsage()`: Updates agent and organization token pools

## Constitutional Principles

The project follows strict development standards defined in `.specify/memory/constitution.md`:

### Type Safety

- TypeScript strict mode enforced
- Avoid `any` - use `unknown` with type guards
- All inputs validated at boundaries
- Type definitions are API contracts

### Composable-First Development

- Frontend logic in `app/composables/`
- Server utilities in `server/utils/` and `server/services/`
- Single-responsibility, testable, typed modules

### Test-First Mindset

- Critical orchestration logic requires tests before implementation
- Bug fixes require failing test first
- Coverage targets:
  - Orchestration primitives: 100%
  - Access control, approvals, rate-limiters: 95%+
  - Server API contracts: 90%+

### Observable Development

- Use structured logging (pino) via `server/utils/logger.ts`
- Three-tier logging: org-level, team-level, agent-level
- Include context keys: orgId, teamId, agentId, taskId
- No console.log (only console.warn/error allowed per ESLint)

### API-First Server Design

- Nuxt server routes under `server/api/` are typed and validated
- Business logic lives in services, not route handlers
- Return structured JSON with proper HTTP status codes

## Development Workflow

### Standard Feature Development

1. **Plan**: Review `SYSTEM_PROMPT.md` priorities, define acceptance criteria
2. **Specify**: Create feature folder in `.specify/features/F00X/` with:
   - `README.md`: Feature overview
   - `00-tests-arguments.md`: Comprehensive test requirements
   - `01-*.prompt.md`: Implementation task prompts
3. **Implement**: Write tests first for critical paths, then implement
4. **Validate**: Run `npm run typecheck && npm run lint && npm test`
5. **Commit**: Follow conventional commit format

### Gemini CLI Workflow

This project uses Gemini CLI for parallel development. See `.specify/WORKFLOW.md` for the full 6-phase workflow (Plan → Specify → Execute → Assess → Learn → Commit).

#### Key patterns

- Specification-driven: Write detailed test requirements first
- Parallel execution: Run independent tasks concurrently
- Fire-and-forget commits: Background commit automation
- Always run from project root
- Don't modify `types/index.ts` in generated code

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# GitHub Integration
NUXT_GITHUB_TOKEN=ghp_...

# LLM Provider API Keys (managed by Vault team in production)
NUXT_OPENAI_API_KEY=sk-...
NUXT_ANTHROPIC_API_KEY=sk-ant-...

# Public Configuration
NUXT_PUBLIC_APP_NAME=AI Team
NUXT_PUBLIC_MAX_AGENTS_PER_ORG=100
NUXT_PUBLIC_DEFAULT_TOKEN_POOL=1000000
```

### Test Environment

Tests use Vitest with setup in `tests/setup.ts`. Test environment variables are configured in `vitest.config.ts`. Vue reactivity helpers (ref, computed, watch) are globally available in tests.

## Code Quality Standards

### TypeScript

- Strict mode enabled in `tsconfig.json`
- No unused locals/parameters
- Explicit return types preferred
- Type-only imports for types: `import type { ... }`

### ESLint

- Flat config in `eslint.config.js`
- Enforces `@typescript-eslint/no-explicit-any`
- Restricts console usage (only warn/error allowed)

### Markdown

- No inline HTML unless necessary
- Blank lines before/after headings, lists, code blocks
- **No emojis** in commits, code comments, console logs, or technical docs
- Use text prefixes like `[ERROR]`, `[INFO]`, `[WARNING]` for better grep
- Fenced code blocks should have a language specified (text by default)

## Common Patterns

### Creating a New API Endpoint

1. Define types in `types/index.ts` (if needed)
2. Create data store in `server/data/` (MVP pattern)
3. Create API route in `server/api/<resource>/`:
   - `index.get.ts`: List resources
   - `index.post.ts`: Create resource
   - `[id].get.ts`: Get single resource
   - `[id].patch.ts`: Update resource
   - `[id].delete.ts`: Delete resource
4. Add service logic in `server/services/` if complex
5. Create composable in `app/composables/use<Resource>.ts`
6. Write tests in `tests/api/<resource>.spec.ts`

### Using the Logger

```typescript
import { createLogger } from '~/server/utils/logger'

const logger = createLogger('my-module')

logger.info({ userId: '123', action: 'login' }, 'User logged in')
logger.error({ error: err, taskId: '456' }, 'Task execution failed')
```

### Orchestration Logic

```typescript
import { AgentTaskQueue, assessDelegation, detectBoredom } from '~/server/services/orchestrator'

const queue = new AgentTaskQueue(agentId)
queue.enqueue(task)

if (detectBoredom(agent)) {
  // Escalate to senior
}

const delegateToId = assessDelegation(task, agent, allAgents)
if (delegateToId) {
  // Reassign task
}
```

## Key Files to Reference

- `SYSTEM_PROMPT.md`: Complete system vision and architecture
- `README.md`: Quick start and project overview
- `.specify/memory/constitution.md`: Development standards
- `.specify/WORKFLOW.md`: Gemini CLI development workflow
- `types/index.ts`: Core type definitions (DO NOT MODIFY)
- `server/services/orchestrator.ts`: Orchestration primitives

## Current State (MVP)

### Implemented

- Basic org/team/agent hierarchy (in-memory)
- Type system and API structure
- Task management APIs
- Orchestration primitives (task queues, delegation, boredom/stuck detection)
- Token tracking logic
- Core team initialization utility
- Structured logging

### In Progress

- GitHub integration for persistence
- Frontend visualization (D3.js force-directed graph)
- Tool governance workflow
- Agent execution engine

### Not Yet Started

- LLM provider integration
- Agent interview process
- Knowledge base (GitHub wiki)
- Real-time WebSocket updates
- Multi-organization UI
