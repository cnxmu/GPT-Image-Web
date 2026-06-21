import { describe, expect, it } from 'vitest'
import { aggregateStats } from './stats'
import type { HistoryRecord } from '../types/history'

function history(partial: Pick<HistoryRecord, 'total' | 'success' | 'failed' | 'slowestMs'>): HistoryRecord {
  return {
    id: crypto.randomUUID(),
    mode: 'generation',
    prompt: 'test',
    params: {
      aspectRatio: '1:1',
      resolutionTier: '1K',
      size: '1024x1024',
      quality: 'high',
      moderation: 'auto',
      count: partial.total,
      outputFormat: 'png',
    },
    status: 'success',
    startedAt: new Date().toISOString(),
    results: [],
    ...partial,
  }
}

describe('aggregateStats', () => {
  it('aggregates totals and keeps the slowest duration', () => {
    expect(
      aggregateStats([
        history({ total: 3, success: 2, failed: 1, slowestMs: 1200 }),
        history({ total: 4, success: 4, failed: 0, slowestMs: 900 }),
      ]),
    ).toEqual({
      total: 7,
      success: 6,
      failed: 1,
      slowestMs: 1200,
    })
  })
})
