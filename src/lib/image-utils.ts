import type { OutputFormat } from './constants'

export function getMimeType(outputFormat: OutputFormat) {
  if (outputFormat === 'jpeg') return 'image/jpeg' as const
  if (outputFormat === 'webp') return 'image/webp' as const
  return 'image/png' as const
}

export async function getImageDimensions(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('无法读取图片尺寸'))
      image.src = url
    })
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function fileToDataUrl(file: File | Blob, mimeType?: string) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

  if (dataUrl.startsWith('data:')) return dataUrl

  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  const effectiveMimeType = mimeType || ('type' in file ? file.type : undefined) || 'application/octet-stream'
  return `data:${effectiveMimeType};base64,${base64}`
}

export async function fileToBase64(file: File | Blob) {
  const dataUrl = await fileToDataUrl(file)
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
}
