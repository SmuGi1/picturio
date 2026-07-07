import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import AppHeader from '../../src/components/AppHeader.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

function mountHeader() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  store.setAdapter(new MockAdapter())
  const wrapper = mount(AppHeader, { global: { plugins: [createVuetify()] } })
  return { store, wrapper }
}

describe('AppHeader', () => {
  it('reads a file and loads it as the original', async () => {
    const { store, wrapper } = mountHeader()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    await (wrapper.vm as unknown as { onFile: (f: File | File[] | null) => Promise<void> }).onFile(file)
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('data:'), 'photo.png')
  })

  it('compare calls store.viewOriginal', async () => {
    const { store, wrapper } = mountHeader()
    await store.loadOriginal('data:x', 'p.png')
    const spy = vi.spyOn(store, 'viewOriginal')
    await (wrapper.vm as unknown as { onViewOriginal: (v: boolean) => Promise<void> }).onViewOriginal(true)
    expect(spy).toHaveBeenCalledWith(true)
  })
})
