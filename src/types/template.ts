import type {
  AspectRatio,
  ImageModel,
  ImageModelFamily,
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
  imageModelFamily?: ImageModelFamily
  imageModel?: ImageModel
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
  nanoBananaTemperature?: number
  nanoBananaTopP?: number
  nanoBananaMaxTokens?: number
  nanoBananaSeed?: number
  createdAt: string
  updatedAt: string
}
