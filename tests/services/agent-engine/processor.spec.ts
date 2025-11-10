// tests/services/agent-engine/processor.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processTask } from '../../../server/services/agent-engine/processor'
import { generateCompletion } from '../../../server/services/llm'
import { assessDelegation } from '../../../server/services/agent-engine/delegation'
import type { Agent, Task } from '../../../types'
import { LLMProvider } from '../../../server/services/llm/types'

vi.mock('../../../server/services/llm')
vi.mock('../../../server/services/agent-engine/delegation')
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

describe('Task Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const agent: Agent = {
    id: 'agent-1',
    name: 'Test Agent',
    role: 'Worker',
    status: 'active',
    organizationId: 'org-1',
    tokenAllocation: 1000,
    tokenUsed: 0,
    createdAt: new Date(),
    lastActiveAt: new Date(),
    teamId: 'team-1',
    seniorId: null,
    systemPrompt: ''
  }

  const task: Task = {
    id: 'task-1',
    title: 'Test task',
    description: 'A task for testing',
    status: 'pending',
    priority: 'medium',
    organizationId: 'org-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    assignedToId: '',
    createdById: ''
  }

  it('should process a task and mark it as completed', async () => {
    vi.mocked(assessDelegation).mockResolvedValue(false)
    vi.mocked(generateCompletion).mockResolvedValue({
      content: 'Task completed successfully.',
      tokensUsed: { total: 50, input: 20, output: 30 },
      provider: LLMProvider.ANTHROPIC,
      model: 'mock',
      finishReason: 'stop'
    })

    await processTask(agent, task)

    expect(task.status).toBe('completed')
    expect(task.result).toBe('Task completed successfully.')
    expect(agent.tokenUsed).toBe(50)
  })

  it('should handle task processing failure', async () => {
    vi.mocked(assessDelegation).mockResolvedValue(false)
    vi.mocked(generateCompletion).mockRejectedValue(new Error('LLM Error'))

    await processTask(agent, task)

    expect(task.status).toBe('blocked')
    expect(task.result).toBe('Error: LLM Error')
  })
})
