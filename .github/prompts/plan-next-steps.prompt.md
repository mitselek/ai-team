# Next Steps Planning Assistant

The user input provides context about available options or features to implement. You **MUST** consider it before proceeding with planning (if not empty).

User input:

$ARGUMENTS

This command helps you evaluate implementation options, prioritize work, and create actionable plans for the next phase of development.

## What This Command Does

This prompt assists with:

- **Evaluating multiple options** (API vs UI, approach A vs B, sequential features)
- **Estimating effort** and impact for each option
- **Identifying dependencies** and risks
- **Creating prioritized task lists** with time estimates
- **Recommending the optimal path** based on constraints
- **Generating actionable first steps** to start immediately

## Workflow

**CRITICAL FIRST STEP**: Check if `$ARGUMENTS` is empty or contains only whitespace.

- **If empty**: Stop immediately and ask:
  - "What options are you considering?"
  - "What feature or task do you want to plan?"
  - Give example: "For example: 'Should we build API endpoints or UI components first for the interview system?'"
  - Do NOT proceed with the workflow below
- **If not empty**: Proceed with steps 1-9 below

### Step 1: Understand Current State

**Before planning, gather context:**

1. **Read recent work** (if mentioned in user input):
   - Check last commit message for context
   - Read relevant README files for feature status
   - Review recent changes to understand what's complete

2. **Check project constitution** (if exists):
   - Look for `.specify/memory/constitution.md`
   - Understand core principles: Type Safety, Test-First, Composable-First, etc.
   - Planning decisions must align with constitutional principles

3. **Identify constraints**:
   - Time constraints (need quick win vs long-term solution)
   - Resource constraints (team size, availability)
   - Technical constraints (dependencies, infrastructure, tech stack)
   - User constraints (who's waiting for this?)

4. **Understand dependencies**:
   - What's already complete?
   - What's blocked waiting for this work?
   - What external systems are involved?

**Present context findings** before evaluating options:

```markdown
## Current State Analysis

**Recent Work Completed**:

- [Feature X completed with Y tests passing]
- [Service layer implemented, missing API/UI exposure]

**Constitutional Requirements** (if applicable):

- Type Safety First: [relevant principle]
- Test-First Development: [relevant principle]
- [Other relevant principles]

**Known Constraints**:

- [Constraint 1]
- [Constraint 2]

**Dependencies**:

- Depends on: [completed features]
- Blocking: [waiting features]
```

### Step 2: Parse and Clarify Options

**Extract options from user input:**

- Identify distinct approaches (Option A, Option B, Option C)
- Clarify what each option delivers
- Note any explicit preferences or constraints
- Ask clarifying questions if options are ambiguous

**Format options clearly:**

```markdown
## Options to Evaluate

**Option A: [Name]**

- Deliverables: [What gets built]
- Benefit: [What problem it solves]

**Option B: [Name]**

- Deliverables: [What gets built]
- Benefit: [What problem it solves]

[Repeat for each option]
```

### Step 3: Evaluate Each Option

**For each option, assess:**

1. **Effort Estimation**:
   - Implementation time (hours or days)
   - Testing time
   - Documentation time
   - Total estimated time

2. **Impact Assessment**:
   - User impact (high/medium/low)
   - Developer experience impact
   - System reliability impact
   - Strategic value (enables future work?)

3. **Risk Analysis**:
   - Technical risks (complexity, unknowns)
   - Integration risks (dependencies, breaking changes)
   - Timeline risks (could this take longer than expected?)
   - Mitigation strategies for each risk

4. **Dependencies**:
   - What must be done first?
   - What does this enable next?
   - What can be done in parallel?

5. **Constitutional Compliance** (if applicable):
   - Does this approach align with Type Safety principles?
   - Does it follow Test-First development?
   - Does it maintain Observable Development standards?
   - Are there governance concerns?

**Present evaluation in structured format:**

```markdown
## Option Evaluation

### Option A: [Name]

**Effort**: [X hours/days]

- Implementation: [breakdown]
- Testing: [breakdown]
- Documentation: [breakdown]

**Impact**: [High/Medium/Low]

- [Specific impact 1]
- [Specific impact 2]

**Risks**:

- [Risk 1] → Mitigation: [strategy]
- [Risk 2] → Mitigation: [strategy]

**Dependencies**:

- Requires: [prerequisites]
- Enables: [future work]
- Parallel with: [concurrent tasks]

**Constitutional Alignment**: [Compliant/Concerns]

- [Principle 1]: [assessment]
- [Principle 2]: [assessment]

[Repeat for each option]
```

### Step 4: Compare Options (Decision Matrix)

**Create comparison table:**

| Criteria                | Option A | Option B | Option C | Winner   |
| ----------------------- | -------- | -------- | -------- | -------- |
| Effort (lower better)   | X hours  | Y hours  | Z hours  | [Option] |
| Impact (higher better)  | High     | Medium   | High     | [Option] |
| Risk (lower better)     | Low      | Medium   | Low      | [Option] |
| Time to Value           | Fast     | Slow     | Fast     | [Option] |
| Strategic Fit           | Strong   | Weak     | Strong   | [Option] |
| Constitution Compliance | ✅       | ⚠️       | ✅       | [Option] |

**Overall Score**: [Recommendation based on weighted criteria]

### Step 5: Make Recommendation

**Provide clear recommendation:**

```markdown
## Recommendation

**RECOMMENDED**: Option [X] - [Name]

**Rationale**:

1. [Primary reason - usually best balance of effort/impact/risk]
2. [Secondary reason - strategic fit, constitutional alignment]
3. [Third reason - enables future work, derisks unknowns]

**Trade-offs**:

- We gain: [benefits]
- We defer: [what we're not doing yet]
- We accept: [compromises or limitations]

**Alternative**: If [condition], consider Option [Y] instead because [reason]
```

### Step 6: Create Actionable Plan

**Break recommendation into concrete tasks:**

````markdown
## Implementation Plan

### Phase 1: [Name] (Estimated: [X hours])

**Tasks**:

1. [Task 1 - specific, actionable] (Est: [time])
   - Acceptance criteria: [how to know it's done]
   - Files affected: [file paths]

2. [Task 2] (Est: [time])
   - Acceptance criteria: [definition of done]
   - Files affected: [file paths]

[Continue for all tasks in phase]

**Validation Gate**: [How to verify Phase 1 is complete]

- [ ] [Checkpoint 1]
- [ ] [Checkpoint 2]

### Phase 2: [Name] (Estimated: [Y hours]) - OPTIONAL

[Only if multi-phase work]

### Next Actions (Start Immediately)

**First concrete step**:

```bash
# Command to run or file to create
[Exact command or code to start with]
```
````

**Why this first**: [Justification for starting here]

**Estimated completion**: [Timeframe for first task]

````

### Step 7: Identify Risks and Unknowns

**Call out what could go wrong:**

```markdown
## Risk Assessment

**Technical Risks**:
- [Risk 1]: [Impact if occurs] → Mitigation: [strategy]
- [Risk 2]: [Impact if occurs] → Mitigation: [strategy]

**Assumptions We're Making**:
- [Assumption 1] - Verify by: [how to validate]
- [Assumption 2] - Verify by: [how to validate]

**Unknowns to Research**:
- [ ] [Unknown 1] - Estimated research time: [X hours]
- [ ] [Unknown 2] - Estimated research time: [Y hours]

**Derisking Strategies**:
1. [Strategy 1 - e.g., create proof of concept first]
2. [Strategy 2 - e.g., parallel spike to validate assumption]
````

### Step 8: Generate Todo List Format (Optional)

**If user wants to start immediately, provide todo list:**

```markdown
## Ready-to-Use Todo List

Copy this to your task tracker:

- [ ] **[Task 1]** - [Brief description] (Est: [time])
  - Files: [file paths]
  - Done when: [acceptance criteria]

- [ ] **[Task 2]** - [Brief description] (Est: [time])
  - Files: [file paths]
  - Done when: [acceptance criteria]

[Continue for all tasks]

**Total Estimated Time**: [X hours/days]
**Validation**: [How to verify all tasks complete]
```

### Step 9: Save Planning Output (Optional)

**If user wants to preserve the planning decision:**

Suggest saving to the appropriate feature folder:

- **Feature-specific plans**: Save in the feature folder alongside related documentation
  - Example: `.specify/features/F008-hr-interview/planning/next-steps-YYYY-MM-DD.md`
  - Example: `.specify/features/F009-api-endpoints/planning/implementation-plan.md`
- **Why feature folders**:
  - Keeps planning decisions with the feature they relate to
  - Provides historical context for future changes
  - Makes it easy to find "why we chose approach X" later
  - Aligns with indexed feature documentation structure

- **Naming convention**:
  - `next-steps-YYYY-MM-DD.md` (for date-specific decisions)
  - `implementation-plan.md` (for initial feature planning)
  - `api-vs-ui-decision.md` (for specific decision records)

## Output Format

When planning next steps, structure your response like this:

````markdown
---

## Next Steps Planning: [Feature/Decision Name]

**Date**: [Current date]
**Context**: [Brief summary of what was just completed or current state]

---

### Current State Analysis

[Context findings from Step 1]

---

### Options to Evaluate

[Parsed options from Step 2]

---

### Option Evaluation

[Detailed evaluation from Step 3]

---

### Decision Matrix

[Comparison table from Step 4]

---

### Recommendation

[Clear recommendation from Step 5]

---

### Implementation Plan

[Actionable tasks from Step 6]

---

### Risk Assessment

[Risks and unknowns from Step 7]

---

### Next Actions

**Start with**:

```bash
[First command or file to create]
```
````

**Why**: [Justification]
**Timeline**: [When this could be complete]

---

````

## Markdown Formatting Requirements (CRITICAL)

To ensure clean, lint-compliant output:

- Add blank line before and after each heading
- Add blank line before and after each list (bullet or numbered)
- Add blank line before and after each code block
- Add blank line before and after each table
- Remove trailing spaces from all lines
- Avoid inline HTML unless necessary
- Use emojis conservatively: avoid in technical documentation, use clear text prefixes instead (e.g., [WARNING], [RECOMMENDED], [RISK])

Before presenting final output:

- Review document for proper spacing around all lists
- Verify all headings have blank lines before and after
- Check that all code blocks have blank lines before and after
- Remove any trailing whitespace
- Ensure consistent markdown syntax throughout

**RECURSIVE REQUIREMENT**: If this prompt generates output that itself creates markdown content (such as documentation, planning templates, or other prompts), those outputs MUST also include these same markdown formatting requirements to ensure linting standards propagate through all levels of generation.

## Git Status Requirements (CRITICAL)

When planning work that involves git commits, include git status verification:

**Pre-Commit Checklist**:

```bash
# Before staging
git status           # Review all changes
git diff --stat      # See modification summary

# After staging
git status           # Verify staged files
git diff --cached    # Review staged changes
````

**Post-Commit Verification**:

```bash
# After commit completes
git status           # MUST show "nothing to commit, working tree clean"
git log -1 --oneline # Verify commit message
```

**Why this matters**:

- Prevents incomplete commits (missing files)
- Catches unintended modifications
- Ensures clean checkpoints between iterations
- Makes git history reliable and atomic
- Provides clear state for next work phase

**Include in all planning output**:

- Add git status checks to task lists
- Include verification steps in validation gates
- Remind to check clean status after commits
- Document expected git state at each phase

## Constitutional Compliance (CRITICAL for Code-Related Planning)

If this project has a constitution file (`.specify/memory/constitution.md`), ensure all planning decisions comply with:

- **Core development principles** (Type Safety First, Test-First, Composable-First, Observable Development, Pragmatic Simplicity)
- **Tech stack governance** (approved dependencies, upgrade policies, architectural patterns)
- **Code quality standards** (testing coverage requirements, type safety rules)
- **Workflow processes** (feature specs, code review requirements, documentation standards)

Before finalizing recommendations:

- Check if constitutional principles apply to this planning decision
- Verify recommended approach aligns with documented standards
- Flag any deviations with justification and risk assessment
- Reference specific constitutional sections when relevant (e.g., "Per Constitution Section 2.1: Type Safety First...")

**RECURSIVE REQUIREMENT**: If this prompt generates planning output that affects code implementation, architecture decisions, or generates other prompts, those outputs MUST also include this constitutional compliance requirement to ensure governance standards propagate through all levels.

## Important Notes

- **Be decisive**: Provide clear recommendation, not "both options are good"
- **Be specific**: "Create InterviewChat.vue" beats "improve UI"
- **Be realistic**: Account for testing, documentation, integration time
- **Be incremental**: Prefer small validatable steps over big-bang delivery
- **Be risk-aware**: Call out assumptions and unknowns explicitly
- **Be constitutional**: Honor project principles and governance standards

## Example Scenarios

### Scenario 1: API vs UI Decision (Your Case)

**User input**:

"create a prompt for planning the next steps/feature requests. i.e. for next immediate tasks I want both
Option A: Add API Endpoints
Option B: Add UI Components"

**Expected workflow**:

1. **Understand current state**: Read recent commit (F008 service layer complete, 97 tests passing)
2. **Check constitution**: Read `.specify/memory/constitution.md` - principles apply
3. **Parse options**:
   - Option A: API endpoints (Postman testing, programmatic access)
   - Option B: UI components (chat interface, visual session management)
4. **Evaluate each**:
   - Option A: ~30 min effort, enables quick validation, low risk, Test-First aligned
   - Option B: ~1-2 hours effort, better UX, higher risk (frontend complexity), requires API anyway
5. **Compare**: Option A wins on "fastest validation" and "enables B"
6. **Recommend**: "Start with Option A (API endpoints), then Option B (UI) in Phase 2"
7. **Create plan**:
   - Phase 1: 5 API endpoints (~30 min)
   - Validation gate: Postman tests working
   - Phase 2: UI components (~2 hours)
   - First step: `create_file app/server/api/interview/start.post.ts`
8. **Identify risks**: "API design might change after UI feedback" → Mitigation: "Keep API flexible, use DTOs"

### Scenario 2: Feature Sequencing

**User input**:

"We just completed user authentication. Should we build: (A) Dashboard with analytics, (B) Notification system, (C) Admin panel?"

**Expected workflow**:

1. **Current state**: Authentication complete, need to add value
2. **Parse options**: 3 distinct features with different user benefits
3. **Evaluate**:
   - Dashboard: High user value, medium effort, enables data-driven decisions
   - Notifications: Medium value, low effort, quick win
   - Admin: Low immediate value (no admins yet), high effort
4. **Compare**: Dashboard wins on strategic value, Notifications wins on quick win
5. **Recommend**: "B (Notifications) for quick user-facing value, then A (Dashboard) for strategic win. Defer C until user base grows."
6. **Plan**:
   - Phase 1: Email notifications (3 days)
   - Phase 2: In-app notifications (2 days)
   - Phase 3: Dashboard MVP (5 days)
7. **Risks**: "Email deliverability unknown" → Mitigation: "Use SendGrid, test with test accounts first"

### Scenario 3: Technical Approach

**User input**:

"Should we use: (A) REST API with polling, (B) WebSockets for real-time, (C) Server-Sent Events?"

**Expected workflow**:

1. **Current state**: Need real-time updates for chat feature
2. **Check constitution**: Observable Development principle → need logging and error handling
3. **Evaluate**:
   - REST+polling: Simple, works everywhere, inefficient, constitutional compliance easy
   - WebSockets: True bidirectional, complex, firewall issues, requires robust error handling
   - SSE: Server-to-client only, simpler than WS, good browser support, constitutional compliance medium
4. **Compare**: SSE wins on "simplicity + real-time" balance
5. **Recommend**: "Option C (SSE) for MVP, upgrade to WebSockets if bidirectional needed"
6. **Plan**: Implement SSE endpoints, add Observable Development logging, test reconnection
7. **Risks**: "Browser compatibility" → Mitigation: "Test on target browsers, polyfill if needed"

## Usage Instructions

1. **Provide context** in `$ARGUMENTS`:
   - Describe options you're considering
   - Mention what was recently completed
   - Note any constraints or preferences

2. **Review the analysis**:
   - Check that context understanding is accurate
   - Verify evaluation criteria match your priorities
   - Question assumptions if something seems off

3. **Act on the recommendation**:
   - Start with the "Next Actions" section
   - Follow the phase-based plan
   - Validate at checkpoints before proceeding

4. **Iterate if needed**:
   - If unknowns emerge, re-run with updated context
   - If priorities change, re-evaluate options
   - If risks materialize, adjust plan

### Example Usage

**You provide**:

```

We just finished implementing the interview service layer (8 files, 97 tests passing).
Now we need to expose it. Options:

- API endpoints (quick, enables testing)
- UI components (better UX, takes longer)
  Which should we do first?

```

**AI generates**:

````markdown
## Next Steps Planning: Interview System Exposure

### Current State Analysis

- ✅ Service layer complete (8 services, 2,840 lines)
- ✅ 97/97 tests passing
- ✅ Constitution-compliant (Type Safety, Test-First)
- ❌ No API exposure
- ❌ No UI

### Options to Evaluate

**Option A: API Endpoints**

- 5 endpoints (start, respond, get, cancel, list)
- Enables: Postman testing, programmatic access

**Option B: UI Components**

- Chat interface, session dashboard
- Enables: Visual testing, better UX

### Decision Matrix

| Criteria         | Option A  | Option B | Winner |
| ---------------- | --------- | -------- | ------ |
| Effort           | 30 min    | 2 hours  | A      |
| Time to Value    | Immediate | 2+ hours | A      |
| Validation Speed | Fast      | Slow     | A      |
| User Experience  | None      | High     | B      |
| Dependencies     | None      | Needs A  | A      |

### Recommendation

**RECOMMENDED**: Option A (API Endpoints) first, then Option B (UI)

**Rationale**:

1. API enables immediate validation via Postman
2. UI needs API anyway (dependency)
3. Faster path to testing the service layer
4. Constitutional alignment: Test-First principle

**Plan**:

Phase 1: API Endpoints (~30 min)

- Create 5 API route files
- Validation: Postman collection works

Phase 2: UI Components (~2 hours)

- InterviewChat.vue component
- Session dashboard page

### Next Actions

**Start with**:

```bash
create_file app/server/api/interview/start.post.ts
```
````

**Why**: Enables first test case (starting an interview)
**Timeline**: 30 minutes to complete Phase 1

```

### Tips for Best Results

- **Be specific about context**: "Just completed F008" is better than "need to add features"
- **State constraints explicitly**: "Need this done today" changes recommendations
- **Include recent commit info**: Helps understand what's fresh in codebase
- **Mention constitution if project has one**: Ensures alignment with governance
- **Ask for alternatives**: "What if we had 1 week instead of 1 day?"
```
