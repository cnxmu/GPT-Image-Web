import { describe, expect, it } from 'vitest'
import { normalizeImageResponse } from './image.adapter'

describe('normalizeImageResponse', () => {
  it('extracts images from generateContent inlineData parts', () => {
    const results = normalizeImageResponse(
      {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: 'ZmFrZS1pbWFnZQ==',
                  },
                },
              ],
            },
          },
        ],
      },
      'png',
    )

    expect(results).toHaveLength(1)
    expect(results[0].b64Json).toBe('data:image/png;base64,ZmFrZS1pbWFnZQ==')
  })
})
