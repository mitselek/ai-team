import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3'
import { tasks } from '../../data/tasks'

export default defineEventHandler((event) => {
  const taskId = getRouterParam(event, 'id')

  const taskIndex = tasks.findIndex(t => t.id === taskId)

  if (taskIndex === -1) {
    setResponseStatus(event, 404)
    return { error: 'Task not found' }
  }

  tasks.splice(taskIndex, 1)

  setResponseStatus(event, 204)
  return undefined
})
