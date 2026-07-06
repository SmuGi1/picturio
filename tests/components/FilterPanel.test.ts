import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import FilterPanel from '../../src/components/panels/FilterPanel.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

describe('FilterPanel', () => {
  it('toggling a filter calls store.toggleFilter with defaults', async () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.setAdapter(new MockAdapter())
    await store.loadOriginal('data:x', 'p.png')
    const spy = vi.spyOn(store, 'toggleFilter')
    const wrapper = mount(FilterPanel, { global: { plugins: [createVuetify()] } })
    await (wrapper.vm as any).toggle({ name: 'blur', label: 'Blur', toggle: true, defaults: { blur: 0.2 } })
    expect(spy).toHaveBeenCalledWith('blur', { blur: 0.2 })
  })
})
