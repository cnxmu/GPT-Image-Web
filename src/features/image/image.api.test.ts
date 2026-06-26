import { describe, expect, it, vi } from 'vitest'
import { API_ENDPOINTS, IMAGE_MODEL } from '../../lib/constants'
import type { ImageFormState } from '../../types/image'
import { buildEditFormData, buildGenerationRequest, editImage, generateImage } from './image.api'

const form: ImageFormState = {
  mode: 'generation',
  imageModelFamily: 'gpt-image-2',
  imageModel: IMAGE_MODEL,
  prompt: '一只白色杯子',
  negativePrompt: '',
  aspectRatio: '1:1',
  resolutionTier: '1K',
  size: '1024x1024',
  quality: 'high',
  moderation: 'auto',
  count: 5,
  compressionRate: 0.8,
  outputFormat: 'png',
}

describe('buildGenerationRequest', () => {
  it('always sends gpt-image-2 and n=1', () => {
    expect(buildGenerationRequest(form)).toMatchObject({
      model: IMAGE_MODEL,
      n: 1,
    })
  })

  it('only builds ordinary image generation request fields', () => {
    const request = buildGenerationRequest(form) as Record<string, unknown>

    expect(Object.keys(request).sort()).toEqual([
      'model',
      'moderation',
      'n',
      'output_compression',
      'output_format',
      'prompt',
      'quality',
      'size',
    ])
  })
})

describe('buildEditFormData', () => {
  it('sends gpt-image-2 and n=1 for image edits', () => {
    const file = new File(['image'], 'reference.png', { type: 'image/png' })
    const { formData } = buildEditFormData({ ...form, mode: 'edit' }, [file])

    expect(formData.get('model')).toBe(IMAGE_MODEL)
    expect(formData.get('n')).toBe('1')
  })

  it('only builds ordinary image edit form fields', () => {
    const file = new File(['image'], 'reference.png', { type: 'image/png' })
    const { formData } = buildEditFormData({ ...form, mode: 'edit' }, [file])

    expect(Array.from(formData.keys()).sort()).toEqual(['image', 'model', 'moderation', 'n', 'output_format', 'prompt', 'quality', 'size'])
  })
})

describe('generateImage', () => {
  it('uses image generations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: 'final' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await generateImage('key', form)
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))

    expect(fetchMock.mock.calls[0][0]).toBe(API_ENDPOINTS.imageGenerations)
    expect(Object.keys(body).sort()).toEqual(['model', 'moderation', 'n', 'output_format', 'prompt', 'quality', 'size'])
    expect(body.model).toBe(IMAGE_MODEL)
    expect(response.raw).toMatchObject({ data: [{ b64_json: 'final' }] })
  })
})

describe('editImage', () => {
  it('uses image edits with the original reference file', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: 'final' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['reference'], 'reference.png', { type: 'image/png' })

    await editImage('key', { ...form, mode: 'edit' }, [file])

    const body = fetchMock.mock.calls[0][1]?.body as FormData

    expect(fetchMock.mock.calls[0][0]).toBe(API_ENDPOINTS.imageEdits)
    expect(body.get('model')).toBe(IMAGE_MODEL)
    expect(body.get('image')).toBe(file)
  })
})
