/**
 * Workload Tracking Utility (F074)
 * Manages agent workload increment/decrement with capacity limits and logging
 */

import { createLogger } from '../utils/logger'
import type { Agent } from '@@/types'

const logger = createLogger('workload')

export const MAX_WORKLOAD_CAPACITY = 5
export const SOFT_LIMIT_THRESHOLD = 4

/**
 * Increment agent workload (when task assigned)
 * - Caps at MAX_WORKLOAD_CAPACITY (5)
 * - Logs capacity warnings
 * - Returns updated workload value
 */
export function incrementWorkload(agent: Agent, taskId?: string): number {
  const current = agent.currentWorkload ?? 0
  const newWorkload = Math.min(current + 1, MAX_WORKLOAD_CAPACITY)

  if (current >= MAX_WORKLOAD_CAPACITY) {
    logger.warn(
      {
        agentId: agent.id,
        agentName: agent.name,
        currentWorkload: current,
        maxCapacity: MAX_WORKLOAD_CAPACITY,
        taskId
      },
      '[WORKLOAD] Agent at maximum capacity - cannot increment'
    )
    return current
  }

  if (newWorkload >= SOFT_LIMIT_THRESHOLD) {
    logger.warn(
      {
        agentId: agent.id,
        agentName: agent.name,
        previousWorkload: current,
        newWorkload,
        maxCapacity: MAX_WORKLOAD_CAPACITY,
        taskId
      },
      '[WORKLOAD] Agent approaching capacity (soft limit)'
    )
  }

  logger.info(
    {
      agentId: agent.id,
      agentName: agent.name,
      previousWorkload: current,
      newWorkload,
      taskId
    },
    '[WORKLOAD] Incremented workload (task assigned)'
  )

  agent.currentWorkload = newWorkload
  return newWorkload
}

/**
 * Decrement agent workload (when task completed)
 * - Floors at 0
 * - Logs workload changes
 * - Returns updated workload value
 */
export function decrementWorkload(agent: Agent, taskId?: string): number {
  const current = agent.currentWorkload ?? 0
  const newWorkload = Math.max(current - 1, 0)

  if (current === 0) {
    logger.warn(
      {
        agentId: agent.id,
        agentName: agent.name,
        currentWorkload: current,
        taskId
      },
      '[WORKLOAD] Agent workload already at zero - cannot decrement'
    )
    return 0
  }

  logger.info(
    {
      agentId: agent.id,
      agentName: agent.name,
      previousWorkload: current,
      newWorkload,
      taskId
    },
    '[WORKLOAD] Decremented workload (task completed)'
  )

  agent.currentWorkload = newWorkload
  return newWorkload
}

/**
 * Calculate derived status from workload
 * - 0-2 tasks → idle
 * - 3 tasks → active
 * - 4-5 tasks → busy
 * - Manual offline (paused) → offline (overrides workload)
 */
export function calculateStatusFromWorkload(agent: Agent): string {
  if (agent.status === 'paused') {
    return 'offline'
  }

  const workload = agent.currentWorkload ?? 0

  if (workload <= 2) {
    return 'idle'
  } else if (workload === 3) {
    return 'active'
  } else {
    return 'busy'
  }
}

/**
 * Validate workload is within acceptable range (0-5)
 * Returns true if valid, false otherwise
 */
export function validateWorkload(workload: number): boolean {
  return workload >= 0 && workload <= MAX_WORKLOAD_CAPACITY
}

/**
 * Check if agent is at or above soft limit (4/5 capacity)
 * Used for delegation decisions
 */
export function isNearCapacity(agent: Agent): boolean {
  const workload = agent.currentWorkload ?? 0
  return workload >= SOFT_LIMIT_THRESHOLD
}

/**
 * Check if agent is at maximum capacity (5/5)
 * Should avoid assigning new tasks to agents at max capacity
 */
export function isAtCapacity(agent: Agent): boolean {
  const workload = agent.currentWorkload ?? 0
  return workload >= MAX_WORKLOAD_CAPACITY
}
