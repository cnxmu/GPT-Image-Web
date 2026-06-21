import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAllLocalData, clearUnreferencedLocalAssets, getReferencedLocalAssetIds } from './local-data.repo'

const clearAssets = vi.fn()
const clearUnreferencedAssets = vi.fn(async (ids: string[]) => ids.length - 1)
const clearHistory = vi.fn()
const clearSecrets = vi.fn()
const clearTemplates = vi.fn()

const historyRecords = [
  {
    id: 'history-1',
    referenceImages: [{ assetId: 'asset-ref' }],
    results: [{ localAssetId: 'asset-result' }, { localAssetId: undefined }],
  },
]

const agentConversations = [
  {
    id: 'agent-1',
    messages: [
      {
        attachments: [{ assetId: 'asset-agent' }],
      },
    ],
  },
]

vi.mock('./assets.repo', () => ({
  clearAssets: () => clearAssets(),
  clearUnreferencedAssets: (ids: string[]) => clearUnreferencedAssets(ids),
  deleteAssets: vi.fn(),
}))

vi.mock('./history.repo', () => ({
  clearHistory: () => clearHistory(),
  getHistoryAssetIds: (records: typeof historyRecords) =>
    records.flatMap((record) => [
      ...(record.referenceImages?.map((item) => item.assetId) || []),
      ...record.results.map((item) => item.localAssetId).filter(Boolean),
    ]),
}))

vi.mock('./secrets.repo', () => ({
  clearSecrets: () => clearSecrets(),
}))

vi.mock('./templates.repo', () => ({
  clearTemplates: () => clearTemplates(),
}))

vi.mock('./db', () => ({
  db: {
    history: {
      toArray: vi.fn(async () => historyRecords),
    },
    agentConversations: {
      toArray: vi.fn(async () => agentConversations),
      clear: vi.fn(async () => undefined),
    },
    settings: {
      clear: vi.fn(async () => undefined),
    },
  },
}))

describe('local data repository', () => {
  beforeEach(() => {
    clearAssets.mockClear()
    clearUnreferencedAssets.mockClear()
    clearHistory.mockClear()
    clearSecrets.mockClear()
    clearTemplates.mockClear()
  })

  it('collects asset references from history and Agent conversations', async () => {
    await expect(getReferencedLocalAssetIds()).resolves.toEqual(['asset-ref', 'asset-result', 'asset-agent'])
  })

  it('cleans only assets that are not referenced by history or Agent conversations', async () => {
    await expect(clearUnreferencedLocalAssets()).resolves.toBe(2)

    expect(clearUnreferencedAssets).toHaveBeenCalledWith(['asset-ref', 'asset-result', 'asset-agent'])
  })

  it('clears all local data including Agent conversations', async () => {
    const { db } = await import('./db')

    await clearAllLocalData()

    expect(clearSecrets).toHaveBeenCalledTimes(1)
    expect(clearTemplates).toHaveBeenCalledTimes(1)
    expect(clearHistory).toHaveBeenCalledTimes(1)
    expect(clearAssets).toHaveBeenCalledTimes(1)
    expect(db.settings.clear).toHaveBeenCalledTimes(1)
    expect(db.agentConversations.clear).toHaveBeenCalledTimes(1)
  })
})
