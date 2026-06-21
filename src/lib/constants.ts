export const API_BASE_URL = 'https://img.xmu.la'

export const API_ENDPOINTS = {
  imageGenerations: `${API_BASE_URL}/v1/images/generations`,
  imageEdits: `${API_BASE_URL}/v1/images/edits`,
  responses: `${API_BASE_URL}/v1/responses`,
} as const

export const IMAGE_MODEL = 'gpt-image-2'
export const AGENT_MODELS = ['gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'] as const
export const DEFAULT_AGENT_MODEL = 'gpt-5.5'

export const ASPECT_RATIOS = ['1:1', '3:2', '2:3', '16:9', '9:16', '4:3', '3:4', '21:9'] as const
export const RESOLUTION_TIERS = ['1K', '2K', '4K'] as const

export const IMAGE_SIZE_MATRIX = {
  '1:1': {
    '1K': '1024x1024',
    '2K': '2048x2048',
    '4K': '4096x4096',
  },
  '3:2': {
    '1K': '1536x1024',
    '2K': '3072x2048',
    '4K': '6144x4096',
  },
  '2:3': {
    '1K': '1024x1536',
    '2K': '2048x3072',
    '4K': '4096x6144',
  },
  '16:9': {
    '1K': '1920x1080',
    '2K': '2560x1440',
    '4K': '3840x2160',
  },
  '9:16': {
    '1K': '1080x1920',
    '2K': '1440x2560',
    '4K': '2160x3840',
  },
  '4:3': {
    '1K': '1024x768',
    '2K': '2048x1536',
    '4K': '4096x3072',
  },
  '3:4': {
    '1K': '768x1024',
    '2K': '1536x2048',
    '4K': '3072x4096',
  },
  '21:9': {
    '1K': '1792x768',
    '2K': '2688x1152',
    '4K': '5376x2304',
  },
} as const

export type AspectRatio = (typeof ASPECT_RATIOS)[number]
export type ResolutionTier = (typeof RESOLUTION_TIERS)[number]
export type ImageSize = (typeof IMAGE_SIZE_MATRIX)[AspectRatio][ResolutionTier]

export const IMAGE_QUALITIES = ['low', 'medium', 'high', 'auto'] as const
export const MODERATION_LEVELS = ['auto', 'low'] as const
export const OUTPUT_FORMATS = ['png', 'jpeg', 'webp'] as const
export const COMPRESSIBLE_OUTPUT_FORMATS = ['jpeg', 'webp'] as const
export const API_REQUEST_IMAGE_COUNT = 1
export const MIN_IMAGE_COUNT = 1
export const MAX_IMAGE_COUNT = 100
export const MIN_GENERATION_CONCURRENCY = 1
export const MAX_GENERATION_CONCURRENCY = 100
export const DEFAULT_GENERATION_CONCURRENCY = 20
export const DEFAULT_COMPRESSION_RATE = 0.8

export type ImageQuality = (typeof IMAGE_QUALITIES)[number]
export type ModerationLevel = (typeof MODERATION_LEVELS)[number]
export type OutputFormat = (typeof OUTPUT_FORMATS)[number]
export type WorkbenchMode = 'generation' | 'edit'
export type AgentModel = (typeof AGENT_MODELS)[number]

export function getImageSize(aspectRatio: AspectRatio, resolutionTier: ResolutionTier) {
  return IMAGE_SIZE_MATRIX[aspectRatio][resolutionTier]
}

export function isImageSizeMatched(
  aspectRatio: AspectRatio,
  resolutionTier: ResolutionTier,
  size: string,
) {
  return IMAGE_SIZE_MATRIX[aspectRatio][resolutionTier] === size
}

export function isAspectRatio(value: string): value is AspectRatio {
  return ASPECT_RATIOS.includes(value as AspectRatio)
}

export function isResolutionTier(value: string): value is ResolutionTier {
  return RESOLUTION_TIERS.includes(value as ResolutionTier)
}

export function isImageQuality(value: string): value is ImageQuality {
  return IMAGE_QUALITIES.includes(value as ImageQuality)
}

export function isModerationLevel(value: string): value is ModerationLevel {
  return MODERATION_LEVELS.includes(value as ModerationLevel)
}

export function isOutputFormat(value: string): value is OutputFormat {
  return OUTPUT_FORMATS.includes(value as OutputFormat)
}

export function isAgentModel(value: string): value is AgentModel {
  return AGENT_MODELS.includes(value as AgentModel)
}

export function shouldSendOutputCompression(outputFormat: OutputFormat) {
  return COMPRESSIBLE_OUTPUT_FORMATS.includes(outputFormat as (typeof COMPRESSIBLE_OUTPUT_FORMATS)[number])
}

export function getOutputCompression(outputFormat: OutputFormat, compressionRate: number) {
  if (!shouldSendOutputCompression(outputFormat)) return undefined
  return Math.round(compressionRate * 100)
}
