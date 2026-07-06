import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import TransformPanel from '../../src/components/panels/TransformPanel.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

async function setup() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  store.setAdapter(new MockAdapter())
  await store.loadOriginal('data:x', 'p.png')
  const wrapper = mount(TransformPanel, { global: { plugins: [createVuetify()] } })
  return { store, wrapper }
}

describe('TransformPanel', () => {
  it('apply crop pushes a crop op from the adapter rect', async () => {
    const { store, wrapper } = await setup()
    ;(wrapper.vm as unknown as { applyCrop: () => Promise<void> }).applyCrop && await (wrapper.vm as any).applyCrop()
    expect(store.operations.some((o) => o.type === 'crop')).toBe(true)
  })

  it('does not apply a degenerate (empty) crop', async () => {
    const { store, wrapper } = await setup()
    vi.spyOn(store.requireAdapter(), 'getCropRect').mockReturnValue({ left: 0, top: 0, width: 0, height: 0 })
    await (wrapper.vm as any).applyCrop()
    expect(store.operations.some((o) => o.type === 'crop')).toBe(false)
  })

  it('rotate pushes a rotate op', async () => {
    const { store, wrapper } = await setup()
    const spy = vi.spyOn(store, 'addOperation')
    await (wrapper.vm as any).rotate(90)
    expect(spy).toHaveBeenCalled()
    expect(store.operations.some((o) => o.type === 'rotate')).toBe(true)
  })
})
