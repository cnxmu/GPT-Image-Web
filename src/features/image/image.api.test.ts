import { describe, expect, it, vi } from 'vitest'
import { API_ENDPOINTS, IMAGE_MODEL } from '../../lib/constants'
import type { ImageFormState } from '../../types/image'
import { buildChatCompletionRequest, buildEditFormData, buildGenerationRequest, editImage, generateImage } from './image.api'

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
  nanoBananaTemperature: 1,
  nanoBananaTopP: 1,
  nanoBananaMaxTokens: 1024,
  nanoBananaSeed: undefined,
}

describe('buildGenerationRequest', () => {
  it('always sends the image model and n=1', () => {
    expect(buildGenerationRequest(form)).toMatchObject({
      model: IMAGE_MODEL,
      n: 1,
    })
  })

  it('uses the selected image model', () => {
    expect(buildGenerationRequest({ ...form, imageModelFamily: 'nano-banana-2', imageModel: 'nano-banana-2-4K' })).toMatchObject({
      model: 'nano-banana-2-4K',
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
    const { formData } = buildEditFormData({ ...form, mode: 'edit', imageModelFamily: 'nano-banana-pro', imageModel: 'nano-banana-pro-2K' }, [file])

    expect(formData.get('model')).toBe('nano-banana-pro-2K')
    expect(formData.get('n')).toBe('1')
  })

  it('only builds ordinary image edit form fields', () => {
    const file = new File(['image'], 'reference.png', { type: 'image/png' })
    const { formData } = buildEditFormData({ ...form, mode: 'edit' }, [file])

    expect(Array.from(formData.keys()).sort()).toEqual(['image', 'model', 'moderation', 'n', 'output_format', 'prompt', 'quality', 'size'])
  })
})

describe('generateImage', () => {
  it('uses image generations for gpt-image-2', async () => {
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
    expect(response.raw).toMatchObject({ data: [{ b64_json: 'final' }] })
  })

  it('uses chat completions for nano-banana text-to-image', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: 'data:image/png;base64,final' } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await generateImage('banana-key', {
      ...form,
      imageModelFamily: 'nano-banana-2',
      imageModel: 'nano-banana-2-4K',
      nanoBananaTemperature: 0.7,
      nanoBananaTopP: 0.9,
      nanoBananaMaxTokens: 2048,
      nanoBananaSeed: 12345,
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))

    expect(fetchMock.mock.calls[0][0]).toBe(API_ENDPOINTS.chatCompletions)
    expect(body.model).toBe('nano-banana-2-4K')
    expect(body).toMatchObject({
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2048,
      seed: 12345,
    })
    expect(body.messages[1].content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('一只白色杯子'),
    })
  })
})

describe('editImage', () => {
  it('uses chat completions with image_url content for nano-banana image-to-image', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { images: [{ url: 'https://example.com/image.png' }] } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const file = new File(['reference'], 'reference.png', { type: 'image/png' })

    await editImage(
      'banana-key',
      {
        ...form,
        mode: 'edit',
        imageModelFamily: 'nano-banana-pro',
        imageModel: 'nano-banana-pro-2K',
      },
      [file],
    )

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))

    expect(fetchMock.mock.calls[0][0]).toBe(API_ENDPOINTS.chatCompletions)
    expect(body.model).toBe('nano-banana-pro-2K')
    expect(body.messages[1].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'image_url',
          image_url: expect.objectContaining({
            url: expect.stringMatching(/^data:image\/png;base64,/),
          }),
        }),
      ]),
    )
  })
})

describe('buildChatCompletionRequest', () => {
  it('omits empty optional nano-banana fields', async () => {
    const request = await buildChatCompletionRequest({
      ...form,
      imageModelFamily: 'nano-banana-2',
      imageModel: 'nano-banana-2',
      nanoBananaSeed: undefined,
    })

    expect(request).toMatchObject({
      model: 'nano-banana-2',
      max_tokens: 1024,
    })
    expect('seed' in request).toBe(false)
  })

  it('keeps nano-banana references as data URLs without changing the file type', async () => {
    const file = new File(['reference'], 'reference.webp', { type: 'image/webp' })
    const request = await buildChatCompletionRequest(
      {
        ...form,
        mode: 'edit',
        imageModelFamily: 'nano-banana-2',
        imageModel: 'nano-banana-2',
      },
      [file],
    )

    expect(request.model).toBe('nano-banana-2')
    expect(request.messages[1].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'image_url',
          image_url: expect.objectContaining({
            url: expect.stringMatching(/^data:image\/webp;base64,/),
          }),
        }),
      ]),
    )
  })
})
