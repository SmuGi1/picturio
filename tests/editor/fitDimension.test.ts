import { describe, it, expect } from 'vitest'
import { fitDimension, CSS_MAX_WIDTH, CSS_MAX_HEIGHT } from '../../src/editor/fitDimension'

describe('fitDimension', () => {
  it('shrinks a tall portrait to the height bound, preserving aspect ratio', () => {
    // The screenshot bug: a 709×912 portrait was shown in a 900-wide box,
    // leaving a dark bar. It must fit to the 640 height with a matching width.
    const fit = fitDimension(709, 912)
    expect(fit).toEqual({ width: 497, height: 640 })
    expect(fit.height).toBe(CSS_MAX_HEIGHT)
    expect(fit.width).toBeLessThan(CSS_MAX_WIDTH)
  })

  it('shrinks a wide landscape to the width bound', () => {
    const fit = fitDimension(1920, 1080)
    expect(fit).toEqual({ width: CSS_MAX_WIDTH, height: 506 })
  })

  it('never upscales an image smaller than the box', () => {
    expect(fitDimension(320, 240)).toEqual({ width: 320, height: 240 })
  })

  it('leaves an image already at the box unchanged', () => {
    expect(fitDimension(CSS_MAX_WIDTH, CSS_MAX_HEIGHT)).toEqual({
      width: CSS_MAX_WIDTH,
      height: CSS_MAX_HEIGHT,
    })
  })
})
