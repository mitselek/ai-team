# F012 Usage Guide: Persistent Organization Bootstrap

## Overview

F012 implements a complete persistence layer for the AI Team application, ensuring all organizational data and interview sessions survive server restarts. Data is stored as JSON files in the filesystem, providing simple, reliable persistence without external dependencies.

## Architecture

### Data Storage Location

```text
data/
└── organizations/
    └── {org-id}/
        ├── organization.json    # Complete org state (teams, agents, tasks)
        └── interviews/
            ├── {session-1}.json
            ├── {session-2}.json
            └── ...
```

### Components

1. **Server Bootstrap Plugin** (`app/server/plugins/bootstrap.ts`)
   - Runs on Nitro startup (before API endpoints active)
   - First startup: Creates initial organization with 6 teams + Marcus
   - Subsequent startups: Loads existing data from filesystem
   - Non-blocking initialization with proper error handling

2. **Filesystem Persistence** (`app/server/services/persistence/filesystem.ts`)
   - `saveOrganization()`: Persists org/teams/agents/tasks
   - `loadOrganization()`: Restores org state on startup
   - `saveInterview()`: Persists interview sessions
   - `loadInterviews()`: Restores all interviews for an org
   - Atomic writes with `.tmp` file + rename pattern

3. **Interview Persistence Hooks** (`app/server/services/interview/session.ts`)
   - Fire-and-forget pattern: `saveInterview().catch(...)`
   - Hooks in 7 mutation functions: create, add message, update state/profile, complete, cancel, resume
   - Non-blocking: Zero latency impact on user operations

4. **Disabled Client Plugin** (`app/plugins/demo-seed.ts`)
   - Old client-side seeding now disabled (no-op export)
   - Replaced by server-side bootstrap
   - Original code preserved in comments for reference

## Usage Scenarios

### First Startup (Clean Slate)

```bash
# Start server
npm run dev

# Server logs show:
# [bootstrap] No existing organization data found
# [bootstrap] Creating initial organization...
# [bootstrap] Organization initialized: Demo AI Org
# [bootstrap] Bootstrap complete in X ms
```

**What Happens:**

1. Bootstrap checks `data/organizations/` (empty)
2. Creates initial organization with:
   - 1 organization (11M token budget)
   - 6 teams (Toolsmiths, Libraries, Nurses, Vault Ops, Post Office, HR Team)
   - 14 agents including Marcus (HR Specialist)
3. Saves to `data/organizations/{org-id}/organization.json`
4. Budget validation runs (ensures allocations are valid)

**Filesystem Result:**

```text
data/organizations/abc123/
└── organization.json  # 15KB file with full org state
```

### Subsequent Startups (Data Exists)

```bash
# Start server
npm run dev

# Server logs show:
# [bootstrap] Loading organization data...
# [bootstrap] Loaded organization: Demo AI Org (6 teams, 14 agents)
# [bootstrap] Bootstrap complete in X ms
```

**What Happens:**

1. Bootstrap finds `data/organizations/*/organization.json`
2. Loads organization into memory stores
3. Restores teams, agents, tasks
4. No data creation, just restoration

### Interview Workflow

**Start Interview:**

```bash
curl -X POST http://localhost:3000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{"teamId": "...", "interviewerId": "..."}'

# Returns: { sessionId: "xyz789", greeting: "..." }
```

**What Happens:**

1. Creates session in memory
2. **Immediately persists** to `data/organizations/{org-id}/interviews/{session-id}.json`
3. Fire-and-forget: API responds without waiting for disk write

**Add Messages:**

```bash
curl -X POST http://localhost:3000/api/interview/{session-id}/message \
  -d '{"content": "I want to build a code analyzer"}'
```

**What Happens:**

1. Message added to session transcript
2. **Immediately persists** updated session (fire-and-forget)
3. Session file updated with new message

**Complete Interview:**

```bash
curl -X POST http://localhost:3000/api/interview/{session-id}/complete
```

**What Happens:**

1. Session state set to `completed`
2. **Immediately persists** final session state
3. Session preserved for historical record

### Server Restart During Active Interview

**Scenario:**

1. User starts interview with Marcus (6 messages exchanged)
2. Server crashes or restarts
3. User returns to interview page

**What Happens:**

1. Bootstrap loads organization (Marcus exists)
2. Bootstrap loads all interviews from `data/organizations/*/interviews/`
3. Session state restored with all 6 messages
4. User can continue exactly where they left off

**Verified Behavior:**

- No message duplication
- Transcript order preserved
- Session state maintained (active/completed/cancelled)
- Profile data restored (name/goals/values)

## Data Management

### View Stored Data

```bash
# List organizations
ls data/organizations/

# View organization details
cat data/organizations/{org-id}/organization.json | jq '.'

# List interviews
ls data/organizations/{org-id}/interviews/

# View specific interview
cat data/organizations/{org-id}/interviews/{session-id}.json | jq '.'
```

### Backup Data

```bash
# Backup entire organization
cp -r data/organizations/{org-id} ~/backups/org-backup-$(date +%Y%m%d)

# Backup specific interviews
cp -r data/organizations/{org-id}/interviews ~/backups/interviews-$(date +%Y%m%d)
```

### Reset to Clean State

```bash
# Remove all data (fresh bootstrap on next startup)
rm -rf data/organizations/*

# Remove specific organization
rm -rf data/organizations/{org-id}

# Remove interviews only (keep org/teams/agents)
rm -rf data/organizations/{org-id}/interviews/*
```

### Migrate Data

```bash
# Copy organization to different environment
scp -r data/organizations/{org-id} user@host:/path/to/ai-team/data/organizations/

# Export organization as single file
tar -czf org-backup.tar.gz data/organizations/{org-id}

# Import organization
tar -xzf org-backup.tar.gz -C /path/to/ai-team/
```

## File Formats

### organization.json Structure

```json
{
  "id": "org-abc123",
  "name": "Demo AI Org",
  "githubUrl": "https://github.com/example/demo-ai-org",
  "tokenBudget": 11000000,
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z",
  "teams": [
    {
      "id": "team-xyz789",
      "name": "HR Team",
      "organizationId": "org-abc123",
      "leaderId": "agent-marcus",
      "tokenAllocation": 1000000,
      "type": "hr",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "agents": [
    {
      "id": "agent-marcus",
      "name": "Marcus",
      "role": "HR Specialist",
      "organizationId": "org-abc123",
      "teamId": "team-xyz789",
      "status": "active",
      "tokenUsed": 150000,
      "tokenAllocation": 500000,
      "systemPrompt": "You are Marcus...",
      "expertise": ["recruitment", "interviewing"],
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "tasks": []
}
```

### Interview Session Structure

```json
{
  "sessionId": "interview-xyz789",
  "organizationId": "org-abc123",
  "teamId": "team-xyz789",
  "interviewerId": "agent-marcus",
  "state": "active",
  "transcript": [
    {
      "role": "assistant",
      "content": "Hello! I'm Marcus...",
      "timestamp": "2025-01-15T10:35:00.000Z"
    },
    {
      "role": "user",
      "content": "I want to build a code analyzer",
      "timestamp": "2025-01-15T10:36:00.000Z"
    }
  ],
  "profile": {
    "name": null,
    "goals": [],
    "technicalBackground": null,
    "values": null
  },
  "metadata": {
    "startedAt": "2025-01-15T10:35:00.000Z",
    "updatedAt": "2025-01-15T10:36:00.000Z",
    "completedAt": null
  }
}
```

## Performance Characteristics

### Startup Time

- **First startup** (create data): ~50-100ms
- **Subsequent startup** (load data): ~20-50ms
- Non-blocking: API endpoints become available immediately

### Persistence Latency

- **Fire-and-forget pattern**: 0ms user-visible latency
- Disk writes happen asynchronously (not awaited)
- Average save time: 2-5ms per file
- File sizes:
  - Organization: ~15KB (full org + 14 agents)
  - Interview: ~2-4KB (per session)

### Error Handling

- Save failures logged but don't block user operations
- Atomic writes (`.tmp` + rename) prevent corruption
- Graceful degradation: Memory state continues even if save fails

## Bootstrap Script

The `scripts/bootstrap-marcus.sh` helper script starts an interview with Marcus:

```bash
./scripts/bootstrap-marcus.sh

# Output:
# 🚀 Bootstrapping Marcus interview...
#    (Marcus created automatically by server-side bootstrap)
#
# 📋 Verifying organization bootstrap...
# ✅ Organization data loaded from filesystem
#
# 📋 Finding HR Team...
# ✅ HR Team found: team-xyz789
#
# 🔍 Checking for Marcus...
# ✅ Marcus loaded from filesystem: agent-marcus
#
# 💬 Starting interview session...
# ✅ Interview started: interview-abc123
#
# 📝 Marcus says:
#    "Hello! I'm Marcus, the HR specialist for our AI team..."
#
# 🌐 Open in browser:
#    http://localhost:3000/interviews/interview-abc123
```

**Features:**

- Verifies organization loaded from filesystem
- Confirms Marcus exists (from bootstrap)
- Starts new interview session
- Provides direct browser link

## Troubleshooting

### Organization Not Found on Startup

**Symptom:** Server logs show "No organization found" but data exists

**Check:**

```bash
ls data/organizations/
# Should show at least one directory

cat data/organizations/*/organization.json
# Should show valid JSON
```

**Fix:**

- Verify file permissions (readable by server process)
- Check JSON validity: `jq '.' data/organizations/*/organization.json`
- Review server logs for filesystem errors

### Interview Not Persisting

**Symptom:** Interview data lost after server restart

**Check:**

```bash
ls data/organizations/*/interviews/
# Should show interview files

tail -f logs/server.log | grep "Failed to persist"
# Should NOT show persistence errors
```

**Fix:**

- Verify directory is writable: `touch data/organizations/test.txt`
- Check disk space: `df -h`
- Review `saveInterview()` error logs

### Duplicate Organizations on Startup

**Symptom:** Multiple organizations created instead of loading existing

**Cause:** Bootstrap logic not detecting existing data

**Check:**

```bash
# Bootstrap should find existing data
ls data/organizations/

# Check file structure matches expected format
cat data/organizations/*/organization.json | jq '.id, .name'
```

**Fix:**

- Ensure `loadOrganization()` runs before `initializeOrganization()`
- Check bootstrap plugin order in Nitro config
- Verify filesystem read permissions

### Interview Session Corrupted

**Symptom:** Cannot load interview, JSON parse errors

**Check:**

```bash
# Validate JSON
jq '.' data/organizations/*/interviews/{session-id}.json

# Check for .tmp files (incomplete writes)
ls data/organizations/*/interviews/*.tmp
```

**Fix:**

- Remove `.tmp` files if found (incomplete saves)
- Restore from backup if available
- Delete corrupted session file (cannot be recovered)

## Best Practices

1. **Backup Regularly**: Copy `data/organizations/` to backup location
2. **Monitor Disk Space**: Interviews accumulate over time
3. **Archive Old Interviews**: Move completed interviews to separate directory
4. **Version Control**: DO NOT commit `data/organizations/` (in .gitignore)
5. **Logging**: Monitor server logs for persistence errors
6. **Testing**: Use `rm -rf data/organizations/*` for clean test runs

## Migration Notes

If upgrading from pre-F012 version (no persistence):

1. Old client-side plugin (`demo-seed.ts`) is now disabled
2. Server will bootstrap automatically on first startup
3. No manual migration needed - fresh start
4. Previous in-memory data is lost (by design)

To preserve old data (if needed):

- Export current state via API before upgrade
- Manually create `organization.json` from exported data
- Place in `data/organizations/{new-org-id}/`
- Server will load on next startup

## Related Documentation

- [EXECUTION_PLAN.md](./EXECUTION_PLAN.md) - Full implementation plan
- [phase1-lessons.md](./phase1-lessons.md) - Filesystem persistence learnings
- [phase2-lessons.md](./phase2-lessons.md) - Bootstrap plugin learnings
- [phase3-lessons.md](./phase3-lessons.md) - Interview persistence learnings
- [lessons-learned.md](../../memory/lessons-learned.md) - Global F012 lessons
