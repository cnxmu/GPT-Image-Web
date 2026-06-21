import type { WorkbenchMode } from '../lib/constants'

export interface HistoryReferenceImage {
  id: string
  assetId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  width?: number
  height?: number
}

export interface HistoryImageResult {
  id: string
  jobIndex: number
  status: 'queued' | 'running' | 'success' | 'failed'
  url?: string
  b64Json?: string
  localAssetId?: string
  actualWidth?: number
  actualHeight?: number
  durationMs: number
  startedAt?: string
  finishedAt?: string
  error?: string
  raw?: unknown
}

export interface HistoryRecord {
  id: string
  mode: WorkbenchMode
  prompt: string
  negativePrompt?: string
  params: {
    aspectRatio: string
    resolutionTier: string
    size: string
    quality: string
    moderation: string
    count: number
    compressionRate?: number
    outputFormat?: string
  }
  status: 'pending' | 'running' | 'success' | 'failed' | 'partial'
  total: number
  success: number
  failed: number
  slowestMs: number
  startedAt: string
  finishedAt?: string
  durationMs?: number
  referenceImages?: HistoryReferenceImage[]
  results: HistoryImageResult[]
  error?: string
  rawRequest?: unknown
  rawResponse?: unknown
  notice?: string
}
