import {
  DEFAULT_COMPRESSION_RATE,
  IMAGE_MODEL,
  MAX_IMAGE_COUNT,
  MIN_IMAGE_COUNT,
  getImageSize,
  isAspectRatio,
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
    imageModelFamily: 'gpt-image-2',
    imageModel: IMAGE_MODEL,
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

  return {
    mode: record.mode as WorkbenchMode,
    imageModelFamily: 'gpt-image-2',
    imageModel: IMAGE_MODEL,
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
