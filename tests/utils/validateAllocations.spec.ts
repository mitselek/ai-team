import { describe, it, expect } from 'vitest'
import { validateAllocations } from '@/utils/validateAllocations'

describe('validateAllocations', () => {
  it('returns valid when total <= max', () => {
    const res = validateAllocations(
      [
        { name: 'A', allocation: 200_000 },
        { name: 'B', allocation: 300_000 }
      ],
      600_000
    )
    expect(res.valid).toBe(true)
    expect(res.total).toBe(500_000)
    expect(res.remaining).toBe(100_000)
    expect(res.overflow).toBe(0)
  })

  it('returns overflow when total > max', () => {
    const res = validateAllocations(
      [
        { name: 'A', allocation: 400_000 },
        { name: 'B', allocation: 400_000 }
      ],
      700_000
    )
    expect(res.valid).toBe(false)
    expect(res.total).toBe(800_000)
    expect(res.overflow).toBe(100_000)
    expect(res.remaining).toBe(0)
  })
})
