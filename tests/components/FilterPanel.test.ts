import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import FilterPanel from '../../src/components/panels/FilterPanel.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'
import { FILTERS } from '../../src/editor/filters'

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

  it('renders a label for every filter in the catalog', async () => {
    // Guards against a broken v-for / empty FILTERS import. NOTE: jsdom cannot
    // reproduce the Vuetify v-chip :model-value="false" hidden-node bug (Vuetify
    // components are unresolved here without the vite plugin) — the real-browser
    // E2E covers that rendering behavior. Here we at least assert every label
    // is emitted by the v-for.
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.setAdapter(new MockAdapter())
    await store.loadOriginal('data:x', 'p.png')
    const wrapper = mount(FilterPanel, { global: { plugins: [createVuetify()] } })
    const text = wrapper.text()
    for (const f of FILTERS) {
      expect(text).toContain(f.label)
    }
  })
})
