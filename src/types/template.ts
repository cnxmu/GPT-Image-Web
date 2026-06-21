import type {
  AspectRatio,
  ImageQuality,
  ImageSize,
  ModerationLevel,
  OutputFormat,
  ResolutionTier,
  WorkbenchMode,
} from '../lib/constants'

export interface TemplateRecord {
  id: string
  source?: 'system' | 'user'
  name: string
  description?: string
  mode: WorkbenchMode
  prompt: string
  negativePrompt?: string
  aspectRatio: AspectRatio
  resolutionTier: ResolutionTier
  size: ImageSize
  quality: ImageQuality
  moderation: ModerationLevel
  count: number
  compressionRate: number
  outputFormat: OutputFormat
  createdAt: string
  updatedAt: string
}
