import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

function setup() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  const adapter = new MockAdapter()
  store.setAdapter(adapter)
  return { store, adapter }
}

describe('editor store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('loadOriginal stores an immutable original and loads adapter', async () => {
    const { store, adapter } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    expect(store.originalImage?.dataURL).toBe('data:img')
    expect(store.originalImage?.source).toEqual({ name: 'cat.png', width: 100, height: 80 })
    expect(adapter.calls.some((c) => c.method === 'loadImage')).toBe(true)
  })

  it('setAdjust is last-write-wins per name', async () => {
    const { store } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    store.setAdjust('brightness', 0.2)
    store.setAdjust('brightness', 0.5)
    const adjusts = store.operations.filter((o) => o.type === 'adjust')
    expect(adjusts).toHaveLength(1)
    expect(adjusts[0]).toMatchObject({ name: 'brightness', value: 0.5 })
  })

  it('reset clears operations and reloads original', async () => {
    const { store, adapter } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    store.setAdjust('contrast', 0.5)
    adapter.calls.length = 0
    await store.reset()
    expect(store.operations).toHaveLength(0)
    expect(adapter.calls.some((c) => c.method === 'loadImage')).toBe(true)
  })

  it('viewOriginal shows original without mutating operations', async () => {
    const { store, adapter } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    store.setAdjust('contrast', 0.5)
    await store.viewOriginal(true)
    expect(store.viewingOriginal).toBe(true)
    expect(store.operations).toHaveLength(1)
    expect(adapter.calls.some((c) => c.method === 'loadImage')).toBe(true)
  })

  it('ensureEdited exits compare mode and rebuilds the edited preview', async () => {
    const { store, adapter } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    store.setAdjust('contrast', 0.5)
    await store.viewOriginal(true)
    expect(store.viewingOriginal).toBe(true)
    adapter.calls.length = 0
    await store.ensureEdited()
    expect(store.viewingOriginal).toBe(false)
    // rebuild reloads the original then replays ops (edited preview restored)
    expect(adapter.calls.some((c) => c.method === 'loadImage')).toBe(true)
  })

  it('editing while viewing original first exits compare mode', async () => {
    const { store } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    await store.viewOriginal(true)
    await store.addOperation((await import('../../src/editor/operations')).filter('sepia'))
    expect(store.viewingOriginal).toBe(false)
    expect(store.operations.filter((o) => o.type === 'filter')).toHaveLength(1)
  })

  it('undo clears the stale viewingOriginal flag', async () => {
    const { store } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    await store.addOperation((await import('../../src/editor/operations')).filter('sepia'))
    await store.viewOriginal(true)
    await store.undo()
    expect(store.viewingOriginal).toBe(false)
  })

  it('undo/redo step through committed operations', async () => {
    const { store } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    await store.addOperation((await import('../../src/editor/operations')).filter('sepia'))
    expect(store.operations).toHaveLength(1)
    await store.undo()
    expect(store.operations).toHaveLength(0)
    await store.redo()
    expect(store.operations).toHaveLength(1)
  })

  it('exportJSON serializes and importJSON replays', async () => {
    const { store } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    store.setAdjust('brightness', 0.3)
    const json = store.exportJSON()
    await store.reset()
    await store.importJSON(json)
    expect(store.operations.filter((o) => o.type === 'adjust')).toHaveLength(1)
  })

  it('previewAdjust updates live without committing history', async () => {
    const { store } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    await store.previewAdjust('brightness', 0.3)
    expect(store.canUndo).toBe(false)
    const adjusts = store.operations.filter((o) => o.type === 'adjust')
    expect(adjusts).toHaveLength(1)
  })

  it('beginAdjust + multiple previewAdjust makes one undo entry for the gesture', async () => {
    const { store } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    store.beginAdjust()
    await store.previewAdjust('brightness', 0.1)
    await store.previewAdjust('brightness', 0.8)
    expect(store.canUndo).toBe(true)
    expect(store.operations.filter((o) => o.type === 'adjust')).toHaveLength(1)
    await store.undo()
    expect(store.operations.filter((o) => o.type === 'adjust')).toHaveLength(0)
  })

  it('serializes adapter calls: reset after previewAdjust ends on a rebuilt preview', async () => {
    const { store, adapter } = setup()
    await store.loadOriginal('data:img', 'cat.png')
    await store.setAdjust('brightness', 0.5)
    await store.reset()
    const last = adapter.calls[adapter.calls.length - 1]
    expect(last.method).toBe('loadImage')
  })
})
