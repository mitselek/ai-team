# F012: Persistent Organization Bootstrap & Persistence Layer

**Status**: Planning
**Created**: 2025-11-11
**Replaces**: Demo seed architecture (client/server separation issue)

## Problem Statement

Current architecture treats data as ephemeral "demo seed":

- Client-side plugin creates browser memory data
- Server API has separate in-memory store
- Server restart loses all state (agents, teams, interviews)
- Marcus doesn't persist between sessions
- Requires manual bootstrap script workaround

**Reality**: This is not demo data - Marcus is our first real agent with persistent identity. All agents, teams, and organizational state should survive restarts and accumulate over time.

## Solution: Persistent Organization Bootstrap

Create server-side persistence layer that:

1. Bootstraps initial organization with core teams and Marcus on first run
2. Saves all state to filesystem (JSON/YAML structures)
3. Loads existing state on server restart
4. Treats all data as permanent organizational state
5. Sets foundation for future GitHub repo migration

## Architecture

### Data Storage Structure

```text
data/
  organizations/
    {org-id}/
      manifest.json              # Org metadata, token pools
      teams/
        {team-id}.json           # Team config, token allocation
      agents/
        {agent-id}.json          # Agent definition, token usage, status
      interviews/
        {session-id}.json        # Interview sessions (HR process)
      logs/
        organizational.jsonl     # Concise org-level logs
        teams/
          {team-id}.jsonl        # Mid-level team logs
        agents/
          {agent-id}.jsonl       # Verbose agent logs
```

### Bootstrap Plugin Flow

```text
Server Start
    ↓
Check: data/organizations/ exists?
    ↓
  NO → Bootstrap Initial Org
    ↓
    Create filesystem structure
    Create Demo AI Org
    Create core teams (HR, Toolsmith, etc.)
    Create Marcus (first agent)
    Save to filesystem
    ↓
  YES → Load Existing State
    ↓
    Read manifest.json
    Load teams from files
    Load agents from files
    Restore in-memory stores
    Resume operations
    ↓
Ready: API has persistent data
```

### Persistence Hooks

All data mutations write to filesystem:

- `createOrganization()` → save manifest.json
- `createTeam()` → save teams/{id}.json
- `createAgent()` → save agents/{id}.json
- `updateAgent()` → update agents/{id}.json
- Interview sessions → save interviews/{id}.json

## Implementation Plan

### Phase 1: Filesystem Persistence Layer (45 min)

**1.1 Create persistence module** (20 min)

File: `app/server/services/persistence/filesystem.ts`

Functions:

- `saveOrganization(org)` - Write manifest.json
- `loadOrganization(orgId)` - Read manifest.json
- `saveTeam(team)` - Write teams/{id}.json
- `loadTeams(orgId)` - Read all team files
- `saveAgent(agent)` - Write agents/{id}.json
- `loadAgents(orgId)` - Read all agent files
- `saveInterview(session)` - Write interviews/{id}.json
- `loadInterview(sessionId)` - Read interview file

Acceptance: Functions create/read files correctly, handle errors gracefully

**1.2 Add persistence hooks to data stores** (15 min)

Files:

- `app/server/data/organizations.ts`
- `app/server/data/teams.ts`
- `app/server/data/agents.ts`
- `app/server/services/interview/session.ts`

Changes:

- Import persistence functions
- Call `save*()` after mutations
- Keep in-memory arrays for fast access
- Filesystem is source of truth

Acceptance: Creating entity via API writes file, API restart loads it back

**1.3 Create data directory structure** (10 min)

```bash
mkdir -p data/organizations
echo "data/organizations/*/*.json" >> .gitignore
echo "data/organizations/*/teams/*.json" >> .gitignore
echo "data/organizations/*/agents/*.json" >> .gitignore
echo "data/organizations/*/interviews/*.json" >> .gitignore
```

Keep `.gitkeep` files so structure exists:

```bash
mkdir -p data/organizations/.gitkeep
```

Acceptance: Directory structure committed, actual org data gitignored

**Validation Gate**: Manual test - create org/team/agent, restart server, verify data still exists

- [ ] Create org via API
- [ ] Files written to data/organizations/
- [ ] Restart server (npm run dev)
- [ ] API endpoints return saved data

---

### Phase 2: Bootstrap Plugin (30 min)

**2.1 Create bootstrap plugin** (15 min)

File: `app/server/plugins/bootstrap.ts`

Logic:

```typescript
export default defineNitroPlugin(async (nitroApp) => {
  const log = createLogger('bootstrap')

  // Check if organizations exist
  const orgIds = await listOrganizations()

  if (orgIds.length === 0) {
    log.info('No organizations found, bootstrapping initial org...')
    await bootstrapInitialOrganization()
    log.info('Bootstrap complete - initial organization created')
  } else {
    log.info('Loading existing organizations...', { count: orgIds.length })
    await loadExistingOrganizations()
    log.info('Organizations loaded successfully')
  }
})
```

Acceptance: Plugin runs on startup, logs indicate bootstrap or load

**2.2 Implement bootstrap logic** (10 min)

File: `app/server/services/bootstrap/initial-org.ts`

Function: `bootstrapInitialOrganization()`

Steps:

1. Create "Demo AI Org" (10M tokens)
2. Create core teams (HR, Toolsmith, Library, Vault, Tools Library, Nurse)
3. Create Marcus (HR Specialist, 500K tokens)
4. Save all to filesystem
5. Load into in-memory stores

Acceptance: Fresh server creates complete org structure with Marcus

**2.3 Implement load logic** (5 min)

File: `app/server/services/bootstrap/load-orgs.ts`

Function: `loadExistingOrganizations()`

Steps:

1. Read manifest.json for each org
2. Load all teams for each org
3. Load all agents for each org
4. Populate in-memory stores
5. Log summary (X orgs, Y teams, Z agents loaded)

Acceptance: Server restart loads all saved data correctly

**Validation Gate**: Complete bootstrap cycle works

- [ ] Delete data/organizations/
- [ ] Start server
- [ ] See "bootstrapping initial org" in logs
- [ ] Verify Marcus exists: `curl /api/agents`
- [ ] Restart server
- [ ] See "Loading existing organizations" in logs
- [ ] Marcus still exists without re-creation

---

### Phase 3: Interview Persistence (20 min)

**3.1 Add interview session persistence** (10 min)

File: `app/server/services/interview/session.ts`

Changes:

- Import `saveInterview()`, `loadInterview()`
- Call `saveInterview()` after `createSession()`, `updateState()`, `updateProfile()`
- Add `loadInterviewSessions(orgId)` on bootstrap

Acceptance: Interview sessions survive server restart, transcript history preserved

**3.2 Update bootstrap to load interviews** (5 min)

File: `app/server/services/bootstrap/load-orgs.ts`

Add: Load interview sessions for each org

Acceptance: Active interview can continue after server restart

**3.3 Test interview persistence** (5 min)

Manual test:

1. Start interview with Marcus
2. Send 2-3 messages
3. Restart server
4. Navigate to interview URL
5. Verify transcript shows previous messages
6. Send new message, verify it works

Acceptance: Interview state fully persistent across restarts

**Validation Gate**: Complete interview cycle persists

- [ ] Start interview, send messages
- [ ] Restart server
- [ ] Interview history loads
- [ ] Can continue conversation

---

### Phase 4: Cleanup & Documentation (25 min)

**4.1 Remove old client plugin** (5 min)

```bash
mv app/plugins/demo-seed.ts app/plugins/demo-seed.ts.disabled
```

Add note in file:

```typescript
// DISABLED: Replaced by server-side bootstrap plugin
// See: app/server/plugins/bootstrap.ts
```

Acceptance: UI loads without client-side seeding, no errors

**4.2 Update bootstrap script** (5 min)

File: `scripts/bootstrap-marcus.sh`

Update to check for persistence:

- If Marcus exists (from filesystem): Skip creation, just start interview
- If not: Error message "Run server first to bootstrap org"

Acceptance: Script detects persisted Marcus, doesn't duplicate

**4.3 Update SYSTEM_PROMPT.md** (10 min)

File: `SYSTEM_PROMPT.md`

Add new section (as discussed):

```markdown
### Data Persistence Phases

**Phase 1 - MVP (Current)**:

- Organizations stored as filesystem structures (JSON)
- Located in project repo under `data/organizations/{org-id}/`
- Contains: agent definitions, team structure, interviews, logs
- Survives server restarts (persistent organizational state)
- Version controlled structure, gitignored data

**Phase 2 - Multi-Org (Future)**:

- Each organization gets dedicated GitHub repository
- Migration tool moves filesystem org → dedicated repo
- Maintains backward compatibility during transition

**Bootstrap Process**:

1. Server startup checks for existing organizations
2. If none: Create initial org with core teams
3. Create Marcus (first HR agent) with persistent identity
4. Marcus conducts interviews for subsequent hires
5. All agents permanent from creation (no demo/test distinction)
```

Update "Agent Lifecycle" section:

```markdown
**Bootstrap (Initial Organization)**:

- System creates first organization with core team structure
- Marcus (HR Specialist) is first agent with full identity
- Marcus conducts interview for first "real" hire
- All subsequent agents enrolled through HR process
- **All agents persistent from creation** (survive restarts)
```

Acceptance: System prompt reflects reality of persistence architecture

**4.4 Document in feature README** (5 min)

File: `.specify/features/F012-persistent-organization-bootstrap/README.md`

Add sections:

- Usage instructions
- File structure explanation
- Migration path to GitHub repos
- Troubleshooting (corrupt files, etc.)

Acceptance: Clear documentation for future reference

**Validation Gate**: Documentation complete and accurate

- [ ] SYSTEM_PROMPT.md updated
- [ ] Feature README complete
- [ ] Bootstrap script updated
- [ ] Old client plugin disabled

---

## Testing Strategy

### Manual Testing Checklist

**Bootstrap (fresh start)**:

- [ ] Delete data/organizations/
- [ ] Start server: `npm run dev`
- [ ] Check logs: "bootstrapping initial org"
- [ ] Verify structure: `ls -R data/organizations/`
- [ ] Check API: `curl http://localhost:3000/api/agents` (see Marcus)
- [ ] Check UI: Navigate to home, see Demo AI Org dashboard

**Persistence (restart)**:

- [ ] With server running, note current org/agents
- [ ] Stop server (Ctrl+C)
- [ ] Start server: `npm run dev`
- [ ] Check logs: "Loading existing organizations"
- [ ] Verify API returns same data (no duplication)
- [ ] Check UI: Dashboard shows same state

**Interview persistence**:

- [ ] Start interview with Marcus
- [ ] Send 3 messages, get responses
- [ ] Note session ID
- [ ] Restart server
- [ ] Navigate to interview URL
- [ ] Verify transcript shows all previous messages
- [ ] Send new message, verify conversation continues

**Multi-restart stability**:

- [ ] Restart server 5 times in a row
- [ ] Verify no data duplication
- [ ] Verify no data loss
- [ ] Check file structure remains clean

### Automated Testing (Future)

Create tests for:

- `persistence/filesystem.ts` functions
- Bootstrap plugin logic
- Load/save cycle consistency
- Error handling (corrupt files, missing directories)

Deferred to post-implementation.

---

## Risk Assessment

**Technical Risks**:

- **File system race conditions**: Multiple writes to same file
  - Impact: Data corruption
  - Mitigation: Use atomic writes (write temp file, rename), add file locking if needed

- **Large interview transcripts**: Files grow unbounded
  - Impact: Slow reads, large repo
  - Mitigation: Implement log rotation later, acceptable for MVP

- **JSON parse errors**: Corrupt data files
  - Impact: Bootstrap fails
  - Mitigation: Catch errors, log clearly, provide manual recovery instructions

**Operational Risks**:

- **Gitignore mistakes**: Accidentally commit org data
  - Impact: Sensitive data in repo
  - Mitigation: Test gitignore patterns, add pre-commit check

- **Directory permissions**: Server can't write to data/
  - Impact: Bootstrap fails silently
  - Mitigation: Check write permissions on startup, log error clearly

**Assumptions**:

- Filesystem is reliable (not network mount) - Verify: Local SSD acceptable for MVP
- JSON files sufficient (no need for DB yet) - Verify: Org count low, query patterns simple
- Single-process server (no concurrency) - Verify: True for MVP deployment

**Derisking Strategies**:

1. Test with corrupt JSON files (manual test)
2. Test with missing directories (manual test)
3. Implement file validation on load (checksums optional, schema validation helpful)
4. Keep backup copy of last known good state (deferred)

---

## Success Metrics

**Functional**:

- [ ] Server restart preserves all org/team/agent data
- [ ] Interview sessions survive restarts with full history
- [ ] No manual bootstrap script needed
- [ ] No client/server data separation issues

**Non-Functional**:

- [ ] Bootstrap time < 100ms for initial org
- [ ] Load time < 500ms for 1 org, 10 teams, 50 agents
- [ ] File writes don't block API requests
- [ ] Clear error messages for filesystem issues

**Developer Experience**:

- [ ] `npm run dev` → working app with Marcus (no manual steps)
- [ ] Documentation clear and accurate
- [ ] File structure easy to understand and inspect
- [ ] Migration path to GitHub repos clearly defined

---

## Future Enhancements

**Phase 2 - GitHub Repository Migration**:

- Create dedicated repo per organization
- Migration script: filesystem → GitHub
- Keep filesystem as cache layer
- GitHub as source of truth

**Phase 3 - Enhanced Persistence**:

- Log rotation for large transcripts
- Backup/restore functionality
- Data integrity validation
- Performance optimization (lazy loading, indexing)

**Phase 4 - Multi-Tenancy**:

- Organization isolation
- Secret KEY for org creation
- Inter-org communication bridges

---

## Next Actions

**Start with**:

```bash
# Create persistence module
mkdir -p app/server/services/persistence
touch app/server/services/persistence/filesystem.ts
```

**Why this first**: Establishes file I/O foundation before bootstrap logic

**Estimated completion**: 2 hours total (45 + 30 + 20 + 25 minutes)

---

**Total Estimated Time**: 2 hours

**Dependencies**: None (can start immediately)

**Validation**: Server restart → Marcus still exists, interviews continue
