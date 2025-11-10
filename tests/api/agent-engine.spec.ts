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

  it('POST /api/agents/:id/start - success (agent paused -> active)', async () => {
    const agent = agents.find((a) => a.status === 'paused')
    if (!agent) throw new Error('No paused agent found for testing')

    const response = await fetch(`${baseUrl}/api/agents/${agent.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()

    expect(data).toEqual({ success: true, message: 'Agent loop started' })
    const updatedAgent = agents.find((a) => a.id === agent.id)
    expect(updatedAgent?.status).toBe('active')
  })

  it('POST /api/agents/:id/start - already running (idempotent)', async () => {
    const agent = agents.find((a) => a.status === 'active')
    if (!agent) throw new Error('No active agent found for testing')

    const response = await fetch(`${baseUrl}/api/agents/${agent.id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()

    expect(data).toEqual({ success: true, message: 'Agent loop started' })
    const updatedAgent = agents.find((a) => a.id === agent.id)
    expect(updatedAgent?.status).toBe('active')
  })

  it('POST /api/agents/:id/stop - success (agent active -> paused)', async () => {
    const agent = agents.find((a) => a.status === 'active')
    if (!agent) throw new Error('No active agent found for testing')

    const response = await fetch(`${baseUrl}/api/agents/${agent.id}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()

    expect(data).toEqual({ success: true, message: 'Agent loop stopped' })
    const updatedAgent = agents.find((a) => a.id === agent.id)
    expect(updatedAgent?.status).toBe('paused')
  })

  it('POST /api/agents/:id/stop - not running (idempotent)', async () => {
    const agent = agents.find((a) => a.status === 'paused')
    if (!agent) throw new Error('No paused agent found for testing')

    const response = await fetch(`${baseUrl}/api/agents/${agent.id}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await response.json()

    expect(data).toEqual({ success: true, message: 'Agent loop stopped' })
    const updatedAgent = agents.find((a) => a.id === agent.id)
    expect(updatedAgent?.status).toBe('paused')
  })

  it('POST /api/agents/invalid-id/start - 404 error', async () => {
    const response = await fetch(`${baseUrl}/api/agents/invalid-id/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.success).toBe(false)
  })

  it('POST /api/agents/invalid-id/stop - 404 error', async () => {
    const response = await fetch(`${baseUrl}/api/agents/invalid-id/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.success).toBe(false)
  })
})
