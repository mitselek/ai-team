# Editorial Task: Fix Emoji and Em-Dash Usage

You are tasked with reviewing and fixing emoji and em-dash usage across documentation files in the AI Team project.

## Context

This project follows professional documentation standards. Emojis and em-dashes should be used sparingly, only when truly adding value.

## Your Mission

Review all markdown documentation files and fix excessive/unnecessary usage of:

- **Emojis** (✅ ❌ 🎉 ⚠️ 💡 etc.)
- **Em-dashes** (—)

## Guidelines

### When Emojis Are Acceptable

- ✅ In lists to indicate status (✅ pass, ❌ fail, ⚠️ warning)
- ✅ In headings for visual scanning (when used consistently)
- ❌ In prose/body text
- ❌ In commit messages (never)
- ❌ Excessive decoration (more than 3 per section)

### When Em-Dashes Are Acceptable

- ✅ For parenthetical thoughts: "The code — which was written yesterday — works well"
- ❌ Instead of colons: "Three items — x, y, z" (use colon)
- ❌ Instead of regular hyphens in compound words
- ❌ In lists/bullet points (use regular hyphen)

### Replacement Strategy

- Replace decorative emojis with clear text
- Replace em-dashes with:
  - Colons (:) for introducing lists/explanations
  - Regular hyphens (-) for ranges and compounds
  - Parentheses or commas for parenthetical phrases
  - Keep em-dashes only when grammatically appropriate

## Your Process

1. **Find documentation files**: `find . -name "*.md" -not -path "./node_modules/*" -not -path "./.nuxt/*"`
2. **Review each file** for emoji/em-dash usage
3. **Assess necessity**: Is this emoji/em-dash truly adding value?
4. **Edit files** that have excessive usage
5. **Stage changes**: `git add <files>`
6. **Commit**: Use format `docs(style): fix emoji/em-dash usage in <scope>`

## Example Edits

### Before

```markdown
## 🎉 Amazing Feature! 🚀

This is super cool — it does three things — first, second, and third.

**What Worked Well:**

- ✅ Fast ⚡
- ✅ Reliable 💪
- ✅ Easy to use 😊
```

### After

```markdown
## Amazing Feature

This is super cool: it does three things (first, second, and third).

**What Worked Well:**

- ✅ Fast
- ✅ Reliable
- ✅ Easy to use
```

## Files to Check

Priority:

- README.md
- docs/\*.md
- .specify/memory/\*.md
- .github/\*_/_.md

## Commit Strategy

Create one commit per file type or logical grouping:

- `docs(style): fix emoji/em-dash usage in README`
- `docs(style): fix emoji/em-dash usage in constitution and lessons-learned`
- `docs(style): clean up prompt documentation formatting`

## Quality Standards

- Keep semantic meaning intact
- Maintain list formatting consistency
- Don't over-correct: some emojis in status lists are fine
- Focus on readability and professionalism
- Preserve markdown linting compliance

## Execute

Start by scanning all markdown files, then fix and commit those that need cleanup.

**Goal**: Professional, scannable documentation without visual clutter.
**Approach**: Surgical edits, not wholesale removal.
