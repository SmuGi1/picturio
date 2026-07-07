import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import UploadScreen from '../../src/components/UploadScreen.vue'
import { useEditorStore } from '../../src/stores/editor'
import { MockAdapter } from '../editor/mockAdapter'

function mountUploadScreen() {
  setActivePinia(createPinia())
  const store = useEditorStore()
  store.setAdapter(new MockAdapter())
  const wrapper = mount(UploadScreen, { global: { plugins: [createVuetify()] } })
  return { store, wrapper }
}

describe('UploadScreen', () => {
  beforeEach(() => {
    // Mock FileReader for all tests
    global.FileReader = class MockFileReader {
      readAsDataURL() {
        setTimeout(() => {
          this.result = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
          if (this.onload) this.onload()
        }, 0)
      }
    } as any
  })

  it('loads a dropped image file', async () => {
    const { store, wrapper } = mountUploadScreen()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    await wrapper.find('.upload-screen').trigger('drop', { dataTransfer: { files: [file] } })
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('data:'), 'photo.png')
  })

  it('ignores a dropped non-image file', async () => {
    const { store, wrapper } = mountUploadScreen()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' })
    await wrapper.find('.upload-screen').trigger('drop', { dataTransfer: { files: [file] } })
    expect(spy).not.toHaveBeenCalled()
  })

  it('loads a file chosen via click-to-browse (hidden input)', async () => {
    const { store, wrapper } = mountUploadScreen()
    const spy = vi.spyOn(store, 'loadOriginal')
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('data:'), 'photo.png')
  })

  it('shows an active state while dragging over, clears it on drop or drag-leave', async () => {
    const { wrapper } = mountUploadScreen()
    await wrapper.find('.upload-screen').trigger('dragover')
    expect(wrapper.find('.upload-dropzone').classes()).toContain('upload-dropzone--active')
    await wrapper.find('.upload-screen').trigger('dragleave')
    expect(wrapper.find('.upload-dropzone').classes()).not.toContain('upload-dropzone--active')
  })
})
