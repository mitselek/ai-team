import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as manager from '../../../app/server/services/agent-engine/manager'
import * as loop from '../../../app/server/services/agent-engine/loop'
import { agents } from '../../../app/server/data/agents'
import type { Agent } from '../../../types'

vi.mock('../../../server/services/agent-engine/loop', () => ({
  startAgentLoop: vi.fn(() => Promise.resolve())
}))

vi.mock('../../../server/utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  }))
}))

const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Test Agent 1',
    role: 'Test Role 1',
    status: 'paused',
    seniorId: null,
    teamId: 'team-1',
    organizationId: 'org-1',
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
    teamId: 'team-1',
    organizationId: 'org-1',
    systemPrompt: 'Test prompt',
    tokenAllocation: 100,
    tokenUsed: 0,
    createdAt: new Date(),
    lastActiveAt: new Date()
  }
]

describe('Agent Manager', () => {
  beforeEach(() => {
    // Clear and repopulate the agents array for each test
    agents.length = 0
    agents.push(...JSON.parse(JSON.stringify(mockAgents)))
    vi.clearAllMocks()
  })

  it('should start all active agents', async () => {
    const startAgentLoopSpy = vi.spyOn(loop, 'startAgentLoop')
    await manager.startAll()
    const activeAgents = agents.filter((a) => a.status === 'active')
    expect(startAgentLoopSpy).toHaveBeenCalledTimes(activeAgents.length)
  })

  it('should stop an agent', async () => {
    const agentToTest = agents.find((a) => a.status === 'active')
    expect(agentToTest).toBeDefined()
    if (!agentToTest) return

    await manager.stop(agentToTest.id)

    const agent = agents.find((a) => a.id === agentToTest.id)
    expect(agent?.status).toBe('paused')
  })
})
