import type {
  AspectRatio,
  ImageQuality,
  ImageSize,
  ModerationLevel,
  OutputFormat,
  ResolutionTier,
  WorkbenchMode,
} from '../lib/constants'
import type { HistoryReferenceImage } from './history'

export interface GenerationStats {
  total: number
  success: number
  failed: number
  slowestMs: number
}

export interface ImageFormState {
  mode: WorkbenchMode
  prompt: string
  negativePrompt: string
  aspectRatio: AspectRatio
  resolutionTier: ResolutionTier
  size: ImageSize
  quality: ImageQuality
  moderation: ModerationLevel
  count: number
  compressionRate: number
  outputFormat: OutputFormat
}

export interface ReferenceImagePreview {
  id: string
  file: File
  previewUrl: string
}

export interface NormalizedImageResult {
  id: string
  url?: string
  b64Json?: string
  localAssetId?: string
  mimeType: 'image/png' | 'image/webp' | 'image/jpeg'
  actualWidth?: number
  actualHeight?: number
  revisedPrompt?: string
  raw: unknown
}

export type GenerationJobStatus = 'queued' | 'running' | 'success' | 'failed'

export interface WorkbenchImageResult extends NormalizedImageResult {
  batchId: string
  jobIndex: number
  status: GenerationJobStatus
  startedAt?: number
  finishedAt?: number
  durationMs?: number
  error?: string
}

export interface GenerationJob extends WorkbenchImageResult {
  id: string
}

export interface GenerationBatch {
  id: string
  historyId: string
  source?: 'live' | 'history'
  historyRecordId?: string
  form: ImageFormState
  status: 'queued' | 'running' | 'success' | 'failed' | 'partial'
  total: number
  success: number
  failed: number
  slowestMs: number
  createdAt: string
  createdAtMs: number
  finishedAt?: string
  durationMs?: number
  rawRequest?: unknown
  rawResponse?: unknown
  notice?: string
  referenceImages?: HistoryReferenceImage[]
  results: GenerationJob[]
}
