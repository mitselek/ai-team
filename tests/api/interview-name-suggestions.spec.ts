import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createApp, toNodeListener, createRouter, eventHandler } from 'h3'
import supertest from 'supertest'
import nameSuggestionsHandler from '../../app/server/api/interview/[id]/name-suggestions.get'
import { interviewSessions } from '../../app/server/services/interview/session'
import type { InterviewSession } from '../../app/server/services/interview/types'

// Mock the logger
vi.mock('../../app/server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  })
}))

const app = createApp()
const router = createRouter()
router.get('/api/interview/:id/name-suggestions', eventHandler(nameSuggestionsHandler))
app.use(router)
const server = supertest(toNodeListener(app))

const createTestSession = (
  id: string,
  currentState: InterviewSession['currentState'],
  options?: { withDraft?: boolean; names?: string[] }
): InterviewSession => {
  const session: InterviewSession = {
    id,
    candidateId: 'test-candidate',
    teamId: 'test-team',
    interviewerId: 'test-interviewer',
    status: 'active',
    currentState,
    candidateProfile: {
      role: 'Software Engineer',
      expertise: ['TypeScript', 'Nuxt'],
      preferences: {
        communicationStyle: 'Direct',
        workingHours: 'Flexible',
        autonomyLevel: 'High'
      },
      personality: {
        traits: ['analytical', 'detail-oriented'],
        tone: 'professional'
      }
    },
    transcript: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    testConversationHistory: [],
    exchangesInCurrentState: 0
  }

  if (options?.withDraft) {
    session.agentDraft = {
      profile: session.candidateProfile,
      draftPrompt: 'You are a helpful TypeScript developer.',
      suggestedNames: options.names || ['Alex', 'Jordan', 'Casey']
    }
  }

  return session
}

describe('GET /api/interview/[id]/name-suggestions', () => {
  beforeEach(() => {
    // Clear all sessions before each test
    interviewSessions.length = 0
  })

  it('1. Get name suggestions successfully', async () => {
    const session = createTestSession('session-1', 'assign_details', {
      withDraft: true,
      names: ['Alex', 'Jordan', 'Casey']
    })
    interviewSessions.push(session)

    const response = await server.get('/api/interview/session-1/name-suggestions')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ names: ['Alex', 'Jordan', 'Casey'] })
    expect(response.body.names).toHaveLength(3)
  })

  it('2. Throw 404 if session not found', async () => {
    const response = await server.get('/api/interview/non-existent-id/name-suggestions')

    expect(response.status).toBe(404)
    expect(response.body.data.error).toBe('Interview session non-existent-id not found')
  })

  it('3. Throw 400 if interviewId is missing', async () => {
    // Note: The router setup will likely handle this before the handler,
    // but a test case ensures robustness if routing changes.
    // supertest with the current setup won't hit the handler for a URL like this.
    // We'll test the handler logic directly for this case.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = { context: { params: {} } } as any
    await expect(nameSuggestionsHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      data: { error: 'interviewId is required' }
    })
  })

  it('4. Throw 400 if not in assign_details state', async () => {
    const session = createTestSession('session-1', 'test_conversation')
    interviewSessions.push(session)

    const response = await server.get('/api/interview/session-1/name-suggestions')

    expect(response.status).toBe(400)
    expect(response.body.data.error).toBe(
      "Cannot get name suggestions in state 'test_conversation'"
    )
  })

  it('5. Throw 400 if agent draft not found', async () => {
    const session = createTestSession('session-1', 'assign_details', { withDraft: false })
    interviewSessions.push(session)

    const response = await server.get('/api/interview/session-1/name-suggestions')

    expect(response.status).toBe(400)
    expect(response.body.data.error).toBe('Agent draft not found')
  })

  it('6. Return empty array if no suggested names', async () => {
    const session = createTestSession('session-1', 'assign_details', {
      withDraft: true,
      names: []
    })
    interviewSessions.push(session)

    const response = await server.get('/api/interview/session-1/name-suggestions')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ names: [] })
  })
})
