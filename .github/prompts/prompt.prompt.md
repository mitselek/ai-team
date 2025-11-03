---
description: Research best practices and generate optimized AI prompts (system prompts, instruction templates) for specific use cases
---

# Prompt Engineering Assistant

The user input to you can be provided directly by the agent or as a command argument - you **MUST** consider it before proceeding with the prompt (if not empty).

User input:

$ARGUMENTS

This command helps you research prompt engineering best practices and create high-quality AI prompts (system prompts, instruction templates, custom GPT instructions) for specific tasks and use cases.

## What This Command Does

This is NOT for creating slash-commands like `/specify` or `/implement`. Instead, it helps you:

- **Research** prompt engineering best practices for specific AI models
- **Generate** system prompts (like ChatGPT custom instructions)
- **Create** reusable prompt templates for common tasks
- **Optimize** existing prompts for clarity and effectiveness
- **Document** prompt libraries for your team

Example use cases:
- "Create a system prompt for reviewing code quality"
- "Generate a prompt that helps write technical documentation"
- "Optimize this prompt for email rewriting" (like the screenshot example)
- "Research best practices for prompting Claude for data analysis"

## Workflow

**CRITICAL FIRST STEP**: Check if `$ARGUMENTS` is empty or contains only whitespace.

- **If empty**: Stop immediately and provide helpful guidance:
  - "Please provide a description of the prompt you want to create."
  - Give examples: "For example: 'Create a prompt for code review' or 'Generate a prompt that helps write documentation'"
  - Do NOT proceed with the workflow below
  
- **If not empty**: Proceed with steps 0-8 below

Given a prompt request from the user, do this:

0. **Determine current date**:
   - Use system tools to get the current date
   - This date will be used in research findings and recommendations
   - Always include the date explicitly in your research output

1. **Understand the use case**:
   - What task should the AI perform? (review code, write emails, analyze data, etc.)
   - Which AI model will use this prompt? (GPT-4, Claude, GitHub Copilot, etc.)
     - **Default**: If not specified by user, assume the same model that is executing this command (GitHub Copilot in most cases)
     - **Important**: GitHub Copilot is a proxy service - the underlying LLM (GPT-4, Claude, etc.) cannot be directly detected. When defaulting to "GitHub Copilot":
       - Generate prompts with general best practices that work across models
       - Mention in recommendations that the user may want to optimize for their specific underlying model if known
       - If the task is highly model-specific, suggest asking the user which model they're using
     - If user explicitly specifies a different model (e.g., "for Claude", "using GPT-4"), use that instead
     - If user says "any", "general", or "most appropriate":
       - **For "any" or "general"**: Create a model-agnostic prompt (no "You are..." GPT-style, no XML Claude-style, no code comments Copilot-style)
       - **For "most appropriate"**: Analyze the task type and recommend the most suitable model with reasoning (e.g., "For email rewriting, I recommend GPT-4 because...")
   - What is the target audience? (developers, writers, analysts, etc.)
   - What format is needed? (system prompt, few-shot examples, instruction template)
   - Are there constraints? (tone, length, style, safety requirements)
   - **SPECIAL CASE**: If the request mentions creating a "slash-command" or references commands like `/test`, `/review`, etc., recognize this as Scenario 4 (Slash-Command Creation) and follow that workflow instead

1b. **Check for project constitution** (if task is code-related):
   
   **Before drafting any code-related prompt**, check if the project has a constitution:
   
   - Look for `.specify/memory/constitution.md` in the repository
   - If it exists, read and understand the core principles:
     - Development principles (Type Safety, Test-First, Composable-First, etc.)
     - Tech stack governance (approved dependencies, patterns)
     - Workflow requirements (spec-kit processes, code review)
     - Quality standards (testing coverage, documentation)
   
   **Determine if constitutional principles apply**:
   - **Code generation/review**: YES - must follow Type Safety, Composable-First, Test-First
   - **Bug fixing**: YES - must follow Test-First (write failing test first), Observable Development
   - **Architecture/design**: YES - must follow Pragmatic Simplicity, tech stack governance
   - **Documentation**: MAYBE - if technical docs, follow project conventions
   - **Email writing/content**: NO - constitution doesn't apply to non-code tasks
   
   **If constitution applies**, the generated prompt MUST:
   - Reference the constitution file explicitly
   - Embed relevant constitutional principles in the prompt's guidelines
   - Add a validation step to check constitutional compliance
   - Include the recursive constitution requirement (see step 7, point 6)
   
   **If no constitution exists**:
   - Proceed with general best practices
   - Optionally suggest creating a constitution if project is code-heavy

2. **Research best practices**:
   
   Always research and consider prompt engineering principles for the target AI model and task type (as of the current date determined in step 0). **Present findings BEFORE drafting the prompt.**
   
   **IMPORTANT**: When researching, be aware of your knowledge cutoff date and clearly state which practices are established vs emerging. For newer models or recent developments, acknowledge any limitations in your knowledge.
   
   **If user mentions models/features newer than your knowledge cutoff** (e.g., GPT-5, ES2027):
   - Explicitly state your knowledge cutoff date in research findings
   - Add caveat: "GPT-5 may be newer than my knowledge cutoff (April 2024). I'll provide general GPT best practices, but specific GPT-5 features may differ."
   - Recommend user verify against latest official documentation
   - Still provide best-effort prompt based on general principles
   
   **General principles** (all models):
   - **Clarity**: Be specific and unambiguous
   - **Context**: Provide necessary background information
   - **Structure**: Use clear sections, numbered steps, examples
   - **Constraints**: Define boundaries, tone, format expectations
   - **Examples**: Include few-shot examples when helpful
   
   **Model-specific considerations**:
   
   *For ChatGPT/GPT-4*:
   - Use "You are..." role definitions
   - Leverage system message vs user message distinction
   - Consider token limits (context window)
   - Use markdown formatting for structure
   
   *For Claude (Anthropic)*:
   - Emphasize task decomposition
   - Use XML tags for structure when helpful (e.g., `<analysis>`, `<findings>`)
   - Leverage "thinking step-by-step" patterns
   - Consider Constitutional AI principles (helpfulness, harmlessness, honesty)
   - Mention large context window advantage (200k+ tokens)
   
   *For GitHub Copilot*:
   - Focus on code context and intent
   - Use comments to guide generation
   - Leverage file/project context
   - Be specific about language, framework, patterns
   
   *For Model-Agnostic/General Prompts* (when user says "any" or "general"):
   - **Avoid** model-specific syntax:
     - NO "You are..." role definitions (GPT-specific)
     - NO XML tags (Claude-specific)
     - NO code comment instructions (Copilot-specific)
   - Use **universal principles**:
     - Clear task description
     - Numbered steps for sequential tasks
     - Bullet points for criteria lists
     - Examples when helpful
     - Format expectations (markdown, JSON, plain text)
   - Note in output: "This prompt is designed to work with most AI models (GPT-4, Claude, Copilot, etc.)"
   
   **Best practices by task type**:
   
   *Writing/Editing* (emails, docs, content):
   - Define tone (formal, casual, technical, friendly)
   - Specify audience and purpose
   - Set length constraints
   - Provide style guidelines or examples
   
   *Code Review/Analysis*:
   - List specific aspects to check (security, performance, style, etc.)
   - Define severity levels (critical, warning, suggestion)
   - Specify output format (checklist, report, inline comments)
   - Include language/framework conventions
   
   *Data Analysis*:
   - Specify analysis goals (insights, patterns, anomalies)
   - Define output format (summary, visualization suggestions, raw findings)
   - Set data privacy/security constraints
   - Request step-by-step reasoning when needed
   
   *Creative/Brainstorming*:
   - Set quantity targets ("generate 10 ideas")
   - Define constraints (feasibility, budget, time)
   - Request diverse perspectives
   - Ask for reasoning behind suggestions

   **Present research findings** in this format:
   
   ```markdown
   ## Prompt Engineering Research
   
   **Topic**: [Specific topic researched]
   **For**: [Target AI model or task type]
   **Research Date**: [Current date from step 0]
   **Knowledge Cutoff**: [Your knowledge cutoff date]
   
   ### Key Findings
   
   1. [Finding 1 with explanation]
   2. [Finding 2 with explanation]
   3. [Finding 3 with explanation]
   
   ### Recommendations for This Prompt
   
   Based on research:
   - [Recommendation 1]
   - [Recommendation 2]
   - [Recommendation 3]
   
   ### Context & Caveats
   
   - [Context about where these practices come from]
   - [Any limitations or considerations]
   - [Note if model/technique is newer than your knowledge cutoff]
   ```

3. **Draft the prompt**:
   
   Follow this structure:
   
   ```markdown
   ## [Prompt Name/Title]
   
   **Purpose**: [One sentence describing what this prompt does]
   
   **Target AI**: [GPT-4, Claude, Copilot, etc.]
   
   **Use Case**: [When to use this prompt]
   
   ---
   
   ### System Prompt / Instructions
   
   [The actual prompt content goes here]
   
   You are [role definition]...
   
   Your task is to [specific task]...
   
   Guidelines:
   - [Guideline 1]
   - [Guideline 2]
   - [Guideline 3]
   
   [Optional: Include examples, constraints, format requirements]
   
   ---
   
   ### Example Usage
   
   **Input**:
   ```
   [Example input from user]
   ```
   
   **Expected Output**:
   ```
   [Example of desired response]
   ```
   
   ---
   
   ### Tips for Best Results
   
   - [Tip 1]
   - [Tip 2]
   - [Tip 3]
   ```

4. **Optimize the prompt**:
   
   Apply these optimization techniques:
   
   **Clarity improvements**:
   - Replace vague words ("good", "better", "improve") with specific criteria
   - Use imperative verbs ("Analyze", "Identify", "Generate", "Review")
   - Break complex tasks into numbered steps
   - Add examples to clarify ambiguous instructions
   
   **Structure improvements**:
   - Use headings and sections for long prompts
   - Number steps for sequential tasks
   - Use bullet points for lists of criteria
   - Add whitespace for readability
   
   **Context improvements**:
   - Include relevant background information upfront
   - Define domain-specific terms
   - Specify target audience or use case
   - Reference related work or standards when applicable
   
   **Constraint improvements**:
   - Set explicit length limits (word count, character count)
   - Define tone and style requirements
   - Specify format requirements (markdown, JSON, plain text)
   - Add safety boundaries (no personal info, no harmful content)
   
   **Example improvements**:
   - Add 2-3 few-shot examples for complex tasks
   - Show both good and bad examples (with explanations)
   - Include edge cases in examples
   - Use realistic, domain-specific examples

5. **Test and validate** (conceptually):
   
   Before finalizing, consider:
   - Is the task clearly defined?
   - Would a human understand what's expected?
   - Are there ambiguities that could lead to unexpected output?
   - Does it include necessary context?
   - Are constraints and format clear?
   - Would examples help clarify expectations?

6. **Save the prompt** (if requested):
   
   Suggest saving to an appropriate location:
   - `docs/prompts/` for general team prompts
   - `.github/prompts/` only if it's a slash-command (rare)
   - User's personal notes or prompt library
   
   Use a descriptive filename:
   - `code-review-assistant.md`
   - `email-rewriter-gpt4.md`
   - `technical-doc-writer.md`

7. **Fix markdown linting errors** (if any occur after saving):
   
   When creating prompts, markdown linters may flag formatting issues. Common linting errors and fixes:
   
   **MD032/blanks-around-lists**: Lists should be surrounded by blank lines
   - **Fix**: Add blank line before and after each list
   
   **MD022/blanks-around-headings**: Headings should be surrounded by blank lines
   - **Fix**: Add blank line before and after each heading
   
   **MD031/blanks-around-fences**: Fenced code blocks should be surrounded by blank lines
   - **Fix**: Add blank line before and after each code block
   
   **MD033/no-inline-html**: Inline HTML detected
   - **Context**: For Claude prompts using XML tags, this is intentional and acceptable
   - **Fix**: Either ignore (XML tags are a feature), or use code blocks to escape XML
   
   **MD026/no-trailing-punctuation**: Trailing punctuation in heading
   - **Fix**: Remove trailing colons, periods, or question marks from headings
   
   **MD009/no-trailing-spaces**: Trailing spaces at end of lines
   - **Fix**: Remove trailing spaces (except when intentional for markdown line breaks)
   
   **When to fix vs ignore**:
   - **Always fix**: Spacing issues (MD032, MD022, MD031, MD009) - improves readability
   - **Consider ignoring**: Inline HTML (MD033) if XML tags are essential to the prompt (e.g., Claude prompts)
   - **Context-dependent**: Heading punctuation (MD026) - fix unless punctuation is semantically important
   
   **After saving**, if linting errors appear:
   1. Review the errors reported by the tool
   2. Offer to fix formatting issues automatically
   3. Explain any intentional violations (e.g., XML tags in Claude prompts)
   4. Let user decide whether to fix or accept the warnings
   
   **Conservative Emoji Usage**:
   - **Avoid emojis** in commit messages, code comments, console logs, and formal documentation (GitHub issues, PRs, technical docs)
   - **Reason**: Emojis can interfere with grep/search, appear unprofessional in some contexts, and may not render consistently across platforms
   - **Alternative**: Use clear text prefixes instead (e.g., `[ERROR]`, `[INFO]`, `[WARNING]`, `[BUG-001]`, `[FIX]`)
   - **Exception**: Emojis may be acceptable in user-facing UI text, marketing content, or casual documentation where appropriate
   - **When creating prompts**: Include this emoji guidance if the prompt will generate code, commits, logs, or formal documentation
   
   **RECURSIVE REQUIREMENT - CRITICAL**:
   
   **If the prompt you're creating will itself generate markdown output** (like a documentation generator, feedback formalizer, report creator, or any prompt-generating prompt), you MUST ensure the linting requirement propagates through ALL levels of recursion:
   
   1. **Include linting requirements in the generated prompt**:
      - Add a "Markdown Formatting Requirements" section in the prompt's output format specification
      - Specify markdown best practices (blank lines around lists, headings, code blocks)
      - Include examples of properly formatted markdown
   
   2. **Teach the prompt to generate lint-compliant output**:
      - In the "Output Structure" or "Format Requirements" section, add:
        - "Use blank lines before and after all lists"
        - "Use blank lines before and after all headings"
        - "Use blank lines before and after all code blocks"
        - "Remove trailing spaces from lines"
        - "Avoid inline HTML unless necessary"
        - "Use emojis conservatively: avoid in commit messages, code comments, console logs, and formal documentation. Use clear text prefixes instead (e.g., [ERROR], [INFO], [WARNING])."
   
   3. **Add validation step to the workflow**:
      - If the prompt has a workflow (steps 1, 2, 3...), add a final step:
        - "Review output for markdown linting issues and fix before presenting"
   
   4. **Include in examples**:
      - Show properly formatted markdown in all example outputs
      - Demonstrate correct spacing in sample responses
   
   5. **PROPAGATE THE RECURSIVE REQUIREMENT ITSELF** (Critical for infinite recursion):
      - If the prompt you're creating might be used to generate OTHER prompts include this instruction in the prompt:
        - "If you generate a prompt, you MUST include these same markdown formatting requirements in that prompt, ensuring this linting standard propagates recursively through all levels."
      - This creates a self-propagating linting requirement that works at any depth
   
   6. **PROPAGATE CONSTITUTION AWARENESS** (Critical for project alignment):
      - **When creating prompts for code-related tasks** (code review, implementation, refactoring, bug fixing, etc.), ensure constitutional compliance:
        - Include reference to project constitution if available (`.specify/memory/constitution.md`)
        - Embed key constitutional principles in the prompt (Type Safety, Composable-First, Test-First, Observable Development, Pragmatic Simplicity)
        - Add validation step: "Verify output complies with project constitution"
      - **Recursive propagation clause**: If the prompt you're creating might generate OTHER prompts that affect code or architecture, include this instruction:
        - "If you generate a prompt that itself generates code-related output (implementations, reviews, refactorings), that prompt MUST also reference and comply with the project's constitutional principles as defined in `.specify/memory/constitution.md`, ensuring governance standards propagate through all levels."
      - **For this esmuseum-map-app project specifically**, always check if `.specify/memory/constitution.md` exists and include these principles:
        - Type Safety First (avoid `any`, document TypeScript patterns)
        - Composable-First Development (Vue 3 composables, single responsibility)
        - Test-First Development (TDD, write tests before implementation)
        - Observable Development (structured logging, error boundaries)
        - Pragmatic Simplicity (YAGNI, optimize after measuring)
        - Strategic Integration Testing (focus on critical paths)
        - API-First Server Design (clean routes, proper error codes)
      - **Example constitution-aware clause** to include in generated prompts:
        ```markdown
        **Constitutional Compliance** (if applicable):
        
        If this project has a constitution file (`.specify/memory/constitution.md`), ensure all generated output complies with:
        
        - Core development principles (Type Safety, Test-First, etc.)
        - Tech stack governance (approved dependencies, upgrade policies)
        - Code quality standards (testing coverage, type safety requirements)
        - Workflow processes (feature specs, code review requirements)
        
        Before finalizing output:
        
        - Check if constitutional principles apply to this task
        - Verify output aligns with documented standards
        - Flag any deviations with justification
        - Reference specific constitutional sections when relevant
        
        **RECURSIVE REQUIREMENT**: If this prompt generates other prompts that affect code or architecture, those prompts MUST also include this constitutional compliance requirement.
        ```
   
   **Example of fully recursive linting requirement**:
   
   If creating a prompt that generates reports, include this in its format section:
   
   ```markdown
   **Markdown Formatting Requirements** (CRITICAL):
   
   To ensure clean, lint-compliant output:
   
   - Add blank line before and after each heading
   - Add blank line before and after each list (bullet or numbered)
   - Add blank line before and after each code block
   - Remove trailing spaces from all lines
   - Avoid inline HTML unless necessary for tables
   
   Before presenting final output:
   
   - Review document for proper spacing around all lists
   - Verify all headings have blank lines before and after
   - Check that all code blocks have blank lines before and after
   - Remove any trailing whitespace
   - Ensure consistent markdown syntax throughout
   
   **RECURSIVE REQUIREMENT**: If this prompt generates output that itself creates markdown content (such as documentation generators, report templates, or other prompts), those outputs MUST also include these same markdown formatting requirements to ensure linting standards propagate through all levels of generation.
   ```
   
   **Why this matters**:
   
   Without the recursive propagation clause, linting requirements stop after one generation. With it, any prompt created by a prompt you create will also enforce linting, creating a self-sustaining chain of quality standards that works at infinite depth.
   
   **Test for recursion completeness**:
   
   Ask yourself: "If someone uses the prompt I'm creating to make another prompt, and that prompt is used to make another prompt, will markdown linting still be enforced at level 3, 4, or N?"
   
   - If NO: Add the recursive propagation clause
   - If YES: The recursive requirement is complete

8. **Provide usage guidance**:
   
   Explain how to use the prompt:
   - Copy/paste as system message (ChatGPT custom instructions)
   - Use as prefix in conversation
   - Adapt for specific context
   - Iterate based on results

## Example Scenarios

### Scenario 1: Email Rewriting (like the screenshot)

**User request**: 
"Create a system prompt for ChatGPT-5 that rewrites my email and newsletter drafts to improve them for clarity and simplicity"

**Response approach**:
1. Research: Best practices for email writing and prompt engineering (as of October 2025), clarity/simplicity guidelines
2. Present research findings (key principles for email rewriting, acknowledge if GPT-5 is newer than knowledge cutoff)
3. Generate prompt with:
   - Clear role definition ("You are an expert email editor...")
   - Specific goals (clarity, simplicity, conciseness)
   - Guidelines for rewriting (active voice, short sentences, clear structure)
   - Format expectations (preserve greeting/closing, maintain professional tone)
   - Examples of before/after rewrites
4. Provide usage tips (paste original draft, review suggestions, maintain voice)

### Scenario 2: Code Review Assistant (with Constitution)

**User request**:
"/prompt Create a prompt for reviewing Vue 3 components for best practices"

**Response approach**:
1. **Check for constitution**: Read `.specify/memory/constitution.md` - found! Principles apply to code review.
2. **Research**: Vue 3 best practices (as of October 2025), Composition API patterns, common pitfalls
3. **Present research findings** (Vue 3 maturity status, Composition API patterns, TypeScript integration, note constitutional requirements)
4. **Generate prompt** covering:
   - **Constitutional principles first**:
     - Type Safety First (check for `any` usage, TypeScript patterns)
     - Composable-First (single responsibility, testability)
     - Test-First Development (test coverage requirements)
     - Observable Development (error boundaries, logging)
   - **Vue 3 specific patterns**:
     - Reactivity patterns (ref vs reactive)
     - Component composition (props, emits, slots)
     - Performance (computed, watch, unnecessary re-renders)
     - Accessibility (ARIA labels, keyboard nav)
   - **Validation step**: "Verify component complies with `.specify/memory/constitution.md` principles"
   - **Recursive requirement**: Include constitutional compliance clause for any derivative prompts
5. **Include checklist format** for reviews with constitutional gates
6. **Add examples** of good/bad patterns that align with/violate constitution

### Scenario 3: Documentation Writer

**User request**:
"/prompt Generate a prompt that helps write API documentation"

**Response approach**:
1. Research: API documentation standards (as of October 2025) - OpenAPI, REST best practices
2. Present research findings (standard documentation structure, developer needs, current industry standards)
3. Generate prompt with:
   - Structure template (endpoint name, method, parameters, response, examples)
   - Style guidelines (clear, concise, developer-friendly)
   - Required sections checklist
   - Example template filled out
4. Show how to use iteratively (describe endpoint, get doc template, refine)

### Scenario 4: Slash-Command Creation (Advanced/Rare)

**User request**:
"/prompt Create a slash-command prompt for /test that runs Vitest and provides structured test reports"

**Response approach**:
1. **Recognize this is a special case**: Creating workflow automation, not a regular prompt
2. **Study existing patterns**: Read `.github/prompts/specify.prompt.md`, `implement.prompt.md`, `plan.prompt.md`
3. **Identify workflow requirements**:
   - What script needs to run? (prerequisite checks, test execution)
   - What context is needed? (test files, configuration, previous results)
   - What artifacts are produced? (test reports, coverage data)
   - What are the phases? (setup, execution, reporting)
4. **Generate slash-command prompt** following the established pattern:
   ```markdown
   ---
   description: Brief description of the slash-command
   scripts:
     sh: scripts/bash/test-runner.sh --json
     ps: scripts/powershell/test-runner.ps1 -Json
   ---
   
   # [Command Name]
   
   User input:
   
   $ARGUMENTS
   
   Given [context], do this:
   
   1. Run `{SCRIPT}` from repo root and parse JSON output
   2. [Load necessary context files]
   3. [Execute workflow phases]
   4. [Validate and report completion]
   ```
5. **Specify script requirements**: What the bash/PowerShell script should do
6. **Add safety checks**: Error handling, validation gates, risk assessment
7. **Document usage**: When to use this vs other commands
8. **Note**: Emphasize this goes in `.github/prompts/`, requires script creation, and needs VS Code extension configuration

## Output Format

When creating a prompt, present it like this:

```markdown
---

## [Prompt Title]

**Purpose**: [Brief description]

**Target AI Model**: [GPT-4, Claude, etc.]

**Recommended Location**: `docs/prompts/[filename].md`

---

### The Prompt

[Full prompt content here, ready to copy/paste]

---

### Usage Instructions

1. [Step 1: How to use this prompt]
2. [Step 2: What to provide as input]
3. [Step 3: How to iterate/refine]

### Example

**You provide**:
```
[Example input]
```

**AI generates**:
```
[Example output]
```

### Tips for Best Results

- [Tip 1]
- [Tip 2]
- [Tip 3]

---
```

## Important Notes

- **This is NOT for slash-commands**: Use this for general AI prompts, not workflow automation
- **Iterate**: Prompts often need refinement based on actual results
- **Context matters**: Same prompt may work differently on different models
- **Keep it simple**: Start simple, add complexity only if needed
- **Test in practice**: The best prompt is one that works for your specific use case

## Meta Note

Yes, this prompt itself is an example of what you might create with `/prompt` - a structured instruction set for an AI to follow. The difference is:

- **Slash-commands** (like `/specify`, `/implement`) = Workflow automation in your project
- **Regular prompts** (created with this tool) = Task-specific AI instructions for any use case
