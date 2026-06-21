import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HistoryRecord } from '../types/history'
import { clearHistory, deleteHistory } from './history.repo'

const deleteAssets = vi.fn()
const records: HistoryRecord[] = [
  {
    id: 'history_1',
    mode: 'edit',
    prompt: '测试',
    params: {
      aspectRatio: '1:1',
      resolutionTier: '1K',
      size: '1024x1024',
      quality: 'high',
      moderation: 'auto',
      count: 1,
      outputFormat: 'png',
    },
    status: 'success',
    total: 1,
    success: 1,
    failed: 0,
    slowestMs: 1000,
    startedAt: '2026-06-20T00:00:00.000Z',
    referenceImages: [
      {
        id: 'ref_1',
        assetId: 'asset_ref_1',
        fileName: 'ref.png',
        mimeType: 'image/png',
        sizeBytes: 10,
      },
    ],
    results: [
      {
        id: 'result_1',
        jobIndex: 0,
        status: 'success',
        localAssetId: 'asset_result_1',
        durationMs: 1000,
      },
    ],
  },
]

vi.mock('./assets.repo', () => ({
  deleteAssets: (ids: string[]) => deleteAssets(ids),
}))

vi.mock('./db', () => ({
  db: {
    history: {
      get: vi.fn(async (id: string) => records.find((record) => record.id === id)),
      delete: vi.fn(async () => undefined),
      toArray: vi.fn(async () => records),
      clear: vi.fn(async () => undefined),
      put: vi.fn(async () => undefined),
    },
  },
}))

describe('history repository cleanup', () => {
  beforeEach(() => {
    deleteAssets.mockReset()
  })

  it('deletes assets referenced by a deleted history record', async () => {
    await deleteHistory('history_1')

    expect(deleteAssets).toHaveBeenCalledWith(['asset_ref_1', 'asset_result_1'])
  })

  it('deletes assets referenced by all history records when clearing history', async () => {
    await clearHistory()

    expect(deleteAssets).toHaveBeenCalledWith(['asset_ref_1', 'asset_result_1'])
  })
})
