# Gemini CLI Prompts

This directory contains reusable prompt templates for Gemini CLI - our AI-assisted development workflow.

## Prompt Categories

### Workflow Automation

**`sequential-issues.prompt.md`** - Sequential GitHub Issue Implementation

- **Purpose**: Implement multiple GitHub issues iteratively with minimal interruption
- **Usage**: `/sequential-issues 32 33 34 35 36 37 38` (or `32-38`)
- **When**: Breaking down complex features into sequential sub-issues
- **Grade**: NEW (based on proven Split TDD workflow)
- **Features**:
  - Split TDD approach (tests first, then implementation)
  - Automatic quality gates (typecheck, lint, tests)
  - 2 commits per issue (test contract + implementation)
  - Handles 7-phase cycle per issue automatically
  - Progress tracking and clear status updates
  - Minimal human interruption (only stops for critical blockers)
- **Time**: ~20-30 minutes per issue (mostly automated)
- **Workflow**: ANALYZE → TEST → ASSESS → COMMIT → IMPLEMENT → ASSESS → COMMIT → CONTINUE

**`commit4gemini.prompt.md`** - Git Commit Automation

- **Purpose**: Automate conventional commit message generation
- **Usage**: `gemini --yolo "$(cat .github/prompts/commit4gemini.prompt.md)" &`
- **When**: After staging changes, need professional commit messages
- **Grade**: A+ (proven reliable in production)
- **Features**:
  - Reads git status and diff
  - Generates conventional commit format
  - Follows style rules (no emojis, no em-dashes)
  - Verifies working tree clean
  - Fire-and-forget workflow

**`editorial-cleanup.prompt.md`** - Multi-File Editorial Review

- **Purpose**: Review and fix style issues across documentation
- **Usage**: `gemini --yolo "$(cat .github/prompts/editorial-cleanup.prompt.md)" &`
- **When**: Need to clean up emoji/punctuation/style across multiple files
- **Grade**: A- (surgical precision, takes time)
- **Features**:
  - Scans multiple files
  - Makes contextual judgments
  - Surgical edits only where needed
  - Commits changes automatically

### Development Templates

**`dev-task.prompt.md`** - Structured Development Task Template

- **Purpose**: Template for feature-specific code generation tasks
- **Usage**: Copy to `.specify/features/F00X/`, fill placeholders, execute
- **When**: Creating new features with multiple files
- **Key Sections**:
  - Critical Constraints (DO NOT MODIFY)
  - Type Definitions to Use (explicit preservation)
  - Reference Files (pattern matching)
  - Expected Output (bounded scope)
  - Validation Checklist (self-checking)
  - Success Criteria
- **Benefits**:
  - Prevents type drift
  - Keeps Gemini focused
  - Enables parallel task execution
  - Self-documenting

**`test-generation.prompt.md`** - Test Generation Template

- **Purpose**: Generate comprehensive tests for APIs, composables, or services
- **Usage**: `gemini --yolo "$(cat .github/prompts/test-generation.prompt.md)" "Generate tests for server/api/agents/index.get.ts covering all filters and edge cases"`
- **When**: After implementing new features, need test coverage
- **Key Features**:
  - Logger mocking (prevents stream.write errors)
  - Data cleanup patterns (beforeEach)
  - Type-safe test data examples
  - Non-interactive execution (vitest run)
  - Coverage guidelines (success + errors + edge cases)
  - Reference to existing test patterns
- **Supports**: API endpoints, composables, services

### Power Prompts (Uncharted Territory)

**`prompt.prompt.md`** - Prompt Engineering Research & Generation

- **Purpose**: Research best practices and generate optimized AI prompts
- **Usage**: For creating system prompts, instruction templates, custom GPT instructions
- **When**: Need to design prompts for specific AI models and use cases
- **Use Cases**:
  - Create system prompts for code review
  - Generate templates for technical documentation
  - Optimize prompts for specific AI capabilities
  - Research model-specific best practices
- **Power Level**: HIGH - Meta-prompt for prompt creation

**`reverse.aii.prompt.md`** - Interview-Based System Prompt Generator

- **Purpose**: Generate optimized system prompts through iterative interview
- **Usage**: `/reverse.aii <YOUR_GOAL>`
- **When**: Need to create custom system prompts but unsure of requirements
- **Features**:
  - One question at a time interview
  - Builds context progressively
  - Constitution-aware (checks `.specify/memory/constitution.md`)
  - Optimized for current AI model
  - Incorporates project principles automatically
- **Power Level**: HIGH - Interactive prompt discovery

## Usage Patterns

### Sequential Issue Implementation

```bash
# Implement a series of dependent issues automatically
/sequential-issues 32 33 34 35 36 37 38

# Or with range notation (if supported by shell)
/sequential-issues 32-38

# What happens:
# For each issue:
#   1. ANALYZE: Fetch issue, gather context (2-3 min)
#   2. TEST: Generate tests first (5-10 min automated)
#   3. ASSESS: Verify tests, fix issues (2-3 min)
#   4. COMMIT: Commit test contract (1 min)
#   5. IMPLEMENT: Generate production code (5-10 min automated)
#   6. ASSESS: Verify implementation (2-3 min)
#   7. COMMIT: Commit implementation (1 min)
#   8. CONTINUE: Move to next issue
#
# Result: 14 commits (7 test + 7 impl), all tests passing, clean tree
```

### Fire-and-Forget (Background)

```bash
# Launch and continue working
gemini --yolo "$(cat .github/prompts/commit4gemini.prompt.md)" &

# Check completion later
git log -1
```

### Foreground (Interactive)

```bash
# Watch progress in real-time
gemini --yolo "$(cat .github/prompts/editorial-cleanup.prompt.md)"
```

### Feature Development (Structured)

```bash
# 1. Create feature folder
mkdir -p .specify/features/F002-my-feature

# 2. Copy and customize dev-task template
cp .github/prompts/dev-task.prompt.md .specify/features/F002-my-feature/01-task.prompt.md

# 3. Fill in placeholders
# 4. Execute
gemini --yolo "$(cat .specify/features/F002-my-feature/01-task.prompt.md)" &
```

### Test Generation

```bash
# Generate tests with specific requirements
gemini --yolo "$(cat .github/prompts/test-generation.prompt.md)" "Generate tests for server/api/agents/ covering GET with all filters (organizationId, teamId, status) and POST with validation errors for all required fields (name, role, organizationId, teamId, systemPrompt). Include edge cases for empty data and combined filters."

# Or simpler invocation
gemini --yolo "$(cat .github/prompts/test-generation.prompt.md)" "Create tests for app/composables/useAgent.ts - test all CRUD operations"

# Non-interactive execution (for CI/automation)
npm test  # Uses vitest run (not watch mode)
```

## Best Practices

### DO

- Use `--yolo` mode for autonomous execution
- Redirect output to logs: `> /tmp/gemini-task.log 2>&1`
- Provide complete type definitions in prompts
- Explicitly state "DO NOT MODIFY" for protected files
- Reference existing patterns from codebase
- Include validation checklists
- Launch independent tasks in parallel

### DON'T

- Run Gemini on files you're actively editing
- Skip type preservation constraints
- Use vague prompts without examples
- Interrupt long-running processes (multi-file tasks take 5-10+ mins)
- Assume Gemini will follow implicit rules
- Mix fixing and generation tasks

## Lessons Applied

All prompts incorporate lessons from `.specify/memory/lessons-learned.md`:

1. **Type Preservation** - Explicit "DO NOT MODIFY types/index.ts"
2. **Complete Type Context** - Full interfaces with all fields
3. **Pattern Matching** - Reference existing files to copy
4. **Bounded Scope** - "Create ONLY [filename]"
5. **Relative Imports** - No ~ aliases, explicit paths
6. **Self-Validation** - Checklists before completion

## Grading History

| Prompt                   | Task              | Grade | Notes                                   |
| ------------------------ | ----------------- | ----- | --------------------------------------- |
| commit4gemini            | Git commits       | A+    | Professional, reliable, fire-and-forget |
| editorial-cleanup        | Multi-file review | A-    | Surgical precision, takes time          |
| dev-task (first attempt) | Agent System      | F     | Type drift, required rollback           |
| dev-task (revised)       | TBD               | -     | Fixed with constraints                  |

## Related Documentation

- `.specify/memory/lessons-learned.md` - Gemini CLI lessons and best practices
- `.specify/memory/constitution.md` - Project principles (12 rules)
- `.specify/features/F001-agent-system/` - Example of structured feature development
- `.specify/features/F001-agent-system/EXAMPLE.md` - Detailed workflow guide

## Contributing New Prompts

When creating new reusable prompts:

1. **Test thoroughly** - Run at least 3 times with variations
2. **Document constraints** - What can/cannot be modified
3. **Include examples** - Show expected input/output
4. **Add validation** - Self-checking steps
5. **Grade it** - Document success rate and issues
6. **Update this README** - Add to appropriate category

For feature-specific prompts, use `.specify/features/F00X/` structure instead.

## Support

If Gemini gets stuck or produces unexpected results:

1. Check logs: `tail -f /tmp/gemini-*.log`
2. Monitor processes: `ps aux | grep gemini`
3. Kill if necessary: `pkill -f "gemini"`
4. Review git diff: `git diff` to see changes
5. Hard reset if needed: `git reset --hard HEAD && git clean -fd`
6. Document lesson: Add to `.specify/memory/lessons-learned.md`

## Future Prompts (Ideas)

- Test generation prompt (create tests from implementation)
- Refactoring prompt (safely restructure code)
- Documentation prompt (generate docs from code)
- Migration prompt (upgrade dependencies safely)
- Performance audit prompt (identify bottlenecks)
