export type AppErrorCode =
  | 'MISSING_IMAGE_API_KEY'
  | 'MISSING_AGENT_API_KEY'
  | 'INVALID_FORM'
  | 'UPLOAD_REQUIRED'
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'RATE_LIMIT'
  | 'UNAUTHORIZED'
  | 'UNKNOWN_ERROR'

export class AppError extends Error {
  code: AppErrorCode
  status?: number

  constructor(code: AppErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return new AppError('NETWORK_ERROR', '网络请求失败，可能是网络中断、CORS 跨域限制或接口不可达')
  }
  if (error instanceof Error) return new AppError('UNKNOWN_ERROR', error.message)
  return new AppError('UNKNOWN_ERROR', '发生未知错误')
}

export function createHttpError(status: number, message: string) {
  if (status === 401 || status === 403) {
    const detail = message ? `接口返回：${message}` : '接口未返回详细原因'
    return new AppError(
      'UNAUTHORIZED',
      `接口返回 ${status}，表示认证失败或权限不足。${detail}。如果密钥确认无误，请检查该 Key 是否有当前接口权限、额度是否可用，或请求参数是否被服务策略拒绝。`,
      status,
    )
  }
  if (status === 429) {
    return new AppError('RATE_LIMIT', `请求过于频繁，请稍后重试或降低数量${message ? `。接口返回：${message}` : ''}`, status)
  }
  return new AppError('API_ERROR', `接口请求失败：${status}${message ? `。接口返回：${message}` : ''}`, status)
}
