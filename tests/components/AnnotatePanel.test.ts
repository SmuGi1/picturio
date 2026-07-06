import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import AnnotatePanel from '../../src/components/panels/AnnotatePanel.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

async function setup() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  store.setAdapter(new MockAdapter())
  await store.loadOriginal('data:x', 'p.png')
  const wrapper = mount(AnnotatePanel, { global: { plugins: [createVuetify()] } })
  return { store, wrapper }
}

describe('AnnotatePanel', () => {
  it('add text pushes a text annotation op', async () => {
    const { store, wrapper } = await setup()
    await (wrapper.vm as any).addText()
    expect(store.operations.some((o) => o.type === 'text')).toBe(true)
  })
  it('add shape pushes a shape annotation op', async () => {
    const { store, wrapper } = await setup()
    await (wrapper.vm as any).addShape('rect')
    expect(store.operations.some((o) => o.type === 'shape')).toBe(true)
  })
})
