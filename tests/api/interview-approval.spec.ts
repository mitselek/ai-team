import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { createApp, toNodeListener, createRouter, eventHandler } from 'h3'
import supertest from 'supertest'
import { mkdir, writeFile, rm } from 'fs/promises'
import path from 'path'
import approvePromptHandler from '../../app/server/api/interview/[id]/approve-prompt.post'
import rejectPromptHandler from '../../app/server/api/interview/[id]/reject-prompt.post'
import editPromptHandler from '../../app/server/api/interview/[id]/edit-prompt.post'
import { interviewSessions, createSession } from '../../app/server/services/interview/session'
import type { InterviewSession } from '../../app/server/services/interview/types'
import type { Agent } from '@@/types'

// Mock the logger to avoid console noise
vi.mock('../../app/server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis()
  }),
  newCorrelationId: () => 'test-correlation-id'
}))

// Mock persistence layer to avoid filesystem operations
vi.mock('../../app/server/services/persistence/filesystem', () => ({
  saveInterview: vi.fn().mockResolvedValue(undefined),
  loadInterview: vi.fn().mockResolvedValue(null),
  saveAgent: vi.fn().mockResolvedValue(undefined),
  loadAgent: vi.fn().mockResolvedValue(null)
}))

const app = createApp()
const router = createRouter()

router.post('/api/interview/:id/approve-prompt', eventHandler(approvePromptHandler))
router.post('/api/interview/:id/reject-prompt', eventHandler(rejectPromptHandler))
router.post('/api/interview/:id/edit-prompt', eventHandler(editPromptHandler))
app.use(router)

const server = supertest(toNodeListener(app))

const TEST_DATA_DIR = path.resolve(process.cwd(), 'test-data')
process.env.TEST_DATA_DIR = TEST_DATA_DIR

const createTestSession = async (
  initialState: InterviewSession['currentState']
): Promise<InterviewSession> => {
  const orgId = 'test-org-id'
  const interviewerId = 'test-interviewer-id'
  const agentDir = path.join(TEST_DATA_DIR, orgId, 'agents')
  await mkdir(agentDir, { recursive: true })
  const agent: Agent = {
    id: interviewerId,
    organizationId: orgId,
    name: 'Test Interviewer',
    role: 'HR Manager',
    status: 'active',
    teamId: 'test-team-id',
    seniorId: null,
    tokenAllocation: 1000,
    tokenUsed: 0,
    createdAt: new Date(),
    lastActiveAt: new Date(),
    systemPrompt: ''
  }
  await writeFile(path.join(agentDir, `${interviewerId}.json`), JSON.stringify(agent))

  const session = createSession('test-team-id', interviewerId)
  session.currentState = initialState
  session.candidateProfile = {
    role: '',
    expertise: [],
    preferences: {
      communicationStyle: '',
      workingHours: '',
      autonomyLevel: ''
    },
    personality: {
      traits: [],
      tone: ''
    }
  }
  return session
}

afterAll(async () => {
  await rm(TEST_DATA_DIR, { recursive: true, force: true })
})

describe('POST /api/interview/[id]/approve-prompt', () => {
  let testSession: InterviewSession

  beforeEach(async () => {
    // Clear sessions before each test
    interviewSessions.length = 0
    testSession = await createTestSession('review_prompt')
    interviewSessions.push(testSession)
  })

  it('should transition to test_conversation state on success', async () => {
    const response = await server.post(`/api/interview/${testSession.id}/approve-prompt`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true })

    const updatedSession = interviewSessions.find((s) => s.id === testSession.id)
    expect(updatedSession?.currentState).toBe('test_conversation')
    expect(updatedSession?.exchangesInCurrentState).toBe(0)
  })

  it('should return 400 if not in review_prompt state', async () => {
    // Set session to a different state
    const sessionInWrongState = await createTestSession('greet')
    interviewSessions.push(sessionInWrongState)

    const response = await server.post(`/api/interview/${sessionInWrongState.id}/approve-prompt`)

    expect(response.status).toBe(400)
    expect(response.body.error).toContain("Cannot approve prompt in state 'greet'")

    const notUpdatedSession = interviewSessions.find((s) => s.id === sessionInWrongState.id)
    expect(notUpdatedSession?.currentState).toBe('greet')
  })

  it('should return 404 if session not found', async () => {
    const nonExistentId = 'non-existent-session-id'
    const response = await server.post(`/api/interview/${nonExistentId}/approve-prompt`)

    expect(response.status).toBe(404)
    expect(response.body?.error || '').toContain('not found')
  })

  it('should return 400 if interviewId is missing', async () => {
    // H3 and supertest don't really allow for a missing param in this setup,
    // but we can simulate the handler being called without context.params.id
    const appWithoutParam = createApp()
    appWithoutParam.use('/api/interview/approve-prompt', (event) => {
      // Manually remove the id from context to simulate a routing issue
      delete event.context.params?.id
      return approvePromptHandler(event)
    })
    const serverWithoutParam = supertest(toNodeListener(appWithoutParam))

    const response = await serverWithoutParam.post('/api/interview/approve-prompt')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'interviewId is required' })
  })
})

describe('POST /api/interview/[id]/reject-prompt', () => {
  let testSession: InterviewSession

  beforeEach(async () => {
    // Clear sessions before each test
    interviewSessions.length = 0
    testSession = await createTestSession('review_prompt')
    interviewSessions.push(testSession)
  })

  it('should transition back to finalize state on success', async () => {
    const response = await server.post(`/api/interview/${testSession.id}/reject-prompt`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true })

    const updatedSession = interviewSessions.find((s) => s.id === testSession.id)
    expect(updatedSession?.currentState).toBe('finalize')
  })

  it('should return 400 if not in review_prompt state', async () => {
    const sessionInWrongState = await createTestSession('greet')
    interviewSessions.push(sessionInWrongState)

    const response = await server.post(`/api/interview/${sessionInWrongState.id}/reject-prompt`)

    expect(response.status).toBe(400)
    expect(response.body.error).toContain("Cannot reject prompt in state 'greet'")
  })

  it('should return 404 if session not found', async () => {
    const nonExistentId = 'non-existent-session-id'
    const response = await server.post(`/api/interview/${nonExistentId}/reject-prompt`)

    expect(response.status).toBe(404)
    expect(response.body?.error || '').toContain('not found')
  })
})

describe('POST /api/interview/[id]/edit-prompt', () => {
  let testSession: InterviewSession

  beforeEach(async () => {
    interviewSessions.length = 0
    testSession = await createTestSession('review_prompt')
    testSession.candidateProfile.systemPrompt = 'Initial prompt'
    interviewSessions.push(testSession)
  })

  it('should update the prompt and stay in review_prompt state', async () => {
    const newPrompt = 'This is the updated system prompt.'
    const response = await server
      .post(`/api/interview/${testSession.id}/edit-prompt`)
      .send({ prompt: newPrompt })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true })

    const updatedSession = interviewSessions.find((s) => s.id === testSession.id)
    expect(updatedSession?.currentState).toBe('review_prompt')
    expect(updatedSession?.candidateProfile.systemPrompt).toBe(newPrompt)
  })

  it('should return 400 if prompt is missing from body', async () => {
    const response = await server.post(`/api/interview/${testSession.id}/edit-prompt`).send({})

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('prompt is required')
  })

  it('should return 400 if not in review_prompt state', async () => {
    const sessionInWrongState = await createTestSession('greet')
    interviewSessions.push(sessionInWrongState)
    const newPrompt = 'This is the updated system prompt.'

    const response = await server
      .post(`/api/interview/${sessionInWrongState.id}/edit-prompt`)
      .send({ prompt: newPrompt })

    expect(response.status).toBe(400)
    expect(response.body.error).toContain("Cannot edit prompt in state 'greet'")
  })

  it('should return 404 if session not found', async () => {
    const nonExistentId = 'non-existent-session-id'
    const newPrompt = 'This is the updated system prompt.'
    const response = await server
      .post(`/api/interview/${nonExistentId}/edit-prompt`)
      .send({ prompt: newPrompt })

    expect(response.status).toBe(404)
    expect(response.body?.error || '').toContain('not found')
  })
})
