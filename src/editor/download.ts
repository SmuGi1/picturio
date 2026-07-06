import JSZip from 'jszip'

export function dataURLToBlob(dataURL: string): Blob {
  const [header, data] = dataURL.split(',')
  const mimeMatch = header.match(/data:([^;]+)/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function baseName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

export async function buildBundle(imageBlob: Blob, jsonText: string, base: string): Promise<Blob> {
  const ext = imageBlob.type === 'image/jpeg' ? 'jpg' : 'png'
  const zip = new JSZip()
  zip.file(`${base}-edited.${ext}`, imageBlob)
  zip.file(`${base}-edited.ops.json`, jsonText)
  return zip.generateAsync({ type: 'blob' })
}
