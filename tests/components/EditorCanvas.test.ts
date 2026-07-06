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
})
