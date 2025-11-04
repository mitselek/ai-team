import { defineEventHandler, readBody, setResponseStatus } from 'h3'
import { randomUUID } from 'crypto'
import { tasks } from '../../data/tasks'
import type { Task, TaskPriority } from '../../../types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const requiredFields = ['title', 'description', 'assignedToId', 'createdById', 'organizationId', 'priority']
  for (const field of requiredFields) {
    if (!body[field]) {
      setResponseStatus(event, 400)
      return { error: `Missing required field: ${field}` }
    }
  }

  const now = new Date()
  const newTask: Task = {
    id: randomUUID(),
    title: body.title,
    description: body.description,
    assignedToId: body.assignedToId,
    createdById: body.createdById,
    organizationId: body.organizationId,
    priority: body.priority as TaskPriority,
    status: 'pending',
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  tasks.push(newTask)
  setResponseStatus(event, 201)
  return newTask
})