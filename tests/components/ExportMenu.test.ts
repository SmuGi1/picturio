import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import ExportMenu from '../../src/components/ExportMenu.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

describe('ExportMenu', () => {
  it('import reads a file and calls store.importJSON', async () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.setAdapter(new MockAdapter())
    await store.loadOriginal('data:x', 'p.png')
    const spy = vi.spyOn(store, 'importJSON').mockResolvedValue()
    const wrapper = mount(ExportMenu, { global: { plugins: [createVuetify()] } })
    const file = new File(['{"version":1,"source":{"name":"p.png","width":1,"height":1},"operations":[]}'], 'p.ops.json', { type: 'application/json' })
    await (wrapper.vm as any).onImport(file)
    expect(spy).toHaveBeenCalled()
  })

  it('exportImage triggers a download from the adapter data url', async () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.setAdapter(new MockAdapter())
    await store.loadOriginal('data:x', 'p.png')
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() })
    const wrapper = mount(ExportMenu, { global: { plugins: [createVuetify()] } })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await (wrapper.vm as any).exportImage('png')
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })
})
