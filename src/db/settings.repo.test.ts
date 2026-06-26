import { describe, expect, it } from 'vitest'
import { clampGenerationConcurrency } from './settings.repo'

describe('generation concurrency settings', () => {
  it('clamps unsafe concurrency values', () => {
    expect(clampGenerationConcurrency(0)).toBe(1)
    expect(clampGenerationConcurrency(5)).toBe(5)
    expect(clampGenerationConcurrency(20)).toBe(10)
    expect(clampGenerationConcurrency(200)).toBe(10)
    expect(clampGenerationConcurrency('bad')).toBe(10)
  })
})
