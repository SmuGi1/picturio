import { describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from './mockAdapter'
import { loadImageFile } from '../../src/editor/loadFile'

function makeStore() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  store.setAdapter(new MockAdapter())
  return store
}

describe('loadImageFile', () => {
  it('reads an image file and loads it as the original', async () => {
    const store = makeStore()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    await loadImageFile(store, file)
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('data:'), 'photo.png')
  })

  it('ignores a non-image file', async () => {
    const store = makeStore()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' })
    await loadImageFile(store, file)
    expect(spy).not.toHaveBeenCalled()
  })
})
