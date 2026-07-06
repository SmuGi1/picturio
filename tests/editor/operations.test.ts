import { describe, it, expect } from 'vitest'
import { crop, flip, rotate, adjust, filter, annotation } from '../../src/editor/operations'

describe('operation factories', () => {
  it('crop carries the rect and a crop type', () => {
    const op = crop({ left: 1, top: 2, width: 3, height: 4 })
    expect(op.type).toBe('crop')
    expect(op.rect).toEqual({ left: 1, top: 2, width: 3, height: 4 })
    expect(typeof op.id).toBe('string')
    expect(op.id.length).toBeGreaterThan(0)
  })

  it('adjust carries name and value', () => {
    const op = adjust('brightness', 0.3)
    expect(op).toMatchObject({ type: 'adjust', name: 'brightness', value: 0.3 })
  })

  it('filter carries name and options', () => {
    expect(filter('blur', { blur: 0.2 })).toMatchObject({ type: 'filter', name: 'blur', options: { blur: 0.2 } })
    expect(filter('grayscale').options).toBeUndefined()
  })

  it('flip/rotate/annotation build their shapes', () => {
    expect(flip('x')).toMatchObject({ type: 'flip', axis: 'x' })
    expect(rotate(90)).toMatchObject({ type: 'rotate', degrees: 90 })
    expect(annotation('text', { text: 'hi' })).toMatchObject({ type: 'text', props: { text: 'hi' } })
  })

  it('ids are unique across factory calls', () => {
    expect(crop({ left: 0, top: 0, width: 1, height: 1 }).id)
      .not.toBe(crop({ left: 0, top: 0, width: 1, height: 1 }).id)
  })
})
