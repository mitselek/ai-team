import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setResponseStatus, readBody, getQuery, getRouterParam } from 'h3'
import type { H3Event } from 'h3'

// Mock the logger to avoid stream.write errors
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
  }),
  newCorrelationId: () => 'test-correlation-id'
}))

// Mock h3 event handlers
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn(),
    setResponseStatus: vi.fn(),
    getQuery: vi.fn(),
    getRouterParam: vi.fn()
  }
})

import GET from '../../app/server/api/tasks/index.get'
import POST from '../../app/server/api/tasks/index.post'
import PATCH from '../../app/server/api/tasks/[id].patch'
import DELETE from '../../app/server/api/tasks/[id].delete'
import { tasks } from '../../app/server/data/tasks'
import type { Task } from '../../types'

const mockEvent = {} as H3Event

const testTask1: Task = {
  id: 'task-1',
  title: 'Implement feature X',
  description: 'Build the new feature for org-1',
  assignedToId: 'agent-1',
  createdById: 'agent-2',
  organizationId: 'org-1',
  status: 'pending',
  priority: 'high',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  completedAt: null
}

const testTask2: Task = {
  id: 'task-2',
  title: 'Review code',
  description: 'Review PR #123',
  assignedToId: 'agent-2',
  createdById: 'agent-1',
  organizationId: 'org-1',
  status: 'in-progress',
  priority: 'medium',
  createdAt: new Date('2025-01-02'),
  updatedAt: new Date('2025-01-02'),
  completedAt: null
}

const testTask3: Task = {
  id: 'task-3',
  title: 'Deploy to production',
  description: 'Deploy version 2.0',
  assignedToId: 'agent-1',
  createdById: 'agent-3',
  organizationId: 'org-2',
  status: 'completed',
  priority: 'urgent',
  createdAt: new Date('2025-01-03'),
  updatedAt: new Date('2025-01-05'),
  completedAt: new Date('2025-01-05')
}

describe('Tasks API', () => {
  beforeEach(() => {
    tasks.length = 0
    vi.clearAllMocks()
  })

  describe('GET /api/tasks', () => {
    it('should return empty array when no tasks exist', async () => {
      vi.mocked(getQuery).mockReturnValue({})
      const result = await GET(mockEvent)
      expect(result).toEqual([])
    })

    it('should return all tasks when no filters applied', async () => {
      tasks.push(testTask1, testTask2, testTask3)
      vi.mocked(getQuery).mockReturnValue({})
      const result = await GET(mockEvent)
      expect(result.length).toBe(3)
    })

    it('should filter by organizationId correctly', async () => {
      tasks.push(testTask1, testTask2, testTask3)
      vi.mocked(getQuery).mockReturnValue({ organizationId: 'org-1' })
      const result = await GET(mockEvent)
      expect(result.length).toBe(2)
      expect(result[0].organizationId).toBe('org-1')
    })

    it('should filter by assignedToId correctly', async () => {
      tasks.push(testTask1, testTask2, testTask3)
      vi.mocked(getQuery).mockReturnValue({ assignedToId: 'agent-2' })
      const result = await GET(mockEvent)
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('task-2')
    })

    it('should filter by createdById correctly', async () => {
      tasks.push(testTask1, testTask2, testTask3)
      vi.mocked(getQuery).mockReturnValue({ createdById: 'agent-3' })
      const result = await GET(mockEvent)
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('task-3')
    })

    it('should filter by status correctly', async () => {
      tasks.push(testTask1, testTask2, testTask3)
      vi.mocked(getQuery).mockReturnValue({ status: 'in-progress' })
      const result = await GET(mockEvent)
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('task-2')
    })

    it('should filter by priority correctly', async () => {
      tasks.push(testTask1, testTask2, testTask3)
      vi.mocked(getQuery).mockReturnValue({ priority: 'urgent' })
      const result = await GET(mockEvent)
      expect(result.length).toBe(1)
      expect(result[0].id).toBe('task-3')
    })

    it('should combine multiple filters (organizationId + status)', async () => {
      tasks.push(testTask1, testTask2, testTask3, {
        ...testTask1,
        id: 'task-4',
        status: 'in-progress'
      })
      vi.mocked(getQuery).mockReturnValue({ organizationId: 'org-1', status: 'in-progress' })
      const result = await GET(mockEvent)
      expect(result.length).toBe(2) // task2 and task-4
    })
  })

  interface NewTaskPayload {
    title: string
    description: string
    assignedToId: string
    createdById: string
    organizationId: string
    priority: string
  }

  describe('POST /api/tasks', () => {
    const validPayload: NewTaskPayload = {
      title: 'Test Task',
      description: 'Test description',
      assignedToId: 'agent-1',
      createdById: 'agent-2',
      organizationId: 'org-1',
      priority: 'medium'
    }

    it('should create a task with all required fields', async () => {
      vi.mocked(readBody).mockResolvedValue(validPayload)
      const result = await POST(mockEvent)

      if ('error' in result) {
        throw new Error(`Expected task, but got error: ${result.error}`)
      }

      expect(result.id).toBeTypeOf('string')
      expect(result.title).toBe(validPayload.title)
      expect(result.status).toBe('pending')
      expect(result.completedAt).toBeNull()
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
      expect(result.createdAt.getTime()).toBe(result.updatedAt.getTime())
      expect(tasks.length).toBe(1)
      expect(tasks[0]).toEqual(result)
      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 201)
    })

    const requiredFields: Array<keyof NewTaskPayload> = [
      'title',
      'description',
      'assignedToId',
      'createdById',
      'organizationId',
      'priority'
    ]
    for (const field of requiredFields) {
      it(`should return 400 when ${field} is missing`, async () => {
        const payload: Partial<NewTaskPayload> = { ...validPayload }
        delete payload[field]
        vi.mocked(readBody).mockResolvedValue(payload)
        const result = await POST(mockEvent)
        if (!('error' in result)) {
          throw new Error('Expected an error object, but got a Task.')
        }
        expect(result.error).toBe(`Missing required field: ${field}`)
        expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 400)
      })
    }
  })

  describe('PATCH /api/tasks/:id', () => {
    beforeEach(() => {
      tasks.push({ ...testTask1 })
      vi.mocked(getRouterParam).mockReturnValue('task-1')
    })

    it('should update task fields successfully', async () => {
      const updates = { title: 'New Title', status: 'in-progress' }
      vi.mocked(readBody).mockResolvedValue(updates)
      const result = await PATCH(mockEvent)

      if ('error' in result) {
        throw new Error(`Expected task, but got error: ${result.error}`)
      }

      expect(result.title).toBe('New Title')
      expect(result.status).toBe('in-progress')
      expect(result.updatedAt.getTime()).toBeGreaterThan(testTask1.updatedAt.getTime())
      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 200)
    })

    it('should set completedAt when status changes to completed', async () => {
      vi.mocked(readBody).mockResolvedValue({ status: 'completed' })
      const result = await PATCH(mockEvent)

      if ('error' in result) {
        throw new Error(`Expected task, but got error: ${result.error}`)
      }

      expect(result.status).toBe('completed')
      expect(result.completedAt).toBeInstanceOf(Date)
      if (result.completedAt === null) {
        throw new Error('Expected completedAt to be a Date, but it was null.')
      }
      expect(result.completedAt.getTime()).toBeGreaterThan(0)
    })

    it('should not change completedAt for other status changes', async () => {
      tasks[0].status = 'in-progress'
      vi.mocked(readBody).mockResolvedValue({ status: 'blocked' })
      const result = await PATCH(mockEvent)

      if ('error' in result) {
        throw new Error(`Expected task, but got error: ${result.error}`)
      }

      expect(result.status).toBe('blocked')
      expect(result.completedAt).toBeNull()
    })

    it('should return 404 when task not found', async () => {
      vi.mocked(getRouterParam).mockReturnValue('not-found')
      vi.mocked(readBody).mockResolvedValue({ title: 'New Title' })
      const result = await PATCH(mockEvent)
      if (!('error' in result)) {
        throw new Error('Expected an error object, but got a Task.')
      }
      expect(result.error).toBe('Task not found')
      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 404)
    })
  })

  describe('DELETE /api/tasks/:id', () => {
    beforeEach(() => {
      tasks.push({ ...testTask1 })
    })

    it('should delete a task successfully', async () => {
      vi.mocked(getRouterParam).mockReturnValue('task-1')
      const result = await DELETE(mockEvent)
      expect(tasks.length).toBe(0)
      expect(result).toBeUndefined()
      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 204)
    })

    it('should return 404 when task not found', async () => {
      vi.mocked(getRouterParam).mockReturnValue('not-found')
      const result = await DELETE(mockEvent)
      if (result === undefined || !('error' in result)) {
        throw new Error('Expected an error object, but got undefined or a Task.')
      }
      expect(tasks.length).toBe(1)
      expect(result.error).toBe('Task not found')
      expect(setResponseStatus).toHaveBeenCalledWith(mockEvent, 404)
    })
  })
})
