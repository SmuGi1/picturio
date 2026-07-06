import { describe, it, expect } from 'vitest'
import { dataURLToBlob, baseName, buildBundle } from '../../src/editor/download'

describe('download helpers', () => {
  it('baseName strips the extension', () => {
    expect(baseName('cat.photo.png')).toBe('cat.photo')
    expect(baseName('noext')).toBe('noext')
  })

  it('dataURLToBlob decodes a png data url', () => {
    const blob = dataURLToBlob('data:image/png;base64,iVBORw0KGgo=')
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('buildBundle produces a non-empty zip blob', async () => {
    const img = dataURLToBlob('data:image/png;base64,iVBORw0KGgo=')
    const zip = await buildBundle(img, '{"version":1}', 'cat')
    expect(zip.size).toBeGreaterThan(0)
  })
})
