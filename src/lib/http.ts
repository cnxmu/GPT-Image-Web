import { createHttpError } from './errors'

export async function readResponseBody(response: Response) {
  const text = await response.text()
  if (!text) return undefined

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function formatApiErrorBody(body: unknown) {
  if (!body) return ''

  if (typeof body === 'string') return body

  if (typeof body === 'object' && body) {
    const payload = body as {
      error?: unknown
      message?: unknown
      detail?: unknown
    }

    if (typeof payload.error === 'string') return payload.error
    if (typeof payload.message === 'string') return payload.message
    if (typeof payload.detail === 'string') return payload.detail

    if (typeof payload.error === 'object' && payload.error) {
      const errorPayload = payload.error as { message?: unknown; code?: unknown; type?: unknown }
      const parts = [errorPayload.message, errorPayload.code, errorPayload.type]
        .filter((item): item is string => typeof item === 'string' && item.length > 0)
      if (parts.length > 0) return parts.join(' / ')
    }

    return JSON.stringify(body)
  }

  return String(body)
}

export async function ensureOk(response: Response) {
  const body = await readResponseBody(response)
  if (!response.ok) {
    throw createHttpError(response.status, formatApiErrorBody(body))
  }
  return body
}
