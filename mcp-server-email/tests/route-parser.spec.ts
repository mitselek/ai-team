import { describe, it, expect } from 'vitest'
import { extractRouteKey } from '../src/inbound/route'

describe('Route Parser', () => {
  describe('extractRouteKey', () => {
    it('extracts plus-address token from email', () => {
      expect(extractRouteKey('mitselek+hr-hiring@gmail.com')).toBe('hr-hiring')
      expect(extractRouteKey('user+vault@example.com')).toBe('vault')
      expect(extractRouteKey('admin+support-team@company.org')).toBe('support-team')
    })

    it('handles multiple plus signs - uses first token', () => {
      expect(extractRouteKey('user+route+extra@example.com')).toBe('route+extra')
    })

    it('returns PostOffice for email without plus-address', () => {
      expect(extractRouteKey('mitselek@gmail.com')).toBe('PostOffice')
      expect(extractRouteKey('user@example.com')).toBe('PostOffice')
    })

    it('returns PostOffice for empty plus-address token', () => {
      expect(extractRouteKey('user+@gmail.com')).toBe('PostOffice')
      expect(extractRouteKey('admin+@company.org')).toBe('PostOffice')
    })

    it('handles malformed addresses gracefully', () => {
      // Missing @ sign
      expect(extractRouteKey('invalid-email')).toBe('PostOffice')
      expect(extractRouteKey('user+token')).toBe('PostOffice')

      // Empty string
      expect(extractRouteKey('')).toBe('PostOffice')

      // Just @ sign
      expect(extractRouteKey('@example.com')).toBe('PostOffice')
    })

    it('preserves case and special characters in token', () => {
      expect(extractRouteKey('user+HR-Hiring_2024@gmail.com')).toBe('HR-Hiring_2024')
      expect(extractRouteKey('user+route.key@example.com')).toBe('route.key')
    })
  })
})
