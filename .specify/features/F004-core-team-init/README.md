# F004: Core Team Initialization

**Status**: 🟡 In Progress  
**Priority**: High (Essential MVP feature)  
**Dependencies**: F002 Team System (✅ Complete)

## Objective

Implement automatic initialization of the 6 core teams required for every organization as defined in SYSTEM_PROMPT.md. These teams are pre-configured and essential for the agent orchestration system to function.

## Scope

### Core Teams (from SYSTEM_PROMPT.md)

1. **HR/Recruiter Team** (`hr`): Conducts interviews for new agent enrollment, prevents redundancy
2. **Toolsmith Team** (`toolsmith`): Creates, tests, and maintains internal tools with approval workflow
3. **Library Team** (`library`): Manages knowledge base, receives valuable information reports, handles archiving
4. **Vault Team** (`vault`): Central secret management, API key distribution, credential approval/registration
5. **Tools Library Team** (`tools-library`): Governs tool approval, availability decisions, receives anomaly tickets
6. **The Nurse Team** (`nurse`): Memory/state specialist who monitors agent cognitive load and provides archiving recommendations

### Type Definition (Reference)

```typescript
export interface Team {
  id: string
  name: string
  organizationId: string
  leaderId: string | null
  tokenAllocation: number
  type: TeamType
}

export type TeamType = 'hr' | 'toolsmith' | 'library' | 'vault' | 'tools-library' | 'nurse' | 'custom'
```

### Implementation Tasks

**Specification-Driven Approach**: Tests define requirements, Gemini generates implementation

1. **00-tests-arguments.md** - Test requirements document
   - Test that 6 teams are created
   - Test each team has correct type
   - Test all 6 Team fields present
   - Test idempotency (can call multiple times)
   - Test teams linked to correct organization

2. **01-utility.prompt.md** - `server/utils/initializeOrganization.ts`
   - Function: `initializeDefaultTeams(organizationId: string): Team[]`
   - Creates 6 teams with proper types and names
   - Sets initial tokenAllocation for each team
   - Sets leaderId to null initially (leaders assigned during agent enrollment)
   - Returns array of created teams
   - Idempotent operation

## Team Configuration

### Initial Token Allocation (per team)

Based on typical workload distribution:

- **HR Team**: 50,000 tokens (moderate - interviews)
- **Toolsmith Team**: 100,000 tokens (high - code generation)
- **Library Team**: 75,000 tokens (moderate-high - documentation)
- **Vault Team**: 25,000 tokens (low - config management)
- **Tools Library Team**: 50,000 tokens (moderate - governance)
- **Nurse Team**: 50,000 tokens (moderate - memory management)

**Total**: 350,000 tokens per organization

### Team Names (Standardized)

- HR Team: "Human Resources"
- Toolsmith Team: "Toolsmiths"
- Library Team: "Knowledge Library"
- Vault Team: "Vault"
- Tools Library Team: "Tools Library"
- Nurse Team: "The Nurse"

## Acceptance Criteria

- ✅ Function creates exactly 6 teams
- ✅ Each team has correct TeamType
- ✅ All 6 Team fields present (id, name, organizationId, leaderId, tokenAllocation, type)
- ✅ All teams linked to provided organizationId
- ✅ All teams have leaderId=null initially
- ✅ Token allocations match configuration
- ✅ Teams stored in teams data array
- ✅ Function is idempotent (safe to call multiple times)
- ✅ npm run typecheck passes
- ✅ npm run lint passes
- ✅ npm test passes (all tests)

## Execution

### Phase 1: Tests First (Specification-Driven)

```bash
cd /home/michelek/Documents/github/ai-team
gemini --yolo "$(cat .github/prompts/test-generation.prompt.md)" \
  "$(cat .specify/features/F004-core-team-init/00-tests-arguments.md)" \
  > .specify/logs/F004-tests-$(date +%H%M%S).log 2>&1 &
```

### Phase 2: Implementation

```bash
# After tests exist
gemini --yolo "$(cat .specify/features/F004-core-team-init/01-utility.prompt.md)" \
  > .specify/logs/F004-01-$(date +%H%M%S).log 2>&1 &
```

Wait 5-10 minutes, then verify tests pass.

## Integration

This utility will be called:

1. When creating a new organization (future feature)
2. Manually via console/script for existing organizations
3. During system initialization/seeding

Example usage:

```typescript
import { initializeDefaultTeams } from '../utils/initializeOrganization'

// When creating new organization
const newOrg = createOrganization('Acme Corp')
const coreTeams = initializeDefaultTeams(newOrg.id)
// Returns: [hrTeam, toolsmithTeam, libraryTeam, vaultTeam, toolsLibraryTeam, nurseTeam]
```

## Notes

- Leaders will be assigned later during agent enrollment workflow
- Token allocations can be adjusted by organization admins later
- Team types are fixed (cannot change hr → custom)
- This is a utility function, not an API endpoint
