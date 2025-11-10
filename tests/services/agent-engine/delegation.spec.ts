// tests/services/agent-engine/delegation.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { assessDelegation } from '../../../server/services/agent-engine/delegation'
import { generateCompletion } from '../../../server/services/llm'
import { agents } from '../../../server/data/agents'
import type { Agent, Task } from '../../../types'
import { LLMProvider } from '../../../server/services/llm/types'

vi.mock('../../../server/services/llm')
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
    id: 'manager-1',
    name: 'Manager Agent',
    role: 'Manager',
    status: 'active',
    seniorId: null,
    teamId: 'team-1',
    organizationId: 'org-1',
    systemPrompt: 'You are a manager',
    tokenAllocation: 100,
    tokenUsed: 0,
    createdAt: new Date(),
    lastActiveAt: new Date()
  },
  {
    id: 'subordinate-1',
    name: 'Subordinate Agent',
    role: 'Engineer',
    status: 'active',
    seniorId: 'manager-1',
    teamId: 'team-1',
    organizationId: 'org-1',
    systemPrompt: 'You are an engineer',
    tokenAllocation: 50,
    tokenUsed: 0,
    createdAt: new Date(),
    lastActiveAt: new Date()
  }
]

describe('Delegation Engine', () => {
  beforeEach(() => {
    // Clear and repopulate the agents array for each test
    agents.length = 0
    agents.push(...JSON.parse(JSON.stringify(mockAgents)))
    vi.clearAllMocks()
  })

  it('should recommend delegation when LLM says YES', async () => {
    const manager = agents.find((a) => a.role === 'Manager') as Agent
    const task: Task = {
      id: 'task-1',
      title: 'Complex task',
      description: 'A very complex task',
      status: 'pending',
      priority: 'high',
      organizationId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      assignedToId: '',
      createdById: ''
    }

    vi.mocked(generateCompletion).mockResolvedValue({
      content: 'YES, this task is complex and should be delegated.',
      tokensUsed: { total: 10, input: 5, output: 5 },
      provider: LLMProvider.ANTHROPIC,
      model: 'mock',
      finishReason: 'stop'
    })

    const result = await assessDelegation(manager, task)
    expect(result).toBe(true)
  })

  it('should not recommend delegation when LLM says NO', async () => {
    const agent = agents.find((a) => a.role === 'Manager') as Agent
    const task: Task = {
      id: 'task-1',
      title: 'Simple task',
      description: 'A very simple task',
      status: 'pending',
      priority: 'low',
      organizationId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      assignedToId: '',
      createdById: ''
    }

    vi.mocked(generateCompletion).mockResolvedValue({
      content: 'NO, this task is simple and can be handled directly.',
      tokensUsed: { total: 10, input: 5, output: 5 },
      provider: LLMProvider.ANTHROPIC,
      model: 'mock',
      finishReason: 'stop'
    })

    const result = await assessDelegation(agent, task)
    expect(result).toBe(false)
  })
})
