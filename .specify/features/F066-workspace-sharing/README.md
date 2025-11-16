# F066: Agent Workspace Sharing - Team-Level and Org-Level Shared Folders

**GitHub Issue**: #66  
**Status**: In Progress  
**Priority**: High  
**Complexity**: High

## Objective

Implement proper workspace sharing so agents can collaborate by reading and writing files across workspace boundaries according to the 5 defined scopes from F059 design.

## Current Problem

Agent workspaces are completely isolated. The "shared" folder (`workspaces/{agentId}/shared/`) is misleadingly named - it's not actually shared with other agents. This prevents agent collaboration.

**Test Case**:

- Alex writes `cone-volume.md` to his shared folder
- Marcus tries to read it → **Permission denied**
- Current: Each agent's workspace is private, including "shared" folder

## Expected Behavior

Implement the 5 folder scopes defined in F059:

1. **`my_private`**: Agent's private workspace (only the agent)
2. **`my_shared`**: Agent's shared workspace (agent + team + leadership)
3. **`team_private`**: Team's private workspace (team members only)
4. **`team_shared`**: Team's shared workspace (all team members + org-wide visibility)
5. **`org_shared`**: Organization-wide (all teams' shared folders + team members' shared folders)

## Scope

### Phase 1: Team Workspaces

- [ ] Create team workspace folders on team creation (`workspaces/{teamId}/private|shared/`)
- [ ] Update initialization logic to create team workspaces
- [ ] Test team workspace creation

### Phase 2: Access Control

- [ ] Design WorkspaceAccess interface with permission rules
- [ ] Implement canRead/canWrite/canDelete for each scope
- [ ] Add permission checks to FilesystemService operations
- [ ] Test permission enforcement for all scopes

### Phase 3: Discovery Updates

- [ ] Update `list_folders` to support `team_private` scope
- [ ] Update `list_folders` to support `team_shared` scope
- [ ] Update `list_folders` to support `org_shared` scope (aggregate all teams)
- [ ] Ensure `my_shared` returns agent's shared folder with correct visibility
- [ ] Test all 5 scopes return correct folders

### Phase 4: Integration

- [ ] Test cross-agent file access (same team)
- [ ] Test cross-team file access (via org_shared)
- [ ] Test permission boundaries (team_private isolation)
- [ ] Test error messages are clear and actionable

## Files to Create/Modify

**New Files**:

- `app/server/services/persistence/workspace-access.ts` - Permission logic
- `tests/api/workspace-sharing.spec.ts` - Integration tests

**Modified Files**:

- `app/server/services/mcp/file-server.ts` - Update list_folders for all scopes
- `app/server/services/persistence/file-workspace.ts` - Add permission checks
- `app/server/data/teams.ts` - Create team workspaces on initialization
- `app/server/utils/initializeOrganization.ts` - Ensure team workspaces created

## Acceptance Criteria

- [ ] Teams have workspace folders (`workspaces/{teamId}/private|shared/`)
- [ ] `list_folders` correctly returns folders for all 5 scopes
- [ ] Alex can write to his `my_shared` folder
- [ ] Marcus can read Alex's `my_shared` file (if same team)
- [ ] Cross-team agents can read each other's `my_shared` files (via `org_shared`)
- [ ] Team members can write to `team_shared` folder
- [ ] Non-team members can read (but not write) `team_shared` folder
- [ ] `team_private` is only accessible to team members
- [ ] Permission denied errors are clear and actionable
- [ ] All tests passing (100%)
- [ ] TypeScript strict mode clean
- [ ] No regressions in existing functionality

## Test Scenario

```bash
# 1. Alex (HR team) writes to his shared folder
Alex: list_folders(scope: my_shared)
Alex: write_file_by_id(folderId: "{alex-shared}", filename: "cone-volume.md", content: "...")

# 2. Marcus (HR team) reads Alex's shared file
Marcus: list_folders(scope: team_shared)  # Should show Alex's shared files
Marcus: read_file_by_id(folderId: "{found}", filename: "cone-volume.md")
# Expected: Success - returns file content

# 3. Elena (Leadership team) reads via org_shared
Elena: list_folders(scope: org_shared)  # Should show all teams' shared folders
Elena: read_file_by_id(folderId: "{hr-member-shared}", filename: "cone-volume.md")
# Expected: Success - returns file content
```

## References

- [F059 Brainstorming Session](../.specify/features/F059-workspace-awareness/brainstorming-session.md)
- [Issue #66](https://github.com/mitselek/ai-team/issues/66)
- [Issue #59](https://github.com/mitselek/ai-team/issues/59) - F059 implementation
- [Issue #39](https://github.com/mitselek/ai-team/issues/39) - Parent: Filesystem Access

## Execution Plan

Following WORKFLOW.prompt.md:

1. **Phase 2: SPECIFY** (Current)
   - Create feature folder ✅
   - Write README.md ✅
   - Write test specifications (next)
   - Create implementation prompts (next)

2. **Phase 3: EXECUTE**
   - Generate tests first (Split TDD approach)
   - Assess and commit tests
   - Generate implementation
   - Run in parallel where possible

3. **Phase 4: ASSESS**
   - Verify all tests passing
   - TypeScript/lint clean
   - Code review

4. **Phase 5: LEARN**
   - Document patterns
   - Update templates
   - Grade performance

5. **Phase 6: COMMIT**
   - Stage changes
   - Automated commit

## Time Estimate

- Specification: 30-45 minutes
- Test generation: 10 minutes (automated)
- Implementation: 15 minutes (automated, parallel)
- Assessment: 15 minutes
- Learning: 10 minutes
- Total: ~80-90 minutes
