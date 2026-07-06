import { describe, it, expect } from 'vitest'
import { FILTERS } from '../../src/editor/filters'

describe('filter catalog', () => {
  it('exposes the full Toast UI filter set', () => {
    const names = FILTERS.map((f) => f.name)
    expect(names).toHaveLength(14)
    expect(names).toEqual(
      expect.arrayContaining([
        'grayscale', 'sepia', 'sepia2', 'invert', 'blur', 'sharpen', 'emboss',
        'noise', 'pixelate', 'removeColor', 'tint', 'multiply', 'blend', 'colorFilter',
      ]),
    )
  })
  it('every entry has a label and name', () => {
    for (const f of FILTERS) {
      expect(typeof f.name).toBe('string')
      expect(f.label.length).toBeGreaterThan(0)
    }
  })
})
