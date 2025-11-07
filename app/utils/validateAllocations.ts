export interface AllocationItem {
  name: string
  allocation: number
}

export interface AllocationResult {
  total: number
  overflow: number
  remaining: number
  valid: boolean
}

/**
 * Validates a set of allocation items against a maximum pool.
 * Returns aggregate totals and overflow info.
 */
export function validateAllocations(items: AllocationItem[], max: number): AllocationResult {
  const total = items.reduce((sum, i) => sum + i.allocation, 0)
  const overflow = total > max ? total - max : 0
  return {
    total,
    overflow,
    remaining: Math.max(max - total, 0),
    valid: overflow === 0
  }
}
