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
  it('add shape pushes a shape annotation op', async () => {
    const { store, wrapper } = await setup()
    await (wrapper.vm as any).addShape('rect')
    expect(store.operations.some((o) => o.type === 'shape')).toBe(true)
  })
  it('add mask pushes a mask annotation op', async () => {
    const { store, wrapper } = await setup()
    await (wrapper.vm as any).addMask()
    expect(store.operations.some((o) => o.type === 'mask')).toBe(true)
  })
  it('toggleDraw records one draw op on enter and stops drawing on exit', async () => {
    const { store, wrapper } = await setup()
    await (wrapper.vm as any).toggleDraw()
    expect(store.operations.filter((o) => o.type === 'draw')).toHaveLength(1)
    // exit: stops drawing mode via the adapter, adds no further op
    await (wrapper.vm as any).toggleDraw()
    expect(store.operations.filter((o) => o.type === 'draw')).toHaveLength(1)
  })
})
