import { describe, expect, it } from 'vitest'
import { clampGenerationConcurrency, normalizeNanoBananaDetailedModelsEnabled } from './settings.repo'

describe('generation concurrency settings', () => {
  it('clamps unsafe concurrency values', () => {
    expect(clampGenerationConcurrency(0)).toBe(1)
    expect(clampGenerationConcurrency(20)).toBe(20)
    expect(clampGenerationConcurrency(200)).toBe(100)
    expect(clampGenerationConcurrency('bad')).toBe(20)
  })
})

describe('nano banana detailed model settings', () => {
  it('defaults detailed models to disabled unless the setting is explicitly true', () => {
    expect(normalizeNanoBananaDetailedModelsEnabled(undefined)).toBe(false)
    expect(normalizeNanoBananaDetailedModelsEnabled('true')).toBe(false)
    expect(normalizeNanoBananaDetailedModelsEnabled(false)).toBe(false)
    expect(normalizeNanoBananaDetailedModelsEnabled(true)).toBe(true)
  })
})
