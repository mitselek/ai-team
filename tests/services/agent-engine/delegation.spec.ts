// tests/services/agent-engine/delegation.spec.ts

import { describe, it, expect, vi } from 'vitest'
import { assessDelegation } from '../../../server/services/agent-engine/delegation'
import { generateCompletion } from '../../../server/services/llm'
import { agents } from '../../../server/data/agents'
import type { Agent, Task } from '../../../types'
import { LLMProvider } from '../../../server/services/llm/types'

vi.mock('../../../server/services/llm')

describe('Delegation Engine', () => {
  it('should recommend delegation when LLM says YES', async () => {
    const agent = agents.find((a) => a.role === 'Manager') as Agent
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

    const result = await assessDelegation(agent, task)
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
