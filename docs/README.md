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

## Getting Started

See README.md for setup instructions.

## API Documentation

Coming soon: API endpoint documentation for agent orchestration.
