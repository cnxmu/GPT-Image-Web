import type { StateCreator } from 'zustand'
import {
  DEFAULT_COMPRESSION_RATE,
  IMAGE_MODEL,
  getImageSize,
  MAX_IMAGE_COUNT,
  MIN_IMAGE_COUNT,
  type AspectRatio,
  type ImageModel,
  type ImageModelFamily,
  type ImageQuality,
  type ModerationLevel,
  type OutputFormat,
  type ResolutionTier,
  type WorkbenchMode,
} from '../lib/constants'
import { createId } from '../lib/uid'
import { formStateFromHistoryRecord } from '../lib/form-snapshot'
import type { ReferenceImagePreview } from '../types/image'
import type { HistoryRecord } from '../types/history'
import type { TemplateRecord } from '../types/template'
import type { WorkbenchState } from './workbench.store'

const defaultAspectRatio: AspectRatio = '1:1'
const defaultResolutionTier: ResolutionTier = '1K'

function clampCount(count: number) {
  return Math.max(MIN_IMAGE_COUNT, Math.min(MAX_IMAGE_COUNT, Math.round(count || 1)))
}

export interface FormSlice {
  mode: WorkbenchMode
  imageModelFamily: ImageModelFamily
  imageModel: ImageModel
  prompt: string
  negativePrompt: string
  aspectRatio: AspectRatio
  resolutionTier: ResolutionTier
  size: ReturnType<typeof getImageSize>
  quality: ImageQuality
  moderation: ModerationLevel
  count: number
  compressionRate: number
  outputFormat: OutputFormat
  referenceImages: ReferenceImagePreview[]
  error?: string
  setMode: (mode: WorkbenchMode) => void
  setImageModelFamily: (family: ImageModelFamily) => void
  setImageModel: (model: ImageModel) => void
  setPrompt: (prompt: string) => void
  setNegativePrompt: (negativePrompt: string) => void
  setAspectRatio: (aspectRatio: AspectRatio) => void
  setResolutionTier: (resolutionTier: ResolutionTier) => void
  setQuality: (quality: ImageQuality) => void
  setModeration: (moderation: ModerationLevel) => void
  setCount: (count: number) => void
  setCompressionRate: (compressionRate: number) => void
  setOutputFormat: (outputFormat: OutputFormat) => void
  addReferenceFiles: (files: File[]) => void
  removeReferenceImage: (id: string) => void
  clearReferenceImages: () => void
  setError: (error?: string) => void
  resetForm: () => void
  applyTemplate: (template: TemplateRecord) => void
  applyHistory: (record: HistoryRecord) => void
}

export const createFormSlice: StateCreator<WorkbenchState, [], [], FormSlice> = (set, get) => ({
  mode: 'generation',
  imageModelFamily: 'gpt-image-2',
  imageModel: IMAGE_MODEL,
  prompt: '',
  negativePrompt: '',
  aspectRatio: defaultAspectRatio,
  resolutionTier: defaultResolutionTier,
  size: getImageSize(defaultAspectRatio, defaultResolutionTier),
  quality: 'high',
  moderation: 'auto',
  count: 1,
  compressionRate: DEFAULT_COMPRESSION_RATE,
  outputFormat: 'png',
  referenceImages: [],
  error: undefined,
  setMode: (mode) => set({ mode }),
  setImageModelFamily: (imageModelFamily) =>
    set({
      imageModelFamily,
      imageModel: IMAGE_MODEL,
    }),
  setImageModel: (imageModel) =>
    set({
      imageModel,
      imageModelFamily: 'gpt-image-2',
    }),
  setPrompt: (prompt) => set({ prompt }),
  setNegativePrompt: (negativePrompt) => set({ negativePrompt }),
  setAspectRatio: (aspectRatio) =>
    set((state) => ({
      aspectRatio,
      size: getImageSize(aspectRatio, state.resolutionTier),
    })),
  setResolutionTier: (resolutionTier) =>
    set((state) => ({
      resolutionTier,
      size: getImageSize(state.aspectRatio, resolutionTier),
    })),
  setQuality: (quality) => set({ quality }),
  setModeration: (moderation) => set({ moderation }),
  setCount: (count) => set({ count: clampCount(count) }),
  setCompressionRate: (compressionRate) => set({ compressionRate }),
  setOutputFormat: (outputFormat) => set({ outputFormat }),
  addReferenceFiles: (files) =>
    set((state) => ({
      referenceImages: [
        ...state.referenceImages,
        ...files.map((file) => ({
          id: createId('ref'),
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ],
    })),
  removeReferenceImage: (id) =>
    set((state) => {
      const removed = state.referenceImages.find((item) => item.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return {
        referenceImages: state.referenceImages.filter((item) => item.id !== id),
      }
    }),
  clearReferenceImages: () =>
    set((state) => {
      state.referenceImages.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      return { referenceImages: [] }
    }),
  setError: (error) => set({ error }),
  resetForm: () => {
    get().clearReferenceImages()
    set({
      mode: 'generation',
      imageModelFamily: 'gpt-image-2',
      imageModel: IMAGE_MODEL,
      prompt: '',
      negativePrompt: '',
      aspectRatio: defaultAspectRatio,
      resolutionTier: defaultResolutionTier,
      size: getImageSize(defaultAspectRatio, defaultResolutionTier),
      quality: 'high',
      moderation: 'auto',
      count: 1,
      compressionRate: DEFAULT_COMPRESSION_RATE,
      outputFormat: 'png',
      error: undefined,
    })
  },
  applyTemplate: (template) => {
    const size = getImageSize(template.aspectRatio, template.resolutionTier)
    set({
      mode: template.mode,
      imageModelFamily: 'gpt-image-2',
      imageModel: IMAGE_MODEL,
      prompt: template.prompt,
      negativePrompt: template.negativePrompt || '',
      aspectRatio: template.aspectRatio,
      resolutionTier: template.resolutionTier,
      size,
      quality: template.quality,
      moderation: template.moderation,
      count: clampCount(template.count),
      compressionRate: template.compressionRate,
      outputFormat: template.outputFormat,
      error: undefined,
    })
  },
  applyHistory: (record) => {
    const form = formStateFromHistoryRecord(record)
    set({
      mode: form.mode,
      imageModelFamily: form.imageModelFamily,
      imageModel: form.imageModel,
      prompt: form.prompt,
      negativePrompt: form.negativePrompt,
      aspectRatio: form.aspectRatio,
      resolutionTier: form.resolutionTier,
      size: form.size,
      quality: form.quality,
      moderation: form.moderation,
      count: form.count,
      compressionRate: form.compressionRate,
      outputFormat: form.outputFormat,
      error: undefined,
    })
  },
})
