import { createId } from '../../lib/uid'
import type { NormalizedImageResult } from '../../types/image'
import type { OutputFormat } from '../../lib/constants'

function getMimeType(outputFormat: OutputFormat): NormalizedImageResult['mimeType'] {
  if (outputFormat === 'jpeg') return 'image/jpeg'
  if (outputFormat === 'webp') return 'image/webp'
  return 'image/png'
}

function withDataUrlPrefix(value: string, mimeType: string) {
  if (value.startsWith('data:')) return value
  return `data:${mimeType};base64,${value}`
}

export function normalizeImageResponse(raw: unknown, outputFormat: OutputFormat): NormalizedImageResult[] {
  const mimeType = getMimeType(outputFormat)
  const response = raw as {
    data?: Array<{
      url?: string
      b64_json?: string
      b64Json?: string
      partial_image_b64?: string
      partialImageB64?: string
      revised_prompt?: string
      revisedPrompt?: string
    }>
    output?: Array<unknown>
  }

  const data = Array.isArray(response?.data) ? response.data : []

  return data.map((item) => {
    const b64Json = item.b64_json || item.b64Json || item.partial_image_b64 || item.partialImageB64
    return {
      id: createId('image'),
      url: item.url,
      b64Json: b64Json ? withDataUrlPrefix(b64Json, mimeType) : undefined,
      mimeType,
      revisedPrompt: item.revised_prompt || item.revisedPrompt,
      raw: item,
    }
  })
}

export function getImageSrc(result: Pick<NormalizedImageResult, 'url' | 'b64Json'>) {
  return result.url || result.b64Json || ''
}
