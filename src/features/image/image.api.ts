import {
  API_ENDPOINTS,
  API_REQUEST_IMAGE_COUNT,
  getImageSize,
  getOutputCompression,
  isNanoBananaImageModel,
  type OutputFormat,
} from '../../lib/constants'
import { ensureOk } from '../../lib/http'
import type { ImageFormState } from '../../types/image'

interface ChatCompletionImageRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user'
    content: string | Array<Record<string, unknown>>
  }>
  n: 1
  temperature: number
  top_p: number
  max_tokens: number
  seed?: number
}

export function buildGenerationRequest(form: ImageFormState) {
  const size = getImageSize(form.aspectRatio, form.resolutionTier)
  return {
    model: form.imageModel,
    prompt: form.negativePrompt ? `${form.prompt}\n\nNegative prompt: ${form.negativePrompt}` : form.prompt,
    size,
    quality: form.quality,
    n: API_REQUEST_IMAGE_COUNT,
    output_format: form.outputFormat,
    output_compression: getOutputCompression(form.outputFormat, form.compressionRate),
    moderation: form.moderation,
  } as const
}

function getUserPrompt(form: ImageFormState) {
  const parts = [
    form.mode === 'edit'
      ? '请参考随消息提供的图片进行图生图，生成新的图片结果。'
      : '请根据下面的描述生成图片，并直接返回图片结果。',
    form.prompt,
    form.negativePrompt ? `负面提示词：${form.negativePrompt}` : '',
    `输出比例：${form.aspectRatio}`,
  ].filter(Boolean)

  return parts.join('\n')
}

async function fileToDataUrl(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

  if (dataUrl.startsWith('data:')) return dataUrl

  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  return `data:${file.type || 'application/octet-stream'};base64,${base64}`
}

export async function buildChatCompletionRequest(
  form: ImageFormState,
  referenceImages: File[] = [],
): Promise<ChatCompletionImageRequest> {
  const content: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: getUserPrompt(form),
    },
  ]

  for (const file of referenceImages) {
    content.push({
      type: 'image_url',
      image_url: {
        url: await fileToDataUrl(file),
      },
    })
  }

  const request: ChatCompletionImageRequest = {
    model: form.imageModel,
    messages: [
      {
        role: 'system',
        content: '你是图片生成模型。请直接生成图片结果，不要输出解释、步骤或长文本。',
      },
      {
        role: 'user',
        content,
      },
    ],
    n: API_REQUEST_IMAGE_COUNT,
    temperature: form.nanoBananaTemperature,
    top_p: form.nanoBananaTopP,
    max_tokens: form.nanoBananaMaxTokens,
    seed: form.nanoBananaSeed,
  }

  if (request.seed === undefined) delete request.seed
  return request
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>
}

export async function generateImage(apiKey: string, form: ImageFormState) {
  if (isNanoBananaImageModel(form.imageModel)) {
    return generateImageViaChatCompletions(apiKey, form)
  }

  const request = buildGenerationRequest(form)
  const response = await fetch(API_ENDPOINTS.imageGenerations, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(omitUndefined(request)),
  })

  return {
    request,
    raw: await ensureOk(response),
  }
}

export function buildEditFormData(form: ImageFormState, referenceImages: File[]) {
  const request = buildGenerationRequest(form)
  const formData = new FormData()

  formData.append('model', request.model)
  formData.append('prompt', request.prompt)
  formData.append('size', request.size)
  formData.append('quality', request.quality)
  formData.append('n', String(API_REQUEST_IMAGE_COUNT))
  formData.append('output_format', request.output_format)
  formData.append('moderation', request.moderation)

  if (request.output_compression) {
    formData.append('output_compression', String(request.output_compression))
  }

  for (const file of referenceImages) {
    formData.append('image', file)
  }

  return {
    request,
    formData,
  }
}

export async function editImage(apiKey: string, form: ImageFormState, referenceImages: File[]) {
  if (isNanoBananaImageModel(form.imageModel)) {
    return generateImageViaChatCompletions(apiKey, form, referenceImages)
  }

  const { request, formData } = buildEditFormData(form, referenceImages)
  const response = await fetch(API_ENDPOINTS.imageEdits, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  return {
    request,
    raw: await ensureOk(response),
  }
}

async function generateImageViaChatCompletions(apiKey: string, form: ImageFormState, referenceImages: File[] = []) {
  const request = await buildChatCompletionRequest(form, referenceImages)
  const response = await fetch(API_ENDPOINTS.chatCompletions, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
  })

  return {
    request,
    raw: await ensureOk(response),
  }
}

export function getFilename(outputFormat: OutputFormat, index: number) {
  return `image-workbench-${index + 1}.${outputFormat === 'jpeg' ? 'jpg' : outputFormat}`
}
