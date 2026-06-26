import type { StateCreator } from 'zustand'
import { getMimeType } from '../lib/image-utils'
import { formStateFromHistoryRecord } from '../lib/form-snapshot'
import type { GenerationBatch, GenerationJob, GenerationStats } from '../types/image'
import type { HistoryRecord } from '../types/history'
import type { WorkbenchState } from './workbench.store'
import { aggregateBatchStats } from './workbench-utils'

export interface BatchSlice {
  visibleBatchIds: string[]
  showBatchInResults: (batchId: string) => void
  showOnlyBatchInResults: (batchId: string) => void
  getVisibleBatches: () => GenerationBatch[]
  getSessionStats: (now?: number) => GenerationStats
  showHistoryResult: (record: HistoryRecord) => void
}

export const createBatchSlice: StateCreator<WorkbenchState, [], [], BatchSlice> = (set, get) => ({
  visibleBatchIds: [],
  showBatchInResults: (batchId) =>
    set((state) => ({
      visibleBatchIds: [batchId, ...state.visibleBatchIds.filter((id) => id !== batchId)],
    })),
  showOnlyBatchInResults: (batchId) => set({ visibleBatchIds: [batchId] }),
  getVisibleBatches: () => {
    const state = get()
    return state.batches.filter((batch) => state.visibleBatchIds.includes(batch.id))
  },
  getSessionStats: (now = performance.now()) => aggregateBatchStats(get().batches, now),
  showHistoryResult: (record) => {
    const liveBatch = get().batches.find((item) => item.historyId === record.id)
    if (liveBatch) {
      get().showOnlyBatchInResults(liveBatch.id)
      return
    }

    const batch = historyToBatch(record)
    if (!batch) return

    set((state) => ({
      batches: [batch, ...state.batches.filter((item) => item.historyRecordId !== record.id)],
      visibleBatchIds: [batch.id],
    }))
  },
})

function historyToBatch(record: HistoryRecord): GenerationBatch | undefined {
  const formState = formStateFromHistoryRecord(record)

  const historyResults =
    record.results.length > 0
      ? record.results
      : record.status === 'running' || record.status === 'pending'
        ? Array.from({ length: record.total }, (_, jobIndex): HistoryRecord['results'][number] => ({
            id: `legacy_${record.id}_${jobIndex}`,
            jobIndex,
            status: 'queued' as const,
            durationMs: 0,
          }))
        : []

  if (historyResults.length === 0) return undefined

  const results: GenerationJob[] = historyResults.map((result) => ({
    id: `history_${record.id}_${result.id}`,
    batchId: `history_${record.id}`,
    jobIndex: result.jobIndex,
    status: result.status === 'running' ? 'queued' : result.status,
    url: result.url,
    b64Json: result.b64Json,
    localAssetId: result.localAssetId,
    actualWidth: result.actualWidth,
    actualHeight: result.actualHeight,
    durationMs: result.durationMs,
    error: result.error,
    raw: result.raw,
    mimeType: getMimeType(formState.outputFormat as 'png' | 'jpeg' | 'webp'),
  }))

  const hasUnfinished = results.some((job) => job.status === 'queued' || job.status === 'running')

  return {
    id: `history_${record.id}`,
    historyId: record.id,
    historyRecordId: record.id,
    source: 'history',
    form: formState,
    status: hasUnfinished ? 'running' : record.status === 'pending' || record.status === 'running' ? 'partial' : record.status,
    total: record.total,
    success: record.success,
    failed: record.failed,
    slowestMs: record.slowestMs,
    createdAt: record.startedAt,
    createdAtMs: Date.parse(record.startedAt) || performance.now(),
    finishedAt: record.finishedAt,
    durationMs: record.durationMs,
    rawRequest: record.rawRequest,
    rawResponse: record.rawResponse,
    notice:
      record.notice ||
      (record.results.length === 0 && (record.status === 'running' || record.status === 'pending')
        ? '这条运行中历史来自旧版本，缺少持久化明细，只能为你显示占位，无法完整续跑。'
        : undefined),
    results,
  }
}
