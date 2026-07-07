import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import EditorStage from '../../src/components/EditorStage.vue'

function mountStage() {
  setActivePinia(createPinia())
  return mount(EditorStage, {
    global: { plugins: [createVuetify()], stubs: { EditorCanvas: true } },
  })
}

describe('EditorStage zoom', () => {
  it('steps by 25, clamps, and fits back to 100', () => {
    const wrapper = mountStage()
    // defineExpose unwraps the top-level `zoom` ref, so vm.zoom is a number
    // that reflects the current value on each access.
    const vm = wrapper.vm as unknown as {
      zoom: number
      zoomIn: () => void
      zoomOut: () => void
      zoomFit: () => void
    }
    expect(vm.zoom).toBe(100)
    vm.zoomIn()
    expect(vm.zoom).toBe(125)
    vm.zoomFit()
    expect(vm.zoom).toBe(100)
    for (let i = 0; i < 10; i++) vm.zoomOut()
    expect(vm.zoom).toBe(25)
    for (let i = 0; i < 20; i++) vm.zoomIn()
    expect(vm.zoom).toBe(400)
  })
})
