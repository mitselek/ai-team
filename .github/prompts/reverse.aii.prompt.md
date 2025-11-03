# Reverse AII Prompt - Interview-Based System Prompt Generator

## Purpose

Generate an optimized system prompt through an iterative interview process, tailored for the AI model you are currently using.

## Usage

```
/reverse.aii <YOUR_GOAL>
```

Example:
```
/reverse.aii Create a system prompt for an AI that can effectively rewrite all my emails and newsletter into a more clear and simple writing style
```

## The Prompt

"I want you to interview me, asking one question at a time. Each answer I provide, should inform the next question you ask. The intent of you interviewing me is to end with a system prompt that is optimized for the AI model you are.

My goal is: {{goal}}

**Important - Constitutional Awareness**: Before finalizing the system prompt, check if this is for a code-related task (code generation, review, refactoring, bug fixing, implementation, etc.). If so:

1. **Check for project constitution**: Look for `.specify/memory/constitution.md` in the repository
2. **If constitution exists and applies to the task**:
   - Ask me about constitutional principles that should be included
   - Incorporate relevant principles into the system prompt (Type Safety, Test-First, Composable-First, Observable Development, Pragmatic Simplicity, etc.)
   - Add a validation step in the prompt to check constitutional compliance
   - Include reference to the constitution file in the final prompt
3. **If no constitution or task is non-code-related**: Proceed with general best practices

**Important - Markdown Quality Standards**: If the system prompt will generate markdown output (documentation, reports, issues, PRs), include these requirements in the final prompt:

1. **Markdown Formatting Requirements**:
   - Use blank lines before and after all headings
   - Use blank lines before and after all lists
   - Use blank lines before and after all code blocks
   - Remove trailing spaces from lines
   - Avoid inline HTML unless necessary
   - **Use emojis conservatively**: Avoid emojis in commit messages, code comments, console logs, and formal documentation (GitHub issues, PRs, technical docs). Emojis can interfere with grep/search, appear unprofessional in some contexts, and may not render consistently. Use clear text prefixes instead (e.g., `[ERROR]`, `[INFO]`, `[WARNING]`).

2. **Include validation step**: Add to the prompt: 'Review output for markdown linting issues and fix before presenting'

3. **Show examples**: Include properly formatted markdown in any example outputs

**Important - Recursive Requirement**: If the system prompt you're creating might itself be used to generate OTHER prompts or templates (meta-prompt generation), include this clause in the final prompt:

'If you generate a prompt or template that itself produces markdown content or code, that output MUST also include:
- These same markdown formatting requirements
- Constitutional compliance requirements (if code-related)
- This recursive propagation clause itself

This ensures quality standards propagate through all levels of generation.'

The final system prompt should ensure output complies with documented project standards, markdown quality guidelines, and includes recursive propagation for derivative content."

## Variable Substitution

- `{{goal}}` - The user's goal for the system prompt (provided as the command argument)
