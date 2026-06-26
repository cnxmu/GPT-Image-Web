import type { GenerationBatch, GenerationJob, GenerationStats } from '../types/image'
import { EMPTY_STATS } from '../lib/stats'

export function getJobDuration(job: GenerationJob, now: number) {
  if (job.durationMs !== undefined) return job.durationMs
  if (job.status === 'running' && job.startedAt !== undefined) return Math.max(0, Math.round(now - job.startedAt))
  return 0
}

export function recalculateBatch(batch: GenerationBatch, now: number): GenerationBatch {
  const success = batch.results.filter((job) => job.status === 'success').length
  const failed = batch.results.filter((job) => job.status === 'failed').length
  const running = batch.results.some((job) => job.status === 'running')
  const queued = batch.results.some((job) => job.status === 'queued')
  const done = success + failed === batch.total
  const slowestMs = batch.results.reduce((max, job) => Math.max(max, getJobDuration(job, now)), 0)

  return {
    ...batch,
    status: done ? (success === batch.total ? 'success' : success > 0 ? 'partial' : 'failed') : running ? 'running' : queued ? 'queued' : batch.status,
    success,
    failed,
    slowestMs,
  }
}

export function finalizeBatchTiming(batch: GenerationBatch): GenerationBatch {
  const done = batch.success + batch.failed === batch.total
  if (!done || batch.finishedAt) return batch

  const finishedAt = new Date().toISOString()
  return {
    ...batch,
    finishedAt,
    durationMs: Date.parse(finishedAt) - Date.parse(batch.createdAt),
  }
}

export function aggregateBatchStats(batches: GenerationBatch[], now: number): GenerationStats {
  return batches.reduce<GenerationStats>(
    (acc, batch) => {
      const recalculated = recalculateBatch(batch, now)
      return {
        total: acc.total + recalculated.total,
        success: acc.success + recalculated.success,
        failed: acc.failed + recalculated.failed,
        slowestMs: Math.max(acc.slowestMs, recalculated.slowestMs),
      }
    },
    { ...EMPTY_STATS },
  )
}

export function getGenerationBatchStats(batches: GenerationBatch[], now = performance.now()) {
  return aggregateBatchStats(batches, now)
}
