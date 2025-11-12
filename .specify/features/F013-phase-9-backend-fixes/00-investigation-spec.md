# F013 Phase 9: Investigation & Fix Specification

**Phase:** 2 - SPECIFY
**Created:** 2025-11-12

---

## Phase 2: SPECIFY

### Investigation Map

#### Code Locations to Review

```text
app/server/api/interview/
├── start.post.ts                    # Interview creation
└── [id]/
    └── respond.post.ts              # ⚠️ PRIMARY SUSPECT - Async handling

app/server/services/interview/
├── workflow.ts                      # ⚠️ State machine & orchestration
├── hr-specialist.ts                 # ⚠️ LLM prompt & response handling
├── analyzer.ts                      # Response analysis
├── prompt-builder.ts                # Context building
└── types.ts                         # Type definitions

app/server/services/llm/
├── gemini.ts                        # ⚠️ LLM integration layer
└── streaming.ts (if exists)         # Streaming implementation
```

**Priority:** Files marked ⚠️ are primary investigation targets.

---

## Issue #3: Async Channel Closure Errors

### Severity: 🔴 Critical

### Reproduction Steps

1. Start interview at `/interviews`
2. Send message to Marcus
3. Open browser console (F12)
4. Observe errors appear in groups of 3:

   ```text
   Uncaught (in promise) Error: A listener indicated an asynchronous
   response by returning true, but the message channel closed before
   a response was received
   ```

### Investigation Checklist

#### Step 1: Review Respond Endpoint

File: `app/server/api/interview/[id]/respond.post.ts`

- [ ] Check if all async operations are properly awaited
- [ ] Verify response returned after async work completes
- [ ] Check error handling - are errors caught and handled?
- [ ] Look for promise chains without proper await
- [ ] Check if response sent before LLM call completes

**Specific patterns to check:**

```typescript
// ❌ BAD - No await
const result = someAsyncFunction()
return result

// ❌ BAD - Fire-and-forget
someAsyncFunction()
return { status: 'ok' }

// ✅ GOOD - Properly awaited
const result = await someAsyncFunction()
return result
```

#### Step 2: Review Workflow Service

File: `app/server/services/interview/workflow.ts`

- [ ] Check `handleInterviewResponse()` or similar function
- [ ] Verify all LLM calls are awaited
- [ ] Check if state updates happen before or after LLM
- [ ] Look for timeout handling
- [ ] Check error propagation

#### Step 3: Review LLM Integration

File: `app/server/services/llm/gemini.ts`

- [ ] Check timeout configuration
- [ ] Verify streaming vs non-streaming mode
- [ ] Check if response promise resolves properly
- [ ] Look for connection/channel management
- [ ] Check error handling and retries

### Fix Specification

#### Expected Behavior

- Async operations complete before response sent
- Errors caught and handled gracefully
- No uncaught promise rejections
- Proper timeout handling

#### Fix Validation

```typescript
// Add logging to trace execution:
log.info('Starting LLM call')
const response = await llmService.generateResponse(prompt)
log.info('LLM call completed', { responseLength: response.length })
return response
```

Test:

1. Send message in interview
2. Check console: No async channel errors
3. Check server logs: LLM call starts and completes
4. Response appears in UI

---

## Issue #1: Message Truncation

### Severity: 🟡 High

### Reproduction Steps

1. Complete interview through several exchanges
2. Observe Marcus's responses end mid-sentence
3. Example: Response ends with "5" instead of "5. Documentation..."

### Evidence

Session: `cb8f6b3b-7aa0-4873-8491-61ab80d2eea9`
Message: `c0bc7c9d-1dad-4790-9a9c-f17dccced3d1`

```json
{
  "message": "...and expertise in configuration management...\n\n5"
}
```

### Investigation Checklist

#### Step 1: Check Token Limits

File: `app/server/services/llm/gemini.ts`

- [ ] Find `maxOutputTokens` or similar config
- [ ] Current value: **\_**
- [ ] Check if responses hit limit
- [ ] Review Gemini API token limits

**Look for:**

```typescript
const generationConfig = {
  maxOutputTokens: 1024, // ⚠️ May be too low
  temperature: 0.7
  // ...
}
```

#### Step 2: Check Streaming Implementation

- [ ] Is streaming enabled?
- [ ] Are all chunks being concatenated?
- [ ] Is there a buffer overflow?
- [ ] Are chunks being processed in order?

**Streaming patterns:**

```typescript
// ❌ BAD - Chunks dropped
let response = ''
stream.on('data', (chunk) => {
  response = chunk.text // Overwrites instead of appends!
})

// ✅ GOOD - Proper concatenation
let response = ''
stream.on('data', (chunk) => {
  response += chunk.text // Appends
})
```

#### Step 3: Check Response Extraction

File: `app/server/services/interview/hr-specialist.ts`

- [ ] How is text extracted from LLM response?
- [ ] Are there any substring operations?
- [ ] Is response validated for completeness?

**Look for:**

```typescript
// ❌ BAD - May truncate
const text = response.candidates[0].content.text.substring(0, 500)

// ✅ GOOD - Full extraction
const text = response.candidates[0].content.parts[0].text
```

### Fix Specification

#### Option A: Increase Token Limit

```typescript
maxOutputTokens: 2048, // Doubled from 1024
```

Validation:

- Long responses no longer truncated
- Responses feel complete
- Ends with proper punctuation

#### Option B: Add Response Validation

```typescript
function isResponseComplete(text: string): boolean {
  // Check if ends with punctuation
  const lastChar = text.trim().slice(-1)
  return ['.', '?', '!'].includes(lastChar)
}

// After LLM call:
if (!isResponseComplete(response)) {
  log.warn('Incomplete response detected', {
    length: response.length,
    lastChars: response.slice(-50)
  })
  // Option: Retry or append continuation prompt
}
```

#### Option C: Fix Streaming Concatenation

Review and fix any chunk concatenation issues.

### Fix Validation

Test:

1. Provide detailed interview responses
2. Marcus's replies are complete sentences
3. No mid-word or mid-sentence cutoffs
4. Check transcript in database

---

## Issue #2: Duplicate Conversation Turns

### Severity: 🟡 High

### Reproduction Steps

1. Continue interview for 4-5 exchanges
2. Observe Marcus's response includes:
   - Timestamps like `[20:06:00]`
   - Multiple speaker labels
   - Hallucinated requester responses

### Evidence

Message: `fc0d808c-7d5e-4565-8293-1ff4699b30cf`

```text
"Okay, let's talk about...\n\n[20:06:00] Interviewer: Great question...\n\n[20:06:29] Requester: The MCP librarian..."
```

### Investigation Checklist

#### Step 1: Review System Prompt

File: `app/server/services/interview/hr-specialist.ts`

- [ ] Find system prompt definition
- [ ] Check if it specifies "single response only"
- [ ] Look for examples that might show multi-turn format
- [ ] Check if prompt includes timestamps

**Look for:**

```typescript
const systemPrompt = `
You are Marcus, an HR interviewer.

Your job is to ask ONE question at a time.  // ⚠️ Is this explicit?
Do NOT generate the user's response.         // ⚠️ Is this present?
Do NOT include timestamps.                   // ⚠️ Is this present?

Ask your next question.
`
```

#### Step 2: Check Conversation History

File: `app/server/services/interview/prompt-builder.ts`

- [ ] How much history is included in prompt?
- [ ] Is history formatted with timestamps?
- [ ] Does format encourage LLM to continue pattern?

**Look for:**

```typescript
// ❌ BAD - Too much context, timestamps
const history = transcript
  .map((entry) => `[${entry.timestamp}] ${entry.speaker}: ${entry.message}`)
  .join('\n')

// ✅ GOOD - Clean history, limited context
const history = transcript
  .slice(-6)
  .map((entry) => `${entry.speaker}: ${entry.message}`)
  .join('\n\n')
```

#### Step 3: Check Response Sanitization

- [ ] Is response cleaned before storing?
- [ ] Are timestamps stripped?
- [ ] Are multiple turns detected and split?

### Fix Specification

#### Fix 1: Strengthen System Prompt

```typescript
const systemPrompt = `
You are Marcus, the HR interviewer.

CRITICAL RULES:
1. Ask ONE question at a time
2. Do NOT generate the requester's response
3. Do NOT include timestamps
4. Do NOT write [HH:MM:SS] format
5. Respond ONLY as Marcus

Format: Just your question, nothing else.

Ask your next question now:
`
```

#### Fix 2: Limit Context Window

```typescript
// Only include last 4-6 exchanges
const recentHistory = transcript.slice(-6)
```

#### Fix 3: Sanitize Response

```typescript
function sanitizeResponse(text: string): string {
  // Remove timestamps
  text = text.replace(/\[\d{2}:\d{2}:\d{2}\]/g, '')

  // Remove speaker labels from response
  text = text.replace(/^(Interviewer|Requester):\s*/gm, '')

  // Take only first paragraph (before double newline)
  const firstParagraph = text.split('\n\n')[0]

  return firstParagraph.trim()
}

const cleanResponse = sanitizeResponse(llmResponse)
```

### Fix Validation

Test:

1. Complete multiple interview exchanges
2. Each Marcus response is single question/statement
3. No timestamps appear
4. No requester responses hallucinated
5. Check transcript: clean format

---

## Integration Validation

### Full Workflow Test

After all fixes applied:

#### Test Scenario 1: Complete Interview

1. Start new interview
2. Answer 5-6 questions from Marcus
3. Verify:
   - [ ] No console errors
   - [ ] All responses complete (no truncation)
   - [ ] Clean conversation (no duplication)
   - [ ] Reaches approval workflow states

#### Test Scenario 2: State Transition

1. Complete standard interview
2. Verify transition to `review_prompt` state
3. Check:
   - [ ] `currentState === 'review_prompt'`
   - [ ] `agentDraft.generatedPrompt` exists
   - [ ] Phase 7 UI displays prompt correctly

#### Test Scenario 3: Console Monitoring

1. Open browser console before starting
2. Complete full interview
3. Verify:
   - [ ] Zero async channel errors
   - [ ] Zero uncaught promise rejections
   - [ ] Clean console throughout

---

## Code Modification Strategy

### High-Risk Changes

Changes that could break existing functionality:

1. **Prompt modifications** - Test thoroughly, affects all interviews
2. **Async flow changes** - Could introduce new race conditions
3. **Response parsing** - Could corrupt transcript data

**Mitigation:** Test each fix in isolation before combining.

### Low-Risk Changes

Safe to implement:

1. **Add logging** - No functional impact
2. **Increase token limits** - Only affects response length
3. **Response sanitization** - Cleans existing bad behavior

### Rollback Plan

If fixes cause regressions:

```bash
# Revert specific file
git checkout HEAD~1 -- app/server/services/interview/hr-specialist.ts

# Or full rollback
git revert <commit-hash>
```

---

## Testing Checklist

### Before Fixes

Document baseline:

- [ ] Record current error frequency
- [ ] Screenshot truncated messages
- [ ] Copy duplicate turn examples
- [ ] Note which exchanges fail

### After Each Fix

Incremental validation:

- [ ] Apply fix
- [ ] Test interview flow
- [ ] Check specific issue resolved
- [ ] Verify no new issues introduced
- [ ] Document result

### After All Fixes

Full validation:

- [ ] Run complete interview (5-6 exchanges)
- [ ] Monitor console throughout
- [ ] Check transcript format
- [ ] Test state transition
- [ ] Verify Phase 7 UI works
- [ ] Run existing tests: `npm test`
- [ ] TypeScript: `npm run typecheck`

---

## Documentation Requirements

### For Each Fix

Document in phase 9 completion:

```markdown
### Fix: [Issue Name]

**Root Cause:** [What was wrong]

**Solution:** [What was changed]

**Files Modified:**

- path/to/file.ts (line X)

**Validation:** [How we know it works]

**Side Effects:** [Any other impacts]
```

### Lessons Learned Updates

Add to `.specify/memory/lessons-learned.md`:

- Async handling patterns that work
- LLM prompt engineering for single responses
- Response validation strategies
- Token limit considerations

---

## Success Criteria Summary

Phase 9 complete when:

- [x] **Issue #3 fixed:** No async channel errors
- [x] **Issue #1 fixed:** Complete responses (no truncation)
- [x] **Issue #2 fixed:** Single Q&A per turn
- [x] **Integration test:** Full interview → approval workflow
- [x] **Phase 7 UI:** Works with real interview data
- [x] **Phase 8:** Can complete integration testing
- [x] **Existing tests:** All passing
- [x] **Documentation:** Fixes documented

---

## Next: Phase 3 EXECUTE

Begin manual debugging:

1. Start with Issue #3 (async errors) - blocks everything
2. Then Issue #1 (truncation) - affects UX
3. Then Issue #2 (duplication) - polish
4. Then integration test

Estimate: 2-3 hours hands-on debugging
