import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkbenchStore } from './workbench.store'
import type { GenerationBatch, ImageFormState } from '../types/image'
import type { HistoryRecord } from '../types/history'

function form(count: number): ImageFormState {
  return {
    mode: 'generation',
    prompt: 'test',
    negativePrompt: '',
    aspectRatio: '1:1',
    resolutionTier: '1K',
    size: '1024x1024',
    quality: 'high',
    moderation: 'auto',
    count,
    compressionRate: 0.8,
    outputFormat: 'png',
  }
}

function batch(id: string, count: number): GenerationBatch {
  return {
    id,
    historyId: `history-${id}`,
    form: form(count),
    status: 'queued',
    total: count,
    success: 0,
    failed: 0,
    slowestMs: 0,
    createdAt: new Date().toISOString(),
    createdAtMs: 0,
    results: Array.from({ length: count }, (_, jobIndex) => ({
      id: `${id}-job-${jobIndex}`,
      batchId: id,
      jobIndex,
      status: 'queued',
      mimeType: 'image/png',
      raw: undefined,
    })),
  }
}

function historyRecord(id: string): HistoryRecord {
  return {
    id,
    mode: 'generation',
    prompt: '历史提示词',
    negativePrompt: '历史负面词',
    params: {
      aspectRatio: '16:9',
      resolutionTier: '1K',
      size: '1920x1080',
      quality: 'high',
      moderation: 'auto',
      count: 2,
      compressionRate: 0.8,
      outputFormat: 'webp',
    },
    status: 'partial',
    total: 2,
    success: 1,
    failed: 1,
    slowestMs: 1500,
    startedAt: '2026-06-20T00:00:00.000Z',
    finishedAt: '2026-06-20T00:00:03.000Z',
    durationMs: 3000,
    results: [
      {
        id: 'ok',
        jobIndex: 0,
        status: 'success',
        localAssetId: 'asset-history-ok',
        actualWidth: 1920,
        actualHeight: 1080,
        durationMs: 1200,
        raw: { ok: true },
      },
      {
        id: 'bad',
        jobIndex: 1,
        status: 'failed',
        durationMs: 1500,
        error: '接口失败',
      },
    ],
  }
}

describe('workbench generation queue', () => {
  beforeEach(() => {
    useWorkbenchStore.getState().resetRuntimeStateForTest()
  })

  it('keeps consecutive batches instead of replacing previous results', () => {
    useWorkbenchStore.getState().enqueueBatch(batch('a', 2))
    useWorkbenchStore.getState().enqueueBatch(batch('b', 3))

    expect(useWorkbenchStore.getState().batches.map((item) => item.id)).toEqual(['b', 'a'])
    expect(useWorkbenchStore.getState().queue).toHaveLength(5)
    expect(useWorkbenchStore.getState().getVisibleBatches().map((item) => item.id)).toEqual(['b'])
  })

  it('counts running job elapsed time in session slowest duration', () => {
    useWorkbenchStore.getState().enqueueBatch(batch('a', 1))
    const job = useWorkbenchStore.getState().getNextQueuedJob()
    expect(job).toBeDefined()

    useWorkbenchStore.getState().markJobRunning(job!.id, 1000)

    expect(useWorkbenchStore.getState().getSessionStats(3500)).toMatchObject({
      total: 1,
      success: 0,
      failed: 0,
      slowestMs: 2500,
    })
  })

  it('does not count queued jobs as elapsed time', () => {
    useWorkbenchStore.getState().enqueueBatch(batch('a', 2))

    expect(useWorkbenchStore.getState().getSessionStats(5000).slowestMs).toBe(0)
  })

  it('updates batch status when all jobs finish with mixed results', () => {
    useWorkbenchStore.getState().enqueueBatch(batch('a', 2))
    const first = useWorkbenchStore.getState().getNextQueuedJob()!
    const second = useWorkbenchStore.getState().getNextQueuedJob()!

    useWorkbenchStore.getState().markJobRunning(first.id, 1000)
    useWorkbenchStore.getState().completeJob(first.id, { durationMs: 700, finishedAt: 1700 })
    useWorkbenchStore.getState().markJobRunning(second.id, 2000)
    const updatedBatch = useWorkbenchStore.getState().failJob(second.id, { durationMs: 900, finishedAt: 2900 })

    expect(updatedBatch?.status).toBe('partial')
    expect(updatedBatch?.success).toBe(1)
    expect(updatedBatch?.failed).toBe(1)
    expect(updatedBatch?.slowestMs).toBe(900)
  })

  it('shows history results as a readonly batch and keeps live batches', () => {
    useWorkbenchStore.getState().enqueueBatch(batch('live', 1))
    useWorkbenchStore.getState().showHistoryResult(historyRecord('history-a'))

    const batches = useWorkbenchStore.getState().batches
    expect(batches).toHaveLength(2)
    expect(batches[0].source).toBe('history')
    expect(batches[0].historyRecordId).toBe('history-a')
    expect(batches[0].form.prompt).toBe('历史提示词')
    expect(batches[0].form.size).toBe('1920x1080')
    expect(batches[0].results[0]).toMatchObject({
      status: 'success',
      localAssetId: 'asset-history-ok',
      actualWidth: 1920,
      actualHeight: 1080,
      durationMs: 1200,
    })
    expect(batches[0].results[1]).toMatchObject({
      status: 'failed',
      error: '接口失败',
      durationMs: 1500,
    })
    expect(batches[1].id).toBe('live')
    expect(useWorkbenchStore.getState().getVisibleBatches()[0].historyRecordId).toBe('history-a')
  })

  it('shows a running live batch when clicking its history record', () => {
    const live = batch('live', 1)
    live.historyId = 'history-a'
    useWorkbenchStore.getState().enqueueBatch(live)
    useWorkbenchStore.getState().enqueueBatch(batch('new', 1))

    expect(useWorkbenchStore.getState().getVisibleBatches().map((item) => item.id)).toEqual(['new'])

    useWorkbenchStore.getState().showHistoryResult(historyRecord('history-a'))

    expect(useWorkbenchStore.getState().getVisibleBatches().map((item) => item.id)).toEqual(['live'])
    expect(useWorkbenchStore.getState().getVisibleBatches()[0].source).toBeUndefined()
  })

  it('deduplicates repeated history result views by record id', () => {
    useWorkbenchStore.getState().enqueueBatch(batch('live', 1))
    useWorkbenchStore.getState().showHistoryResult(historyRecord('history-a'))
    useWorkbenchStore.getState().showHistoryResult(historyRecord('history-a'))

    const batches = useWorkbenchStore.getState().batches
    expect(batches.filter((item) => item.historyRecordId === 'history-a')).toHaveLength(1)
    expect(batches[0].historyRecordId).toBe('history-a')
    expect(batches[1].id).toBe('live')
  })

  it('shows placeholders for a running history record without persisted results', () => {
    const record = historyRecord('history-running')
    record.status = 'running'
    record.success = 0
    record.failed = 0
    record.results = []

    useWorkbenchStore.getState().showHistoryResult(record)

    const visible = useWorkbenchStore.getState().getVisibleBatches()[0]
    expect(visible.historyRecordId).toBe('history-running')
    expect(visible.status).toBe('running')
    expect(visible.results).toHaveLength(2)
    expect(visible.results.every((job) => job.status === 'queued')).toBe(true)
    expect(visible.notice).toContain('缺少持久化明细')
  })

  it('refills form params when applying history', () => {
    useWorkbenchStore.getState().applyHistory(historyRecord('history-a'))

    expect(useWorkbenchStore.getState()).toMatchObject({
      prompt: '历史提示词',
      negativePrompt: '历史负面词',
      aspectRatio: '16:9',
      resolutionTier: '1K',
      size: '1920x1080',
      outputFormat: 'webp',
    })
  })
})
