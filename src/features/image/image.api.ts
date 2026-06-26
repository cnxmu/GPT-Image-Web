import {
  API_ENDPOINTS,
  API_REQUEST_IMAGE_COUNT,
  getImageSize,
  getOutputCompression,
  type OutputFormat,
} from '../../lib/constants'
import { ensureOk } from '../../lib/http'
import { getMimeType } from '../../lib/image-utils'
import type { ImageFormState } from '../../types/image'

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

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>
}

export async function generateImage(apiKey: string, form: ImageFormState) {
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

export function getFilename(outputFormat: OutputFormat, index: number) {
  return `image-workbench-${index + 1}.${outputFormat === 'jpeg' ? 'jpg' : outputFormat}`
}

export { getMimeType }
