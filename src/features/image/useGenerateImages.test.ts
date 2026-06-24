import { describe, expect, it } from 'vitest'
import type { HistoryRecord } from '../../types/history'
import type { GenerationJob, ImageFormState } from '../../types/image'
import { createBatch, createInitialHistory, createRestoredBatchFromHistory, toHistoryResult } from './useGenerateImages'

const form: ImageFormState = {
  mode: 'generation',
  imageModelFamily: 'gpt-image-2',
  imageModel: 'gpt-image-2',
  prompt: 'test',
  negativePrompt: '',
  aspectRatio: '1:1',
  resolutionTier: '1K',
  size: '1024x1024',
  quality: 'high',
  moderation: 'auto',
  count: 3,
  compressionRate: 0.8,
  outputFormat: 'png',
  nanoBananaTemperature: 1,
  nanoBananaTopP: 1,
  nanoBananaMaxTokens: 1024,
  nanoBananaSeed: undefined,
}

function historyRecord(): HistoryRecord {
  return {
    id: 'history-a',
    mode: 'generation',
    prompt: '恢复测试',
    params: {
      imageModelFamily: 'nano-banana-2',
      imageModel: 'nano-banana-2-2K',
      aspectRatio: '1:1',
      resolutionTier: '1K',
      size: '1024x1024',
      quality: 'high',
      moderation: 'auto',
      count: 3,
      outputFormat: 'png',
    },
    status: 'running',
    total: 3,
    success: 1,
    failed: 1,
    slowestMs: 900,
    startedAt: '2026-06-20T00:00:00.000Z',
    results: [
      {
        id: 'job-ok',
        jobIndex: 0,
        status: 'success',
        localAssetId: 'asset-ok',
        actualWidth: 1024,
        actualHeight: 1024,
        durationMs: 700,
      },
      {
        id: 'job-running',
        jobIndex: 1,
        status: 'running',
        durationMs: 0,
      },
      {
        id: 'job-failed',
        jobIndex: 2,
        status: 'failed',
        durationMs: 900,
        error: '接口失败',
      },
    ],
  }
}

describe('generation history persistence', () => {
  it('creates queued placeholders for every job in the initial history', () => {
    const batch = createBatch(form)
    const history = createInitialHistory(batch)

    expect(history.status).toBe('running')
    expect(history.params).toMatchObject({
      imageModelFamily: 'gpt-image-2',
      imageModel: 'gpt-image-2',
    })
    expect(history.results).toHaveLength(3)
    expect(history.results.map((item) => item.status)).toEqual(['queued', 'queued', 'queued'])
    expect(history.results.map((item) => item.jobIndex)).toEqual([0, 1, 2])
  })

  it('restores only unfinished jobs to the queue', () => {
    const { batch, queuedJobIds } = createRestoredBatchFromHistory(historyRecord())

    expect(batch.historyId).toBe('history-a')
    expect(batch.form.imageModel).toBe('nano-banana-2')
    expect(batch.results.map((item) => item.status)).toEqual(['success', 'queued', 'failed'])
    expect(batch.results[0].localAssetId).toBe('asset-ok')
    expect(queuedJobIds).toEqual([batch.results[1].id])
  })

  it('keeps restored detailed models when detailed model setting is enabled', () => {
    const { batch } = createRestoredBatchFromHistory(historyRecord(), true)

    expect(batch.form.imageModel).toBe('nano-banana-2-2K')
  })

  it('creates legacy placeholders for old running history without results', () => {
    const record = historyRecord()
    record.results = []

    const { batch, queuedJobIds } = createRestoredBatchFromHistory(record)

    expect(batch.results).toHaveLength(3)
    expect(batch.results.every((item) => item.status === 'queued')).toBe(true)
    expect(queuedJobIds).toHaveLength(3)
  })

  it('stores generated image history by local asset id instead of base64 when available', () => {
    const job: GenerationJob = {
      id: 'job-asset',
      batchId: 'batch-a',
      jobIndex: 0,
      status: 'success',
      b64Json: 'data:image/png;base64,large',
      localAssetId: 'asset-generated',
      mimeType: 'image/png',
      durationMs: 1000,
      raw: {
        b64_json: 'large',
        nested: {
          b64Json: 'large2',
          keep: 'metadata',
        },
      },
    }

    expect(toHistoryResult(job)).toMatchObject({
      id: 'job-asset',
      localAssetId: 'asset-generated',
      b64Json: undefined,
      raw: {
        b64_json: '[omitted image data]',
        nested: {
          b64Json: '[omitted image data]',
          keep: 'metadata',
        },
      },
    })
  })
})
