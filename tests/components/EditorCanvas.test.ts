import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import EditorCanvas from '../../src/components/EditorCanvas.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

describe('EditorCanvas', () => {
  it('registers an adapter with the store on mount', () => {
    setActivePinia(createPinia())
    const adapter = new MockAdapter()
    mount(EditorCanvas, {
      global: { plugins: [createVuetify()] },
      props: { adapterFactory: () => adapter },
    })
    expect(useEditorStore().adapter).toBe(adapter)
  })

  it('destroys the adapter and clears the store on unmount', () => {
    setActivePinia(createPinia())
    const adapter = new MockAdapter()
    const wrapper = mount(EditorCanvas, {
      global: { plugins: [createVuetify()] },
      props: { adapterFactory: () => adapter },
    })
    wrapper.unmount()
    expect(adapter.calls.some((c) => c.method === 'destroy')).toBe(true)
    expect(useEditorStore().adapter).toBeNull()
  })
})
