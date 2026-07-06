import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import App from '../../src/App.vue'

describe('App', () => {
  it('renders the toolbar and panels', () => {
    setActivePinia(createPinia())
    const wrapper = mount(App, { global: { plugins: [createVuetify()], stubs: { EditorCanvas: true } } })
    expect(wrapper.text()).toContain('Adjust')
    expect(wrapper.text()).toContain('Filters')
    expect(wrapper.text()).toContain('Transform')
    expect(wrapper.text()).toContain('Annotate')
  })
})
