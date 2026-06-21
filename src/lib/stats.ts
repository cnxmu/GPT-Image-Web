import type { HistoryRecord } from '../types/history'
import type { GenerationStats } from '../types/image'

export const EMPTY_STATS: GenerationStats = {
  total: 0,
  success: 0,
  failed: 0,
  slowestMs: 0,
}

export function aggregateStats(history: HistoryRecord[]): GenerationStats {
  return history.reduce<GenerationStats>(
    (acc, item) => ({
      total: acc.total + item.total,
      success: acc.success + item.success,
      failed: acc.failed + item.failed,
      slowestMs: Math.max(acc.slowestMs, item.slowestMs || 0),
    }),
    { ...EMPTY_STATS },
  )
}
