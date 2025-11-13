# Next Steps Planning: GitHub Repository Persistence for Organizations

**Date**: November 13, 2025

**Context**: Phase 1 persistence implemented (F012) - organizations stored as filesystem JSON structures in `data/organizations/`. Currently gitignored for development convenience. Ready to transition to Phase 2: dedicated GitHub repository per organization with automatic commits on state changes.

**Status**: Planning complete, not yet scheduled for implementation

---

## Current State Analysis

**Recent Work Completed**:

- ✅ F012: Filesystem persistence implemented (19 JSON files in current org)
- ✅ Fire-and-forget persistence hooks (zero latency impact)
- ✅ Functions: `saveOrganization`, `saveTeam`, `saveAgent`, `saveInterview`
- ✅ All entity changes persist immediately to filesystem
- ✅ Bootstrap process loads/restores organizational state on server restart
- ✅ Recent features: F014 (multi-model LLM), speakerLLM tracking, HR consultation
- ✅ Current org: "Demo AI Org" (created Nov 12, 2025) with 6 teams, agents, interviews

**Constitutional Requirements**:

- **Type Safety First**: All GitHub integration must be typed (use @octokit/rest)
- **Test-First Development**: Critical orchestration logic requires tests before implementation
- **Observable Development**: Three-tier logging with structured context
- **GitHub-Centric Persistence** (Section XI): "Each organization has its own GitHub repository. Agents may open issues/PRs/commits without manual approval unless restricted by policy."
- **API-First Server Design**: Expose typed, validated endpoints for org management
- **Pragmatic Simplicity**: Build simplest version that satisfies requirements and is safe to operate

**Known Constraints**:

- Must maintain backward compatibility during transition (Phase 1 → Phase 2)
- Cannot break existing filesystem persistence (fallback option)
- Zero latency requirement: Git operations must be async/background
- Budget PC deployment: Minimize resource overhead
- Multi-tenant from inception: Each org needs isolated repository

**Dependencies**:

- ✅ Depends on: Filesystem persistence (complete)
- ✅ Depends on: Organization data structure (stable)
- 🔄 Enables: GitHub Issues for tasks, Wiki for knowledge base, PRs for tool approval
- 🔄 Enables: Multi-organization collaboration via GitHub
- 🔄 Blocks: Tool approval workflow (needs PR system)
- 🔄 Blocks: Knowledge base management (needs Wiki)

**System Prompt Requirements** (Phase 2 - Multi-Org):

- Each organization gets dedicated GitHub repository
- Migration tool moves filesystem org → dedicated repo
- Maintains backward compatibility during transition
- GitHub Issues, Wiki, PRs for extended collaboration features

---

## Problem Statement

**User Goal**: "I think its about time to start saving our organisations state. for that purpose we should create separate github repository. we can always manually commit the organisation at will, but there should be automatic workflow, that commits whenever any team or agent gets changed."

**Why This Matters**:

1. **Version Control**: Track organizational evolution over time
2. **Backup**: Automatic off-site backup of organizational state
3. **Collaboration**: Enable multi-org interactions via GitHub
4. **Transparency**: All changes auditable via git history
5. **Foundation**: Prerequisite for Issues (tasks), Wiki (knowledge), PRs (approvals)

**Current Gap**:

- Organization data exists only locally (gitignored)
- No version history of organizational changes
- No automatic backup mechanism
- No foundation for GitHub-based workflows

---

## Options to Evaluate

**Option A: Full GitHub Repository Persistence:**

- Deliverables: Dedicated GitHub repo per org, automatic commits on all changes
- Benefit: Complete Phase 2 implementation, enables all future GitHub features
- Scope: Repository creation, migration, automatic sync, webhook integration

**Option B: Manual Commit Tool First:**

- Deliverables: CLI/API endpoint to manually commit org state to GitHub
- Benefit: Quick validation of GitHub integration, user control over commits
- Scope: Repository creation, single commit operation, minimal automation

**Option C: Hybrid Approach (Phased):**

- Deliverables: Start with manual commits (Phase 2a), add automation later (Phase 2b)
- Benefit: Incremental delivery, early validation, lower risk
- Scope: Phase 2a = manual tool, Phase 2b = automatic workflow

---

## Option Evaluation

### Option A: Full GitHub Repository Persistence

**Effort**: 12-16 hours

- GitHub API integration: 3-4 hours
- Repository initialization: 2 hours
- Automatic commit workflow (watch filesystem): 3-4 hours
- Migration tool (filesystem → repo): 2-3 hours
- Testing (unit + integration): 2-3 hours
- Documentation: 1 hour

**Impact**: High

- Completes Phase 2 vision from system prompt
- Enables GitHub Issues, Wiki, PRs immediately
- Automatic backup and version control
- Foundation for agent-initiated commits

**Risks**:

- **Complexity**: Filesystem watcher, debouncing, conflict resolution → Mitigation: Use proven libraries (chokidar), queue commits
- **Rate Limits**: GitHub API limits on commits → Mitigation: Batch commits (debounce 30s), exponential backoff
- **Repository Creation**: Need GitHub token with repo creation scope → Mitigation: Document token setup, validate permissions
- **Migration**: Existing data transition could fail → Mitigation: Keep filesystem as fallback, test migration thoroughly
- **Timeline Risk**: Could take longer than estimated → Mitigation: Break into phases (Option C)

**Dependencies**:

- Requires: GitHub token (repo scope), @octokit/rest installed
- Enables: GitHub Issues for tasks, Wiki for knowledge, PR-based approvals
- Parallel with: None (foundational)

**Constitutional Alignment**: Compliant ✅

- Type Safety: @octokit/rest is fully typed
- Test-First: Can test git operations with test repos
- Observable Development: Structured logging for all git operations
- GitHub-Centric Persistence: Full compliance with Section XI

### Option B: Manual Commit Tool First

**Effort**: 4-6 hours

- GitHub API integration: 2 hours
- Repository initialization: 1.5 hours
- Manual commit endpoint/CLI: 1-2 hours
- Testing: 1 hour
- Documentation: 0.5 hours

**Impact**: Medium

- Validates GitHub integration quickly
- Provides immediate backup capability
- User controls when to commit (intentional snapshots)
- Foundation for automation later

**Risks**:

- **User Burden**: Requires manual action, may be forgotten → Mitigation: Add dashboard reminder/nudge
- **Incomplete Solution**: Doesn't fulfill "automatic workflow" requirement → Mitigation: Plan Phase 2b upfront
- **Rate Limits**: Still need to handle (though less frequent) → Mitigation: Same batching/backoff strategy

**Dependencies**:

- Requires: GitHub token (repo scope), @octokit/rest installed
- Enables: Manual backup, git history, foundation for automation
- Blocks: Automatic commit workflow (needs Phase 2b)

**Constitutional Alignment**: Compliant ✅

- Pragmatic Simplicity: Simplest version that provides value
- Type Safety: @octokit/rest is typed
- Observable Development: Log manual commit actions

### Option C: Hybrid Approach (Phased)

**Effort**: 16-20 hours total (split across phases)

- **Phase 2a (Manual - 4-6 hours)**:
  - Same as Option B: Manual commit tool

- **Phase 2b (Automatic - 8-10 hours)**:
  - Filesystem watcher: 3-4 hours
  - Debouncing/batching: 2-3 hours
  - Migration to automatic mode: 1-2 hours
  - Testing automation: 2-3 hours

- **Phase 2c (Advanced - 4-6 hours)** - Optional:
  - Webhook integration for GitHub events
  - Conflict detection and resolution
  - Multi-org synchronization

**Impact**: High (staged delivery)

- Early value (Phase 2a): Backup and version control within days
- Complete solution (Phase 2b): Automatic workflow within 1-2 weeks
- Progressive enhancement (Phase 2c): Advanced features as needed

**Risks**:

- **Phase Commitment**: Must complete Phase 2b for full value → Mitigation: Create GitHub Issue for Phase 2b immediately after 2a
- **Architecture Changes**: May need refactoring between phases → Mitigation: Design for automation from start (use same git layer)
- **User Confusion**: Two modes (manual + automatic) → Mitigation: Clear mode indication in UI, smooth transition

**Dependencies**:

- Phase 2a: GitHub token, @octokit/rest
- Phase 2b: Depends on Phase 2a completion
- Phase 2c: Depends on Phase 2b, real-world usage patterns

**Constitutional Alignment**: Compliant ✅

- Pragmatic Simplicity: Start simple, add complexity as validated
- Test-First: Each phase fully tested before next
- Observable Development: Log all git operations with phase context

---

## Decision Matrix

| Criteria                 | Option A (Full) | Option B (Manual) | Option C (Hybrid) | Winner    |
| ------------------------ | --------------- | ----------------- | ----------------- | --------- |
| Effort (lower better)    | 12-16 hours     | 4-6 hours         | 16-20 hours total | B         |
| Time to First Value      | 12-16 hours     | 4-6 hours         | 4-6 hours         | B/C (tie) |
| Complete Solution        | Yes             | No                | Yes (staged)      | A/C (tie) |
| Risk (lower better)      | Medium-High     | Low               | Low-Medium        | B         |
| User Requirement Match   | Full            | Partial           | Full (staged)     | A/C (tie) |
| Constitutional Alignment | ✅              | ✅                | ✅                | All       |
| Pragmatic Simplicity     | Complex upfront | Very simple       | Staged complexity | C         |
| Enables Future Work      | Immediate       | Delayed           | Progressive       | C         |

**Weighted Score**:

- **Option A**: High impact, high effort, high risk → Score: 7/10
- **Option B**: Quick win, incomplete → Score: 6/10
- **Option C**: Best balance of risk/value/pragmatism → Score: 9/10

---

## Recommendation

**RECOMMENDED**: Option C (Hybrid Approach) - Phased Implementation

**Rationale**:

1. **Pragmatic Simplicity** (Constitutional): Start with simplest version (manual commit), validate GitHub integration, then add automation
2. **Risk Management**: Low-risk Phase 2a validates approach before investing in complex automation
3. **Time to Value**: User gets backup capability within 4-6 hours (same as Option B)
4. **Complete Solution**: Ultimately delivers full automatic workflow (same as Option A)
5. **User Requirement**: Fulfills "automatic workflow" while allowing "manual commit at will"
6. **Constitutional Alignment**: Test-First mindset - validate each phase before next

**Trade-offs**:

- We gain: Early validation, staged delivery, lower risk, progressive enhancement
- We defer: Automatic commits by ~1 week (Phase 2b follows 2a)
- We accept: Two-phase implementation, need for Phase 2b issue tracking

**Alternative**: If immediate automatic commits are critical (emergency backup need), choose Option A. However, Option C provides better risk management and aligns with constitutional principles.

---

## Implementation Plan

### Phase 2a: Manual GitHub Commit Tool (Estimated: 4-6 hours)

**Objective**: Enable manual commits of organization state to dedicated GitHub repository

**Tasks**:

1. **Create GitHub service layer** (Est: 1.5 hours)
   - Acceptance criteria: Typed service with repo creation, commit operations, token validation
   - Files affected:
     - NEW: `app/server/services/github/repository.ts`
     - NEW: `app/server/services/github/types.ts`
     - Update: `app/server/services/github.ts` (import new modules)

2. **Implement repository initialization** (Est: 1 hour)
   - Acceptance criteria: Create GitHub repo for org, initialize with README, add .gitignore
   - Files affected:
     - `app/server/services/github/repository.ts` (createOrgRepository function)

3. **Implement manual commit operation** (Est: 1.5 hours)
   - Acceptance criteria: Commit all org JSON files to GitHub in single atomic commit
   - Files affected:
     - `app/server/services/github/repository.ts` (commitOrgState function)
     - `app/server/services/persistence/filesystem.ts` (read all org files helper)

4. **Create API endpoint** (Est: 0.5 hours)
   - Acceptance criteria: POST `/api/organizations/[id]/commit` triggers manual commit
   - Files affected:
     - NEW: `app/server/api/organizations/[id]/commit.post.ts`

5. **Add UI trigger** (Est: 0.5 hours)
   - Acceptance criteria: Dashboard button "Commit to GitHub" with loading state
   - Files affected:
     - `app/pages/index.vue` (add commit button)
     - `app/composables/useOrganization.ts` (commitToGitHub method)

6. **Write tests** (Est: 1 hour)
   - Acceptance criteria: Unit tests for git operations, integration test for full flow
   - Files affected:
     - NEW: `tests/services/github/repository.spec.ts`
     - NEW: `tests/api/organizations-commit.spec.ts`

**Validation Gate**: Phase 2a Complete

- [ ] Can create GitHub repository for organization
- [ ] Can manually commit org state (manifest, teams, agents, interviews)
- [ ] Dashboard button triggers commit successfully
- [ ] All tests passing (Type Safety, zero regressions)
- [ ] Git history shows commits with proper messages
- [ ] Documentation updated (token setup, manual commit process)

### Phase 2b: Automatic Commit Workflow (Estimated: 8-10 hours) - SEPARATE ISSUE

**Objective**: Automatically commit organization changes to GitHub on entity modifications

**High-Level Tasks** (detailed in Issue #12):

1. Implement filesystem watcher for `data/organizations/` (chokidar)
2. Add debouncing/batching (30s window, max 100 files per commit)
3. Queue commit operations (async job queue)
4. Handle GitHub API rate limits (exponential backoff)
5. Add conflict detection (warn if manual+auto commits collide)
6. Update persistence hooks to trigger commits
7. Add dashboard indicator (last auto-commit time)
8. Write comprehensive tests (auto-commit scenarios)

**Validation Gate**: Phase 2b Complete

- [ ] Agent/team changes trigger automatic commits within 30s
- [ ] Batching works (multiple changes = single commit)
- [ ] Rate limit handling prevents API errors
- [ ] Dashboard shows last auto-commit timestamp
- [ ] All tests passing including automation scenarios

### Phase 2c: Advanced Features (Estimated: 4-6 hours) - FUTURE ISSUE

**Objective**: Webhook integration, conflict resolution, multi-org sync

- Defer until Phase 2b validated in production
- Create separate issue when needed

---

## Risk Assessment

**Technical Risks**:

- **GitHub Token Security**: Token needs repo creation scope, stored where? → Mitigation: Use environment variable, Vault team manages (future), validate scope on startup
- **Repository Naming Conflicts**: Org name may not be valid GitHub repo name → Mitigation: Slug generation (org-name-{uuid-prefix}), validate before creation
- **Commit Message Quality**: Auto-generated messages may be unclear → Mitigation: Structured format: "Update {entity}: {name} ({action})", include metadata
- **File Size Limits**: Large interview transcripts could hit GitHub limits → Mitigation: Split large files, compress JSON, monitor file sizes
- **Network Failures**: GitHub API may be unavailable → Mitigation: Retry with exponential backoff, fallback to filesystem-only mode, log failures

**Assumptions We're Making**:

- GitHub token available in environment - Verify by: Check process.env.GITHUB_TOKEN on startup
- User has repo creation permissions - Verify by: Validate token scope with @octokit API call
- Organization data fits in single repository - Verify by: Calculate total size, warn if > 1GB
- Commit frequency manageable for GitHub rate limits - Verify by: Monitor commit rate in Phase 2b, adjust debounce

**Unknowns to Research**:

- [ ] GitHub API rate limits for authenticated requests - Research time: 0.5 hours
- [ ] Optimal debounce interval for automatic commits - Research time: 0.5 hours (test with real usage)
- [ ] Repository visibility (public vs private) - Research time: 0.25 hours (check user preference)
- [ ] Branch strategy (main only vs feature branches) - Research time: 0.5 hours (design decision)

**Derisking Strategies**:

1. **Create test repository first**: Validate GitHub integration with throwaway repo before touching org data
2. **Dry-run mode**: Add `--dry-run` flag to test commit logic without pushing
3. **Filesystem fallback**: Always write to filesystem first, GitHub second (no data loss if GitHub fails)
4. **Incremental rollout**: Phase 2a validates basics before Phase 2b automation
5. **Monitoring**: Add structured logging for all GitHub operations (success, failures, retry attempts)

---

## Ready-to-Use Todo List (Phase 2a)

**Phase 2a: Manual GitHub Commit Tool:**

- [ ] **Install @octokit/rest** - Add dependency, type definitions (Est: 0.25 hours)
  - Files: `package.json`
  - Done when: `npm install @octokit/rest` succeeds, types available

- [ ] **Create GitHub service layer** - Repository operations (Est: 1.5 hours)
  - Files: `app/server/services/github/repository.ts`, `app/server/services/github/types.ts`
  - Done when: Typed service with `createOrgRepository`, `commitOrgState`, `validateToken` functions

- [ ] **Implement repository initialization** - Create GitHub repo for org (Est: 1 hour)
  - Files: `app/server/services/github/repository.ts`
  - Done when: `createOrgRepository(orgId)` creates repo with README, .gitignore, proper structure

- [ ] **Implement manual commit operation** - Commit all org files (Est: 1.5 hours)
  - Files: `app/server/services/github/repository.ts`, `app/server/services/persistence/filesystem.ts`
  - Done when: `commitOrgState(orgId)` reads all JSON files, creates single commit on GitHub

- [ ] **Create API endpoint** - Trigger manual commit (Est: 0.5 hours)
  - Files: `app/server/api/organizations/[id]/commit.post.ts`
  - Done when: POST request commits org state, returns success/failure

- [ ] **Add UI trigger** - Dashboard commit button (Est: 0.5 hours)
  - Files: `app/pages/index.vue`, `app/composables/useOrganization.ts`
  - Done when: Button in dashboard triggers commit, shows loading state, displays success/error

- [ ] **Write tests** - Unit + integration tests (Est: 1 hour)
  - Files: `tests/services/github/repository.spec.ts`, `tests/api/organizations-commit.spec.ts`
  - Done when: Tests cover repo creation, commit operation, API endpoint, all passing

- [ ] **Update documentation** - Token setup, manual commit process (Est: 0.25 hours)
  - Files: `README.md`, new `docs/github-persistence.md`
  - Done when: Documentation explains token setup, how to trigger manual commit

- [ ] **Test with real organization** - End-to-end validation (Est: 0.5 hours)
  - Done when: "Demo AI Org" committed to GitHub successfully, can view files in browser

**Total Estimated Time**: 6.5 hours

**Validation**: Manual commit creates GitHub repository with all organization files, accessible via browser, git history shows commit

---

## Next Actions (When Ready to Implement)

**Start with**:

```bash
# Install GitHub API client
npm install @octokit/rest

# Create service directory structure
mkdir -p app/server/services/github

# Create first service file
touch app/server/services/github/types.ts
touch app/server/services/github/repository.ts
```

**Why**: Foundation for all GitHub operations; types-first approach ensures type safety (constitutional requirement)

**Timeline**: Phase 2a can be complete within 1-2 days of focused work

---

## GitHub Milestone/Issue Structure (For Future)

**RECOMMENDED**: Create GitHub Milestone + Issues

**Milestone**: Phase 2: GitHub Repository Persistence

- Due date: TBD (when scheduled)
- Description: Transition from filesystem-only persistence to dedicated GitHub repository per organization with automatic commit workflow

**Issues**:

1. **Issue #12: Phase 2a - Manual GitHub Commit Tool** (Priority: High)
   - Labels: `enhancement`, `phase-2a`, `github-integration`
   - Description: Implement manual commit capability for organization state to GitHub
   - Checklist: All Phase 2a tasks from todo list above
   - Acceptance criteria: All validation gates from Phase 2a

2. **Issue #13: Phase 2b - Automatic Commit Workflow** (Priority: Medium)
   - Labels: `enhancement`, `phase-2b`, `github-integration`, `automation`
   - Description: Implement automatic commits on entity changes (teams, agents)
   - Blocked by: #12
   - Checklist: High-level tasks from Phase 2b section
   - Acceptance criteria: All validation gates from Phase 2b

3. **Issue #14: Documentation - GitHub Persistence Setup** (Priority: Medium)
   - Labels: `documentation`, `phase-2a`
   - Description: Document token setup, repository structure, commit workflow
   - Blocked by: #12
   - Acceptance criteria: User can set up GitHub persistence following docs

---

## Git Status Requirements

**Pre-Commit Checklist** (for each phase commit):

```bash
# Before staging
git status           # Review all changes (should show new service files)
git diff --stat      # See modification summary

# After staging
git status           # Verify staged files (no accidental inclusions)
git diff --cached    # Review staged changes (code review yourself)
```

**Post-Commit Verification** (critical):

```bash
# After commit completes
git status           # MUST show "nothing to commit, working tree clean"
git log -1 --oneline # Verify commit message follows format
```

**Expected Git State at Each Phase**:

- **After Phase 2a**: Clean working tree, new files in `app/server/services/github/`, `app/server/api/organizations/[id]/commit.post.ts`, tests
- **After Phase 2b**: Clean working tree, new watcher service, updated persistence hooks, automation tests

---

## Summary

**Recommended Path**: Option C (Hybrid/Phased)

1. **Phase 2a** (4-6 hours): Manual commit tool - validates GitHub integration, provides immediate backup
2. **Phase 2b** (8-10 hours): Automatic workflow - fulfills "automatic commits on changes" requirement
3. **Phase 2c** (future): Advanced features as needed

**Immediate Action** (when scheduled): Install @octokit/rest, create GitHub service layer

**Constitutional Compliance**: ✅ All phases align with Type Safety, Test-First, Pragmatic Simplicity, GitHub-Centric Persistence principles

**Risk Level**: Low-Medium (phased approach derisks complexity)

**Time to First Value**: 4-6 hours (manual commit capability)

**Time to Complete Solution**: 12-16 hours (both phases)
