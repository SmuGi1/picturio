import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import AdjustPanel from '../../src/components/panels/AdjustPanel.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

async function setup() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  store.setAdapter(new MockAdapter())
  await store.loadOriginal('data:x', 'p.png')
  const wrapper = mount(AdjustPanel, { global: { plugins: [createVuetify()] } })
  return { store, wrapper }
}

describe('AdjustPanel', () => {
  it('slider change calls previewAdjust with the channel name (no history commit alone)', async () => {
    const { store, wrapper } = await setup()
    const spy = vi.spyOn(store, 'previewAdjust')
    ;(wrapper.vm as unknown as { onChange: (n: 'brightness', v: number) => void }).onChange('brightness', 0.4)
    expect(spy).toHaveBeenCalledWith('brightness', 0.4)
  })

  it('drag start calls beginAdjust once so a gesture is one undo entry', async () => {
    const { store, wrapper } = await setup()
    const spy = vi.spyOn(store, 'beginAdjust')
    ;(wrapper.vm as unknown as { onStart: () => void }).onStart()
    ;(wrapper.vm as unknown as { onChange: (n: 'contrast', v: number) => void }).onChange('contrast', 0.1)
    ;(wrapper.vm as unknown as { onChange: (n: 'contrast', v: number) => void }).onChange('contrast', 0.5)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(store.operations.filter((o) => o.type === 'adjust')).toHaveLength(1)
  })
})
