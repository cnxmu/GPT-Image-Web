import { describe, expect, it, vi } from 'vitest'
import { IMAGE_MODEL } from '../../lib/constants'
import type { ImageFormState } from '../../types/image'
import { buildEditFormData, buildGenerationRequest, generateImage } from './image.api'

const form: ImageFormState = {
  mode: 'generation',
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
  it('always sends the image model and n=1', () => {
    expect(buildGenerationRequest(form)).toMatchObject({
      model: IMAGE_MODEL,
      n: 1,
    })
  })

  it('only builds the ordinary image generation request fields', () => {
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
  it('sends the image model and n=1 for image edits', () => {
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
  it('uses ordinary JSON responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: 'final' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await generateImage('key', form)
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))

    expect(Object.keys(body).sort()).toEqual(['model', 'moderation', 'n', 'output_format', 'prompt', 'quality', 'size'])
    expect(response.raw).toMatchObject({ data: [{ b64_json: 'final' }] })
  })
})
