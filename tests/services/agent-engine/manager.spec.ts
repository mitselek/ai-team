// tests/services/agent-engine/manager.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as manager from '../../../server/services/agent-engine/manager'
import * as loop from '../../../server/services/agent-engine/loop'
import { agents } from '../../../server/data/agents'

vi.mock('../../../server/services/agent-engine/loop')

describe('Agent Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start all active agents', async () => {
    const startAgentLoopSpy = vi.spyOn(loop, 'startAgentLoop')
    await manager.startAll()
    const activeAgents = agents.filter((a) => a.status === 'active')
    expect(startAgentLoopSpy).toHaveBeenCalledTimes(activeAgents.length)
  })

  it('should stop an agent', async () => {
    const agent = agents[0]
    agent.status = 'active'

    // Can't directly test the stop mechanism without a running loop,
    // but we can check if it attempts to set the status to 'paused'.
    await manager.start(agent.id)
    await manager.stop(agent.id)
    expect(agent.status).toBe('paused')
  })
})
