import { describe, it, expect } from 'vitest'
import { valueToPercent, percentToValue, ADJUST_NEUTRAL_PCT } from '../../src/editor/adjustScale'

describe('adjustScale', () => {
  it('maps store values to display percent', () => {
    expect(valueToPercent(-1)).toBe(0)
    expect(valueToPercent(0)).toBe(ADJUST_NEUTRAL_PCT)
    expect(valueToPercent(1)).toBe(200)
    expect(valueToPercent(0.3)).toBe(130)
  })
  it('maps display percent back to store values', () => {
    expect(percentToValue(0)).toBe(-1)
    expect(percentToValue(100)).toBe(0)
    expect(percentToValue(200)).toBe(1)
  })
})
