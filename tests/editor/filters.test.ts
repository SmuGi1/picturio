import { describe, it, expect } from 'vitest'
import { FILTERS } from '../../src/editor/filters'

describe('filter catalog', () => {
  it('includes the core bonus filters', () => {
    const names = FILTERS.map((f) => f.name)
    expect(names).toEqual(expect.arrayContaining(['grayscale', 'sepia', 'invert', 'blur']))
  })
  it('every entry has a label and name', () => {
    for (const f of FILTERS) {
      expect(typeof f.name).toBe('string')
      expect(f.label.length).toBeGreaterThan(0)
    }
  })
})
