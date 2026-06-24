import { create } from 'zustand'
import {
  DEFAULT_COMPRESSION_RATE,
  DEFAULT_NANO_BANANA_MAX_TOKENS,
  DEFAULT_NANO_BANANA_TEMPERATURE,
  DEFAULT_NANO_BANANA_TOP_P,
  IMAGE_MODEL,
  getImageSize,
  getDefaultImageModel,
  getImageModelFamily,
  isAspectRatio,
  isImageModel,
  isImageModelFamily,
  isImageQuality,
  isModerationLevel,
  isOutputFormat,
  isResolutionTier,
  MAX_IMAGE_COUNT,
  MIN_IMAGE_COUNT,
  MIN_NANO_BANANA_MAX_TOKENS,
  MIN_NANO_BANANA_TEMPERATURE,
  MIN_NANO_BANANA_TOP_P,
  MAX_NANO_BANANA_TEMPERATURE,
  MAX_NANO_BANANA_TOP_P,
  type AspectRatio,
  type ImageModel,
  type ImageModelFamily,
  type ImageQuality,
  type ModerationLevel,
  type OutputFormat,
  type ResolutionTier,
  type WorkbenchMode,
} from '../lib/constants'
import { EMPTY_STATS } from '../lib/stats'
import { createId } from '../lib/uid'
import type { GenerationBatch, GenerationJob, GenerationStats, ReferenceImagePreview } from '../types/image'
import type { HistoryRecord } from '../types/history'
import type { TemplateRecord } from '../types/template'

export interface WorkbenchState {
  mode: WorkbenchMode
  imageModelFamily: ImageModelFamily
  imageModel: ImageModel
  prompt: string
  negativePrompt: string
  aspectRatio: AspectRatio
  resolutionTier: ResolutionTier
  size: ReturnType<typeof getImageSize>
  quality: ImageQuality
  moderation: ModerationLevel
  count: number
  compressionRate: number
  outputFormat: OutputFormat
  nanoBananaTemperature: number
  nanoBananaTopP: number
  nanoBananaMaxTokens: number
  nanoBananaSeed?: number
  referenceImages: ReferenceImagePreview[]
  batches: GenerationBatch[]
  visibleBatchIds: string[]
  queue: string[]
  activeJobCount: number
  error?: string
  setMode: (mode: WorkbenchMode) => void
  setImageModelFamily: (family: ImageModelFamily) => void
  setImageModel: (model: ImageModel) => void
  setPrompt: (prompt: string) => void
  setNegativePrompt: (negativePrompt: string) => void
  setAspectRatio: (aspectRatio: AspectRatio) => void
  setResolutionTier: (resolutionTier: ResolutionTier) => void
  setQuality: (quality: ImageQuality) => void
  setModeration: (moderation: ModerationLevel) => void
  setCount: (count: number) => void
  setCompressionRate: (compressionRate: number) => void
  setOutputFormat: (outputFormat: OutputFormat) => void
  setNanoBananaTemperature: (temperature: number) => void
  setNanoBananaTopP: (topP: number) => void
  setNanoBananaMaxTokens: (maxTokens: number) => void
  setNanoBananaSeed: (seed?: number) => void
  addReferenceFiles: (files: File[]) => void
  removeReferenceImage: (id: string) => void
  clearReferenceImages: () => void
  enqueueBatch: (batch: GenerationBatch) => void
  restoreBatchFromHistory: (batch: GenerationBatch, queuedJobIds: string[]) => void
  getVisibleBatches: () => GenerationBatch[]
  showBatchInResults: (batchId: string) => void
  showOnlyBatchInResults: (batchId: string) => void
  markJobRunning: (jobId: string, startedAt: number) => GenerationJob | undefined
  completeJob: (jobId: string, result: Partial<GenerationJob>, raw?: Pick<GenerationBatch, 'rawRequest' | 'rawResponse'>) => GenerationBatch | undefined
  failJob: (jobId: string, result: Partial<GenerationJob>) => GenerationBatch | undefined
  getNextQueuedJob: () => GenerationJob | undefined
  getSessionStats: (now?: number) => GenerationStats
  resetRuntimeStateForTest: () => void
  setError: (error?: string) => void
  resetForm: () => void
  applyTemplate: (template: TemplateRecord) => void
  applyHistory: (record: HistoryRecord) => void
  showHistoryResult: (record: HistoryRecord) => void
}

const defaultAspectRatio: AspectRatio = '1:1'
const defaultResolutionTier: ResolutionTier = '1K'

function clampCount(count: number) {
  return Math.max(MIN_IMAGE_COUNT, Math.min(MAX_IMAGE_COUNT, Math.round(count || 1)))
}

function formFromHistory(record: HistoryRecord): {
  mode: WorkbenchMode
  imageModelFamily: ImageModelFamily
  imageModel: ImageModel
  prompt: string
  negativePrompt: string
  aspectRatio: AspectRatio
  resolutionTier: ResolutionTier
  size: ReturnType<typeof getImageSize>
  quality: ImageQuality
  moderation: ModerationLevel
  count: number
  compressionRate: number
  outputFormat: OutputFormat
  nanoBananaTemperature: number
  nanoBananaTopP: number
  nanoBananaMaxTokens: number
  nanoBananaSeed?: number
} {
  const historyModel = typeof record.params.imageModel === 'string' && isImageModel(record.params.imageModel)
    ? record.params.imageModel
    : undefined
  const imageModelFamily =
    typeof record.params.imageModelFamily === 'string' && isImageModelFamily(record.params.imageModelFamily)
      ? record.params.imageModelFamily
      : historyModel
        ? getImageModelFamily(historyModel)
        : 'gpt-image-2'
  const imageModel = historyModel && getImageModelFamily(historyModel) === imageModelFamily
    ? historyModel
    : getDefaultImageModel(imageModelFamily)
  const aspectRatio = isAspectRatio(record.params.aspectRatio) ? record.params.aspectRatio : defaultAspectRatio
  const resolutionTier = isResolutionTier(record.params.resolutionTier)
    ? record.params.resolutionTier
    : defaultResolutionTier
  const outputFormat = record.params.outputFormat && isOutputFormat(record.params.outputFormat) ? record.params.outputFormat : 'png'
  return {
    mode: record.mode,
    imageModelFamily,
    imageModel,
    prompt: record.prompt,
    negativePrompt: record.negativePrompt || '',
    aspectRatio,
    resolutionTier,
    size: getImageSize(aspectRatio, resolutionTier),
    quality: isImageQuality(record.params.quality) ? record.params.quality : 'high',
    moderation: isModerationLevel(record.params.moderation) ? record.params.moderation : 'auto',
    count: clampCount(record.params.count),
    compressionRate:
      typeof record.params.compressionRate === 'number'
        ? record.params.compressionRate
        : DEFAULT_COMPRESSION_RATE,
    outputFormat,
    nanoBananaTemperature: clampNanoBananaTemperature(record.params.nanoBananaTemperature),
    nanoBananaTopP: clampNanoBananaTopP(record.params.nanoBananaTopP),
    nanoBananaMaxTokens: clampNanoBananaMaxTokens(record.params.nanoBananaMaxTokens),
    nanoBananaSeed: normalizeOptionalInteger(record.params.nanoBananaSeed),
  }
}

function clampNanoBananaTemperature(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(MIN_NANO_BANANA_TEMPERATURE, Math.min(MAX_NANO_BANANA_TEMPERATURE, value))
    : DEFAULT_NANO_BANANA_TEMPERATURE
}

function clampNanoBananaTopP(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(MIN_NANO_BANANA_TOP_P, Math.min(MAX_NANO_BANANA_TOP_P, value))
    : DEFAULT_NANO_BANANA_TOP_P
}

function clampNanoBananaMaxTokens(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(MIN_NANO_BANANA_MAX_TOKENS, Math.round(value))
    : DEFAULT_NANO_BANANA_MAX_TOKENS
}

function normalizeOptionalInteger(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : undefined
}

function historyToBatch(record: HistoryRecord): GenerationBatch | undefined {
  const form = formFromHistory(record)
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
    mimeType: form.outputFormat === 'jpeg' ? 'image/jpeg' : form.outputFormat === 'webp' ? 'image/webp' : 'image/png',
  }))

  const hasUnfinished = results.some((job) => job.status === 'queued' || job.status === 'running')

  return {
    id: `history_${record.id}`,
    historyId: record.id,
    historyRecordId: record.id,
    source: 'history',
    form,
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

function getJobDuration(job: GenerationJob, now: number) {
  if (job.durationMs !== undefined) return job.durationMs
  if (job.status === 'running' && job.startedAt !== undefined) return Math.max(0, Math.round(now - job.startedAt))
  return 0
}

function recalculateBatch(batch: GenerationBatch, now: number): GenerationBatch {
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

function finalizeBatchTiming(batch: GenerationBatch): GenerationBatch {
  const done = batch.success + batch.failed === batch.total
  if (!done || batch.finishedAt) return batch

  const finishedAt = new Date().toISOString()
  return {
    ...batch,
    finishedAt,
    durationMs: Date.parse(finishedAt) - Date.parse(batch.createdAt),
  }
}

function aggregateBatchStats(batches: GenerationBatch[], now: number): GenerationStats {
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

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  mode: 'generation',
  imageModelFamily: 'gpt-image-2',
  imageModel: IMAGE_MODEL,
  prompt: '',
  negativePrompt: '',
  aspectRatio: defaultAspectRatio,
  resolutionTier: defaultResolutionTier,
  size: getImageSize(defaultAspectRatio, defaultResolutionTier),
  quality: 'high',
  moderation: 'auto',
  count: 1,
  compressionRate: DEFAULT_COMPRESSION_RATE,
  outputFormat: 'png',
  nanoBananaTemperature: DEFAULT_NANO_BANANA_TEMPERATURE,
  nanoBananaTopP: DEFAULT_NANO_BANANA_TOP_P,
  nanoBananaMaxTokens: DEFAULT_NANO_BANANA_MAX_TOKENS,
  nanoBananaSeed: undefined,
  referenceImages: [],
  batches: [],
  visibleBatchIds: [],
  queue: [],
  activeJobCount: 0,
  setMode: (mode) => set({ mode }),
  setImageModelFamily: (imageModelFamily) =>
    set({
      imageModelFamily,
      imageModel: getDefaultImageModel(imageModelFamily),
    }),
  setImageModel: (imageModel) =>
    set({
      imageModel,
      imageModelFamily: getImageModelFamily(imageModel),
    }),
  setPrompt: (prompt) => set({ prompt }),
  setNegativePrompt: (negativePrompt) => set({ negativePrompt }),
  setAspectRatio: (aspectRatio) =>
    set((state) => ({
      aspectRatio,
      size: getImageSize(aspectRatio, state.resolutionTier),
    })),
  setResolutionTier: (resolutionTier) =>
    set((state) => ({
      resolutionTier,
      size: getImageSize(state.aspectRatio, resolutionTier),
    })),
  setQuality: (quality) => set({ quality }),
  setModeration: (moderation) => set({ moderation }),
  setCount: (count) => set({ count: clampCount(count) }),
  setCompressionRate: (compressionRate) => set({ compressionRate }),
  setOutputFormat: (outputFormat) => set({ outputFormat }),
  setNanoBananaTemperature: (nanoBananaTemperature) =>
    set({ nanoBananaTemperature: clampNanoBananaTemperature(nanoBananaTemperature) }),
  setNanoBananaTopP: (nanoBananaTopP) => set({ nanoBananaTopP: clampNanoBananaTopP(nanoBananaTopP) }),
  setNanoBananaMaxTokens: (nanoBananaMaxTokens) =>
    set({ nanoBananaMaxTokens: clampNanoBananaMaxTokens(nanoBananaMaxTokens) }),
  setNanoBananaSeed: (nanoBananaSeed) => set({ nanoBananaSeed: normalizeOptionalInteger(nanoBananaSeed) }),
  addReferenceFiles: (files) =>
    set((state) => ({
      referenceImages: [
        ...state.referenceImages,
        ...files.map((file) => ({
          id: createId('ref'),
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ],
    })),
  removeReferenceImage: (id) =>
    set((state) => {
      const removed = state.referenceImages.find((item) => item.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return {
        referenceImages: state.referenceImages.filter((item) => item.id !== id),
      }
    }),
  clearReferenceImages: () =>
    set((state) => {
      state.referenceImages.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      return { referenceImages: [] }
    }),
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
  getVisibleBatches: () => {
    const state = get()
    return state.batches.filter((batch) => state.visibleBatchIds.includes(batch.id))
  },
  showBatchInResults: (batchId) =>
    set((state) => ({
      visibleBatchIds: [batchId, ...state.visibleBatchIds.filter((id) => id !== batchId)],
    })),
  showOnlyBatchInResults: (batchId) => set({ visibleBatchIds: [batchId] }),
  markJobRunning: (jobId, startedAt) => {
    let runningJob: GenerationJob | undefined
    set((state) => ({
      activeJobCount: state.activeJobCount + 1,
      batches: state.batches.map((batch) => {
        let touched = false
        const results = batch.results.map((job) => {
          if (job.id !== jobId) return job
          touched = true
          runningJob = { ...job, status: 'running', startedAt }
          return runningJob
        })
        return touched ? recalculateBatch({ ...batch, status: 'running', results }, performance.now()) : batch
      }),
    }))
    return runningJob
  },
  completeJob: (jobId, result, raw) => {
    let updatedBatch: GenerationBatch | undefined
    set((state) => ({
      activeJobCount: Math.max(0, state.activeJobCount - 1),
      batches: state.batches.map((batch) => {
        let touched = false
        const results = batch.results.map((job) => {
          if (job.id !== jobId) return job
          touched = true
          return { ...job, ...result, status: 'success' as const }
        })
        if (!touched) return batch
        updatedBatch = finalizeBatchTiming(recalculateBatch({ ...batch, ...raw, results }, performance.now()))
        return updatedBatch
      }),
    }))
    return updatedBatch
  },
  failJob: (jobId, result) => {
    let updatedBatch: GenerationBatch | undefined
    set((state) => ({
      activeJobCount: Math.max(0, state.activeJobCount - 1),
      batches: state.batches.map((batch) => {
        let touched = false
        const results = batch.results.map((job) => {
          if (job.id !== jobId) return job
          touched = true
          return { ...job, ...result, status: 'failed' as const }
        })
        if (!touched) return batch
        updatedBatch = finalizeBatchTiming(recalculateBatch({ ...batch, results }, performance.now()))
        return updatedBatch
      }),
    }))
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
  getSessionStats: (now = performance.now()) => aggregateBatchStats(get().batches, now),
  resetRuntimeStateForTest: () =>
    set({
      batches: [],
      visibleBatchIds: [],
      queue: [],
      activeJobCount: 0,
      error: undefined,
    }),
  setError: (error) => set({ error }),
  resetForm: () => {
    get().clearReferenceImages()
    set({
      mode: 'generation',
      imageModelFamily: 'gpt-image-2',
      imageModel: IMAGE_MODEL,
      prompt: '',
      negativePrompt: '',
      aspectRatio: defaultAspectRatio,
      resolutionTier: defaultResolutionTier,
      size: getImageSize(defaultAspectRatio, defaultResolutionTier),
      quality: 'high',
      moderation: 'auto',
      count: 1,
      compressionRate: DEFAULT_COMPRESSION_RATE,
      outputFormat: 'png',
      nanoBananaTemperature: DEFAULT_NANO_BANANA_TEMPERATURE,
      nanoBananaTopP: DEFAULT_NANO_BANANA_TOP_P,
      nanoBananaMaxTokens: DEFAULT_NANO_BANANA_MAX_TOKENS,
      nanoBananaSeed: undefined,
      error: undefined,
    })
  },
  applyTemplate: (template) => {
    const size = getImageSize(template.aspectRatio, template.resolutionTier)
    const templateFamily = template.imageModelFamily || (template.imageModel ? getImageModelFamily(template.imageModel) : 'gpt-image-2')
    const templateModel =
      template.imageModel && getImageModelFamily(template.imageModel) === templateFamily
        ? template.imageModel
        : getDefaultImageModel(templateFamily)
    set({
      mode: template.mode,
      imageModelFamily: templateFamily,
      imageModel: templateModel,
      prompt: template.prompt,
      negativePrompt: template.negativePrompt || '',
      aspectRatio: template.aspectRatio,
      resolutionTier: template.resolutionTier,
      size,
      quality: template.quality,
      moderation: template.moderation,
      count: clampCount(template.count),
      compressionRate: template.compressionRate,
      outputFormat: template.outputFormat,
      nanoBananaTemperature: template.nanoBananaTemperature ?? DEFAULT_NANO_BANANA_TEMPERATURE,
      nanoBananaTopP: template.nanoBananaTopP ?? DEFAULT_NANO_BANANA_TOP_P,
      nanoBananaMaxTokens: template.nanoBananaMaxTokens ?? DEFAULT_NANO_BANANA_MAX_TOKENS,
      nanoBananaSeed: template.nanoBananaSeed,
      error: undefined,
    })
  },
  applyHistory: (record) => {
    const form = formFromHistory(record)
    set({
      mode: form.mode,
      imageModelFamily: form.imageModelFamily,
      imageModel: form.imageModel,
      prompt: form.prompt,
      negativePrompt: form.negativePrompt,
      aspectRatio: form.aspectRatio,
      resolutionTier: form.resolutionTier,
      size: form.size,
      quality: form.quality,
      moderation: form.moderation,
      count: form.count,
      compressionRate: form.compressionRate,
      outputFormat: form.outputFormat,
      nanoBananaTemperature: form.nanoBananaTemperature,
      nanoBananaTopP: form.nanoBananaTopP,
      nanoBananaMaxTokens: form.nanoBananaMaxTokens,
      nanoBananaSeed: form.nanoBananaSeed,
      error: undefined,
    })
  },
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
}))
