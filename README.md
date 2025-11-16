# AI Team - Asynchronous AI Agent Orchestration Platform

A self-organizing, hierarchical system where AI agents collaborate as persistent team members to accomplish project management, tool creation, and organizational goals.

## Project Overview

AI Team enables organizations to create autonomous AI agent hierarchies that:

- Self-organize into teams with clear reporting structures
- Delegate tasks intelligently based on competency
- Create and manage their own tools with governance
- Maintain persistent identities and accumulate experience
- Integrate with GitHub for persistence and collaboration
- Recruit new agents through AI-powered interview workflow (Marcus HR specialist)

## Tech Stack

- **Framework**: Nuxt 3 (Vue 3, TypeScript strict)
- **Backend**: Nitro server (Nuxt's integrated backend)
- **Persistence**: Filesystem (JSON, MD) + GitHub API (repos, issues, wikis, PRs)
- **Visualization**: D3.js (force-directed graphs)
- **Styling**: Tailwind CSS
- **AI Integration**: Multi-provider LLM support (OpenAI, Anthropic, local models)
- **Testing**: Vitest + @vue/test-utils

## Project Structure

```text
app/
├── components/         # Vue components (auto-imported)
│   ├── org/           # Organization visualization components
│   ├── agent/         # Agent management components
│   ├── task/          # Task management components
│   └── tools/         # Tool management components
├── composables/       # Composables (auto-imported)
│   ├── useAgent.ts
│   ├── useOrganization.ts
│   ├── useTask.ts
│   └── useTools.ts
├── pages/             # File-based routing
│   ├── index.vue      # Dashboard
│   ├── org/           # Organization views
│   └── agent/         # Agent detail views
├── server/            # Server API routes
│   ├── api/
│   │   ├── organizations/
│   │   ├── agents/
│   │   ├── tasks/
│   │   └── tools/
│   ├── plugins/       # Server bootstrap (organization initialization)
│   ├── services/      # Business logic & persistence layer
│   └── utils/
├── types/             # TypeScript definitions
└── assets/

data/                  # Filesystem persistence (not in git)
├── organizations/     # Org/team/agent/interview data (JSON)
└── workspaces/        # Agent and team workspace directories
    ├── agent-{id}/    # Agent private/shared folders
    │   ├── private/
    │   └── shared/
    └── team-{id}/     # Team private/shared folders
        ├── private/
        └── shared/

.github/
└── prompts/           # Custom slash commands

docs/                  # Documentation
tests/                 # Test suites
```

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (auto-bootstraps organization on first run)
npm run dev

# Run tests
npm run test

# Build for production
npm run build

# Bootstrap Marcus interview helper
./scripts/bootstrap-marcus.sh
```

## Recent Features

**F059 - Agent Workspace Awareness** (Jan 2025):

- Folder-based workspace discovery with 5 scopes (`my_private`, `my_shared`, `team_private`, `team_shared`, `org_shared`)
- Ephemeral folderId system with 30-minute TTL for secure file operations
- New tools: `list_folders` for discovery + 4 by-ID operations (`read_file_by_id`, `write_file_by_id`, `delete_file_by_id`, `get_file_info_by_id`)
- Unified `/workspaces/` directory structure (agent-{id}, team-{id})
- See `docs/F059-MIGRATION.md` for migration guide and tool usage examples

**F014 - Flexible LLM Configuration** (Nov 2025):

- Task-based model selection (4-tier: explicit override → task-based → role default → provider default)
- 15 models across 3 providers (Anthropic, Google, OpenAI)
- Role-specific models: interviewer, worker, manager, director
- Task types: generate-questions, analyze-response, final-report, delegate-task, budget-calculation

**F013 - Interview Approval Workflow** (Nov 2025):

- Complete interview lifecycle: screening → deep-dive → finalization → approval
- HR consultation with LLM-powered recommendations
- System prompt generation with role-specific competencies
- Auto-finalization when interview reaches 'finalize' state
- Agent persistence to filesystem upon hire

**LLM Observability Enhancements** (Nov 2025):

- `speakerLLM` field in interview transcripts tracks which model generated each message
- Format: `provider:model` (e.g., `anthropic:claude-sonnet-4-5-20241022`)
- Hardcoded messages tagged with `system:hardcoded` sentinel value
- HR consultation tracks model used for final recommendations
- Full observability across interview workflow

**F015 - GitHub Repository Persistence** (Nov 2025 - Phase 2a):

- Each organization gets dedicated private GitHub repository
- Manual commit capability for org state (manifest, teams, agents, interviews)
- Foundation for automatic commit workflow (Phase 2b planned)
- Organization-level .gitignore for selective tracking

## Data Persistence

AI Team uses a two-phase persistence approach:

**Phase 1 - Filesystem (Current)**:

- **Location**: `data/organizations/{org-id}/`
- **What's Stored**: Organizations, teams, agents, interview sessions (JSON)
- **Features**:
  - Auto-initialized on first startup with demo organization
  - Survives server restarts (interviews resume seamlessly)
  - Fire-and-forget persistence hooks (zero latency impact)
  - Gitignored in main project (development data stays local)
- **Details**: See `.specify/features/F012-persistent-organization-bootstrap/USAGE.md`

**Phase 2 - GitHub Repository per Organization (Implemented)**:

- **Location**: Each organization has its own private GitHub repository
- **Example**: Life Org → `https://github.com/{owner}/ai-org-life`
- **What's Tracked**: manifest.json, teams/, agents/, interviews/ (via org-level .gitignore)
- **Features**:
  - Version control for organizational evolution
  - Automatic backup and history tracking
  - Foundation for GitHub Issues (tasks), Wiki (knowledge base), PRs (approvals)
  - Manual commits currently, automatic workflow planned (F015 Phase 2b)
- **Details**: See `.specify/features/F015-github-persistence/planning/`

Each organization directory (`data/organizations/{org-id}/`) is a separate git repository connected to its own GitHub remote, enabling isolated version control and collaboration per organization.

## Documentation

- See `SYSTEM_PROMPT.md` for comprehensive system architecture
- See `.github/prompts/` for custom slash commands
- See `docs/` for technical documentation

## Development Guidelines

- Use TypeScript strict mode for all files
- Follow Vue 3 Composition API with `<script setup>`
- Use kebab-case for files, PascalCase for components
- All user-facing text should be i18n-ready
- Test critical orchestration logic before implementation
- Leverage Nuxt auto-imports for components and composables

## License

MIT
