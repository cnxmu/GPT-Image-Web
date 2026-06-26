import { describe, expect, it } from 'vitest'
import {
  API_REQUEST_IMAGE_COUNT,
  AGENT_MODELS,
  ASPECT_RATIOS,
  DEFAULT_AGENT_MODEL,
  DEFAULT_GENERATION_CONCURRENCY,
  API_ENDPOINTS,
  IMAGE_MODEL,
  IMAGE_MODEL_FAMILIES,
  IMAGE_MODELS,
  IMAGE_SIZE_MATRIX,
  MAX_GENERATION_CONCURRENCY,
  MIN_GENERATION_CONCURRENCY,
  RESOLUTION_TIERS,
  getDefaultImageModel,
  getImageModelFamily,
  getImageModelOptions,
  getImageSize,
  getOutputCompression,
  isImageSizeMatched,
} from './constants'

describe('image size matrix', () => {
  it('covers every aspect ratio and resolution tier', () => {
    for (const aspectRatio of ASPECT_RATIOS) {
      for (const resolutionTier of RESOLUTION_TIERS) {
        expect(getImageSize(aspectRatio, resolutionTier)).toBe(IMAGE_SIZE_MATRIX[aspectRatio][resolutionTier])
      }
    }
  })

  it('rejects mismatched sizes', () => {
    expect(isImageSizeMatched('16:9', '1K', '1920x1080')).toBe(true)
    expect(isImageSizeMatched('16:9', '1K', '1024x1024')).toBe(false)
  })

  it('keeps API request image count fixed at 1', () => {
    expect(API_REQUEST_IMAGE_COUNT).toBe(1)
  })
})

describe('models', () => {
  it('uses the configured image and agent models', () => {
    expect(IMAGE_MODEL).toBe('gpt-image-2')
    expect(IMAGE_MODEL_FAMILIES).toEqual(['gpt-image-2', 'nano-banana-2', 'nano-banana-pro'])
    expect(IMAGE_MODELS).toEqual(['gpt-image-2', 'nano-banana-2', 'nano-banana-pro'])
    expect(AGENT_MODELS).toEqual(['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'])
    expect(DEFAULT_AGENT_MODEL).toBe('gpt-5.5')
  })

  it('builds Nano Banana generateContent endpoints', () => {
    expect(API_ENDPOINTS.nanoBananaGenerateContent('nano-banana-2')).toBe(
      'https://img.xmu.la/v1beta/models/nano-banana-2:generateContent',
    )
    expect(API_ENDPOINTS.nanoBananaGenerateContent('nano-banana-pro')).toBe(
      'https://img.xmu.la/v1beta/models/nano-banana-pro:generateContent',
    )
  })

  it('maps image model families to their default models', () => {
    expect(getImageModelOptions('gpt-image-2')).toEqual(['gpt-image-2'])
    expect(getDefaultImageModel('gpt-image-2')).toBe('gpt-image-2')
    expect(getImageModelFamily('gpt-image-2')).toBe('gpt-image-2')
    expect(getImageModelOptions('nano-banana-2')).toEqual(['nano-banana-2'])
    expect(getDefaultImageModel('nano-banana-pro')).toBe('nano-banana-pro')
    expect(getImageModelFamily('nano-banana-2')).toBe('nano-banana-2')
  })
})

describe('generation queue', () => {
  it('caps generation concurrency at 10', () => {
    expect(MIN_GENERATION_CONCURRENCY).toBe(1)
    expect(DEFAULT_GENERATION_CONCURRENCY).toBe(10)
    expect(MAX_GENERATION_CONCURRENCY).toBe(10)
  })
})

describe('output compression', () => {
  it('omits compression for png', () => {
    expect(getOutputCompression('png', 0.8)).toBeUndefined()
  })

  it('converts jpeg and webp compression to integer percent', () => {
    expect(getOutputCompression('jpeg', 0.8)).toBe(80)
    expect(getOutputCompression('webp', 1)).toBe(100)
  })
})
