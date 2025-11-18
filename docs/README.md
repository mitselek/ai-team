# AI Team Documentation

## Architecture Overview

### System Components

1. **Organizations** - Top-level entities, each with isolated GitHub repo
2. **Teams** - Functional groups within organizations (HR, Toolsmith, Library, Vault, etc.)
3. **Agents** - Persistent AI entities with roles, competencies, and task queues
4. **Tools** - Executable capabilities with governance and approval workflows
5. **Tasks** - Work units that flow through the hierarchy

### Core Teams

Every organization is initialized with these teams:

- **HR/Recruiter** - Agent enrollment and interview process
- **Toolsmith** - Tool creation and testing
- **Library** - Knowledge base management
- **Vault** - Secret and credential management
- **Tools Library** - Tool approval and distribution
- **The Nurse** - Memory and cognitive load management

### Data Flow

```text
Root (Human) → Project Manager Agent → Team Leads → Individual Contributors
                                    ↓
                            Task Queue System
                                    ↓
                            Tool Execution Layer
                                    ↓
                            GitHub Persistence
```

### Logging Hierarchy

- **Org Level** - Concise, timestamped, accessible to all
- **Team Level** - Detailed team activity
- **Agent Level** - Full conversation logs (verbatim, concise, index)

## Feature Documentation

### Agent System

- **[Agent Creation Guide](agents/creation.md)** - How to create agents with organizational context
- **[Delegation Framework](agents/delegation.md)** - Intelligent task delegation and routing

### Tools

- **[Roster Tool Reference](tools/roster.md)** - Query colleagues for delegation decisions

### API Reference

- **[Tools API](api/tools.md)** - Tool definitions, type updates, and workload tracking

### Other Features

- **[Filesystem Security](filesystem-security-implementation.md)** - MCP filesystem security model
- **[F059 Migration](F059-MIGRATION.md)** - Workspace management migration guide

## Getting Started

See `../README.md` for setup instructions.
