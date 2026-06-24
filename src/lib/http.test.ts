import { describe, expect, it } from 'vitest'
import { createHttpError } from './errors'
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

describe('createHttpError', () => {
  it('explains 524 as an upstream timeout', () => {
    const error = createHttpError(524, 'openai_error / bad_response_status_code')

    expect(error.message).toContain('中转站等待上游模型响应超时')
    expect(error.message).toContain('降低数量')
  })
})
