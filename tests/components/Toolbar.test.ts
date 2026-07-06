import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import Toolbar from '../../src/components/Toolbar.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

function mountToolbar() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  store.setAdapter(new MockAdapter())
  const wrapper = mount(Toolbar, { global: { plugins: [createVuetify()] } })
  return { store, wrapper }
}

describe('Toolbar', () => {
  it('reads a file and loads it as the original', async () => {
    const { store, wrapper } = mountToolbar()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    await (wrapper.vm as unknown as { onFile: (f: File | File[] | null) => Promise<void> }).onFile(file)
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('data:'), 'photo.png')
  })

  it('view-original toggle calls store.viewOriginal', async () => {
    const { store, wrapper } = mountToolbar()
    await store.loadOriginal('data:x', 'p.png')
    const spy = vi.spyOn(store, 'viewOriginal')
    await (wrapper.vm as unknown as { onViewOriginal: (v: boolean) => Promise<void> }).onViewOriginal(true)
    expect(spy).toHaveBeenCalledWith(true)
  })
})
