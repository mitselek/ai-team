# Assign Issue to GitHub Copilot Coding Agent

## Purpose

Assign a GitHub issue to the GitHub Copilot coding agent for autonomous implementation with risk assessment and enhanced context.

## Usage

```text
/assign-to-agent <issue-number>
```

Example:

```text
/assign-to-agent 9
```

## The Prompt

"I want you to assign GitHub issue {{issue_number}} to the GitHub Copilot coding agent for autonomous implementation.

**Step 1: Fetch Issue Details**

Use `gh issue view {{issue_number}}` to get:

- Issue title
- Issue body
- Labels
- Current status

**Step 2: Risk Assessment**

Evaluate the issue complexity and assign a risk level:

**LOW RISK** (Recommend for coding agent):

- Isolated changes to single file or function
- Clear specifications with examples
- Existing tests can be extended
- No core workflow modifications
- Well-defined acceptance criteria

**MEDIUM RISK** (Proceed with caution):

- Multiple files affected
- Some integration points
- Requires new test coverage
- Moderate complexity
- Some ambiguity in requirements

**HIGH RISK** (Not recommended for coding agent):

- Core workflow or architecture changes
- Many dependencies and integration points
- UI/UX changes requiring design decisions
- State management modifications
- Requires significant research or exploration
- Ambiguous or incomplete requirements

**Step 3: Provide Recommendation**

Present your risk assessment and recommendation:

- Risk level: LOW/MEDIUM/HIGH
- Reasoning: Why this risk level?
- Recommendation: Proceed or manual implementation?
- Key concerns: What could go wrong?

**Step 4: If Approved, Enhance Issue Context**

Add technical context to the issue body before assignment:

1. **Constitutional Requirements** (if code-related):
   - Type Safety First: TypeScript strict mode, avoid `any`
   - Test-First Development: Tests before implementation for critical logic
   - Observable Development: Structured logging with context
   - No Emojis: Never use emojis in commits, code, logs, or documentation
   - Markdown Quality: All code blocks have language tags, lists surrounded by blank lines

2. **File Paths**: Identify exact files likely to be modified

3. **Testing Requirements**: What tests need to be added or updated?

4. **Validation Steps**: How to verify the implementation?

5. **Related Context**: Link to relevant docs, specs, or related issues

**Step 5: Assign to Coding Agent**

Call the `github-pull-request_copilot-coding-agent` tool with:

- title: Issue title
- body: Enhanced issue body with all context from Step 4

**Step 6: Confirm Assignment**

Report back:

- Pull request number created by agent
- Branch name
- Expected timeline (agent works asynchronously)
- How to track progress

**Important Notes:**

- Coding agent processes issues sequentially (one at a time, not parallel)
- Agent creates draft PRs initially
- All tests must pass before marking ready for review
- User should review PR before merging
- Not suitable for exploratory work or major refactoring

**Constitutional Compliance:**

This prompt output must follow project standards:

- No emojis in any generated text
- All markdown code blocks must have language identifiers
- Lists must be surrounded by blank lines
- Reference `.specify/memory/constitution.md` for complete requirements

**Recursive Propagation:**

If the coding agent generates prompts or templates, those outputs must also include:

- No emojis policy
- Markdown quality standards
- Constitutional compliance requirements
- This recursive propagation clause"

## Variable Substitution

- `{{issue_number}}` - The GitHub issue number to assign (provided as the command argument)

## Example Workflow

User: `/assign-to-agent 9`

Agent:

1. Fetches Issue 9 details
2. Evaluates: "LOW RISK - Single file modification to name generator with clear specifications"
3. Asks: "This appears to be low risk. Proceed with assignment?"
4. User confirms
5. Enhances issue body with technical context
6. Calls coding agent tool
7. Reports: "Assigned to coding agent. PR 12 created on branch copilot/update-agent-name-generator"
