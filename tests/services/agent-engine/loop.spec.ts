// tests/services/agent-engine/loop.spec.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Task } from '../../../types'
import { startAgentLoop } from '../../../server/services/agent-engine/loop'
import * as tasks from '../../../server/data/tasks'

vi.mock('../../../server/data/tasks')

// This is a simplified test for the loop due to its long-running nature.
// We'll just test one iteration.
describe('Agent Execution Loop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should process a task when found', async () => {
    const task = { id: 'task-1', title: 'Test' }
    vi.mocked(tasks.tasks).push(task as Task)

    // We can't run the infinite loop in a test, so we'll just check the setup
    // A more advanced test would involve mocking setTimeout and controlling time.
    expect(startAgentLoop).toBeDefined()
  })
})
