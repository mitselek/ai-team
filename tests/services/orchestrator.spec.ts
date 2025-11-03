import { describe, it, expect, vi } from 'vitest'
import {
  AgentTaskQueue,
  detectBoredom,
  detectStuck,
  trackTokenUsage
} from '../../server/services/orchestrator'
import type { Agent, Task, Organization } from '../../types'

// Mock the logger to avoid stream.write errors in tests
vi.mock('../../server/utils/logger', () => ({
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

describe('AgentTaskQueue', () => {
  it('should enqueue and dequeue tasks in FIFO order', () => {
    const queue = new AgentTaskQueue('agent-1')
    
    const task1: Task = {
      id: 'task-1',
      title: 'First Task',
      description: 'First',
      status: 'pending',
      priority: 'medium',
      assignedToId: 'agent-1',
      createdById: 'agent-0',
      organizationId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null
    }

    const task2: Task = {
      id: 'task-2',
      title: 'Second Task',
      description: 'Second',
      status: 'pending',
      priority: 'high',
      assignedToId: 'agent-1',
      createdById: 'agent-0',
      organizationId: 'org-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null
    }

    queue.enqueue(task1)
    queue.enqueue(task2)
    
    expect(queue.size()).toBe(2)
    expect(queue.dequeue()?.id).toBe('task-1')
    expect(queue.dequeue()?.id).toBe('task-2')
    expect(queue.isEmpty()).toBe(true)
  })
})

describe('detectBoredom', () => {
  it('should detect bored agent (inactive > 10 min)', () => {
    const agent: Agent = {
      id: 'agent-1',
      name: 'Test Agent',
      role: 'worker',
      seniorId: null,
      teamId: 'team-1',
      organizationId: 'org-1',
      systemPrompt: 'You are a test agent',
      tokenAllocation: 10000,
      tokenUsed: 0,
      status: 'active',
      createdAt: new Date(),
      lastActiveAt: new Date(Date.now() - 11 * 60 * 1000) // 11 minutes ago
    }

    expect(detectBoredom(agent)).toBe(true)
  })

  it('should not detect bored agent (active recently)', () => {
    const agent: Agent = {
      id: 'agent-1',
      name: 'Test Agent',
      role: 'worker',
      seniorId: null,
      teamId: 'team-1',
      organizationId: 'org-1',
      systemPrompt: 'You are a test agent',
      tokenAllocation: 10000,
      tokenUsed: 0,
      status: 'active',
      createdAt: new Date(),
      lastActiveAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    }

    expect(detectBoredom(agent)).toBe(false)
  })
})

describe('detectStuck', () => {
  it('should detect stuck task (in-progress > 30 min)', () => {
    const task: Task = {
      id: 'task-1',
      title: 'Stuck Task',
      description: 'This task is stuck',
      status: 'in-progress',
      priority: 'high',
      assignedToId: 'agent-1',
      createdById: 'agent-0',
      organizationId: 'org-1',
      createdAt: new Date(Date.now() - 35 * 60 * 1000),
      updatedAt: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
      completedAt: null
    }

    expect(detectStuck(task)).toBe(true)
  })

  it('should not detect stuck for completed tasks', () => {
    const task: Task = {
      id: 'task-1',
      title: 'Done Task',
      description: 'This task is done',
      status: 'completed',
      priority: 'high',
      assignedToId: 'agent-1',
      createdById: 'agent-0',
      organizationId: 'org-1',
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 60 * 60 * 1000),
      completedAt: new Date()
    }

    expect(detectStuck(task)).toBe(false)
  })
})

describe('trackTokenUsage', () => {
  it('should update agent and org token pools', () => {
    const agent: Agent = {
      id: 'agent-1',
      name: 'Test Agent',
      role: 'worker',
      seniorId: null,
      teamId: 'team-1',
      organizationId: 'org-1',
      systemPrompt: '',
      tokenAllocation: 10000,
      tokenUsed: 1000,
      status: 'active',
      createdAt: new Date(),
      lastActiveAt: new Date()
    }

    const org: Organization = {
      id: 'org-1',
      name: 'Test Org',
      githubRepoUrl: 'https://github.com/test/org',
      tokenPool: 1000000,
      rootAgentId: null,
      createdAt: new Date()
    }

    const result = trackTokenUsage(agent, org, 500)

    expect(result.updatedAgent.tokenUsed).toBe(1500)
    expect(result.updatedOrganization.tokenPool).toBe(999500)
  })
})
