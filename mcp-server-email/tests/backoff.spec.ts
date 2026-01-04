import { describe, it, expect, beforeEach } from 'vitest'
import { ExponentialBackoff, withExponentialBackoff } from '../src/utils/backoff'

describe('ExponentialBackoff', () => {
  let backoff: ExponentialBackoff

  beforeEach(() => {
    backoff = new ExponentialBackoff({
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 10000,
      jitterFraction: 0.2
    })
  })

  describe('getDelay', () => {
    it('attempt 0: returns ~100ms (with jitter)', () => {
      const delays = Array.from({ length: 10 }, () => backoff.getDelay(0))

      // Expected base: 100ms
      // With ±20% jitter: 80-120ms
      const avg = delays.reduce((a, b) => a + b, 0) / delays.length
      expect(avg).toBeGreaterThan(80)
      expect(avg).toBeLessThan(120)
    })

    it('attempt 1: returns ~200ms (with jitter)', () => {
      const delays = Array.from({ length: 10 }, () => backoff.getDelay(1))

      // Expected base: 200ms (100 * 2^1)
      // With ±20% jitter: 160-240ms
      const avg = delays.reduce((a, b) => a + b, 0) / delays.length
      expect(avg).toBeGreaterThan(160)
      expect(avg).toBeLessThan(240)
    })

    it('attempt 2: returns ~400ms (with jitter)', () => {
      const delays = Array.from({ length: 10 }, () => backoff.getDelay(2))

      // Expected base: 400ms (100 * 2^2)
      // With ±20% jitter: 320-480ms
      const avg = delays.reduce((a, b) => a + b, 0) / delays.length
      expect(avg).toBeGreaterThan(320)
      expect(avg).toBeLessThan(480)
    })

    it('clamps to maxDelayMs', () => {
      const smallMaxBackoff = new ExponentialBackoff({
        initialDelayMs: 100,
        maxDelayMs: 200
      })

      // Attempt 3 would be 100 * 2^3 = 800ms, but clamped to 200ms
      const delays = Array.from({ length: 10 }, () => smallMaxBackoff.getDelay(3))
      const max = Math.max(...delays)

      // With ±20% jitter on 200ms: max should be ~240ms
      expect(max).toBeLessThanOrEqual(250)
    })

    it('returns 0 for negative attempt', () => {
      expect(backoff.getDelay(-1)).toBe(0)
    })

    it('applies consistent jitter (not 0)', () => {
      const delays = Array.from({ length: 20 }, () => backoff.getDelay(1))
      const unique = new Set(delays)

      // With 20 samples, we should see multiple unique values due to jitter
      expect(unique.size).toBeGreaterThan(1)
    })
  })

  describe('shouldRetry', () => {
    it('returns true for attempt < maxRetries', () => {
      expect(backoff.shouldRetry(0)).toBe(true)
      expect(backoff.shouldRetry(1)).toBe(true)
      expect(backoff.shouldRetry(2)).toBe(true)
    })

    it('returns false for attempt >= maxRetries', () => {
      expect(backoff.shouldRetry(3)).toBe(false)
      expect(backoff.shouldRetry(4)).toBe(false)
    })
  })

  describe('sleep', () => {
    it('sleeps for calculated delay', async () => {
      const start = Date.now()
      await backoff.sleep(0)
      const elapsed = Date.now() - start

      // Expected ~100ms, allow range for test variance
      expect(elapsed).toBeGreaterThanOrEqual(90)
      expect(elapsed).toBeLessThan(150)
    })
  })
})

describe('withExponentialBackoff', () => {
  it('calls function once on success', async () => {
    let callCount = 0
    const fn = async () => {
      callCount++
      return 'success'
    }

    const result = await withExponentialBackoff(fn, { maxRetries: 3 })

    expect(result).toBe('success')
    expect(callCount).toBe(1)
  })

  it('retries on error and eventually succeeds', async () => {
    let callCount = 0
    const fn = async () => {
      callCount++
      if (callCount < 2) {
        throw new Error('Temporary error')
      }
      return 'success'
    }

    const result = await withExponentialBackoff(fn, { maxRetries: 3 })

    expect(result).toBe('success')
    expect(callCount).toBe(2)
  })

  it('throws after maxRetries exceeded', async () => {
    let callCount = 0
    const fn = async () => {
      callCount++
      throw new Error('Permanent error')
    }

    await expect(
      withExponentialBackoff(fn, { maxRetries: 2, initialDelayMs: 10, maxDelayMs: 50 })
    ).rejects.toThrow('Permanent error')

    // Should attempt: 0, 1, 2 (3 total attempts = maxRetries + 1)
    expect(callCount).toBe(3)
  })

  it('applies backoff between retries', async () => {
    let callCount = 0
    const fn = async () => {
      callCount++
      if (callCount < 3) {
        throw new Error('Retry')
      }
      return 'success'
    }

    const start = Date.now()
    await withExponentialBackoff(fn, {
      maxRetries: 3,
      initialDelayMs: 20,
      maxDelayMs: 100,
      jitterFraction: 0.1
    })
    const elapsed = Date.now() - start

    // Expected: 0ms, 20ms, 40ms = ~60ms minimum
    expect(elapsed).toBeGreaterThanOrEqual(50)
    expect(callCount).toBe(3)
  })

  it('handles non-Error thrown values', async () => {
    const fn = async () => {
      throw 'string error'
    }

    await expect(withExponentialBackoff(fn, { maxRetries: 0, initialDelayMs: 10 })).rejects.toThrow(
      'string error'
    )
  })
})
