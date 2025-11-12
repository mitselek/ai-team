# LLM Provider Testing Plan

**Date:** 2025-11-12
**Purpose:** Systematically test all LLM providers to identify which generate clean interview responses

**Status:** 🔬 TESTING IN PROGRESS - No conclusions yet

---

## Test Setup

### Providers to Test

**Testing 3 models from each provider (November 2025 research):**

#### Anthropic Claude 4.x Series

1. **Claude Sonnet 4.5** - `claude-sonnet-4-5-20250929`
   - Latest flagship, smartest for complex agents and coding
   - 200K context (1M with beta header)
   - Extended thinking capability
   - $3/MTok input, $15/MTok output

2. **Claude Haiku 4.5** - `claude-haiku-4-5-20251001`
   - Fastest with near-frontier intelligence
   - 200K context
   - Extended thinking capability
   - $1/MTok input, $5/MTok output

3. **Claude Opus 4.1** - `claude-opus-4-1-20250805`
   - Exceptional reasoning tasks
   - 200K context
   - Extended thinking capability
   - $15/MTok input, $75/MTok output

#### Google Gemini 2.5 Series

1. **Gemini 2.5 Pro** - `gemini-2.5-pro`
   - State-of-the-art thinking model
   - Complex reasoning in code, math, STEM
   - Large datasets/codebases with long context

2. **Gemini 2.5 Flash** - `gemini-2.5-flash`
   - Best price-performance
   - Optimized for agentic use cases
   - Low-latency, high-volume processing
   - Large scale processing capability

3. **Gemini 2.5 Flash-Lite** - `gemini-2.5-flash-lite`
   - Fastest, most cost-efficient
   - Ultra-fast processing
   - High throughput optimization

**Note:** All models released 2025, represent current state-of-the-art from each provider.

### Test Scenario

**Standard Interview Flow:**

1. Start interview
2. Send: "I need an MCP librarian to help manage and document our Model Context Protocol servers."
3. Send: "They will catalog our MCP server implementations, create comprehensive documentation for each server, maintain a searchable index, and help developers find the right servers for their needs."
4. Send: "The agent should have deep knowledge of MCP, strong technical writing skills, and experience with metadata tagging."

**What to Observe:**

- Marcus's responses (count turns, check for labels)
- Server logs (raw LLM output)
- Stored transcript (what actually gets saved)

---

## Test Procedure

### Step 1: Configure Provider

Edit `app/server/services/llm/config.ts`:

```typescript
providerPriority: [LLMProvider.X] // Replace X with provider to test
```

For model-specific tests, also update:

```typescript
google: {
  defaultModel: 'model-name-here' // Change as needed
}
```

### Step 2: Restart Server

Server auto-restarts on file change. Wait ~2 seconds.

### Step 3: Run Test Interview

```bash
# Start interview
SESSION_ID=$(curl -s -X POST http://localhost:3000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "0af61814-2416-45a1-b3e9-2315e9a1bc5d",
    "interviewerId": "72e10c47-68e4-46ee-a941-c35a3d541c0a"
  }' | jq -r '.sessionId')

echo "Session: $SESSION_ID"

# Response 1
curl -s -X POST "http://localhost:3000/api/interview/${SESSION_ID}/respond" \
  -H "Content-Type: application/json" \
  -d '{
    "response": "I need an MCP librarian to help manage and document our Model Context Protocol servers."
  }' | jq -r '.nextQuestion'

sleep 2

# Response 2
curl -s -X POST "http://localhost:3000/api/interview/${SESSION_ID}/respond" \
  -H "Content-Type: application/json" \
  -d '{
    "response": "They will catalog our MCP server implementations, create comprehensive documentation for each server, maintain a searchable index, and help developers find the right servers for their needs."
  }' | jq -r '.nextQuestion'

sleep 2

# Response 3
curl -s -X POST "http://localhost:3000/api/interview/${SESSION_ID}/respond" \
  -H "Content-Type: application/json" \
  -d '{
    "response": "The agent should have deep knowledge of MCP, strong technical writing skills, and experience with metadata tagging."
  }' | jq -r '.nextQuestion'

# Check stored transcript
curl -s "http://localhost:3000/api/interview/${SESSION_ID}" | jq '.transcript[] | {speaker, message}'
```

### Step 4: Document Observations

For each response, record:

- Exact text returned
- Any "Requester:" or "Marcus:" labels present
- Multiple turns in single response?
- Timestamps present?
- Response truncated?
- Raw LLM output from server logs

### Step 5: Save Session Data

```bash
# Save full interview file for analysis
cp data/organizations/*/interviews/${SESSION_ID}.json \
   .specify/features/F013-phase-9-backend-fixes/test-results/${PROVIDER}-${MODEL}.json
```

---

## Test Results

### Test 1: [Provider Name] - [Model]

**Configuration:**

```typescript
providerPriority: [LLMProvider.?]
defaultModel: '?'
```

**Session ID:** `?`

**Response 1:**

```text
[Paste exact response here]
```

**Response 2:**

```text
[Paste exact response here]
```

**Response 3:**

```text
[Paste exact response here]
```

**Server Logs:**

```text
[Paste relevant log entries showing raw LLM output]
```

**Observations:**

- Single turn per response? [YES/NO]
- Speaker labels in response? [YES/NO - which ones?]
- Timestamps present? [YES/NO]
- Response truncated? [YES/NO]
- Other issues? [Description]

---

### Test 2: [Provider Name] - [Model]

**Configuration:**

```typescript
providerPriority: [LLMProvider.?]
defaultModel: '?'
```

**Session ID:** `?`

[Repeat format above]

---

## Analysis (After All Tests Complete)

### Summary Table

| Provider | Model | Single Turn | No Labels | No Timestamps | Complete | Pass? |
| -------- | ----- | ----------- | --------- | ------------- | -------- | ----- |
| ?        | ?     | ?           | ?         | ?             | ?        | ?     |
| ?        | ?     | ?           | ?         | ?             | ?        | ?     |
| ?        | ?     | ?           | ?         | ?             | ?        | ?     |

### Patterns Observed

[Document any patterns after testing, not before]

### Root Causes

[Analyze root causes based on actual test results]

### Recommendations

[Make recommendations based on evidence from tests]

---

## Next Steps

1. [ ] Test first provider
2. [ ] Document results
3. [ ] Test second provider
4. [ ] Document results
5. [ ] Continue for all providers
6. [ ] Analyze results
7. [ ] Make evidence-based recommendations

### Test Scenario

**Standard Interview Flow:**

1. Start interview
2. Send: "I need an MCP librarian to help manage and document our Model Context Protocol servers."
3. Send: "They will catalog our MCP server implementations, create comprehensive documentation for each server, maintain a searchable index, and help developers find the right servers for their needs."
4. Send: "The agent should have deep knowledge of MCP, strong technical writing skills, and experience with metadata tagging."

**Expected Behavior:**

- Each Marcus response should be a SINGLE question
- No "Requester:" labels in Marcus's responses
- No "Marcus:" repeated multiple times
- No timestamps like `[HH:MM:SS]`
- Complete sentences (no truncation)

---

## Test Procedure

### Step 1: Configure Provider

Edit `app/server/services/llm/config.ts`:

```typescript
providerPriority: [LLMProvider.ANTHROPIC] // Change to test different provider
```

For model-specific tests, also update:

```typescript
defaultModel: 'model-name-here'
```

### Step 2: Restart Server

```bash
# Server auto-restarts on config change
# Wait ~2 seconds for reload
```

### Step 3: Run Test Interview

```bash
# Start interview
SESSION_ID=$(curl -s -X POST http://localhost:3000/api/interview/start \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "0af61814-2416-45a1-b3e9-2315e9a1bc5d",
    "interviewerId": "72e10c47-68e4-46ee-a941-c35a3d541c0a"
  }' | jq -r '.sessionId')

echo "Session: $SESSION_ID"

# Response 1
curl -s -X POST "http://localhost:3000/api/interview/${SESSION_ID}/respond" \
  -H "Content-Type: application/json" \
  -d '{
    "response": "I need an MCP librarian to help manage and document our Model Context Protocol servers."
  }' | jq -r '.nextQuestion'

sleep 2

# Response 2
curl -s -X POST "http://localhost:3000/api/interview/${SESSION_ID}/respond" \
  -H "Content-Type: application/json" \
  -d '{
    "response": "They will catalog our MCP server implementations, create comprehensive documentation for each server, maintain a searchable index, and help developers find the right servers for their needs."
  }' | jq -r '.nextQuestion'

sleep 2

# Response 3
curl -s -X POST "http://localhost:3000/api/interview/${SESSION_ID}/respond" \
  -H "Content-Type: application/json" \
  -d '{
    "response": "The agent should have deep knowledge of MCP, strong technical writing skills, and experience with metadata tagging."
  }' | jq -r '.nextQuestion'

# Check stored transcript
curl -s "http://localhost:3000/api/interview/${SESSION_ID}" | jq '.transcript[] | {speaker, message}'
```

### Step 4: Analyze Results

Check for:

- [ ] Clean single questions (no multi-turn)
- [ ] No "Requester:" in responses
- [ ] No repeated "Marcus:" labels
- [ ] No timestamps
- [ ] Complete responses (not truncated)
- [ ] Check server logs for raw LLM output

### Step 5: Document Results

Fill in results table below.

---

## Test Results

### Anthropic - claude-3-haiku-20240307

**Status:** ✅ PASS

**Observations:**

- Clean single questions
- No hallucinations
- Complete responses
- Proper sentence endings

**Sample Response:**

```text
"Okay, great. Can you tell me more about the specific tasks and responsibilities this new MCP librarian agent will be handling? What will their day-to-day work look like?"
```

**Decision:** ✅ Keep as primary provider

---

### Google - gemini-1.5-flash

**Status:** ⏳ PENDING

**Test Command:**

```bash
# Edit config.ts: providerPriority: [LLMProvider.GOOGLE]
# Edit config.ts: defaultModel: 'gemini-1.5-flash'
```

**Observations:**

- [ ] Test not yet run

---

### Google - gemini-pro

**Status:** ⏳ PENDING

**Test Command:**

```bash
# Edit config.ts: providerPriority: [LLMProvider.GOOGLE]
# Edit config.ts: defaultModel: 'gemini-pro'
```

**Observations:**

- Previous manual testing showed hallucinations
- [ ] Needs systematic test to confirm

---

### OpenAI - gpt-3.5-turbo

**Status:** ⏳ PENDING

**Prerequisites:**

- Verify `NUXT_OPENAI_API_KEY` is set
- Check API key is valid

**Test Command:**

```bash
# Edit config.ts: providerPriority: [LLMProvider.OPENAI]
# Edit config.ts: defaultModel: 'gpt-3.5-turbo'
```

**Observations:**

- [ ] Test not yet run

---

### OpenAI - gpt-4-turbo-preview

**Status:** ⏳ PENDING

**Prerequisites:**

- Verify `NUXT_OPENAI_API_KEY` is set
- Check API key is valid

**Test Command:**

```bash
# Edit config.ts: providerPriority: [LLMProvider.OPENAI]
# Edit config.ts: defaultModel: 'gpt-4-turbo-preview'
```

**Observations:**

- [ ] Test not yet run

---

## Analysis Framework

### Hallucination Patterns

**Type 1: Multi-turn Conversation**

```text
Marcus: Question here?

Requester: Their response

Marcus: Follow-up question
```

**Type 2: Repeated Labels**

```text
Marcus: First part
Marcus: Second part
Marcus: Third part
```

**Type 3: Timestamps**

```text
[20:06:00] Marcus: Question here
[20:06:15] Requester: Response
```

### Root Cause Hypotheses

1. **Context Window Poisoning**: formatTranscript() includes bad patterns
2. **Insufficient Instructions**: CRITICAL RULES not strong enough
3. **Model Training**: Some models trained on chat transcripts
4. **Temperature Too High**: 0.7 allows creative hallucinations

---

## Decision Criteria

### PASS Criteria ✅

- Zero hallucinations in 3 exchanges
- Complete responses (no truncation)
- Follows prompt instructions
- Consistent quality

### CONDITIONAL PASS ⚠️

- Occasional minor issues (e.g., "Marcus:" prefix)
- Can be fixed with prompt tuning
- Overall quality acceptable

### FAIL Criteria ❌

- Multi-turn hallucinations
- Repeated hallucinations
- Ignores CRITICAL RULES
- Unusable for production

---

## Recommendations

After all tests complete:

1. **Primary Provider**: Use provider(s) that PASS
2. **Fallback Providers**: Use CONDITIONAL PASS providers with fixes
3. **Disabled Providers**: Remove FAIL providers from rotation
4. **Documentation**: Update config comments with test results

---

## Next Steps

1. [ ] Test gemini-1.5-flash
2. [ ] Test gemini-pro (confirm previous results)
3. [ ] Test gpt-3.5-turbo (if API key available)
4. [ ] Test gpt-4-turbo-preview (if API key available)
5. [ ] Update providerPriority based on results
6. [ ] Document findings in Phase 9 COMPLETION
7. [ ] Consider prompt tuning for CONDITIONAL PASS providers
