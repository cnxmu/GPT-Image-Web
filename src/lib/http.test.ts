import { describe, expect, it } from 'vitest'
import { formatApiErrorBody } from './http'

describe('formatApiErrorBody', () => {
  it('extracts nested OpenAI-compatible error messages', () => {
    expect(
      formatApiErrorBody({
        error: {
          message: 'model is required',
          code: 'invalid_request_error',
        },
      }),
    ).toContain('model is required')
  })

  it('keeps plain text error bodies', () => {
    expect(formatApiErrorBody('quota exceeded')).toBe('quota exceeded')
  })
})
