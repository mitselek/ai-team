import { describe, it, expect } from 'vitest'
import {
  formatNameOptions,
  parseNameSelection
} from '../../../app/server/services/interview/name-selector'
import type { NameOption } from '../../../app/server/services/interview/types'

describe('Name Selector Helper Functions', () => {
  const mockOptions: NameOption[] = [
    { name: 'Iris', rationale: 'Symbolizes wisdom and communication' },
    { name: 'Atlas', rationale: 'Represents strength and support' },
    { name: 'Nova', rationale: 'Signifies innovation and new beginnings' }
  ]

  describe('formatNameOptions', () => {
    it('should format 3 options with numbers and rationales', () => {
      const result = formatNameOptions(mockOptions)

      expect(result).toContain('three name suggestions')
      expect(result).toContain('1. **Iris**')
      expect(result).toContain('2. **Atlas**')
      expect(result).toContain('3. **Nova**')
      expect(result).toContain('wisdom and communication')
      expect(result).toContain('strength and support')
      expect(result).toContain('innovation and new beginnings')
      expect(result).toContain('choose 1, 2, or 3')
    })
  })

  describe('parseNameSelection', () => {
    it('should accept numeric selection 1', () => {
      expect(parseNameSelection('1', mockOptions)).toBe('Iris')
    })

    it('should accept numeric selection 2', () => {
      expect(parseNameSelection('2', mockOptions)).toBe('Atlas')
    })

    it('should accept numeric selection 3', () => {
      expect(parseNameSelection('3', mockOptions)).toBe('Nova')
    })

    it('should accept name directly (case-insensitive)', () => {
      expect(parseNameSelection('iris', mockOptions)).toBe('Iris')
      expect(parseNameSelection('ATLAS', mockOptions)).toBe('Atlas')
      expect(parseNameSelection('Nova', mockOptions)).toBe('Nova')
    })

    it('should handle whitespace', () => {
      expect(parseNameSelection('  2  ', mockOptions)).toBe('Atlas')
      expect(parseNameSelection('  iris  ', mockOptions)).toBe('Iris')
    })

    it('should return null for invalid number', () => {
      expect(parseNameSelection('0', mockOptions)).toBeNull()
      expect(parseNameSelection('4', mockOptions)).toBeNull()
      expect(parseNameSelection('99', mockOptions)).toBeNull()
    })

    it('should return null for invalid name', () => {
      expect(parseNameSelection('invalid', mockOptions)).toBeNull()
      expect(parseNameSelection('Zeus', mockOptions)).toBeNull()
    })

    it('should return null for empty input', () => {
      expect(parseNameSelection('', mockOptions)).toBeNull()
      expect(parseNameSelection('   ', mockOptions)).toBeNull()
    })
  })
})
