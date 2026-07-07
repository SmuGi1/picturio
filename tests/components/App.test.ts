import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import App from '../../src/App.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

if (typeof ResizeObserver === 'undefined') {
  // @ts-expect-error test shim
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

function mountApp() {
  const wrapper = mount(App, { global: { plugins: [createVuetify({ components, directives })], stubs: { EditorCanvas: true } } })
  return wrapper
}

describe('App', () => {
  it('shows the upload screen when no image is loaded', () => {
    setActivePinia(createPinia())
    const wrapper = mountApp()
    expect(wrapper.find('.upload-screen').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Export')
  })

  it('shows the editor once an image is loaded, and hides the upload screen', async () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.setAdapter(new MockAdapter())
    const wrapper = mountApp()
    await store.loadOriginal('data:x', 'p.png')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.upload-screen').exists()).toBe(false)
    expect(wrapper.text()).toContain('Transform')
    expect(wrapper.text()).toContain('Adjust')
    expect(wrapper.text()).toContain('Filters')
    expect(wrapper.text()).toContain('Annotate')
    expect(wrapper.text()).toContain('Export')
  })
})
