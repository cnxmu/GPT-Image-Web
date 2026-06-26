import type { StateCreator } from 'zustand'
import type { GenerationBatch, GenerationJob } from '../types/image'
import type { WorkbenchState } from './workbench.store'
import { recalculateBatch, finalizeBatchTiming } from './workbench-utils'

export interface QueueSlice {
  batches: GenerationBatch[]
  queue: string[]
  activeJobCount: number
  enqueueBatch: (batch: GenerationBatch) => void
  restoreBatchFromHistory: (batch: GenerationBatch, queuedJobIds: string[]) => void
  markJobRunning: (jobId: string, startedAt: number) => GenerationJob | undefined
  completeJob: (jobId: string, result: Partial<GenerationJob>, raw?: Pick<GenerationBatch, 'rawRequest' | 'rawResponse'>) => GenerationBatch | undefined
  failJob: (jobId: string, result: Partial<GenerationJob>) => GenerationBatch | undefined
  getNextQueuedJob: () => GenerationJob | undefined
  resetRuntimeStateForTest: () => void
}

export const createQueueSlice: StateCreator<WorkbenchState, [], [], QueueSlice> = (set) => ({
  batches: [],
  queue: [],
  activeJobCount: 0,
  enqueueBatch: (batch) =>
    set((state) => ({
      batches: [batch, ...state.batches],
      visibleBatchIds: [batch.id],
      queue: [...state.queue, ...batch.results.map((job) => job.id)],
    })),
  restoreBatchFromHistory: (batch, queuedJobIds) =>
    set((state) => {
      if (state.batches.some((item) => item.historyId === batch.historyId)) return state
      return {
        batches: [batch, ...state.batches],
        queue: [...state.queue, ...queuedJobIds],
      }
    }),
  markJobRunning: (jobId, startedAt) => {
    let runningJob: GenerationJob | undefined
    set((state) => {
      let found = false
      const batches = state.batches.map((batch) => {
        let touched = false
        const results = batch.results.map((job) => {
          if (job.id !== jobId) return job
          touched = true
          found = true
          runningJob = { ...job, status: 'running', startedAt }
          return runningJob
        })
        return touched ? recalculateBatch({ ...batch, status: 'running', results }, performance.now()) : batch
      })

      return found ? { activeJobCount: state.activeJobCount + 1, batches } : state
    })
    return runningJob
  },
  completeJob: (jobId, result, raw) => {
    let updatedBatch: GenerationBatch | undefined
    set((state) => {
      let found = false
      const batches = state.batches.map((batch) => {
        let touched = false
        const results = batch.results.map((job) => {
          if (job.id !== jobId) return job
          touched = true
          found = true
          return { ...job, ...result, status: 'success' as const }
        })
        if (!touched) return batch
        updatedBatch = finalizeBatchTiming(recalculateBatch({ ...batch, ...raw, results }, performance.now()))
        return updatedBatch
      })

      return found ? { activeJobCount: Math.max(0, state.activeJobCount - 1), batches } : state
    })
    return updatedBatch
  },
  failJob: (jobId, result) => {
    let updatedBatch: GenerationBatch | undefined
    set((state) => {
      let found = false
      const batches = state.batches.map((batch) => {
        let touched = false
        const results = batch.results.map((job) => {
          if (job.id !== jobId) return job
          touched = true
          found = true
          return { ...job, ...result, status: 'failed' as const }
        })
        if (!touched) return batch
        updatedBatch = finalizeBatchTiming(recalculateBatch({ ...batch, results }, performance.now()))
        return updatedBatch
      })

      return found ? { activeJobCount: Math.max(0, state.activeJobCount - 1), batches } : state
    })
    return updatedBatch
  },
  getNextQueuedJob: () => {
    let nextJob: GenerationJob | undefined
    set((state) => {
      const nextJobId = state.queue.find((jobId) =>
        state.batches.some((batch) => batch.results.some((job) => job.id === jobId && job.status === 'queued')),
      )
      if (!nextJobId) return { queue: [] }

      for (const batch of state.batches) {
        const found = batch.results.find((job) => job.id === nextJobId && job.status === 'queued')
        if (found) {
          nextJob = found
          break
        }
      }

      return {
        queue: state.queue.filter((jobId) => jobId !== nextJobId),
      }
    })
    return nextJob
  },
  resetRuntimeStateForTest: () =>
    set({
      batches: [],
      visibleBatchIds: [],
      queue: [],
      activeJobCount: 0,
      error: undefined,
    }),
})
