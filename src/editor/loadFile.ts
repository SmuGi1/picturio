import type { useEditorStore } from '../stores/editor'

type EditorStore = ReturnType<typeof useEditorStore>

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export async function loadImageFile(store: EditorStore, file: File): Promise<void> {
  if (!file.type.startsWith('image/')) return
  const dataURL = await readAsDataURL(file)
  await store.loadOriginal(dataURL, file.name)
}
