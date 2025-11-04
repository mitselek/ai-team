import { defineEventHandler, getQuery } from 'h3'
import { tasks } from '../../data/tasks'
import type { Task } from '../../../types'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  let filteredTasks = [...tasks]

  if (query.organizationId) {
    filteredTasks = filteredTasks.filter(t => t.organizationId === query.organizationId)
  }
  if (query.assignedToId) {
    filteredTasks = filteredTasks.filter(t => t.assignedToId === query.assignedToId)
  }
  if (query.createdById) {
    filteredTasks = filteredTasks.filter(t => t.createdById === query.createdById)
  }
  if (query.status) {
    filteredTasks = filteredTasks.filter(t => t.status === query.status)
  }
  if (query.priority) {
    filteredTasks = filteredTasks.filter(t => t.priority === query.priority)
  }

  return filteredTasks
})