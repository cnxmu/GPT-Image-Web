import { describe, expect, it } from 'vitest'
import {
  API_REQUEST_IMAGE_COUNT,
  AGENT_MODELS,
  ASPECT_RATIOS,
  DEFAULT_AGENT_MODEL,
  DEFAULT_GENERATION_CONCURRENCY,
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
    expect(IMAGE_MODEL_FAMILIES).toEqual(['gpt-image-2'])
    expect(IMAGE_MODELS).toEqual(['gpt-image-2'])
    expect(AGENT_MODELS).toEqual(['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'])
    expect(DEFAULT_AGENT_MODEL).toBe('gpt-5.5')
  })

  it('maps the image model family to gpt-image-2', () => {
    expect(getImageModelOptions('gpt-image-2')).toEqual(['gpt-image-2'])
    expect(getDefaultImageModel('gpt-image-2')).toBe('gpt-image-2')
    expect(getImageModelFamily('gpt-image-2')).toBe('gpt-image-2')
  })
})

describe('generation queue', () => {
  it('uses a safer default concurrency and keeps the advanced upper bound', () => {
    expect(MIN_GENERATION_CONCURRENCY).toBe(1)
    expect(DEFAULT_GENERATION_CONCURRENCY).toBe(20)
    expect(MAX_GENERATION_CONCURRENCY).toBe(100)
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
