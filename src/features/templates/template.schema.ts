import { z } from 'zod'
import { ASPECT_RATIOS, IMAGE_MODEL_FAMILIES, IMAGE_MODELS, IMAGE_QUALITIES, MODERATION_LEVELS, OUTPUT_FORMATS, RESOLUTION_TIERS } from '../../lib/constants'

export const templateSchema = z.object({
  name: z.string().min(1, '请输入模板名称'),
  description: z.string().optional(),
  mode: z.enum(['generation', 'edit']),
  imageModelFamily: z.enum(IMAGE_MODEL_FAMILIES).optional(),
  imageModel: z.enum(IMAGE_MODELS).optional(),
  prompt: z.string().min(1, '请输入你的提示词'),
  negativePrompt: z.string().optional(),
  aspectRatio: z.enum(ASPECT_RATIOS),
  resolutionTier: z.enum(RESOLUTION_TIERS),
  quality: z.enum(IMAGE_QUALITIES),
  moderation: z.enum(MODERATION_LEVELS),
  count: z.number().int().min(1).max(100),
  compressionRate: z.number().min(0.1).max(1),
  outputFormat: z.enum(OUTPUT_FORMATS),
  nanoBananaTemperature: z.number().min(0).max(2).optional(),
  nanoBananaTopP: z.number().min(0).max(1).optional(),
  nanoBananaMaxTokens: z.number().int().min(1).optional(),
  nanoBananaSeed: z.number().int().optional(),
})
