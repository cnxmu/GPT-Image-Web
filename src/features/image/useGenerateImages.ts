import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getImageSize } from '../../lib/constants'
import { AppError, toAppError } from '../../lib/errors'
import { getActualImageSize } from '../../lib/image-size'
import { nowIso } from '../../lib/time'
import { createId } from '../../lib/uid'
import { getAsset, putAsset } from '../../db/assets.repo'
import { db } from '../../db/db'
import { getSecret } from '../../db/secrets.repo'
import { getGenerationConcurrency } from '../../db/settings.repo'
import { upsertHistory } from '../../db/history.repo'
import { useWorkbenchStore } from '../../store/workbench.store'
import type { AssetRecord } from '../../types/api'
import type { HistoryImageResult, HistoryRecord, HistoryReferenceImage } from '../../types/history'
import type { GenerationBatch, GenerationJob, ImageFormState, NormalizedImageResult } from '../../types/image'
import { editImage, generateImage } from './image.api'
import { getImageSrc, normalizeImageResponse } from './image.adapter'

interface RunnerJob extends GenerationJob {
  form: ImageFormState
  apiKey: string
  referenceImages: File[]
}

const runnerContext = new Map<string, RunnerJob>()
let schedulerActive = false
let restoreStarted = false
let schedulerConcurrency = 20

function snapshotForm(state: ReturnType<typeof useWorkbenchStore.getState>): ImageFormState {
  return {
    mode: state.mode,
    prompt: state.prompt.trim(),
    negativePrompt: state.negativePrompt.trim(),
    aspectRatio: state.aspectRatio,
    resolutionTier: state.resolutionTier,
    size: getImageSize(state.aspectRatio, state.resolutionTier),
    quality: state.quality,
    moderation: state.moderation,
    count: state.count,
    compressionRate: state.compressionRate,
    outputFormat: state.outputFormat,
  }
}

function validateForm(form: ImageFormState, referenceImages: File[]) {
  if (!form.prompt) throw new AppError('INVALID_FORM', '请输入你想生成的提示词')
  if (form.mode === 'edit' && referenceImages.length === 0) {
    throw new AppError('UPLOAD_REQUIRED', '图生图模式请先上传至少一张你的参考图')
  }
}

function getMimeType(outputFormat: ImageFormState['outputFormat']): GenerationJob['mimeType'] {
  return outputFormat === 'jpeg' ? 'image/jpeg' : outputFormat === 'webp' ? 'image/webp' : 'image/png'
}

export function createBatch(form: ImageFormState, referenceImages: HistoryReferenceImage[] = []): GenerationBatch {
  const batchId = createId('batch')
  const historyId = createId('history')
  const createdAt = nowIso()
  const results: GenerationJob[] = Array.from({ length: form.count }, (_, jobIndex) => ({
    id: createId('job'),
    batchId,
    jobIndex,
    status: 'queued',
    mimeType: getMimeType(form.outputFormat),
    raw: undefined,
  }))

  return {
    id: batchId,
    historyId,
    form,
    status: 'queued',
    total: form.count,
    success: 0,
    failed: 0,
    slowestMs: 0,
    createdAt,
    createdAtMs: performance.now(),
    referenceImages,
    results,
  }
}

export function createInitialHistory(batch: GenerationBatch): HistoryRecord {
  const form = batch.form
  return {
    id: batch.historyId,
    mode: form.mode,
    prompt: form.prompt,
    negativePrompt: form.negativePrompt || undefined,
    params: {
      aspectRatio: form.aspectRatio,
      resolutionTier: form.resolutionTier,
      size: form.size,
      quality: form.quality,
      moderation: form.moderation,
      count: form.count,
      compressionRate: form.outputFormat === 'png' ? undefined : form.compressionRate,
      outputFormat: form.outputFormat,
    },
    status: 'running',
    total: form.count,
    success: 0,
    failed: 0,
    slowestMs: 0,
    startedAt: batch.createdAt,
    referenceImages: batch.referenceImages,
    results: batch.results.map(toHistoryResult),
  }
}

function toIsoFromPerformanceTime(value?: number) {
  if (value === undefined) return undefined
  return new Date(Date.now() - Math.max(0, performance.now() - value)).toISOString()
}

const imagePayloadKeys = new Set(['b64_json', 'b64Json', 'partial_image_b64', 'partialImageB64'])

function stripImagePayload(value: unknown, seen = new WeakSet<object>()): unknown {
  if (!value || typeof value !== 'object') return value
  if (seen.has(value)) return '[Circular]'
  seen.add(value)

  if (Array.isArray(value)) return value.map((item) => stripImagePayload(item, seen))

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      imagePayloadKeys.has(key) ? '[omitted image data]' : stripImagePayload(item, seen),
    ]),
  )
}

export function toHistoryResult(job: GenerationJob): HistoryImageResult {
  return {
    id: job.id,
    jobIndex: job.jobIndex,
    status: job.status,
    url: job.url,
    b64Json: job.localAssetId ? undefined : job.b64Json,
    localAssetId: job.localAssetId,
    actualWidth: job.actualWidth,
    actualHeight: job.actualHeight,
    durationMs: job.durationMs || 0,
    startedAt: toIsoFromPerformanceTime(job.startedAt),
    finishedAt: toIsoFromPerformanceTime(job.finishedAt),
    error: job.error,
    raw: stripImagePayload(job.raw),
  }
}

async function persistBatchHistory(batch: GenerationBatch) {
  const results = batch.results.map(toHistoryResult)
  const done = batch.success + batch.failed === batch.total
  const finishedAt = done ? nowIso() : undefined
  const history: HistoryRecord = {
    ...createInitialHistory(batch),
    status: done ? (batch.status === 'queued' ? 'running' : batch.status) : 'running',
    success: batch.success,
    failed: batch.failed,
    slowestMs: batch.slowestMs,
    finishedAt,
    durationMs: finishedAt ? Date.parse(finishedAt) - Date.parse(batch.createdAt) : undefined,
    referenceImages: batch.referenceImages,
    results,
    error: batch.failed > 0 && batch.success === 0 ? results.find((item) => item.error)?.error : undefined,
    rawRequest: batch.rawRequest,
    rawResponse: stripImagePayload(batch.rawResponse),
    notice: batch.notice,
  }

  await upsertHistory(history)
}

async function persistGeneratedImageAsset(
  result: NormalizedImageResult,
  actualSize?: { width: number; height: number },
) {
  const src = getImageSrc(result)
  if (!src) return undefined

  try {
    const response = await fetch(src)
    const blob = await response.blob()
    const assetId = createId('asset')
    const asset: AssetRecord = {
      id: assetId,
      blob,
      mimeType: blob.type || result.mimeType,
      width: actualSize?.width,
      height: actualSize?.height,
      createdAt: nowIso(),
    }
    await putAsset(asset)
    return assetId
  } catch {
    return undefined
  }
}

async function getImageDimensions(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('无法读取图片尺寸'))
      image.src = url
    })
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function persistReferenceImages(files: File[]) {
  const references: HistoryReferenceImage[] = []

  for (const file of files) {
    const dimensions = await getImageDimensions(file).catch(() => undefined)
    const assetId = createId('asset')
    const reference: HistoryReferenceImage = {
      id: createId('history_ref'),
      assetId,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      width: dimensions?.width,
      height: dimensions?.height,
    }
    const asset: AssetRecord = {
      id: assetId,
      blob: file,
      mimeType: reference.mimeType,
      width: dimensions?.width,
      height: dimensions?.height,
      createdAt: nowIso(),
    }

    await putAsset(asset)
    references.push(reference)
  }

  return references
}

async function restoreReferenceFiles(record: HistoryRecord) {
  if (record.mode !== 'edit') return []

  const references = record.referenceImages || []
  if (references.length === 0) return undefined

  const files: File[] = []
  for (const reference of references) {
    const asset = await getAsset(reference.assetId)
    if (!asset) return undefined
    files.push(
      new File([asset.blob], reference.fileName, {
        type: reference.mimeType || asset.mimeType,
        lastModified: Date.now(),
      }),
    )
  }

  return files
}

function formFromHistoryRecord(record: HistoryRecord): ImageFormState {
  const aspectRatio = record.params.aspectRatio as ImageFormState['aspectRatio']
  const resolutionTier = record.params.resolutionTier as ImageFormState['resolutionTier']

  return {
    mode: record.mode,
    prompt: record.prompt,
    negativePrompt: record.negativePrompt || '',
    aspectRatio,
    resolutionTier,
    size: getImageSize(aspectRatio, resolutionTier),
    quality: record.params.quality as ImageFormState['quality'],
    moderation: record.params.moderation as ImageFormState['moderation'],
    count: record.params.count,
    compressionRate: typeof record.params.compressionRate === 'number' ? record.params.compressionRate : 0.8,
    outputFormat: (record.params.outputFormat || 'png') as ImageFormState['outputFormat'],
  }
}

export function createRestoredBatchFromHistory(record: HistoryRecord): {
  batch: GenerationBatch
  queuedJobIds: string[]
} {
  const form = formFromHistoryRecord(record)
  const batchId = `restored_${record.id}`
  const historyResults =
    record.results.length > 0
      ? record.results
      : Array.from({ length: record.total }, (_, jobIndex): HistoryImageResult => ({
          id: `legacy_${record.id}_${jobIndex}`,
          jobIndex,
          status: 'queued' as const,
          durationMs: 0,
        }))
  const results: GenerationJob[] = historyResults.map((result) => {
    const status = result.status === 'success' || result.status === 'failed' ? result.status : 'queued'
    return {
      id: `restored_${record.id}_${result.id}`,
      batchId,
      jobIndex: result.jobIndex,
      status,
      url: result.url,
      b64Json: result.b64Json,
      localAssetId: result.localAssetId,
      actualWidth: result.actualWidth,
      actualHeight: result.actualHeight,
      durationMs: result.durationMs,
      error: result.error,
      raw: result.raw,
      mimeType: getMimeType(form.outputFormat),
    }
  })
  const queuedJobIds = results.filter((job) => job.status === 'queued').map((job) => job.id)
  const success = results.filter((job) => job.status === 'success').length
  const failed = results.filter((job) => job.status === 'failed').length

  return {
    batch: {
      id: batchId,
      historyId: record.id,
      source: 'live',
      form,
      status: queuedJobIds.length > 0 ? 'queued' : success === record.total ? 'success' : success > 0 ? 'partial' : 'failed',
      total: record.total,
      success,
      failed,
      slowestMs: record.slowestMs,
      createdAt: record.startedAt,
      createdAtMs: performance.now(),
      finishedAt: record.finishedAt,
      durationMs: record.durationMs,
      rawRequest: record.rawRequest,
      rawResponse: record.rawResponse,
      notice: record.notice,
      referenceImages: record.referenceImages,
      results,
    },
    queuedJobIds,
  }
}

async function executeJob(job: RunnerJob) {
  const store = useWorkbenchStore.getState()
  const startedAt = performance.now()
  const runningJob = store.markJobRunning(job.id, startedAt)
  if (runningJob) {
    const runningBatch = useWorkbenchStore.getState().batches.find((batch) => batch.id === job.batchId)
    if (runningBatch) void persistBatchHistory(runningBatch)
  }
  try {
    const response =
      job.form.mode === 'edit'
        ? await editImage(job.apiKey, job.form, job.referenceImages)
        : await generateImage(job.apiKey, job.form)

    const normalized = normalizeImageResponse(response.raw, job.form.outputFormat)[0]

    if (!normalized) {
      throw new AppError('API_ERROR', '接口未返回图片数据')
    }

    const src = getImageSrc(normalized)
    const actualSize = src ? await getActualImageSize(src) : undefined
    const localAssetId = await persistGeneratedImageAsset(normalized, actualSize)
    const finishedAt = performance.now()
    const batch = useWorkbenchStore.getState().completeJob(
      job.id,
      {
        ...normalized,
        b64Json: localAssetId ? undefined : normalized.b64Json,
        localAssetId,
        raw: stripImagePayload(normalized.raw),
        finishedAt,
        durationMs: Math.round(finishedAt - startedAt),
        actualWidth: actualSize?.width,
        actualHeight: actualSize?.height,
      },
      {
        rawRequest: response.request,
        rawResponse: stripImagePayload(response.raw),
      },
    )

    if (batch) await persistBatchHistory(batch)
  } catch (error) {
    const appError = toAppError(error)
    const finishedAt = performance.now()
    const batch = useWorkbenchStore.getState().failJob(job.id, {
      finishedAt,
      durationMs: Math.round(finishedAt - startedAt),
      error: appError.message,
    })
    if (batch) await persistBatchHistory(batch)
  } finally {
    runnerContext.delete(job.id)
    wakeScheduler()
  }
}

async function failRestoredJobsForMissingReferences(queuedJobIds: string[]) {
  let latestBatch: GenerationBatch | undefined
  for (const jobId of queuedJobIds) {
    latestBatch = useWorkbenchStore.getState().failJob(jobId, {
      durationMs: 0,
      finishedAt: performance.now(),
      error: '你的参考图本地文件缺失，无法续跑',
    })
  }
  if (latestBatch) await persistBatchHistory(latestBatch)
}

export async function restoreRunningHistory() {
  if (restoreStarted) return
  restoreStarted = true

  const apiKey = (await getSecret('imageApiKey'))?.value
  if (!apiKey) return

  const records = await db.history.where('status').equals('running').toArray()
  for (const record of records) {
    if (useWorkbenchStore.getState().batches.some((batch) => batch.historyId === record.id)) continue

    const { batch, queuedJobIds } = createRestoredBatchFromHistory(record)
    if (queuedJobIds.length === 0) continue

    useWorkbenchStore.getState().restoreBatchFromHistory(batch, queuedJobIds)

    const referenceImages = await restoreReferenceFiles(record)
    if (!referenceImages) {
      await failRestoredJobsForMissingReferences(queuedJobIds)
      continue
    }

    for (const jobId of queuedJobIds) {
      const queuedJob = batch.results.find((job) => job.id === jobId)
      if (!queuedJob) continue
      runnerContext.set(jobId, {
        ...queuedJob,
        form: batch.form,
        apiKey,
        referenceImages,
      })
    }
  }

  wakeScheduler()
}

export function useRestoreRunningHistory() {
  useEffect(() => {
    void restoreRunningHistory()
  }, [])
}

function wakeScheduler() {
  if (schedulerActive) return
  schedulerActive = true
  void runScheduler()
}

async function runScheduler() {
  try {
    schedulerConcurrency = await getGenerationConcurrency()
    while (useWorkbenchStore.getState().activeJobCount < schedulerConcurrency) {
      const queuedJob = useWorkbenchStore.getState().getNextQueuedJob()
      if (!queuedJob) break

      const runnerJob = runnerContext.get(queuedJob.id)
      if (!runnerJob) continue

      void executeJob(runnerJob)
    }
  } finally {
    schedulerActive = false
    if (
      useWorkbenchStore.getState().activeJobCount < schedulerConcurrency &&
      useWorkbenchStore.getState().queue.length > 0
    ) {
      wakeScheduler()
    }
  }
}

export function useGenerateImagesMutation() {
  return useMutation({
    mutationFn: async () => {
      const store = useWorkbenchStore.getState()
      const form = snapshotForm(store)
      const referenceImages = store.referenceImages.map((item) => item.file)
      const apiKey = (await getSecret('imageApiKey'))?.value

      if (!apiKey) throw new AppError('MISSING_IMAGE_API_KEY', '请先在个人设置中保存生图 API Key')
      validateForm(form, referenceImages)

      const historyReferenceImages = form.mode === 'edit' ? await persistReferenceImages(referenceImages) : []
      const batch = createBatch(form, historyReferenceImages)
      await upsertHistory(createInitialHistory(batch))

      for (const job of batch.results) {
        runnerContext.set(job.id, {
          ...job,
          form,
          apiKey,
          referenceImages,
        })
      }

      store.setError(undefined)
      store.enqueueBatch(batch)
      wakeScheduler()

      return batch
    },
    onError: (error) => {
      const appError = toAppError(error)
      useWorkbenchStore.getState().setError(appError.message)
    },
  })
}
