import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import AppSlider from '../../src/components/AppSlider.vue'

function mountSlider(modelValue = 0) {
  return mount(AppSlider, {
    props: { label: 'Brightness', modelValue },
    global: { plugins: [createVuetify()] },
  })
}

describe('AppSlider', () => {
  it('emits start once per pointer gesture (not twice on touch)', async () => {
    const wrapper = mountSlider(0)
    await wrapper.find('input[type="range"]').trigger('pointerdown')
    expect(wrapper.emitted('start')).toHaveLength(1)
  })

  it('emits the store value (-1..1) on input, converting from percent', async () => {
    const wrapper = mountSlider(0)
    const input = wrapper.find('input[type="range"]')
    ;(input.element as HTMLInputElement).value = '200'
    await input.trigger('input')
    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    expect(events![events!.length - 1][0]).toBe(1)
  })
})
