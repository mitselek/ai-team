# Break Issue into Sub-Issues

## Purpose

Break down a large GitHub issue (parent issue) into smaller, manageable sub-issues with clear dependencies, effort estimates, and implementation phases.

## When to Use

- Large feature with multiple components
- Issue estimated at > 6 hours of work
- Complex features with interdependent tasks
- Issues requiring phased implementation
- Parent issues that need progress tracking

## Instructions

You will analyze a parent issue and create well-scoped sub-issues following these principles:

### Core Principles

1. **Single Responsibility**: Each sub-issue should accomplish ONE clear objective
2. **Right-Sized**: Target 1-3 hours per sub-issue (max 4 hours)
3. **Clear Dependencies**: Explicit "depends on" and "blocks" relationships
4. **Testable**: Each sub-issue has concrete acceptance criteria
5. **Phased**: Group related sub-issues into logical phases

### Analysis Phase

Before creating sub-issues, understand:

1. **Review Parent Issue**: Read complete issue description, objectives, success criteria
2. **Check Design Docs**: Look for related feature specs in `.specify/features/`
3. **Identify Components**: What major pieces need to be built?
4. **Map Dependencies**: What must come before what?
5. **Estimate Realistically**: Factor in testing, documentation, debugging time

### Sub-Issue Structure

Each sub-issue must include:

#### Required Sections

**Title Format**: `[PARENT]-[NUMBER]: [Clear Objective]`

- Example: `F074-1: Data Model & Type Updates`

**Parent Reference**:

```markdown
**Parent Issue:** nr [NUMBER] - [Parent Title]
```

**Objective**: 1-2 sentences explaining what this sub-issue accomplishes

**Tasks**: Bulleted checklist of specific implementation tasks

- File paths where changes needed
- Specific functions/components to create/modify
- Testing requirements

**Acceptance Criteria**: Observable outcomes that define "done"

- Zero TypeScript errors (always)
- Specific test coverage requirements
- Integration points verified
- Documentation updated (if applicable)

**Estimated Effort**: Time range (e.g., "2-3 hours")

**Dependencies**: Which other sub-issues must complete first

- Format: `- [PARENT]-[NUMBER] ([Title])`
- If none: `None (foundational)` or `None (parallel work)`

**Blocks**: Which other sub-issues this enables

- Format: `- [PARENT]-[NUMBER] ([Title])`
- If none: `None` with explanation

### Phase Organization

Group sub-issues into logical phases:

**Phase 1 - Foundation/Core Infrastructure**:

- Type definitions
- Core services
- Database/data model changes
- Tool/utility implementations

**Phase 2 - Integration**:

- Connect components
- Update existing workflows
- Add business logic
- Implement orchestration

**Phase 3 - Testing & Polish**:

- Scenario testing
- Edge case handling
- Documentation
- Performance validation

### Labeling Strategy

Apply GitHub labels consistently:

**Type Labels**:

- `enhancement`: New features
- `refactor`: Code restructuring
- `testing`: Test-focused work
- `documentation`: Docs-focused work

**Phase Labels**:

- `phase-1`: Foundation work
- `phase-2`: Integration work
- `phase-3`: Testing & polish

**Priority Labels** (if applicable):

- `priority-high`: Blocking other work
- `priority-low`: Nice-to-have enhancements

### Dependency Visualization

Create clear dependency chains:

**Sequential** (must complete in order):

```
nr 75 → nr 76 → nr 77
```

**Parallel** (can work independently):

```
nr 78 (starts after nr 75)
nr 79 (parallel with nr 78)
```

**Convergent** (multiple inputs, single output):

```
nr 76, nr 77, nr 78 → nr 81 (all must complete before testing)
```

### Effort Estimation Guidelines

**30 min - 1 hour**: Simple updates

- Add fields to types
- Update imports
- Simple config changes

**1-2 hours**: Single-component work

- Create new utility function
- Add API endpoint
- Write basic test suite

**2-3 hours**: Multi-component work

- Implement new tool/service
- Integration work
- Comprehensive testing
- Update multiple files

**3-4 hours**: Complex integration

- Orchestrator changes
- Workflow modifications
- Extensive test coverage
- Documentation updates

**> 4 hours**: Break it down further!

### Quality Checks

Before creating sub-issues, verify:

- [ ] Each sub-issue is independently implementable (given dependencies)
- [ ] Dependency graph is acyclic (no circular dependencies)
- [ ] All sub-issues have acceptance criteria
- [ ] Effort estimates total more than original (realistic padding)
- [ ] Phases are logically grouped
- [ ] Critical path is identified
- [ ] Parallel work opportunities identified

### Post-Creation Actions

After creating all sub-issues:

1. **Update Parent Issue**: Add comment with sub-issue breakdown
   - List all sub-issues by phase
   - Show dependency graph
   - Provide revised total effort estimate
   - Link to progress tracking

2. **Link in Design Docs**: Update feature README with sub-issue links

3. **Update Project Board** (if applicable): Add sub-issues to project

## Example Flow

**User Request**: "Break issue nr 74 into sub-issues"

**Your Process**:

1. **Read Parent Issue nr 74**: Understand scope, objectives, architecture
2. **Review Design Docs**: Check `.specify/features/F074-agent-roster/`
3. **Identify Components**:
   - Data model changes
   - Roster tool implementation
   - System prompt builder
   - Workload tracking
   - Integration points
   - Testing requirements

4. **Map Dependencies**:
   - Types must come first (foundation)
   - Roster tool depends on types
   - Integration depends on both
   - Testing depends on integration

5. **Create Sub-Issues**:
   - F074-1: Data Model & Type Updates (Phase 1)
   - F074-2: Roster Tool Implementation (Phase 1)
   - F074-3: Orchestrator Integration (Phase 1)
   - F074-4: Workload Tracking (Phase 2, parallel)
   - F074-5: System Prompt Builder (Phase 2)
   - F074-6: Agent Creation Integration (Phase 2)
   - F074-7: Delegation Testing (Phase 3)
   - F074-8: Edge Cases Testing (Phase 3)
   - F074-9: Documentation (Phase 3)

6. **Update Parent Issue**: Add comment with breakdown

7. **Reality Check**:
   - Original estimate: 4-6 hours (too optimistic)
   - Revised estimate: 14-21 hours (realistic)
   - Note: Detailed breakdown reveals true scope

## Template: Sub-Issue Body

```markdown
**Parent Issue:** nr [PARENT_NUMBER] - [Parent Title]

## Objective

[1-2 sentence description of what this sub-issue accomplishes]

## Tasks

- [ ] [Specific task 1]
  - File: `path/to/file.ts`
  - Details: [implementation notes]
- [ ] [Specific task 2]
  - File: `path/to/file.ts`
  - Details: [implementation notes]
- [ ] Write tests
  - Test file: `tests/path/to/file.spec.ts`
  - Scenarios: [list test scenarios]

## Acceptance Criteria

- [Observable outcome 1]
- [Observable outcome 2]
- Zero TypeScript errors
- All tests passing

## Estimated Effort

[X-Y hours]

## Dependencies

- [PARENT]-[NUMBER] ([Title])

## Blocks

- [PARENT]-[NUMBER] ([Title])
```

## Common Pitfalls

### Too Large

❌ **Bad**: "Implement entire roster system" (8+ hours)
✅ **Good**: Split into data model, tool implementation, integration

### Unclear Scope

❌ **Bad**: "Fix delegation issues"
✅ **Good**: "Implement 5-priority delegation framework in roster tool"

### Missing Dependencies

❌ **Bad**: No dependencies listed (when they clearly exist)
✅ **Good**: Explicit `Depends on: F074-1 (Data Model Updates)`

### Vague Acceptance Criteria

❌ **Bad**: "Everything works"
✅ **Good**: "Tool returns correct status for agents at 0/5, 3/5, and 5/5 workload"

### Underestimation

❌ **Bad**: "2 hours" for complex multi-file integration
✅ **Good**: "3-4 hours" accounting for testing and debugging

## Success Metrics

Good sub-issue breakdown achieves:

- **Clarity**: Developer can pick up any sub-issue and understand scope immediately
- **Velocity**: Sub-issues completed in 1-2 days (not weeks)
- **Tracking**: Progress visible through sub-issue completion
- **Parallelization**: Opportunities for multiple developers identified
- **Realistic**: Total effort estimate reflects actual complexity

## Output Format

After creating all sub-issues:

```markdown
## Sub-Issue Summary

Created [N] sub-issues for nr [PARENT]:

### Phase 1: [Phase Name] ([X-Y hours])

- nr [NUM] - [Title] ([estimate])
- nr [NUM] - [Title] ([estimate])

### Phase 2: [Phase Name] ([X-Y hours])

- nr [NUM] - [Title] ([estimate])

### Phase 3: [Phase Name] ([X-Y hours])

- nr [NUM] - [Title] ([estimate])

**Total Estimated Time**: [X-Y hours]

## Dependency Graph

Sequential:
[NUM] → [NUM] → [NUM]

Parallel:

- [NUM] (after [NUM])
- [NUM] (after [NUM])

## Critical Path

[NUM] → [NUM] → [NUM] → [NUM] ([total hours] hours)

## Next Steps

1. Start with nr [NUM] (no dependencies, foundational)
2. Update parent issue nr [PARENT] with progress tracking
3. Consider YOLO mode for Phase 1 (4-6 hours consecutive work)
```

## Related Workflows

- Use with `/brainstorm` for design before breaking issues
- Use with `/dev-task` for implementation of individual sub-issues
- Update `.specify/memory/architectural-decisions.md` if major design decisions made

---

**Constitutional Requirements**: All generated issue text must follow:

- No emojis in issue titles or descriptions
- Markdown quality standards (MD040, MD032)
- Type safety in code examples
- Clear, professional language
