# F012 Execution Plan: Two-Layer Breakdown

**Status**: Ready for Review
**Created**: 2025-11-11
**Approach**: Phased iterative development with validation gates

---

## Layer 1: Strategic Phases (High-Level)

### Phase 1: Filesystem Persistence Layer

**Goal**: Create reliable save/load functions for all entity types
**Risk Level**: Medium (new pattern, foundation for everything else)
**Validation**: Manual filesystem tests before proceeding
**Estimated Duration**: 45-60 minutes (Gemini + validation)
**Dependencies**: None (can start immediately)

### Phase 2: Bootstrap Plugin

**Goal**: Server startup creates or loads organization state
**Risk Level**: High (Nitro plugin lifecycle, affects every startup)
**Validation**: Fresh start test + restart test before proceeding
**Estimated Duration**: 30-45 minutes (Gemini + validation)
**Dependencies**: Phase 1 complete and validated

### Phase 3: Interview Persistence Hooks

**Goal**: Interview sessions survive server restarts
**Risk Level**: Low (adding hooks to existing working system)
**Validation**: Interview continuation test before proceeding
**Estimated Duration**: 20-30 minutes (Gemini + validation)
**Dependencies**: Phases 1 & 2 complete

### Phase 4: Cleanup & Documentation

**Goal**: Remove old patterns, update docs, polish
**Risk Level**: Low (cosmetic improvements)
**Validation**: UI still works, docs accurate
**Estimated Duration**: 15-20 minutes (mostly manual)
**Dependencies**: Phases 1-3 complete

---

## Layer 2: Tactical Task Breakdown

### PHASE 1: Filesystem Persistence Layer

#### Task 1.1: Create Directory Structure & Gitignore

**Type**: Manual setup
**Files**: `.gitignore`, `data/organizations/.gitkeep`
**Complexity**: Trivial
**Time**: 5 minutes

**Actions**:

```bash
mkdir -p data/organizations
touch data/organizations/.gitkeep
```

**Update .gitignore**:

```text
# Organization data (persistent state)
data/organizations/*/manifest.json
data/organizations/*/teams/
data/organizations/*/agents/
data/organizations/*/interviews/
data/organizations/*/logs/

# Keep directory structure
!data/organizations/.gitkeep
```

**Validation**:

- [ ] Directory exists
- [ ] .gitkeep committed
- [ ] Actual org data will be gitignored

---

#### Task 1.2: Define Filesystem Persistence Interface

**Type**: TypeScript types
**Files**: `app/server/services/persistence/types.ts`
**Complexity**: Low
**Time**: 10 minutes

**Purpose**: Define contracts before implementation

**Interface to Define**:

```typescript
export interface PersistenceLayer {
  // Organization operations
  saveOrganization(org: Organization): Promise<void>
  loadOrganization(orgId: string): Promise<Organization | null>
  listOrganizations(): Promise<string[]> // Returns org IDs

  // Team operations
  saveTeam(team: Team): Promise<void>
  loadTeams(orgId: string): Promise<Team[]>

  // Agent operations
  saveAgent(agent: Agent): Promise<void>
  loadAgents(orgId: string): Promise<Agent[]>

  // Interview operations
  saveInterview(session: InterviewSession): Promise<void>
  loadInterview(sessionId: string): Promise<InterviewSession | null>
  loadInterviews(orgId: string): Promise<InterviewSession[]>
}

export interface FilesystemPaths {
  organizationsRoot: string
  getOrgManifestPath(orgId: string): string
  getTeamPath(orgId: string, teamId: string): string
  getAgentPath(orgId: string, agentId: string): string
  getInterviewPath(orgId: string, sessionId: string): string
}
```

**Reference**: `types/index.ts` for Organization, Team, Agent types

**Validation**:

- [ ] Types compile without errors
- [ ] Interface matches all needed operations
- [ ] Paths helper covers all use cases

---

#### Task 1.3: Implement Filesystem Persistence Module

**Type**: Gemini implementation
**Files**: `app/server/services/persistence/filesystem.ts`
**Complexity**: Medium-High
**Time**: 20-25 minutes (Gemini)

**Implementation Requirements**:

**Functions to implement**:

1. `saveOrganization()` - Write `data/organizations/{id}/manifest.json`
2. `loadOrganization()` - Read manifest, parse JSON
3. `listOrganizations()` - Read directory, return IDs
4. `saveTeam()` - Write `data/organizations/{orgId}/teams/{id}.json`
5. `loadTeams()` - Read all team files, parse array
6. `saveAgent()` - Write `data/organizations/{orgId}/agents/{id}.json`
7. `loadAgents()` - Read all agent files, parse array
8. `saveInterview()` - Write `data/organizations/{orgId}/interviews/{id}.json`
9. `loadInterview()` - Read interview file, parse
10. `loadInterviews()` - Read all interview files, parse array

**Critical Implementation Details**:

- Use `fs/promises` for async operations
- Create directories if they don't exist (`mkdir -p` equivalent)
- Handle errors gracefully (file not found = return null, not throw)
- Use `JSON.stringify(obj, null, 2)` for readable output
- Parse dates correctly (Date fields need reconstruction)
- Use structured logging (`createLogger('persistence')`)
- Add correlationId to all log entries

**Error Handling**:

```typescript
try {
  // operation
} catch (error: unknown) {
  log.error({ error, orgId }, 'Failed to save organization')
  throw error // Re-throw after logging
}
```

**Date Serialization Pattern**:

```typescript
// Saving
const json = JSON.stringify({
  ...org,
  createdAt: org.createdAt.toISOString()
})

// Loading
const data = JSON.parse(content)
return {
  ...data,
  createdAt: new Date(data.createdAt)
}
```

**Reference Files**:

- `app/server/utils/logger.ts` - Logging pattern
- `types/index.ts` - Full type definitions

**Validation Criteria**:

- [ ] TypeScript compiles without errors
- [ ] All functions handle errors gracefully
- [ ] Dates serialize/deserialize correctly
- [ ] Directories created automatically
- [ ] Missing files return null (not throw)
- [ ] Structured logging used throughout

---

#### Task 1.4: Create Filesystem Persistence Tests

**Type**: Gemini test generation
**Files**: `tests/services/persistence/filesystem.spec.ts`
**Complexity**: Medium
**Time**: 15-20 minutes (Gemini)

**Test Coverage Required**:

**Setup/Teardown**:

- Create temp directory for each test
- Clean up after each test
- Mock logger (no console spam)

**saveOrganization() tests**:

- [ ] Creates directory structure
- [ ] Writes manifest.json with correct data
- [ ] Handles dates correctly (ISO strings)
- [ ] Overwrites existing file
- [ ] Throws on filesystem error

**loadOrganization() tests**:

- [ ] Reads existing manifest correctly
- [ ] Reconstructs Date objects
- [ ] Returns null for missing org
- [ ] Handles corrupt JSON gracefully

**listOrganizations() tests**:

- [ ] Returns empty array for empty directory
- [ ] Returns all org IDs
- [ ] Ignores non-directory files

**saveTeam() / loadTeams() tests**:

- [ ] Saves team to correct subdirectory
- [ ] Loads all teams for organization
- [ ] Returns empty array for no teams

**saveAgent() / loadAgents() tests**:

- [ ] Saves agent with all fields
- [ ] Loads agents with Date reconstruction
- [ ] Handles multiple agents

**saveInterview() / loadInterview() / loadInterviews() tests**:

- [ ] Saves interview session completely
- [ ] Reconstructs transcript with dates
- [ ] Loads single interview by ID
- [ ] Loads all interviews for org

**Reference Files**:

- `tests/api/organizations.spec.ts` - Test structure pattern
- `tests/services/orchestrator.spec.ts` - Service test pattern

**Validation Criteria**:

- [ ] All tests pass (100%)
- [ ] No console.log spam (logger mocked)
- [ ] Temp directories cleaned up
- [ ] Tests are deterministic (no race conditions)

---

#### Task 1.5: Manual Filesystem Validation

**Type**: Manual testing
**Files**: None (temporary test script)
**Complexity**: Low
**Time**: 10 minutes

**Create temporary test script**: `scripts/test-persistence.ts`

```typescript
import {
  saveOrganization,
  loadOrganization,
  saveTeam,
  loadTeams,
  saveAgent,
  loadAgents
} from '../app/server/services/persistence/filesystem'
import type { Organization, Team, Agent } from '@@/types'

async function test() {
  // Create test org
  const org: Organization = {
    id: 'test-org-1',
    name: 'Test Organization',
    githubRepoUrl: '',
    tokenPool: 1000000,
    rootAgentId: null,
    createdAt: new Date()
  }

  await saveOrganization(org)
  console.log('✅ Saved org')

  const loaded = await loadOrganization('test-org-1')
  console.log('✅ Loaded org:', loaded?.name)
  console.log('   Date check:', loaded?.createdAt instanceof Date)

  // Create test team
  const team: Team = {
    id: 'team-1',
    name: 'Test Team',
    organizationId: 'test-org-1',
    leaderId: null,
    tokenAllocation: 100000,
    type: 'hr'
  }

  await saveTeam(team)
  console.log('✅ Saved team')

  const teams = await loadTeams('test-org-1')
  console.log('✅ Loaded teams:', teams.length)

  // Verify filesystem structure
  console.log('\n📁 Filesystem structure:')
  // ls -R data/organizations/test-org-1/
}

test().catch(console.error)
```

**Run validation**:

```bash
npx tsx scripts/test-persistence.ts
ls -R data/organizations/test-org-1/
cat data/organizations/test-org-1/manifest.json
```

**Validation Criteria**:

- [ ] Script runs without errors
- [ ] Files created in correct locations
- [ ] JSON is human-readable (formatted)
- [ ] Dates stored as ISO strings
- [ ] Dates load back as Date objects
- [ ] Subsequent runs don't create duplicates

**Cleanup**:

```bash
rm -rf data/organizations/test-org-1/
rm scripts/test-persistence.ts
```

---

#### Phase 1 Validation Gate

**Before proceeding to Phase 2, verify**:

- [ ] All Task 1.4 tests passing (filesystem.spec.ts)
- [ ] Manual validation successful (Task 1.5)
- [ ] TypeScript compiles without errors
- [ ] No linting issues
- [ ] Filesystem structure looks correct
- [ ] Dates serialize/deserialize properly
- [ ] Error handling works (try with missing files)

**If any validation fails**: Fix before Phase 2

**Commit checkpoint**:

```bash
git add app/server/services/persistence/
git add tests/services/persistence/
git add data/organizations/.gitkeep
git add .gitignore
# Launch Gemini commit automation
```

---

### PHASE 2: Bootstrap Plugin

#### Task 2.1: Create Bootstrap Data Definitions

**Type**: Manual configuration
**Files**: `app/server/data/bootstrap-data.ts`
**Complexity**: Low
**Time**: 10 minutes

**Purpose**: Centralize initial organization structure

**Define Bootstrap Data**:

```typescript
import type { Organization, Team, Agent } from '@@/types'

export const INITIAL_ORG: Omit<Organization, 'id' | 'createdAt'> = {
  name: 'Demo AI Org',
  githubRepoUrl: '',
  tokenPool: 10000000,
  rootAgentId: null
}

export const CORE_TEAMS: Omit<Team, 'id' | 'organizationId'>[] = [
  {
    name: 'HR Team',
    leaderId: null,
    tokenAllocation: 1000000,
    type: 'hr'
  },
  {
    name: 'Toolsmiths',
    leaderId: null,
    tokenAllocation: 2500000,
    type: 'toolsmith'
  },
  {
    name: 'Libraries',
    leaderId: null,
    tokenAllocation: 1200000,
    type: 'library'
  },
  {
    name: 'Vault Ops',
    leaderId: null,
    tokenAllocation: 1500000,
    type: 'vault'
  },
  {
    name: 'Tools Library',
    leaderId: null,
    tokenAllocation: 1000000,
    type: 'tools-library'
  },
  {
    name: 'The Nurse',
    leaderId: null,
    tokenAllocation: 800000,
    type: 'nurse'
  }
]

export const MARCUS_TEMPLATE: Omit<
  Agent,
  'id' | 'teamId' | 'organizationId' | 'createdAt' | 'lastActiveAt'
> = {
  name: 'Marcus',
  role: 'HR Specialist',
  seniorId: null,
  systemPrompt:
    'You are Marcus, an HR specialist who helps recruit new AI agents. You conduct interviews to understand what kind of agent is needed, then help create agent definitions with appropriate system prompts and capabilities.',
  tokenAllocation: 500000,
  tokenUsed: 0,
  status: 'active'
}
```

**Validation**:

- [ ] TypeScript compiles
- [ ] Total team allocations < org token pool
- [ ] All team types represented
- [ ] Marcus template includes all required fields

---

#### Task 2.2: Create Bootstrap Utility Functions

**Type**: Manual implementation (simple logic)
**Files**: `app/server/services/bootstrap/create-initial-org.ts`
**Complexity**: Low
**Time**: 15 minutes

**Purpose**: Logic to create initial organization

**Function to implement**:

```typescript
import { v4 as uuidv4 } from 'uuid'
import { saveOrganization, saveTeam, saveAgent } from '../persistence/filesystem'
import { organizations } from '../../data/organizations'
import { teams } from '../../data/teams'
import { agents } from '../../data/agents'
import { INITIAL_ORG, CORE_TEAMS, MARCUS_TEMPLATE } from '../../data/bootstrap-data'
import type { Organization, Team, Agent } from '@@/types'
import { createLogger } from '../../utils/logger'

const log = createLogger('bootstrap:create')

export async function createInitialOrganization(): Promise<Organization> {
  log.info('Creating initial organization...')

  // Create organization
  const org: Organization = {
    id: uuidv4(),
    ...INITIAL_ORG,
    createdAt: new Date()
  }

  await saveOrganization(org)
  organizations.push(org)
  log.info({ orgId: org.id }, 'Organization created')

  // Create teams
  let hrTeamId: string | null = null
  for (const teamTemplate of CORE_TEAMS) {
    const team: Team = {
      id: uuidv4(),
      organizationId: org.id,
      ...teamTemplate
    }

    await saveTeam(team)
    teams.push(team)

    if (team.type === 'hr') {
      hrTeamId = team.id
    }

    log.info({ teamId: team.id, teamName: team.name }, 'Team created')
  }

  if (!hrTeamId) {
    throw new Error('HR Team not created during bootstrap')
  }

  // Create Marcus
  const marcus: Agent = {
    id: uuidv4(),
    teamId: hrTeamId,
    organizationId: org.id,
    ...MARCUS_TEMPLATE,
    createdAt: new Date(),
    lastActiveAt: new Date()
  }

  await saveAgent(marcus)
  agents.push(marcus)
  log.info({ agentId: marcus.id, agentName: marcus.name }, 'Marcus created')

  log.info(
    { orgId: org.id, teamsCount: CORE_TEAMS.length, agentsCount: 1 },
    'Initial organization complete'
  )

  return org
}
```

**Validation**:

- [ ] TypeScript compiles
- [ ] Imports correct
- [ ] UUIDs generated for all entities
- [ ] Both filesystem and memory updated
- [ ] Returns created organization

---

#### Task 2.3: Create Load Existing Organizations Function

**Type**: Manual implementation
**Files**: `app/server/services/bootstrap/load-organizations.ts`
**Complexity**: Medium
**Time**: 20 minutes

**Purpose**: Load saved state on server restart

**Function to implement**:

```typescript
import {
  listOrganizations,
  loadOrganization,
  loadTeams,
  loadAgents,
  loadInterviews
} from '../persistence/filesystem'
import { organizations } from '../../data/organizations'
import { teams } from '../../data/teams'
import { agents } from '../../data/agents'
import { sessions } from '../interview/session'
import { createLogger } from '../../utils/logger'

const log = createLogger('bootstrap:load')

export async function loadExistingOrganizations(): Promise<void> {
  log.info('Loading existing organizations...')

  const orgIds = await listOrganizations()

  if (orgIds.length === 0) {
    log.info('No organizations found')
    return
  }

  log.info({ count: orgIds.length }, 'Found organizations to load')

  for (const orgId of orgIds) {
    try {
      // Load organization
      const org = await loadOrganization(orgId)
      if (!org) {
        log.warn({ orgId }, 'Organization manifest not found, skipping')
        continue
      }
      organizations.push(org)

      // Load teams
      const orgTeams = await loadTeams(orgId)
      teams.push(...orgTeams)

      // Load agents
      const orgAgents = await loadAgents(orgId)
      agents.push(...orgAgents)

      // Load interviews
      const orgInterviews = await loadInterviews(orgId)
      for (const interview of orgInterviews) {
        sessions.set(interview.id, interview)
      }

      log.info(
        {
          orgId,
          orgName: org.name,
          teamsCount: orgTeams.length,
          agentsCount: orgAgents.length,
          interviewsCount: orgInterviews.length
        },
        'Organization loaded'
      )
    } catch (error: unknown) {
      log.error({ error, orgId }, 'Failed to load organization, skipping')
      continue
    }
  }

  log.info(
    {
      organizationsCount: organizations.length,
      teamsCount: teams.length,
      agentsCount: agents.length,
      interviewsCount: sessions.size
    },
    'All organizations loaded successfully'
  )
}
```

**Note**: Assumes `sessions` is a Map (check actual implementation)

**Validation**:

- [ ] TypeScript compiles
- [ ] Handles missing files gracefully
- [ ] Populates all in-memory stores
- [ ] Logs comprehensive summary
- [ ] Continues on individual org failures

---

#### Task 2.4: Create Nitro Bootstrap Plugin

**Type**: Gemini implementation
**Files**: `app/server/plugins/bootstrap.ts`
**Complexity**: Low-Medium
**Time**: 15 minutes (Gemini)

**Purpose**: Run bootstrap/load logic on server startup

**Implementation Requirements**:

**Plugin structure**:

```typescript
import { createLogger } from '../utils/logger'
import { listOrganizations } from '../services/persistence/filesystem'
import { createInitialOrganization } from '../services/bootstrap/create-initial-org'
import { loadExistingOrganizations } from '../services/bootstrap/load-organizations'

const log = createLogger('bootstrap')

export default defineNitroPlugin(async (nitroApp) => {
  log.info('Bootstrap plugin starting...')

  try {
    // Check if organizations exist
    const orgIds = await listOrganizations()

    if (orgIds.length === 0) {
      log.info('No organizations found, creating initial organization')
      await createInitialOrganization()
      log.info('Initial organization bootstrap complete')
    } else {
      log.info({ count: orgIds.length }, 'Loading existing organizations')
      await loadExistingOrganizations()
      log.info('Existing organizations loaded')
    }

    log.info('Bootstrap plugin complete')
  } catch (error: unknown) {
    log.error({ error }, 'Bootstrap plugin failed')
    // Don't throw - let server start even if bootstrap fails
    // Admin can debug from logs
  }
})
```

**Reference**: Nuxt 3 Nitro plugin documentation

**Validation Criteria**:

- [ ] Plugin registered correctly (runs on startup)
- [ ] Distinguishes bootstrap vs load correctly
- [ ] Logs clearly indicate which path taken
- [ ] Handles errors gracefully (doesn't crash server)
- [ ] Async operations complete before server ready

---

#### Task 2.5: Manual Bootstrap Testing

**Type**: Manual testing
**Files**: None (test scenarios)
**Complexity**: Low
**Time**: 15 minutes

**Test Scenario 1: Fresh Bootstrap:**

```bash
# Clean slate
rm -rf data/organizations/*

# Start server
npm run dev

# Expected logs:
# "No organizations found, creating initial organization"
# "Organization created"
# "Team created" (x6)
# "Marcus created"
# "Initial organization bootstrap complete"

# Verify filesystem
ls -R data/organizations/

# Verify API
curl http://localhost:3000/api/organizations | jq '.'
curl http://localhost:3000/api/teams | jq 'length'  # Should be 6
curl http://localhost:3000/api/agents | jq '.[] | {name, role}'  # Should show Marcus

# Stop server (Ctrl+C)
```

**Test Scenario 2: Load Existing:**

```bash
# Server already stopped, data exists from Scenario 1

# Start server again
npm run dev

# Expected logs:
# "Found organizations to load" (count: 1)
# "Organization loaded" (with counts)
# "All organizations loaded successfully"

# Verify API returns same data
curl http://localhost:3000/api/organizations | jq '.[0].id'  # Same ID as before
curl http://localhost:3000/api/agents | jq '.[0].id'  # Same Marcus ID

# Stop server
```

**Test Scenario 3: Multiple Restarts (Stability):**

```bash
# Start and stop 5 times in a row
for i in {1..5}; do
  echo "=== Restart $i ==="
  npm run dev &
  sleep 5
  pkill -f "node.*nuxt"
  sleep 2
done

# Final start
npm run dev

# Verify no duplication
curl http://localhost:3000/api/teams | jq 'length'  # Still 6, not 30
curl http://localhost:3000/api/agents | jq 'length'  # Still 1, not 5

# Check filesystem
find data/organizations/ -type f | wc -l  # Count files, should be reasonable
```

**Validation Criteria**:

- [ ] Fresh bootstrap creates everything correctly
- [ ] Restart loads existing data (no re-creation)
- [ ] Multiple restarts don't duplicate data
- [ ] Logs are clear and informative
- [ ] API returns correct data after any restart
- [ ] Filesystem structure remains clean

---

#### Phase 2 Validation Gate

**Before proceeding to Phase 3, verify**:

- [ ] Test Scenario 1 passes (fresh bootstrap)
- [ ] Test Scenario 2 passes (load existing)
- [ ] Test Scenario 3 passes (multiple restarts)
- [ ] No data duplication
- [ ] Marcus accessible via API after restart
- [ ] Logs are clear at each startup
- [ ] TypeScript compiles without errors
- [ ] No linting issues

**If any validation fails**: Fix before Phase 3

**Commit checkpoint**:

```bash
git add app/server/services/bootstrap/
git add app/server/plugins/bootstrap.ts
git add app/server/data/bootstrap-data.ts
# Launch Gemini commit automation
```

---

### PHASE 3: Interview Persistence Hooks

#### Task 3.1: Add Persistence Hooks to Session Management

**Type**: Manual code modification
**Files**: `app/server/services/interview/session.ts`
**Complexity**: Low
**Time**: 15 minutes

**Purpose**: Save interview sessions to filesystem on mutations

**Modifications Needed**:

**Import persistence functions**:

```typescript
import { saveInterview } from '../persistence/filesystem'
```

**Add save hook to createSession()**:

```typescript
export function createSession(/* params */): InterviewSession {
  // ... existing session creation logic

  sessions.set(session.id, session)

  // NEW: Persist to filesystem
  saveInterview(session).catch((error: unknown) => {
    log.error({ error, sessionId: session.id }, 'Failed to persist new interview session')
  })

  return session
}
```

**Add save hook to updateState()**:

```typescript
export function updateState(sessionId: string, newState: InterviewState): void {
  // ... existing update logic

  session.currentState = newState
  session.updatedAt = new Date()

  // NEW: Persist to filesystem
  saveInterview(session).catch((error: unknown) => {
    log.error({ error, sessionId }, 'Failed to persist interview state update')
  })
}
```

**Add save hook to updateProfile()**:

```typescript
export function updateProfile(/* params */): void {
  // ... existing profile update logic

  session.updatedAt = new Date()

  // NEW: Persist to filesystem
  saveInterview(session).catch((error: unknown) => {
    log.error({ error, sessionId }, 'Failed to persist interview profile update')
  })
}
```

**Pattern**: Fire-and-forget async saves (don't block operations)

**Validation**:

- [ ] TypeScript compiles
- [ ] Saves don't block interview operations
- [ ] Errors logged but don't crash
- [ ] All mutation points have save hooks

---

#### Task 3.2: Add Interview Loading to Bootstrap

**Type**: Minor modification
**Files**: `app/server/services/bootstrap/load-organizations.ts`
**Complexity**: Trivial (already implemented in Task 2.3)
**Time**: N/A

**Verify**: Check that `loadInterviews()` is already called in the load function

**If missing, add**:

```typescript
// Load interviews
const orgInterviews = await loadInterviews(orgId)
for (const interview of orgInterviews) {
  sessions.set(interview.id, interview)
}
```

---

#### Task 3.3: Manual Interview Persistence Testing

**Type**: Manual testing
**Files**: None (test scenario)
**Complexity**: Low
**Time**: 15 minutes

**Test Scenario: Interview Continuation After Restart:**

**Setup**:

```bash
# Ensure server running with Marcus
curl http://localhost:3000/api/agents | jq '.[] | select(.name=="Marcus") | .id'
# Note Marcus ID and HR Team ID
```

**Step 1: Start interview**:

```bash
# Start interview
SESSION=$(curl -s -X POST http://localhost:3000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{"teamId":"<hr-team-id>","interviewerId":"<marcus-id>"}' \
  | jq -r '.sessionId')

echo "Session ID: $SESSION"

# Send 2-3 messages
curl -s -X POST "http://localhost:3000/api/interview/$SESSION/respond" \
  -H "Content-Type: application/json" \
  -d '{"response":"I need a code review specialist"}' | jq '.'

curl -s -X POST "http://localhost:3000/api/interview/$SESSION/respond" \
  -H "Content-Type: application/json" \
  -d '{"response":"Someone who can analyze PRs and provide feedback"}' | jq '.'

# Get current state
curl -s "http://localhost:3000/api/interview/$SESSION" | jq '{status, transcriptLength: (.transcript | length)}'
# Note transcript length
```

**Step 2: Verify filesystem**:

```bash
# Find interview file
find data/organizations/ -name "$SESSION.json"

# Check content
cat data/organizations/*/interviews/$SESSION.json | jq '{status, transcriptLength: (.transcript | length)}'
```

**Step 3: Restart server**:

```bash
# Stop server
pkill -f "node.*nuxt"
sleep 2

# Start server
npm run dev
sleep 5

# Check logs for "Loading existing organizations"
```

**Step 4: Verify interview survived**:

```bash
# Get interview
curl -s "http://localhost:3000/api/interview/$SESSION" | jq '{status, transcriptLength: (.transcript | length)}'

# Should show same transcript length as before restart

# Continue conversation
curl -s -X POST "http://localhost:3000/api/interview/$SESSION/respond" \
  -H "Content-Type: application/json" \
  -d '{"response":"They should have experience with TypeScript and React"}' | jq '.'

# Verify response added
curl -s "http://localhost:3000/api/interview/$SESSION" | jq '.transcript | length'
# Should be +2 from original (new question + new response)
```

**Step 5: Navigate to UI**:

```bash
echo "Open: http://localhost:3000/interviews/$SESSION"
# Manually verify UI shows full conversation history
```

**Validation Criteria**:

- [ ] Interview file created in filesystem
- [ ] Transcript persisted correctly
- [ ] Server restart loads interview
- [ ] Conversation can continue after restart
- [ ] UI displays full history after restart
- [ ] Dates remain as Date objects (not strings)
- [ ] Multiple restarts don't duplicate transcripts

---

#### Phase 3 Validation Gate

**Before proceeding to Phase 4, verify**:

- [ ] Interview persistence test passes
- [ ] Interview files exist in filesystem
- [ ] Restarts preserve interview state
- [ ] UI shows full history after restart
- [ ] TypeScript compiles without errors
- [ ] No linting issues

**Commit checkpoint**:

```bash
git add app/server/services/interview/session.ts
git add app/server/services/bootstrap/load-organizations.ts
# Launch Gemini commit automation
```

---

### PHASE 4: Cleanup & Documentation

#### Task 4.1: Disable Old Client Plugin

**Type**: Manual file operation
**Files**: `app/plugins/demo-seed.ts`
**Complexity**: Trivial
**Time**: 2 minutes

**Actions**:

```bash
mv app/plugins/demo-seed.ts app/plugins/demo-seed.ts.disabled
```

**Add comment to disabled file**:

```typescript
/*
 * DISABLED: 2025-11-11
 *
 * This client-side plugin has been replaced by server-side bootstrap.
 * See: app/server/plugins/bootstrap.ts
 *
 * Issue: Client plugin created browser-memory data, but API runs server-side
 * with separate in-memory stores. Led to client/server data separation.
 *
 * Solution: Server-side plugin with filesystem persistence.
 * All organizational state now lives on server where API can access it.
 */

// Original code preserved below for reference...
```

**Validation**:

- [ ] File renamed to .disabled
- [ ] Comment explains why disabled
- [ ] UI still loads without errors
- [ ] No client-side seeding attempts

---

#### Task 4.2: Update Bootstrap Script

**Type**: Manual modification
**Files**: `scripts/bootstrap-marcus.sh`
**Complexity**: Low
**Time**: 5 minutes

**Update script logic**:

**Change detection logic**:

```bash
# Old: Check API directly
# New: Check filesystem first (faster, more accurate)

if [ -d "data/organizations" ] && [ "$(ls -A data/organizations 2>/dev/null)" ]; then
  echo "✅ Organizations exist (filesystem)"

  # Still verify API consistency
  TEAM_COUNT=$(curl -s "$BASE_URL/api/teams" | jq 'length')
  echo "   API teams: $TEAM_COUNT"

  if [ "$TEAM_COUNT" = "0" ]; then
    echo "⚠️  Warning: Filesystem has data but API is empty"
    echo "   Server may not have started yet, or bootstrap failed"
    echo "   Check logs: .specify/logs/"
    exit 1
  fi
else
  echo "❌ No organizations found"
  echo "   Run: npm run dev"
  echo "   This will bootstrap the initial organization with Marcus"
  exit 1
fi
```

**Update success message**:

```bash
echo "✨ Done!"
echo ""
echo "💡 Tip: Marcus and all agents persist across restarts"
echo "   Organization data: data/organizations/"
```

**Validation**:

- [ ] Script detects filesystem state
- [ ] Provides helpful guidance
- [ ] Works with existing Marcus
- [ ] Handles edge cases (filesystem exists, API empty)

---

#### Task 4.3: Add Usage Documentation

**Type**: Manual documentation
**Files**: `README.md` or `.specify/features/F012-persistent-organization-bootstrap/USAGE.md`
**Complexity**: Low
**Time**: 10 minutes

**Create USAGE.md**:

The file should contain:

- Overview section explaining filesystem-based persistence
- Data location with directory structure diagram
- First startup instructions with expected logs
- Subsequent startup behavior
- Interview persistence explanation
- Data management commands (viewing, backing up, resetting)
- Troubleshooting section with common problems
- Migration to GitHub (future) section
- Git considerations explaining what's committed vs gitignored

**Directory structure to document**:

````text
**Directory structure to document**:

```text
data/organizations/{org-id}/
├── manifest.json
├── teams/{team-id}.json
├── agents/{agent-id}.json
└── interviews/{session-id}.json
````

**Key sections to include in USAGE.md**:

1. **First Startup**: Commands, expected logs, server behavior
2. **Subsequent Startups**: Load behavior, expected logs
3. **Interview Persistence**: How sessions survive restarts
4. **Data Management**: Commands for viewing, backing up, resetting
5. **Troubleshooting**: Common problems and solutions
6. **Migration to GitHub**: Future Phase 2 plans
7. **Git Considerations**: What's committed vs gitignored

See the full template content in this execution plan's original version for complete markdown content.

### First Startup

**Clean install**:

```bash
npm run dev
```

Server will:

1. Detect no organizations exist
2. Bootstrap initial organization ("Demo AI Org")
3. Create 6 core teams (HR, Toolsmith, Library, Vault, Tools Library, Nurse)
4. Create Marcus (HR Specialist)
5. Save to `data/organizations/`

**Expected logs**:

```text
[bootstrap] No organizations found, creating initial organization
[bootstrap:create] Organization created | orgId=xxx
[bootstrap:create] Team created | teamName="HR Team"
[bootstrap:create] Marcus created | agentName="Marcus"
[bootstrap] Initial organization bootstrap complete
```

### Subsequent Startups

**After first run**:

```bash
npm run dev
```

Server will:

1. Detect organizations exist in filesystem
2. Load all saved state into memory
3. Resume operations with existing agents

**Expected logs**:

```text
[bootstrap] Found organizations to load | count=1
[bootstrap:load] Organization loaded | orgName="Demo AI Org" teamsCount=6 agentsCount=1
[bootstrap] Existing organizations loaded
```

### Interview Persistence

**Starting an interview**:

```bash
./scripts/bootstrap-marcus.sh
```

This will:

1. Verify Marcus exists (from persistence)
2. Start a new interview session
3. Provide browser URL

**Interview survival**:

- Interview sessions saved to `data/organizations/{org-id}/interviews/`
- Full transcript preserved across restarts
- Can continue conversation after server restart

### Data Management

**Viewing data**:

```bash
# List organizations
ls -1 data/organizations/

# View organization manifest
cat data/organizations/{org-id}/manifest.json | jq '.'

# Count teams
ls -1 data/organizations/{org-id}/teams/ | wc -l

# View Marcus
cat data/organizations/{org-id}/agents/*.json | jq '. | select(.name=="Marcus")'
```

**Backing up**:

```bash
# Backup entire organization
cp -r data/organizations/{org-id} /path/to/backup/

# Restore
cp -r /path/to/backup/{org-id} data/organizations/
```

**Resetting**:

```bash
# WARNING: Deletes all organizational state
rm -rf data/organizations/*

# Next npm run dev will bootstrap fresh
```

### Troubleshooting

**Problem: Server starts but API returns empty data:**

Cause: Bootstrap plugin failed, check logs

Solution:

```bash
# Check bootstrap logs
grep -A 10 "bootstrap" .specify/logs/*.log

# Check filesystem
ls -R data/organizations/

# If files exist but not loading, check permissions
chmod -R u+rw data/organizations/
```

**Problem: Data duplicated on restart:**

This shouldn't happen (plugin checks existence), but if it does:

```bash
# Stop server
pkill -f "node.*nuxt"

# Clean duplicates manually
# (inspect data/organizations/*/teams/ for duplicate names)

# Or reset completely
rm -rf data/organizations/*
```

**Problem: Interview session not found after restart:**

Check:

```bash
# Does file exist?
find data/organizations/ -name "{session-id}.json"

# Is it valid JSON?
cat data/organizations/*/interviews/{session-id}.json | jq '.'

# Are dates properly formatted?
cat data/organizations/*/interviews/{session-id}.json | jq '.transcript[0].timestamp'
# Should be ISO string: "2025-11-11T..."
```

### Migration to GitHub (Future)

Current filesystem storage is Phase 1. Future Phase 2 will migrate to GitHub repos:

- Each organization → dedicated GitHub repository
- Filesystem acts as cache layer
- GitHub as source of truth
- Backwards compatible migration tool

For now, filesystem persistence is production-ready for single-server deployment.

### Git Considerations

**What's committed**:

- Directory structure: `data/organizations/.gitkeep`
- Actual org data: **Gitignored** (see `.gitignore`)

**Why gitignored**:

- Organizational state is runtime data, not code
- Each deployment has its own organizations
- Prevents accidental commit of sensitive agent data

**Development workflow**:

- Your local `data/organizations/` is yours
- Teammate's `data/organizations/` is theirs
- Production `data/organizations/` is production's
- No conflicts, no sharing needed

**Validation**:

```text
- [ ] Documentation clear and complete
- [ ] All common scenarios covered
- [ ] Troubleshooting section helpful
- [ ] Examples are accurate
```

---

#### Task 4.4: Update Main README

**Type**: Manual documentation
**Files**: `README.md`
**Complexity**: Low
**Time**: 5 minutes

**Add section after installation/setup**:

Section title: **Data Persistence**

Content to add:

- Explanation: "AI Team uses filesystem-based persistence for organizational state. Marcus and all agents are permanent entities that survive server restarts."
- First startup: Run `npm run dev` - server automatically bootstraps initial organization with Marcus (HR Specialist) and 6 core teams
- Data location: `data/organizations/{org-id}/`
- Link to: [Persistence Usage Guide](.specify/features/F012-persistent-organization-bootstrap/USAGE.md)
- Quick interview: Run `./scripts/bootstrap-marcus.sh` - starts interview with Marcus, sessions persist across restarts

**Validation**:

- [ ] Section added in logical place
- [ ] Links work
- [ ] Instructions match reality

---

#### Task 4.5: Update SYSTEM_PROMPT.md (Already Done)

**Type**: Verification
**Files**: `SYSTEM_PROMPT.md`
**Complexity**: N/A
**Time**: 2 minutes

**Verify** (should already be committed from planning phase):

- [ ] "Data Persistence Phases" section exists
- [ ] "Bootstrap (Initial Organization)" section exists
- [ ] Filesystem → GitHub migration path documented

**If missing**: Re-apply changes from planning commit

---

#### Task 4.6: Final Integration Test

**Type**: Manual end-to-end test
**Files**: None (comprehensive validation)
**Complexity**: Low
**Time**: 10 minutes

**End-to-End Test Sequence**:

```bash
# 1. Clean slate
rm -rf data/organizations/*
pkill -f "node.*nuxt"

# 2. First startup
npm run dev
# Wait for "Initial organization bootstrap complete"

# 3. Verify API
curl http://localhost:3000/api/organizations | jq '.[] | {name, tokenPool}'
curl http://localhost:3000/api/teams | jq '.[] | {name, type}'
curl http://localhost:3000/api/agents | jq '.[] | {name, role}'

# 4. Start interview
./scripts/bootstrap-marcus.sh
# Note session URL

# 5. Interact with interview
# Open browser to session URL
# Send 2-3 messages
# Verify Marcus responds appropriately

# 6. Restart server
pkill -f "node.*nuxt"
sleep 2
npm run dev
# Wait for "All organizations loaded successfully"

# 7. Verify persistence
curl http://localhost:3000/api/organizations | jq length  # Still 1
curl http://localhost:3000/api/teams | jq length  # Still 6
curl http://localhost:3000/api/agents | jq length  # Still 1

# 8. Open same interview URL in browser
# Verify conversation history visible
# Send new message
# Verify conversation continues

# 9. Check filesystem
find data/organizations/ -type f
ls -lh data/organizations/*/interviews/*.json

# 10. UI smoke test
# Open http://localhost:3000/
# Navigate to Interviews
# Verify interview listed
# Click interview
# Verify full transcript visible
```

**Validation Criteria**:

- [ ] Fresh bootstrap creates everything
- [ ] API endpoints return correct data
- [ ] Interview can be started
- [ ] Marcus responds correctly
- [ ] Server restart preserves all state
- [ ] Interview history survives restart
- [ ] Conversation can continue after restart
- [ ] UI reflects persisted state
- [ ] Filesystem structure correct
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No linting issues
- [ ] All automated tests pass (npm test)

---

#### Phase 4 Validation Gate

**Before final commit, verify**:

- [ ] Old client plugin disabled
- [ ] Bootstrap script updated
- [ ] Documentation complete and accurate
- [ ] SYSTEM_PROMPT.md correct
- [ ] End-to-end test passes
- [ ] No regressions (all existing features work)
- [ ] TypeScript compiles
- [ ] Linting passes
- [ ] All tests pass

**Final commit**:

```bash
git add app/plugins/demo-seed.ts.disabled
git add scripts/bootstrap-marcus.sh
git add README.md
git add .specify/features/F012-persistent-organization-bootstrap/USAGE.md
# Launch Gemini commit automation
```

---

## Summary: Task Inventory

### Phase 1: Filesystem Persistence Layer

- [ ] Task 1.1: Create directory structure & gitignore (5 min, manual)
- [ ] Task 1.2: Define persistence interface (10 min, manual)
- [ ] Task 1.3: Implement filesystem module (25 min, Gemini)
- [ ] Task 1.4: Create filesystem tests (20 min, Gemini)
- [ ] Task 1.5: Manual filesystem validation (10 min, manual)
- [ ] **Validation Gate 1**

### Phase 2: Bootstrap Plugin

- [ ] Task 2.1: Create bootstrap data definitions (10 min, manual)
- [ ] Task 2.2: Create bootstrap utility functions (15 min, manual)
- [ ] Task 2.3: Create load existing function (20 min, manual)
- [ ] Task 2.4: Create Nitro plugin (15 min, Gemini)
- [ ] Task 2.5: Manual bootstrap testing (15 min, manual)
- [ ] **Validation Gate 2**

### Phase 3: Interview Persistence Hooks

- [ ] Task 3.1: Add persistence hooks to session (15 min, manual)
- [ ] Task 3.2: Add interview loading to bootstrap (N/A, verify)
- [ ] Task 3.3: Manual interview persistence testing (15 min, manual)
- [ ] **Validation Gate 3**

### Phase 4: Cleanup & Documentation

- [ ] Task 4.1: Disable old client plugin (2 min, manual)
- [ ] Task 4.2: Update bootstrap script (5 min, manual)
- [ ] Task 4.3: Add usage documentation (10 min, manual)
- [ ] Task 4.4: Update main README (5 min, manual)
- [ ] Task 4.5: Verify SYSTEM_PROMPT.md (2 min, verify)
- [ ] Task 4.6: Final integration test (10 min, manual)
- [ ] **Validation Gate 4**

### Total Estimates

- **Gemini tasks**: 3 tasks (~60 minutes total execution time)
- **Manual tasks**: 12 tasks (~135 minutes total hands-on time)
- **Validation gates**: 4 checkpoints
- **Total elapsed**: ~3-4 hours (includes Gemini parallel execution)

### Commit Strategy

- Commit after each phase validation gate (4 commits total)
- Use Gemini commit automation for all commits
- Each commit is independently deployable

---

## Risk Mitigation

**High-Risk Areas**:

1. **Nitro plugin lifecycle** (Task 2.4)
   - Mitigation: Simple logic, comprehensive logging, graceful error handling
2. **Date serialization** (Task 1.3)
   - Mitigation: Explicit ISO string conversion, test coverage
3. **Interview session persistence** (Task 3.1)
   - Mitigation: Fire-and-forget saves, doesn't block operations

**Safety Nets**:

- Validation gates prevent cascade failures
- Each phase independently tested before proceeding
- Manual testing confirms automation correctness
- Graceful degradation (server starts even if bootstrap fails)
- Comprehensive logging for debugging

---

## Next Steps

1. **Review this plan thoroughly**
2. **Approve or request changes**
3. **Begin Phase 1, Task 1.1** when ready
4. **Follow validation gates strictly**
5. **Document any deviations in lessons-learned**

**Plan Status**: Ready for execution approval
