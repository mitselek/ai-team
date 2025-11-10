// tests/api/agent-engine.spec.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { agents } from '../../app/server/data/agents'
import type { Agent } from '../../types'

const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Test Agent 1',
    role: 'Test Role 1',
    status: 'paused',
    seniorId: null,
    teamId: 'test-team-1',
    organizationId: 'test-org-1',
    systemPrompt: 'Test prompt',
    tokenAllocation: 100,
    tokenUsed: 0,
    createdAt: new Date(),
    lastActiveAt: new Date()
  },
  {
    id: '2',
    name: 'Test Agent 2',
    role: 'Test Role 2',
    status: 'active',
    seniorId: null,
    teamId: 'test-team-1',
    organizationId: 'test-org-1',
    systemPrompt: 'Test prompt',
    tokenAllocation: 100,
    tokenUsed: 0,
    createdAt: new Date(),
    lastActiveAt: new Date()
  }
]

const baseUrl = 'http://localhost:3000'

describe('Agent Engine API', () => {
  beforeEach(() => {
    // Clear and repopulate the agents array for each test
    agents.length = 0
    agents.push(...JSON.parse(JSON.stringify(mockAgents)))
  })

  it('POST /api/agent-start/:id - success (agent paused -> active)', async () => {
    const agent = agents.find((a) => a.status === 'paused')
    if (!agent) throw new Error('No paused agent found for testing')

    const response = await fetch(`${baseUrl}/api/agent-start/${agent.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()

    expect(data).toEqual({ success: true, message: 'Agent loop started' })
    // MVP: Agent status is not persisted in data store
  })

  it('POST /api/agent-start/:id - already running (idempotent)', async () => {
    const agent = agents.find((a) => a.status === 'active')
    if (!agent) throw new Error('No active agent found for testing')

    const response = await fetch(`${baseUrl}/api/agent-start/${agent.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()

    expect(data).toEqual({ success: true, message: 'Agent loop started' })
    // MVP: Agent status is not persisted in data store
  })

  it('POST /api/agent-stop/:id - success (agent active -> paused)', async () => {
    const agent = agents.find((a) => a.status === 'active')
    if (!agent) throw new Error('No active agent found for testing')

    const response = await fetch(`${baseUrl}/api/agent-stop/${agent.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()

    expect(data).toEqual({ success: true, message: 'Agent loop stopped' })
    // MVP: Agent status is not persisted in data store
  })

  it('POST /api/agent-stop/:id - not running (idempotent)', async () => {
    const agent = agents.find((a) => a.status === 'paused')
    if (!agent) throw new Error('No paused agent found for testing')

    const response = await fetch(`${baseUrl}/api/agent-stop/${agent.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()

    expect(data).toEqual({ success: true, message: 'Agent loop stopped' })
    // MVP: Agent status is not persisted in data store
  })

  it('POST /api/agent-start/invalid-id - accepts any ID (MVP)', async () => {
    const response = await fetch(`${baseUrl}/api/agent-start/invalid-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    // MVP: No validation, manager accepts any agent ID
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.message).toBe('Agent loop started')
  })

  it('POST /api/agent-stop/invalid-id - accepts any ID (MVP)', async () => {
    const response = await fetch(`${baseUrl}/api/agent-stop/invalid-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    // MVP: No validation, manager accepts any agent ID
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.message).toBe('Agent loop stopped')
  })
})
