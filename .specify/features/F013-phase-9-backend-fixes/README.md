# F013 Phase 9: Backend Interview Workflow Fixes

**Feature ID:** F013-phase-9-backend-fixes
**Phase:** 9 (Remediation)
**Status:** Planning
**Created:** 2025-11-12

---

## Phase 1: PLAN

### Feature Selection

**Selected:** Backend interview workflow remediation

**Context:** Phase 7 (Approval Workflow UI) completed successfully, but Phase 8 integration testing discovered critical backend issues preventing end-to-end workflow validation.

**Objective:** Fix critical backend issues in interview conversation workflow to enable:

- Complete standard interview flow
- Proper transition to approval workflow states
- Full integration testing of Phase 7 UI

### Objectives

#### Primary Objectives

1. **Fix Critical: Async Channel Closure Errors**
   - Eliminate console errors during LLM response generation
   - Ensure stable async communication channels
   - Proper error handling and timeout management

2. **Fix High: Message Truncation**
   - Ensure complete LLM responses without cutoff
   - Validate response completeness before storing
   - Investigate token limits and streaming configuration

3. **Fix High: Duplicate Conversation Turns**
   - Prevent multi-turn hallucinated conversations
   - Single question/response per exchange
   - Remove timestamp injection from responses

#### Secondary Objectives

4. Enable complete Phase 8 integration testing
5. Validate interview → approval workflow transition
6. Document fixes and patterns for future stability

### Scope

**In Scope:**

- Fix async/await handling in interview respond endpoint
- Fix LLM streaming or response buffering issues
- Fix interviewer prompt engineering (prevent multi-turn responses)
- Add response validation and error recovery
- Update interview workflow service error handling
- Document root causes and solutions

**Out of Scope:**

- UI changes (Phase 7 complete)
- API endpoint contract changes (Phase 2-6 complete)
- Test modifications (tests are correct, implementation needs fixing)
- Performance optimization
- New features or enhancements

### Dependencies

**Required:**

- Phase 8 issue documentation (01-discovered-issues.md)
- Interview workflow service code
- LLM integration service
- HR specialist prompt configuration

**Blocks:**

- Phase 8 integration testing completion
- End-to-end workflow validation
- Phase 7 UI validation with real data

### Acceptance Criteria

#### Critical Fixes

- [ ] No async channel closure errors in console
- [ ] LLM responses complete (no truncation)
- [ ] Single question/response per exchange (no duplication)
- [ ] Interview conversation completes successfully
- [ ] Transitions to approval workflow states correctly

#### Validation

- [ ] Complete one full interview → approval workflow test
- [ ] All console errors resolved
- [ ] Transcript entries properly formatted
- [ ] State machine transitions work correctly
- [ ] TypeScript: 0 errors
- [ ] Existing tests still pass

#### Documentation

- [ ] Root cause analysis for each issue
- [ ] Fix implementation documented
- [ ] Lessons learned updated
- [ ] Phase 8 can resume testing

### Non-Goals

- Full refactor of interview workflow
- Changing approval workflow API contracts
- Adding new interview features
- UI/UX improvements
- Test coverage expansion

### Risks

**Technical Risks:**

1. **LLM Service Configuration**
   - Risk: Timeout/token settings at service level
   - Mitigation: Review Gemini API configuration, adjust limits

2. **Streaming Implementation**
   - Risk: Complex to debug async streaming issues
   - Mitigation: Add logging, consider non-streaming fallback

3. **Prompt Engineering**
   - Risk: Prompt changes affect behavior unpredictably
   - Mitigation: Test incrementally, document prompt changes

**Schedule Risks:**

1. **Deep debugging required**
   - Risk: Issues may be in LLM integration layer
   - Mitigation: Time-box investigation, escalate if needed

### Estimated Time

- **Phase 1 (PLAN):** 15 minutes ✅
- **Phase 2 (SPECIFY):** 30-45 minutes
- **Phase 3 (EXECUTE):** Manual debugging 1-2 hours
- **Phase 4 (ASSESS):** 30 minutes
- **Phase 5 (LEARN):** 15 minutes
- **Phase 6 (COMMIT):** 5 minutes

**Total:** 2.5-3.5 hours (mostly manual debugging)

### Success Metrics

**Quantitative:**

- 0 async channel errors
- 100% complete LLM responses (no truncation)
- 1:1 question:response ratio (no duplication)
- Interview completion rate: 100%

**Qualitative:**

- Console clean during interview
- Conversation feels natural and coherent
- Proper state transitions
- User experience smooth

### Execution Plan

#### Step 1: Investigation (30 min)

1. Review interview respond endpoint (`app/server/api/interview/[id]/respond.post.ts`)
2. Review interview workflow service (`app/server/services/interview/workflow.ts`)
3. Review HR specialist service (`app/server/services/interview/hr-specialist.ts`)
4. Review LLM integration (`app/server/services/llm/`)
5. Check Gemini API configuration and timeout settings

#### Step 2: Fix Async Channel Errors (30 min)

1. Add proper error handling in respond endpoint
2. Ensure all async operations awaited correctly
3. Add timeout handling
4. Add request/response logging
5. Test fix in isolation

#### Step 3: Fix Message Truncation (30 min)

1. Check LLM service token limits
2. Review streaming implementation
3. Add response completeness validation
4. Consider fallback to non-streaming if needed
5. Test with long responses

#### Step 4: Fix Duplicate Turns (30 min)

1. Review HR specialist system prompt
2. Add explicit "respond with ONLY one question" instruction
3. Limit conversation history in prompt context
4. Strip any timestamps from responses
5. Validate response format before storing

#### Step 5: Integration Test (30 min)

1. Run complete interview flow
2. Verify transitions to approval states
3. Test Phase 7 UI with real data
4. Validate all issues resolved

### Implementation Approach

**Manual debugging** preferred over Gemini automation for this phase:

**Reasons:**

1. Debugging requires investigation and hypothesis testing
2. Error context spread across multiple services
3. Fix validation needs iterative testing
4. Quick manual edits faster than Gemini re-prompting

**Process:**

1. Read code to understand flow
2. Add logging to trace execution
3. Reproduce errors in controlled way
4. Apply targeted fixes
5. Test and validate
6. Document findings

### Root Cause Hypotheses

#### Issue #3: Async Channel Errors

**Hypothesis 1:** Interview respond endpoint not awaiting LLM completion

```typescript
// Suspect pattern:
export default defineEventHandler(async (event) => {
  // Missing await on LLM call?
  const response = handleInterview(...)  // Should be: await handleInterview(...)
  return response
})
```

**Hypothesis 2:** LLM service timeout too short

- Streaming response exceeds timeout
- Channel closes before complete

**Hypothesis 3:** Error thrown but not caught

- Unhandled rejection in async chain
- Promise resolves before work done

#### Issue #1: Message Truncation

**Hypothesis 1:** Token limit reached

- Max tokens setting too low
- Response cut off at limit

**Hypothesis 2:** Streaming buffer issue

- Chunks not fully concatenated
- Last chunk dropped

**Hypothesis 3:** Response parsing error

- Text extraction incomplete
- Metadata fields interfere

#### Issue #2: Duplicate Turns

**Hypothesis 1:** Prompt includes too much history

- LLM sees full conversation
- Continues pattern instead of single response

**Hypothesis 2:** System prompt unclear

- Doesn't specify "one question only"
- LLM fills in both sides of conversation

**Hypothesis 3:** Few-shot examples show multi-turn

- Training examples confuse LLM
- Mimics example format

---

## Notes

This is a **remediation phase**, not a standard development iteration. Focus is on:

- Root cause analysis
- Targeted fixes
- Validation that fixes work
- Documentation for future stability

No new features, no scope expansion. Fix what's broken, validate, move on.

---

## Next Steps After Planning

1. Create Phase 2 SPECIFY document
2. Map exact code locations to investigate
3. Create test scenarios for reproduction
4. Define fix validation criteria
5. Begin Phase 3 EXECUTE (manual debugging)
