import { describe, it, expect } from 'vitest'
import { MockAdapter } from './mockAdapter'

describe('MockAdapter', () => {
  it('records ordered calls', async () => {
    const a = new MockAdapter()
    await a.applyFilter('grayscale')
    await a.rotate(90)
    expect(a.calls.map((c) => c.method)).toEqual(['applyFilter', 'rotate'])
    expect(a.calls[1].args).toEqual([90])
  })

  it('returns a data url and load result', async () => {
    const a = new MockAdapter()
    expect(await a.loadImage('data:x', 'n.png')).toEqual({ width: 100, height: 80 })
    expect(a.toDataURL()).toContain('data:image')
  })
})
