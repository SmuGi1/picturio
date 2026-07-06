import { describe, it, expect } from 'vitest'
import { replay } from '../../src/editor/replay'
import { MockAdapter } from './mockAdapter'
import { adjust, annotation, crop, filter, flip, rotate } from '../../src/editor/operations'

describe('replay', () => {
  it('applies operations in recorded order', async () => {
    const a = new MockAdapter()
    await replay([rotate(90), adjust('brightness', 0.2), filter('sepia')], a)
    expect(a.calls.map((c) => c.method)).toEqual(['rotate', 'applyFilter', 'applyFilter'])
  })

  it('maps adjust to a named filter option object', async () => {
    const a = new MockAdapter()
    await replay([adjust('contrast', 0.4)], a)
    expect(a.calls[0]).toEqual({ method: 'applyFilter', args: ['contrast', { contrast: 0.4 }] })
  })

  it('maps crop, flip, annotation, and mask', async () => {
    const a = new MockAdapter()
    await replay(
      [
        crop({ left: 1, top: 2, width: 3, height: 4 }),
        flip('y'),
        annotation('text', { text: 'hi' }),
        annotation('mask', { maskObjId: 5 }),
      ],
      a,
    )
    expect(a.calls.map((c) => c.method)).toEqual(['crop', 'flip', 'addObject', 'applyMask'])
    expect(a.calls[0].args[0]).toEqual({ left: 1, top: 2, width: 3, height: 4 })
    expect(a.calls[2].args).toEqual(['text', { text: 'hi' }])
  })
})
