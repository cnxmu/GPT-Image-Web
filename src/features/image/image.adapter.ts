import { createId } from '../../lib/uid'
import { getMimeType } from '../../lib/image-utils'
import type { NormalizedImageResult } from '../../types/image'
import type { OutputFormat } from '../../lib/constants'

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
    choices?: Array<{
      message?: {
        content?: unknown
        images?: unknown
      }
    }>
  }

  const data = Array.isArray(response?.data) ? response.data : []
  const imageItems = [
    ...data.map((item) => ({
      url: item.url,
      b64Json: item.b64_json || item.b64Json || item.partial_image_b64 || item.partialImageB64,
      revisedPrompt: item.revised_prompt || item.revisedPrompt,
      raw: item,
    })),
    ...extractChatCompletionImages(response, mimeType),
  ]

  return imageItems.map((item) => {
    return {
      id: createId('image'),
      url: item.url,
      b64Json: item.b64Json ? withDataUrlPrefix(item.b64Json, mimeType) : undefined,
      mimeType,
      revisedPrompt: item.revisedPrompt,
      raw: item.raw,
    }
  })
}

function extractChatCompletionImages(
  response: { choices?: Array<{ message?: { content?: unknown; images?: unknown } }> },
  mimeType: string,
) {
  const images: Array<{ url?: string; b64Json?: string; revisedPrompt?: string; raw: unknown }> = []

  for (const choice of response.choices || []) {
    const message = choice.message
    if (!message) continue

    collectImageValues(message.images, images, mimeType)
    collectImageValues(message.content, images, mimeType)
  }

  return images
}

function collectImageValues(
  value: unknown,
  images: Array<{ url?: string; b64Json?: string; revisedPrompt?: string; raw: unknown }>,
  mimeType: string,
) {
  if (!value) return

  if (typeof value === 'string') {
    collectImagesFromText(value, images, mimeType)
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) collectImageValues(item, images, mimeType)
    return
  }

  if (typeof value !== 'object') return

  const item = value as Record<string, unknown>
  const imageUrl = item.image_url
  if (typeof imageUrl === 'string') {
    pushImageValue(imageUrl, images, value, mimeType)
  } else if (imageUrl && typeof imageUrl === 'object') {
    const url = (imageUrl as Record<string, unknown>).url
    if (typeof url === 'string') pushImageValue(url, images, value, mimeType)
  }

  const directUrl = item.url
  if (typeof directUrl === 'string') pushImageValue(directUrl, images, value, mimeType)

  for (const key of ['b64_json', 'b64Json', 'base64', 'data', 'image']) {
    const imageValue = item[key]
    if (typeof imageValue === 'string') pushImageValue(imageValue, images, value, mimeType)
  }

  if (typeof item.text === 'string') collectImagesFromText(item.text, images, mimeType)
  if (typeof item.content === 'string') collectImagesFromText(item.content, images, mimeType)
}

function collectImagesFromText(
  text: string,
  images: Array<{ url?: string; b64Json?: string; revisedPrompt?: string; raw: unknown }>,
  mimeType: string,
) {
  const dataUrlMatches = text.match(/data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=_-]+/gi) || []
  for (const match of dataUrlMatches) pushImageValue(match, images, text, mimeType)

  const markdownMatches = text.match(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/gi) || []
  for (const match of markdownMatches) {
    const url = match.match(/\((https?:\/\/[^)\s]+)\)/i)?.[1]
    if (url) pushImageValue(url, images, text, mimeType)
  }
}

function pushImageValue(
  value: string,
  images: Array<{ url?: string; b64Json?: string; revisedPrompt?: string; raw: unknown }>,
  raw: unknown,
  mimeType: string,
) {
  const trimmed = value.trim()
  if (!trimmed) return

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('blob:')) {
    images.push({ url: trimmed, raw })
    return
  }

  if (trimmed.startsWith('data:image/')) {
    images.push({ b64Json: trimmed, raw })
    return
  }

  if (/^[A-Za-z0-9+/=_-]{80,}$/.test(trimmed)) {
    images.push({ b64Json: withDataUrlPrefix(trimmed, mimeType), raw })
  }
}

export function getImageSrc(result: Pick<NormalizedImageResult, 'url' | 'b64Json'>) {
  return result.url || result.b64Json || ''
}
