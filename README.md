# AI Team - Asynchronous AI Agent Orchestration Platform

A self-organizing, hierarchical system where AI agents collaborate as persistent team members to accomplish project management, tool creation, and organizational goals.

## Project Overview

AI Team enables organizations to create autonomous AI agent hierarchies that:

- Self-organize into teams with clear reporting structures
- Delegate tasks intelligently based on competency
- Create and manage their own tools with governance
- Maintain persistent identities and accumulate experience
- Integrate with GitHub for persistence and collaboration

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
└── organizations/     # Org/team/agent/interview data (JSON)

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

## Data Persistence

AI Team uses a hybrid persistence approach:

- **Filesystem (JSON)**: Organizations, teams, agents, and interview sessions
  - Location: `data/organizations/`
  - Auto-initialized on first startup with demo organization
  - Survives server restarts (interviews resume seamlessly)
  - See `.specify/features/F012-persistent-organization-bootstrap/USAGE.md` for details

- **GitHub API**: Coming soon for cross-environment sync
  - Repositories, issues, wikis, PRs
  - Collaboration and version control integration

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
