# Next Steps Planning: F008 HR Interview System Exposure

**Date**: November 11, 2025
**Context**: F008 HR Interview Workflow service layer complete (commit 7440ad0), 8 services implemented, 97/97 tests passing, ready for API/UI exposure
**Decision**: API Endpoints first (Phase 1), then UI Components (Phase 2)

---

## Current State Analysis

**Recent Work Completed**:

- ✅ F008 service layer complete (8 services, 2,840 lines)
- ✅ 97/97 tests passing (100% success rate)
- ✅ Core functionality: session management, question generation, response analysis, profile building, HR consultation, name generation, workflow orchestration
- ✅ Constitution-compliant: Type Safety (TypeScript strict), Test-First (12 tests), Observable Development (structured logging)
- ❌ No API exposure - services not accessible externally
- ❌ No UI - no visual interface for conducting interviews

**Constitutional Requirements**:

- **Type Safety First**: All new code must use TypeScript with strict mode, avoid `any`
- **Test-First Development**: API endpoints need integration tests, UI components need pragmatic tests
- **Observable Development**: Structured logging with correlationId, orgId, teamId context
- **Composable-First**: Frontend logic in composables, server logic in services
- **API-First Server Design**: Clean routes, proper HTTP status codes, error handling

**Known Constraints**:

- Nuxt 3 framework (server routes in `app/server/api/`, components in `app/components/`)
- Existing API pattern established (see `app/server/api/agents/index.post.ts`)
- In-memory data stores (agents, teams, interviewSessions arrays)
- Test infrastructure using Vitest with mocking patterns

**Dependencies**:

- Depends on: F008 service layer (complete ✅)
- Blocking: Nothing currently blocked
- Enables: Manual interview testing, user-facing interview capability, integration with agent execution engine

---

## Options to Evaluate

**Option A: Add API Endpoints:**

- **Deliverables**:
  - 5 REST endpoints for interview workflow
  - `/api/interview/start` (POST) - Start new interview
  - `/api/interview/[id]/respond` (POST) - Submit candidate response
  - `/api/interview/[id]` (GET) - Get interview session
  - `/api/interview/[id]/cancel` (POST) - Cancel interview
  - `/api/interviews` (GET) - List interviews by team
- **Benefit**: Enables programmatic access, Postman/curl testing, quick validation of service layer, foundation for UI

**Option B: Add UI Components:**

- **Deliverables**:
  - `InterviewChat.vue` - Chat interface for conducting interviews
  - `InterviewSessionDashboard.vue` - View/manage active interviews
  - `app/pages/interviews/index.vue` - List all interviews
  - `app/pages/interviews/[id].vue` - Interview detail/chat page
  - `app/composables/useInterview.ts` - Interview state management
- **Benefit**: Better user experience, visual testing, production-ready feature, session management UI

---

## Option Evaluation

### Option A: API Endpoints

**Effort**: 45 minutes

- Implementation: 30 min (5 endpoints × 6 min each, following existing pattern)
- Testing: 10 min (API integration tests for critical paths)
- Documentation: 5 min (API endpoint documentation)

**Impact**: Medium-High

- Developer experience: High (enables Postman testing, curl scripting, programmatic access)
- User experience: None (no UI yet)
- System reliability: Medium (exposes service layer, proper error handling needed)
- Strategic value: **High** (foundation for UI, enables automated testing, prerequisite for B)

**Risks**:

- API design decisions might need revision after UI implementation → **Mitigation**: Use DTOs, keep flexible schema, version endpoints if needed
- Authentication/authorization not yet implemented → **Mitigation**: Add TODO comments, plan for future auth layer
- Rate limiting not in place → **Mitigation**: Acceptable for MVP, document in `.specify/memory/opportunities.md`

**Dependencies**:

- Requires: F008 service layer ✅ (complete)
- Enables: **Option B** (UI needs API), automated integration tests, programmatic interview creation
- Parallel with: Nothing (can start immediately)

**Constitutional Alignment**: ✅ Compliant

- Type Safety First: TypeScript strict mode, proper types from service layer
- Test-First Development: Can write API tests alongside implementation
- Observable Development: Reuse existing logger pattern with correlationId
- API-First Server Design: **Strongly aligned** - this IS API-first development

---

### Option B: UI Components

**Effort**: 2.5 hours

- Implementation: 2 hours (4 Vue components + composable + pages)
- Testing: 20 min (component tests for InterviewChat, integration smoke tests)
- Documentation: 10 min (usage guide)

**Impact**: High

- Developer experience: Low (doesn't help with testing/debugging)
- User experience: **Very High** (production-ready interview interface)
- System reliability: Medium (adds client-side complexity, error states)
- Strategic value: High (makes feature usable by humans, demonstrates capability)

**Risks**:

- **UI needs API anyway** → **Blocker**: Must implement A first or in parallel
- Frontend complexity (Vue 3 reactivity, state management) → **Mitigation**: Use composables pattern, keep simple
- Real-time interview flow requires polling or WebSocket → **Mitigation**: Start with polling (simpler), upgrade later
- Accessibility concerns (chat interface, keyboard nav) → **Mitigation**: Use semantic HTML, add ARIA labels

**Dependencies**:

- Requires: **Option A** (API endpoints) - **hard dependency**
- Requires: F008 service layer ✅ (complete)
- Enables: End-user interviews, visual demos, stakeholder validation
- Parallel with: Cannot start until A is complete

**Constitutional Alignment**: ✅ Compliant

- Composable-First: Logic in `useInterview.ts` composable
- Type Safety First: TypeScript components with proper typing
- Test-First Development: Pragmatic component tests (per constitution: "where valuable")
- Observable Development: Client-side error boundaries, user-friendly error messages

---

## Decision Matrix

| Criteria                    | Option A (API)        | Option B (UI)            | Winner                          |
| --------------------------- | --------------------- | ------------------------ | ------------------------------- |
| **Effort** (lower better)   | 45 min                | 2.5 hours                | **A** (3.3× faster)             |
| **Impact** (higher better)  | Medium-High           | High                     | B (better UX)                   |
| **Risk** (lower better)     | Low                   | Medium                   | **A** (simpler, fewer unknowns) |
| **Time to Value**           | Immediate             | 3+ hours                 | **A** (can test today)          |
| **Validation Speed**        | Fast (Postman/curl)   | Slow (manual UI testing) | **A** (instant API tests)       |
| **Strategic Fit**           | High (foundation)     | High (end goal)          | Tie                             |
| **Dependencies**            | None (ready now)      | **Requires A**           | **A** (unblocked)               |
| **Constitution Compliance** | ✅ Strong (API-First) | ✅ Compliant             | **A** (API-First principle)     |
| **Enables Future Work**     | **Unlocks B**         | End-user feature         | **A** (prerequisite)            |

**Overall Score**: **Option A wins decisively** (6 wins, 0 losses, 2 ties)

**Critical Insight**: Option B **cannot proceed without A** (hard dependency on API), making this a sequential decision, not a parallel one.

---

## Recommendation

**RECOMMENDED**: **Option A (API Endpoints) first, then Option B (UI Components) in Phase 2**

**Rationale**:

1. **Hard dependency**: UI components require API endpoints to function. Building B before A means rework and delay. A → B is the only viable sequence.

2. **Fastest validation**: API endpoints enable immediate testing of the F008 service layer via Postman/curl (45 min vs 3+ hours). Can validate workflow today.

3. **Constitutional alignment**: Strongly aligned with **API-First Server Design** principle. Building API before UI is the constitutional approach.

4. **Risk mitigation**: Lower complexity (follow existing pattern), fewer unknowns (no frontend reactivity issues), easier debugging (API responses vs UI state).

5. **Strategic enablement**: API endpoints unlock multiple future paths: UI development, automated tests, programmatic interview creation, integration with agent execution engine.

**Trade-offs**:

- **We gain**: Immediate testability, programmatic access, foundation for all future work, 45-minute delivery
- **We defer**: End-user UI experience (still ~3 hours away after A completes)
- **We accept**: No visual interface initially (Postman/curl only), but this enables faster iteration on API design

**Alternative**: If timeline is flexible (no immediate demos needed), implementing A first is still optimal. If stakeholder demo is urgent today, there is no shortcut - A must be built before B can work.

---

## Implementation Plan

### Phase 1: API Endpoints (Estimated: 45 minutes)

**Tasks**:

1. **Create POST /api/interview/start** (Est: 8 min)
   - Acceptance criteria: Returns sessionId, greeting, first question; validates teamId and interviewerId exist
   - Files affected: `app/server/api/interview/start.post.ts`
   - Pattern: Follow `app/server/api/agents/index.post.ts` structure
   - Calls: `startInterview(teamId, interviewerId)` from workflow service

2. **Create POST /api/interview/[id]/respond** (Est: 10 min)
   - Acceptance criteria: Accepts response text, returns nextQuestion or completion status; handles follow-ups
   - Files affected: `app/server/api/interview/[id]/respond.post.ts`
   - Calls: `processCandidateResponse(sessionId, response)` from workflow service

3. **Create GET /api/interview/[id]** (Est: 5 min)
   - Acceptance criteria: Returns full session including transcript, profile, status
   - Files affected: `app/server/api/interview/[id].get.ts`
   - Calls: `getSession(sessionId)` from session service

4. **Create POST /api/interview/[id]/cancel** (Est: 5 min)
   - Acceptance criteria: Cancels session, returns confirmation; validates session exists
   - Files affected: `app/server/api/interview/[id]/cancel.post.ts`
   - Calls: `cancelInterview(sessionId, reason)` from workflow service

5. **Create GET /api/interviews** (Est: 5 min)
   - Acceptance criteria: Returns array of sessions filtered by teamId query param
   - Files affected: `app/server/api/interviews.get.ts`
   - Calls: `getSessionsByTeam(teamId)` from session service

6. **Write API integration tests** (Est: 10 min)
   - Acceptance criteria: Tests cover start → respond → complete flow; error cases
   - Files affected: `tests/api/interview.spec.ts`
   - Pattern: Follow `tests/api/organizations.spec.ts` structure

7. **Update API documentation** (Est: 2 min)
   - Acceptance criteria: Document all 5 endpoints with request/response examples
   - Files affected: `.specify/features/F008-hr-interview-workflow/api-docs.md` (create if needed)

**Validation Gate**: Phase 1 complete when:

- [ ] All 5 endpoints return correct HTTP status codes
- [ ] Can start interview via Postman/curl and get greeting + question
- [ ] Can submit response and receive next question or completion
- [ ] Can retrieve session data and see transcript
- [ ] Integration tests pass (add to 97 → 103+ tests)

---

### Phase 2: UI Components (Estimated: 2.5 hours) - SEQUENTIAL AFTER PHASE 1

**Tasks**:

1. **Create useInterview composable** (Est: 30 min)
   - Acceptance criteria: Manages interview state, API calls, error handling
   - Files affected: `app/composables/useInterview.ts`
   - Exports: `startInterview()`, `submitResponse()`, `getSession()`, `cancelInterview()`, reactive state

2. **Create InterviewChat.vue component** (Est: 45 min)
   - Acceptance criteria: Chat UI with message history, input field, loading states, error display
   - Files affected: `app/components/InterviewChat.vue`
   - Uses: `useInterview` composable, Nuxt UI components

3. **Create interview detail page** (Est: 30 min)
   - Acceptance criteria: Displays active interview, embeds InterviewChat, shows profile progress
   - Files affected: `app/pages/interviews/[id].vue`

4. **Create interview list page** (Est: 20 min)
   - Acceptance criteria: Lists all interviews by team, filter by status, navigate to detail
   - Files affected: `app/pages/interviews/index.vue`

5. **Write component tests** (Est: 20 min)
   - Acceptance criteria: Test InterviewChat interaction, composable state management
   - Files affected: `tests/components/InterviewChat.spec.ts`, `tests/composables/useInterview.spec.ts`

6. **UI documentation** (Est: 5 min)
   - Acceptance criteria: Usage guide, screenshots, navigation flow
   - Files affected: `.specify/features/F008-hr-interview-workflow/ui-guide.md`

**Validation Gate**: Phase 2 complete when:

- [ ] Can start interview from browser UI
- [ ] Can have multi-turn conversation with clear message display
- [ ] Can see profile building in real-time
- [ ] Error states display user-friendly messages
- [ ] Can cancel interview and return to list

---

### Next Actions (Start Immediately)

**First concrete step**:

```bash
# Create the first API endpoint
create_file app/server/api/interview/start.post.ts
```

**Why this first**:

- Start endpoint is the entry point for all interviews
- Tests entire workflow initialization
- Unblocks subsequent endpoints (respond needs active session from start)
- Follows existing API pattern (easy 8-minute task)

**Estimated completion**: 45 minutes for Phase 1 complete, 3+ hours for Phase 2 after that

---

## Risk Assessment

**Technical Risks**:

- **API design changes after UI feedback**: UI may reveal missing fields or awkward flows → **Mitigation**: Use DTOs (Data Transfer Objects), keep response schema flexible, document versioning strategy in first endpoint

- **Error handling inconsistency**: Different endpoints might handle errors differently → **Mitigation**: Create shared error response type, follow existing pattern in `app/server/api/agents/index.post.ts`

- **Session state race conditions**: Concurrent requests to same session could cause issues → **Mitigation**: Acceptable for MVP (single user per interview), document in `.specify/memory/opportunities.md` for future locking mechanism

- **LLM service integration**: Real LLM calls vs mocked responses in tests → **Mitigation**: Keep mock pattern from service layer tests, add integration test flag for optional real LLM tests

**Assumptions We're Making**:

- **Assumption 1**: Existing API authentication pattern (if any) will work for interview endpoints → **Verify by**: Check how other endpoints handle auth, add TODO comments if auth needed

- **Assumption 2**: In-memory session storage is acceptable for MVP → **Verify by**: Confirm with stakeholders that losing sessions on server restart is okay initially

- **Assumption 3**: Polling (not WebSocket) is sufficient for UI → **Verify by**: Test UI responsiveness with polling, document upgrade path if too slow

**Unknowns to Research**:

- [ ] **Does Nuxt 3 API have built-in request validation?** - Estimated research time: 10 min (check h3 docs)
- [ ] **What's the best pattern for DTO validation in this codebase?** - Estimated research time: 5 min (grep for existing validation examples)
- [ ] **Should we use Nuxt UI components or custom?** - Estimated research time: 15 min (check if Nuxt UI is already installed)

**Derisking Strategies**:

1. **Start with smallest endpoint (GET /api/interview/[id])**: Simple read operation, no complex logic, validates API pattern works
2. **Write POST /api/interview/start test first**: Ensures service layer integration works before building all endpoints
3. **Create UI mockup before implementation**: Quick Figma/sketch to validate UX flow, avoid rework

---

## Ready-to-Use Todo List

Copy this to your task tracker:

**Phase 1: API Endpoints (45 min total):**

- [ ] **Create POST /api/interview/start** - Initialize interview session (Est: 8 min)
  - Files: `app/server/api/interview/start.post.ts`
  - Done when: Returns sessionId, greeting, first question; validates team/interviewer

- [ ] **Create POST /api/interview/[id]/respond** - Submit candidate response (Est: 10 min)
  - Files: `app/server/api/interview/[id]/respond.post.ts`
  - Done when: Accepts response, returns next question or completion; handles follow-ups

- [ ] **Create GET /api/interview/[id]** - Retrieve session details (Est: 5 min)
  - Files: `app/server/api/interview/[id].get.ts`
  - Done when: Returns full session with transcript, profile, status

- [ ] **Create POST /api/interview/[id]/cancel** - Cancel interview (Est: 5 min)
  - Files: `app/server/api/interview/[id]/cancel.post.ts`
  - Done when: Cancels session, returns confirmation

- [ ] **Create GET /api/interviews** - List interviews by team (Est: 5 min)
  - Files: `app/server/api/interviews.get.ts`
  - Done when: Returns filtered array by teamId query param

- [ ] **Write API integration tests** - Test critical flows (Est: 10 min)
  - Files: `tests/api/interview.spec.ts`
  - Done when: start → respond → complete flow tested; error cases covered

- [ ] **Document API endpoints** - Request/response examples (Est: 2 min)
  - Files: `.specify/features/F008-hr-interview-workflow/api-docs.md`
  - Done when: All 5 endpoints documented with examples

**Phase 2: UI Components (2.5 hours total) - START AFTER PHASE 1:**

- [ ] **Create useInterview composable** - Interview state management (Est: 30 min)
  - Files: `app/composables/useInterview.ts`
  - Done when: Exports startInterview, submitResponse, getSession, cancelInterview functions

- [ ] **Create InterviewChat.vue** - Chat interface component (Est: 45 min)
  - Files: `app/components/InterviewChat.vue`
  - Done when: Message history, input field, loading states, error display working

- [ ] **Create interview detail page** - Active interview view (Est: 30 min)
  - Files: `app/pages/interviews/[id].vue`
  - Done when: Displays interview, embeds chat, shows profile progress

- [ ] **Create interview list page** - All interviews view (Est: 20 min)
  - Files: `app/pages/interviews/index.vue`
  - Done when: Lists interviews by team, filters by status, navigation works

- [ ] **Write component tests** - Test UI interactions (Est: 20 min)
  - Files: `tests/components/InterviewChat.spec.ts`, `tests/composables/useInterview.spec.ts`
  - Done when: Chat interaction and composable state management tested

- [ ] **Create UI documentation** - Usage guide (Est: 5 min)
  - Files: `.specify/features/F008-hr-interview-workflow/ui-guide.md`
  - Done when: Usage flow, screenshots, navigation documented

**Total Estimated Time**: 45 min (Phase 1) + 2.5 hours (Phase 2) = 3.25 hours

**Validation**: Phase 1 complete when Postman tests work; Phase 2 complete when browser UI works end-to-end
