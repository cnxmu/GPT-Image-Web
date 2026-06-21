export function nowIso() {
  return new Date().toISOString()
}

export function formatDuration(ms?: number) {
  if (!ms) return '0ms'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(ms > 10_000 ? 1 : 2)}s`
}

export function formatDateTime(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
