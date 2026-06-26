import {
  DEFAULT_COMPRESSION_RATE,
  MAX_IMAGE_COUNT,
  MIN_IMAGE_COUNT,
  getDefaultImageModel,
  getImageModelFamily,
  getImageSize,
  isAspectRatio,
  isImageModel,
  isImageModelFamily,
  isImageQuality,
  isModerationLevel,
  isOutputFormat,
  isResolutionTier,
  type AspectRatio,
  type ResolutionTier,
  type WorkbenchMode,
} from './constants'
import type { WorkbenchState } from '../store/workbench.store'
import type { HistoryRecord } from '../types/history'
import type { ImageFormState } from '../types/image'

/** Snapshot the live Zustand workbench store into a serializable ImageFormState. */
export function snapshotFormFromStore(
  state: Pick<
    WorkbenchState,
    | 'mode'
    | 'imageModelFamily'
    | 'imageModel'
    | 'prompt'
    | 'negativePrompt'
    | 'aspectRatio'
    | 'resolutionTier'
    | 'quality'
    | 'moderation'
    | 'count'
    | 'compressionRate'
    | 'outputFormat'
  >,
): ImageFormState {
  return {
    mode: state.mode,
    imageModelFamily: state.imageModelFamily,
    imageModel: state.imageModel,
    prompt: state.prompt.trim(),
    negativePrompt: state.negativePrompt.trim(),
    aspectRatio: state.aspectRatio,
    resolutionTier: state.resolutionTier,
    size: getImageSize(state.aspectRatio, state.resolutionTier),
    quality: state.quality,
    moderation: state.moderation,
    count: state.count,
    compressionRate: state.compressionRate,
    outputFormat: state.outputFormat,
  }
}

const defaultAspectRatio: AspectRatio = '1:1'
const defaultResolutionTier: ResolutionTier = '1K'

function clampCount(count: number) {
  return Math.max(MIN_IMAGE_COUNT, Math.min(MAX_IMAGE_COUNT, Math.round(count || 1)))
}

/** Reconstruct an ImageFormState from a persisted HistoryRecord with full runtime validation. */
export function formStateFromHistoryRecord(record: HistoryRecord): ImageFormState {
  const aspectRatio = isAspectRatio(record.params.aspectRatio) ? record.params.aspectRatio : defaultAspectRatio
  const resolutionTier = isResolutionTier(record.params.resolutionTier)
    ? record.params.resolutionTier
    : defaultResolutionTier
  const outputFormat = record.params.outputFormat && isOutputFormat(record.params.outputFormat) ? record.params.outputFormat : 'png'
  const imageModelFromHistory =
    typeof record.params.imageModel === 'string' && isImageModel(record.params.imageModel)
      ? record.params.imageModel
      : undefined
  const imageModelFamily =
    typeof record.params.imageModelFamily === 'string' && isImageModelFamily(record.params.imageModelFamily)
      ? record.params.imageModelFamily
      : imageModelFromHistory
        ? getImageModelFamily(imageModelFromHistory)
        : 'gpt-image-2'
  const imageModel =
    imageModelFromHistory && getImageModelFamily(imageModelFromHistory) === imageModelFamily
      ? imageModelFromHistory
      : getDefaultImageModel(imageModelFamily)

  return {
    mode: record.mode as WorkbenchMode,
    imageModelFamily,
    imageModel,
    prompt: record.prompt,
    negativePrompt: record.negativePrompt || '',
    aspectRatio,
    resolutionTier,
    size: getImageSize(aspectRatio, resolutionTier),
    quality: isImageQuality(record.params.quality) ? record.params.quality : 'high',
    moderation: isModerationLevel(record.params.moderation) ? record.params.moderation : 'auto',
    count: clampCount(record.params.count),
    compressionRate:
      typeof record.params.compressionRate === 'number'
        ? record.params.compressionRate
        : DEFAULT_COMPRESSION_RATE,
    outputFormat,
  }
}
