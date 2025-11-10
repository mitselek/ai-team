# F008: HR Interview Workflow

## Status

Planning

## Objective

Implement the specialized HR Interview workflow that transforms new team members into fully configured agents through a conversational one-question-at-a-time interview process. The HR agent asks questions, interprets responses, and consults with the Director-level HR specialist to generate system prompts and finalize agent configuration.

## Scope

### In Scope

- One-question-at-a-time interview state machine
- Interview question generation (based on role)
- Answer interpretation and follow-up logic
- HR specialist consultation (Director → HR Senior)
- System prompt generation from interview responses
- Agent name generation (creative, avoiding conflicts)
- Final agent creation with configuration
- Interview transcript storage
- Multi-turn conversation handling
- Interview context preservation (resume after pause)

### Out of Scope (Future)

- Advanced personality profiling (F016)
- Agent skill assessment tests (F020)
- Onboarding task generation (separate feature)
- Team dynamics analysis (F014)
- Interview quality scoring (analytics)

## Dependencies

### Required (Complete)

- F001 Agent System ✅ (Agent type, creation API)
- F002 Team System ✅ (Team type, agent assignment)
- F003 Task Management ✅ (Task creation for interview)
- F006 LLM Integration ✅ (Question generation, analysis)

### Required (In Progress)

- F006 Phase 2 MCP Client ✅ (Tool invocation - in progress)

### Required (Pending)

- F007 Agent Execution Engine ⏳ (Task processing, delegation)

### Uses

- `server/services/llm/` (LLM service for questions/analysis)
- `server/data/agents.ts` (Agent data store)
- `server/data/teams.ts` (Team data store)
- `types/index.ts` (Agent, Team types)
- `server/utils/logger.ts` (Structured logging)

## Architecture

### High-Level Design

```text
┌─────────────────────────────────────────────┐
│  Director Delegates to HR Manager           │
│  Task: "Interview 3 new developers"         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  HR Manager Executes Interview Task         │
│  - Creates interview session                │
│  - Starts one-question-at-a-time flow       │
│  - Stores conversation context              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Interview State Machine                    │
│  START → GREET → ASK → LISTEN → ANALYZE     │
│    ↓                            ↓            │
│  FOLLOW_UP ←───────────────────┘             │
│    ↓                                         │
│  CONSULT_HR (Director review)                │
│    ↓                                         │
│  GENERATE_PROMPT → FINALIZE → END           │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  HR Specialist Consultation                 │
│  - Reviews interview transcript             │
│  - Generates system prompt                  │
│  - Suggests agent name                      │
│  - Provides feedback                        │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Agent Creation                             │
│  - Generate unique name                     │
│  - Apply system prompt                      │
│  - Assign to team                           │
│  - Set initial token allocation             │
│  - Mark as active                           │
└─────────────────────────────────────────────┘
```

### Interview State Machine

```text
[START]
   ↓
[GREET] "Hello! I'm conducting today's interview..."
   ↓
[ASK_ROLE] "What role will you be taking?"
   ↓
[LISTEN] → [ANALYZE] → "You mentioned X, Y, Z..."
   ↓
[FOLLOW_UP] "Can you elaborate on...?"
   ↓
[ASK_EXPERTISE] "What are your areas of expertise?"
   ↓
[LISTEN] → [ANALYZE]
   ↓
[FOLLOW_UP] (repeat 3-5 times based on responses)
   ↓
[ASK_PREFERENCES] "How would you prefer to communicate?"
   ↓
[LISTEN] → [ANALYZE]
   ↓
[CONSULT_HR] (HR Manager delegates to HR Specialist)
   ↓
[HR_REVIEW] Director reviews transcript
   ↓
[GENERATE_PROMPT] Director creates system prompt
   ↓
[SUGGEST_NAME] Director suggests agent name
   ↓
[FINALIZE] HR Manager creates agent
   ↓
[END] "Welcome aboard, [Name]!"
```

## Implementation Tasks

### Task 1: Interview Session Manager

**File:** `server/services/interview/session.ts`

**Responsibilities:**

- Create interview session (persist state)
- Track current question and responses
- Handle multi-turn conversation
- Resume interrupted interviews
- Store interview transcript
- Manage session lifecycle

### Task 2: Question Generator

**File:** `server/services/interview/questions.ts`

**Responsibilities:**

- Generate role-specific questions (developer, designer, manager, etc.)
- Ask follow-up questions based on responses
- Adapt questioning style (formal, casual)
- Track coverage (ensure all key areas explored)
- Identify when interview is complete

### Task 3: Response Analyzer

**File:** `server/services/interview/analyzer.ts`

**Responsibilities:**

- Parse candidate responses
- Extract key information (skills, preferences, personality)
- Identify unclear answers (trigger follow-up)
- Detect red flags (conflicting responses)
- Build candidate profile progressively

### Task 4: HR Specialist Connector

**File:** `server/services/interview/hr-specialist.ts`

**Responsibilities:**

- Format interview transcript for Director review
- Request system prompt generation
- Request agent name suggestions
- Handle Director feedback
- Iterate if needed (Director requests more info)

### Task 5: System Prompt Builder

**File:** `server/services/interview/prompt-builder.ts`

**Responsibilities:**

- Generate system prompt from interview data
- Include role description
- Add personality traits
- Specify communication style
- Set boundaries and guidelines
- Format for LLM consumption

### Task 6: Agent Name Generator

**File:** `server/services/interview/name-generator.ts`

**Responsibilities:**

- Generate creative agent names
- Check for conflicts (no duplicates in team)
- Match name to personality/role
- Offer alternatives (if first choice rejected)
- Validate name format

### Task 7: Interview Workflow Orchestrator

**File:** `server/services/interview/workflow.ts`

**Responsibilities:**

- Coordinate entire interview process
- Manage state transitions
- Handle errors and retries
- Log all steps
- Create final agent on completion
- Notify team on boarding

## Technical Specification

### Interview Session

```typescript
interface InterviewSession {
  id: string
  candidateId: string // Placeholder ID (before agent created)
  teamId: string
  interviewerId: string // HR Manager agent ID
  status: 'active' | 'pending_review' | 'completed' | 'cancelled'
  currentState: InterviewState
  transcript: InterviewMessage[]
  candidateProfile: CandidateProfile
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

type InterviewState =
  | 'greet'
  | 'ask_role'
  | 'ask_expertise'
  | 'ask_preferences'
  | 'follow_up'
  | 'consult_hr'
  | 'awaiting_review'
  | 'finalize'
  | 'complete'

interface InterviewMessage {
  id: string
  speaker: 'interviewer' | 'candidate'
  message: string
  timestamp: Date
  metadata?: {
    questionType?: string
    followUpTo?: string
  }
}

interface CandidateProfile {
  role: string
  expertise: string[]
  preferences: {
    communicationStyle: string
    workingHours: string
    autonomyLevel: string
  }
  personality: {
    traits: string[]
    tone: string
  }
  systemPrompt?: string
  suggestedName?: string
}
```

### Question Generation

```typescript
async function generateNextQuestion(session: InterviewSession): Promise<string> {
  const log = logger.child({ sessionId: session.id })

  // Determine what to ask based on state
  const context = buildQuestionContext(session)

  const prompt = `You are an HR interviewer conducting an onboarding interview.

Interview progress:
${session.transcript.map((m) => `${m.speaker}: ${m.message}`).join('\n')}

Current state: ${session.currentState}

Generate the next question to ask the candidate. Keep it natural, one question at a time.
If you have enough information, respond with "INTERVIEW_COMPLETE".`

  const response = await generateCompletion(prompt, {
    agentId: session.interviewerId,
    temperature: 0.7,
    maxTokens: 200
  })

  if (response.content.includes('INTERVIEW_COMPLETE')) {
    session.currentState = 'consult_hr'
    return null
  }

  return response.content.trim()
}
```

### Response Analysis

```typescript
async function analyzeResponse(
  session: InterviewSession,
  response: string
): Promise<AnalysisResult> {
  const log = logger.child({ sessionId: session.id })

  const prompt = `Analyze this interview response:

Question: ${session.transcript[session.transcript.length - 2].message}
Response: ${response}

Extract:
1. Key information (skills, preferences, traits)
2. Clarity score (1-10)
3. Need for follow-up? (yes/no with reason)

Respond in JSON format:
{
  "keyInfo": ["item1", "item2"],
  "clarityScore": 8,
  "needsFollowUp": false,
  "followUpReason": ""
}`

  const llmResponse = await generateCompletion(prompt, {
    agentId: session.interviewerId,
    temperature: 0.3,
    maxTokens: 300
  })

  const analysis = JSON.parse(llmResponse.content)

  // Update candidate profile
  updateCandidateProfile(session, analysis.keyInfo)

  return analysis
}
```

### HR Specialist Consultation

```typescript
async function consultHRSpecialist(session: InterviewSession): Promise<HRRecommendation> {
  const log = logger.child({ sessionId: session.id })

  // Find HR Specialist (Director level)
  const hrSpecialist = agents.find((a) => a.role === 'director' && a.team?.name === 'HR Team')

  if (!hrSpecialist) {
    throw new Error('HR Specialist not found')
  }

  // Format interview transcript
  const transcript = formatTranscript(session)

  // Create consultation task for Director
  const task = await createTask({
    id: uuidv4(),
    title: `Review interview for ${session.candidateProfile.role}`,
    description: `Interview transcript:
${transcript}

Candidate profile:
- Role: ${session.candidateProfile.role}
- Expertise: ${session.candidateProfile.expertise.join(', ')}
- Preferences: ${JSON.stringify(session.candidateProfile.preferences)}

Please:
1. Generate a system prompt for this agent
2. Suggest 3 creative names
3. Provide any additional feedback`,
    assignedTo: hrSpecialist.id,
    createdBy: session.interviewerId,
    priority: 'high',
    status: 'pending',
    organizationId: hrSpecialist.organizationId,
    createdAt: new Date()
  })

  // Wait for Director to complete task (poll or webhook)
  const result = await waitForTaskCompletion(task.id, 300000) // 5 min timeout

  return parseHRRecommendation(result)
}
```

### System Prompt Generation

```typescript
function generateSystemPrompt(profile: CandidateProfile): string {
  const { role, expertise, preferences, personality } = profile

  return `You are ${profile.suggestedName}, a ${role} agent.

Your expertise includes:
${expertise.map((e) => `- ${e}`).join('\n')}

Your personality:
- Traits: ${personality.traits.join(', ')}
- Communication tone: ${personality.tone}

Your work preferences:
- Communication style: ${preferences.communicationStyle}
- Autonomy level: ${preferences.autonomyLevel}
- Working hours: ${preferences.workingHours}

Your responsibilities:
${getRoleResponsibilities(role)}

Your constraints:
- Always maintain professional boundaries
- Escalate to senior when stuck
- Track your token usage diligently
- Report status changes to your manager

Your decision-making approach:
${getDecisionMakingGuidelines(role, preferences.autonomyLevel)}`
}
```

### Name Generation

```typescript
async function generateAgentName(profile: CandidateProfile, teamId: string): Promise<string> {
  const team = teams.find((t) => t.id === teamId)
  const existingNames = agents.filter((a) => a.teamId === teamId).map((a) => a.name)

  const prompt = `Generate a creative name for a new ${profile.role} agent.

Team: ${team.name}
Personality: ${profile.personality.traits.join(', ')}
Tone: ${profile.personality.tone}

Existing names (avoid): ${existingNames.join(', ')}

Generate 3 unique, creative names that fit this personality. 
Names should be memorable and appropriate for a professional setting.`

  const response = await generateCompletion(prompt, {
    agentId: 'system',
    temperature: 0.9, // High creativity
    maxTokens: 150
  })

  const names = extractNames(response.content)

  // Return first available name
  return names.find((name) => !existingNames.includes(name)) || names[0]
}
```

### Final Agent Creation

```typescript
async function finalizeInterview(session: InterviewSession): Promise<Agent> {
  const log = logger.child({ sessionId: session.id })

  const team = teams.find((t) => t.id === session.teamId)
  const interviewer = agents.find((a) => a.id === session.interviewerId)

  // Generate agent name
  const name = await generateAgentName(session.candidateProfile, session.teamId)

  // Create agent
  const newAgent: Agent = {
    id: uuidv4(),
    name,
    role: session.candidateProfile.role,
    status: 'active',
    tokenAllocation: getInitialTokenAllocation(session.candidateProfile.role),
    tokenUsed: 0,
    systemPrompt: session.candidateProfile.systemPrompt,
    teamId: session.teamId,
    seniorId: interviewer.seniorId, // Report to HR Manager's senior
    organizationId: team.organizationId,
    createdAt: new Date(),
    lastActiveAt: new Date()
  }

  agents.push(newAgent)

  log.info('Interview completed, agent created', {
    agentId: newAgent.id,
    agentName: newAgent.name,
    role: newAgent.role
  })

  // Update session
  session.status = 'completed'
  session.completedAt = new Date()

  // Welcome message
  await sendWelcomeMessage(newAgent, team)

  return newAgent
}
```

## Acceptance Criteria

### Functionality

- [ ] HR Manager can start interview workflow
- [ ] Interview asks one question at a time
- [ ] Follow-up questions adapt to responses
- [ ] All key areas are covered (role, expertise, preferences)
- [ ] HR Specialist receives consultation request
- [ ] System prompt is generated correctly
- [ ] Agent name is unique and creative
- [ ] Final agent is created with correct configuration
- [ ] Interview transcript is stored
- [ ] Welcome message is sent on completion

### User Experience

- [ ] Questions feel natural (conversational)
- [ ] Interview flow is logical
- [ ] Candidate doesn't repeat information
- [ ] Interview completes in 8-12 exchanges
- [ ] Names are creative and appropriate

### Error Handling

- [ ] Interview can be paused and resumed
- [ ] Unclear responses trigger follow-ups
- [ ] HR Specialist non-response is handled (timeout)
- [ ] Duplicate names are avoided
- [ ] Invalid responses don't crash workflow

### Code Quality

- [ ] TypeScript strict mode passes
- [ ] All functions have proper types
- [ ] Structured logging throughout
- [ ] Relative imports only
- [ ] Follows existing patterns

## Expected Output

```text
server/services/interview/
├── session.ts            # Session manager (~200 lines)
├── questions.ts          # Question generator (~150 lines)
├── analyzer.ts           # Response analyzer (~180 lines)
├── hr-specialist.ts      # HR consultation (~150 lines)
├── prompt-builder.ts     # System prompt builder (~120 lines)
├── name-generator.ts     # Name generation (~100 lines)
├── workflow.ts           # Orchestrator (~250 lines)
└── types.ts              # Interview types (~80 lines)

tests/services/interview/
├── workflow.spec.ts      # Workflow tests (~200 lines)
├── questions.spec.ts     # Question tests (~150 lines)
└── analyzer.spec.ts      # Analyzer tests (~150 lines)
```

Total: ~1,730 lines across 11 files

## Execution Plan

### Phase 1: State Machine (Days 1-2)

- Implement interview session manager
- Create state machine logic
- Add transcript storage
- Basic error handling

### Phase 2: Question/Answer Flow (Days 3-4)

- Build question generator
- Implement response analyzer
- Add follow-up logic
- Test conversation flow

### Phase 3: HR Consultation (Days 5-6)

- Create HR specialist connector
- Implement task delegation
- Build system prompt generator
- Handle Director feedback

### Phase 4: Agent Creation (Day 7)

- Implement name generator
- Build agent creation logic
- Add welcome messaging
- Test end-to-end flow

### Phase 5: Testing & Polish (Days 8-9)

- Write comprehensive tests
- Test with real LLM
- Polish conversation quality
- Documentation

## Success Metrics

- Interviews complete successfully (90%+ success rate)
- Names are unique and creative
- System prompts are coherent and specific
- Interview feels natural (user feedback)
- HR Specialist consultation works reliably
- All tests passing

## Notes

### Sample Interview Flow

```text
HR Manager: "Hello! I'm Sarah from the HR team. Welcome to the interview process.
What role will you be taking on our team?"

Candidate: "I'll be a frontend developer focusing on Vue.js and Nuxt."

HR Manager: "Great! Vue.js and Nuxt expertise is valuable here. Can you tell me
about any specific areas within frontend development where you excel?"

Candidate: "I'm really good at component architecture and state management.
I also have experience with accessibility."

HR Manager: "Excellent combination. How would you prefer to communicate with your
team? For example, do you prefer detailed written updates or quick verbal check-ins?"

Candidate: "I prefer written communication, but I'm flexible. I like to document
my decisions."

HR Manager: "Perfect. One last question - how much autonomy do you prefer in your work?"

Candidate: "I like clear objectives but freedom in execution. Check in with me if
I'm stuck."

HR Manager: "Thank you! I'm going to consult with our HR Director to finalize your
configuration. This will take just a moment..."

[HR Director reviews transcript and generates system prompt]

HR Manager: "Welcome aboard, Alex! You're now part of the Frontend Team.
Your manager is Maria, and you can start working on assigned tasks right away."
```

### Configuration

```typescript
export const INTERVIEW_CONFIG = {
  maxQuestions: 12,
  minQuestions: 8,
  followUpThreshold: 6, // Clarity score below 6 triggers follow-up
  consultTimeout: 300000, // 5 minutes
  sessionTimeout: 1800000, // 30 minutes
  defaultTokenAllocation: {
    worker: 100000,
    manager: 200000,
    director: 300000
  }
}
```

## Gemini Grade Prediction

Expected: **A-** (well-defined workflow, clear state machine)

Potential issues:

- Conversation quality (may feel robotic)
- Follow-up logic (might not always be relevant)
- Name generation (could be too generic)

Manual review recommended for:

- Interview question phrasing
- System prompt quality
- Name creativity
