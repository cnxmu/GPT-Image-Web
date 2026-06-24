import {
  DEFAULT_COMPRESSION_RATE,
  DEFAULT_NANO_BANANA_MAX_TOKENS,
  DEFAULT_NANO_BANANA_TEMPERATURE,
  DEFAULT_NANO_BANANA_TOP_P,
  getDefaultImageModel,
  getImageSize,
  getImageModelFamily,
  isImageModel,
  isImageModelFamily,
  isAspectRatio,
  isImageQuality,
  isModerationLevel,
  isOutputFormat,
  isResolutionTier,
} from '../../lib/constants'
import type { WorkbenchState } from '../../store/workbench.store'
import type { AgentFormPatch, AgentProposedAction } from '../../types/api'
import type { HistoryRecord } from '../../types/history'
import type { ImageFormState } from '../../types/image'
import type { TemplateRecord } from '../../types/template'
import { nowIso } from '../../lib/time'
import { createId } from '../../lib/uid'

export interface AgentActionChange {
  field: keyof AgentFormPatch
  label: string
  before: string
  after: string
}

export function formSnapshotFromStore(state: WorkbenchState): ImageFormState {
  return {
    mode: state.mode,
    imageModelFamily: state.imageModelFamily,
    imageModel: state.imageModel,
    prompt: state.prompt.trim(),
    negativePrompt: state.negativePrompt.trim(),
    aspectRatio: state.aspectRatio,
    resolutionTier: state.resolutionTier,
    size: state.size,
    quality: state.quality,
    moderation: state.moderation,
    count: state.count,
    compressionRate: state.compressionRate,
    outputFormat: state.outputFormat,
    nanoBananaTemperature: state.nanoBananaTemperature,
    nanoBananaTopP: state.nanoBananaTopP,
    nanoBananaMaxTokens: state.nanoBananaMaxTokens,
    nanoBananaSeed: state.nanoBananaSeed,
  }
}

export function getActionFormPatch(action: AgentProposedAction): AgentFormPatch {
  const payload = action.payload || {}
  const rawPatch = payload.formPatch && typeof payload.formPatch === 'object' ? payload.formPatch : payload
  return sanitizeFormPatch(rawPatch)
}

export function getActionTemplateId(action: AgentProposedAction) {
  const value = action.payload?.templateId
  return typeof value === 'string' ? value : ''
}

export function getActionHistoryId(action: AgentProposedAction) {
  const value = action.payload?.historyId
  return typeof value === 'string' ? value : ''
}

export function getActionTemplateDraft(action: AgentProposedAction, state: WorkbenchState): TemplateRecord {
  const payload = action.payload || {}
  const patch = getActionFormPatch(action)
  const aspectRatio = patch.aspectRatio || state.aspectRatio
  const resolutionTier = patch.resolutionTier || state.resolutionTier
  const { imageModelFamily, imageModel } = resolveImageModelPatch(patch, state)
  const now = nowIso()
  const name = typeof payload.name === 'string' && payload.name.trim()
    ? payload.name.trim()
    : action.title.trim() || `Agent 模板 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  const description = typeof payload.description === 'string' ? payload.description.trim() : ''

  return {
    id: createId('template'),
    source: 'user',
    name,
    description: description || undefined,
    mode: patch.mode || state.mode,
    imageModelFamily,
    imageModel,
    prompt: patch.prompt ?? state.prompt,
    negativePrompt: (patch.negativePrompt ?? state.negativePrompt) || undefined,
    aspectRatio,
    resolutionTier,
    size: getImageSize(aspectRatio, resolutionTier),
    quality: patch.quality || state.quality,
    moderation: patch.moderation || state.moderation,
    count: patch.count ?? state.count,
    compressionRate: patch.compressionRate ?? state.compressionRate,
    outputFormat: patch.outputFormat || state.outputFormat,
    nanoBananaTemperature: patch.nanoBananaTemperature ?? state.nanoBananaTemperature,
    nanoBananaTopP: patch.nanoBananaTopP ?? state.nanoBananaTopP,
    nanoBananaMaxTokens: patch.nanoBananaMaxTokens ?? state.nanoBananaMaxTokens,
    nanoBananaSeed: patch.nanoBananaSeed ?? state.nanoBananaSeed,
    createdAt: now,
    updatedAt: now,
  }
}

export function getFormPatchChanges(patch: AgentFormPatch, state: WorkbenchState): AgentActionChange[] {
  return Object.entries(patch)
    .map(([field, value]) => {
      const key = field as keyof AgentFormPatch
      const before = getStateFieldValue(state, key)
      const after = formatValue(key, value)
      if (before === after) return undefined
      return {
        field: key,
        label: FIELD_LABELS[key],
        before,
        after,
      }
    })
    .filter((change): change is AgentActionChange => Boolean(change))
}

export function applyFormPatch(patch: AgentFormPatch, state: WorkbenchState) {
  if (patch.mode) state.setMode(patch.mode)
  if (patch.imageModel) state.setImageModel(patch.imageModel)
  else if (patch.imageModelFamily) state.setImageModelFamily(patch.imageModelFamily)
  if (patch.prompt !== undefined) state.setPrompt(patch.prompt)
  if (patch.negativePrompt !== undefined) state.setNegativePrompt(patch.negativePrompt)
  if (patch.aspectRatio) state.setAspectRatio(patch.aspectRatio)
  if (patch.resolutionTier) state.setResolutionTier(patch.resolutionTier)
  if (patch.quality) state.setQuality(patch.quality)
  if (patch.moderation) state.setModeration(patch.moderation)
  if (patch.count !== undefined) state.setCount(patch.count)
  if (patch.compressionRate !== undefined) state.setCompressionRate(patch.compressionRate)
  if (patch.outputFormat) state.setOutputFormat(patch.outputFormat)
  if (patch.nanoBananaTemperature !== undefined) state.setNanoBananaTemperature(patch.nanoBananaTemperature)
  if (patch.nanoBananaTopP !== undefined) state.setNanoBananaTopP(patch.nanoBananaTopP)
  if (patch.nanoBananaMaxTokens !== undefined) state.setNanoBananaMaxTokens(patch.nanoBananaMaxTokens)
  if (patch.nanoBananaSeed !== undefined) state.setNanoBananaSeed(patch.nanoBananaSeed)
}

function resolveImageModelPatch(patch: AgentFormPatch, state: WorkbenchState) {
  if (patch.imageModel) {
    return {
      imageModel: patch.imageModel,
      imageModelFamily: getImageModelFamily(patch.imageModel),
    }
  }

  if (patch.imageModelFamily) {
    return {
      imageModelFamily: patch.imageModelFamily,
      imageModel: getDefaultImageModel(patch.imageModelFamily),
    }
  }

  return {
    imageModelFamily: state.imageModelFamily,
    imageModel: state.imageModel,
  }
}

export function templateToFormPatch(template: TemplateRecord): AgentFormPatch {
  const imageModel = template.imageModel || 'gpt-image-2'
  return {
    mode: template.mode,
    imageModelFamily: template.imageModelFamily || getImageModelFamily(imageModel),
    imageModel,
    prompt: template.prompt,
    negativePrompt: template.negativePrompt || '',
    aspectRatio: template.aspectRatio,
    resolutionTier: template.resolutionTier,
    quality: template.quality,
    moderation: template.moderation,
    count: template.count,
    compressionRate: template.compressionRate,
    outputFormat: template.outputFormat,
    nanoBananaTemperature: template.nanoBananaTemperature ?? DEFAULT_NANO_BANANA_TEMPERATURE,
    nanoBananaTopP: template.nanoBananaTopP ?? DEFAULT_NANO_BANANA_TOP_P,
    nanoBananaMaxTokens: template.nanoBananaMaxTokens ?? DEFAULT_NANO_BANANA_MAX_TOKENS,
    nanoBananaSeed: template.nanoBananaSeed,
  }
}

export function historyToFormPatch(record: HistoryRecord): AgentFormPatch {
  return sanitizeFormPatch({
    mode: record.mode,
    imageModelFamily: record.params.imageModelFamily,
    imageModel: record.params.imageModel,
    prompt: record.prompt,
    negativePrompt: record.negativePrompt || '',
    aspectRatio: record.params.aspectRatio,
    resolutionTier: record.params.resolutionTier,
    quality: record.params.quality,
    moderation: record.params.moderation,
    count: record.params.count,
    compressionRate: record.params.compressionRate ?? DEFAULT_COMPRESSION_RATE,
    outputFormat: record.params.outputFormat,
    nanoBananaTemperature: record.params.nanoBananaTemperature,
    nanoBananaTopP: record.params.nanoBananaTopP,
    nanoBananaMaxTokens: record.params.nanoBananaMaxTokens,
    nanoBananaSeed: record.params.nanoBananaSeed,
  })
}

function sanitizeFormPatch(value: unknown): AgentFormPatch {
  if (!value || typeof value !== 'object') return {}

  const raw = value as Record<string, unknown>
  const patch: AgentFormPatch = {}

  if (raw.mode === 'generation' || raw.mode === 'edit') patch.mode = raw.mode
  if (typeof raw.imageModelFamily === 'string' && isImageModelFamily(raw.imageModelFamily)) {
    patch.imageModelFamily = raw.imageModelFamily
  }
  if (typeof raw.imageModel === 'string' && isImageModel(raw.imageModel)) {
    patch.imageModel = raw.imageModel
  }
  if (typeof raw.prompt === 'string') patch.prompt = raw.prompt
  if (typeof raw.negativePrompt === 'string') patch.negativePrompt = raw.negativePrompt
  if (typeof raw.aspectRatio === 'string' && isAspectRatio(raw.aspectRatio)) patch.aspectRatio = raw.aspectRatio
  if (typeof raw.resolutionTier === 'string' && isResolutionTier(raw.resolutionTier)) {
    patch.resolutionTier = raw.resolutionTier
  }
  if (typeof raw.quality === 'string' && isImageQuality(raw.quality)) patch.quality = raw.quality
  if (typeof raw.moderation === 'string' && isModerationLevel(raw.moderation)) patch.moderation = raw.moderation
  if (typeof raw.count === 'number' && Number.isFinite(raw.count)) patch.count = raw.count
  if (typeof raw.compressionRate === 'number' && Number.isFinite(raw.compressionRate)) {
    patch.compressionRate = Math.max(0.1, Math.min(1, raw.compressionRate))
  }
  if (typeof raw.outputFormat === 'string' && isOutputFormat(raw.outputFormat)) patch.outputFormat = raw.outputFormat
  if (typeof raw.nanoBananaTemperature === 'number' && Number.isFinite(raw.nanoBananaTemperature)) {
    patch.nanoBananaTemperature = Math.max(0, Math.min(2, raw.nanoBananaTemperature))
  }
  if (typeof raw.nanoBananaTopP === 'number' && Number.isFinite(raw.nanoBananaTopP)) {
    patch.nanoBananaTopP = Math.max(0, Math.min(1, raw.nanoBananaTopP))
  }
  if (typeof raw.nanoBananaMaxTokens === 'number' && Number.isFinite(raw.nanoBananaMaxTokens)) {
    patch.nanoBananaMaxTokens = Math.max(1, Math.round(raw.nanoBananaMaxTokens))
  }
  if (typeof raw.nanoBananaSeed === 'number' && Number.isFinite(raw.nanoBananaSeed)) {
    patch.nanoBananaSeed = Math.round(raw.nanoBananaSeed)
  }

  return patch
}

function getStateFieldValue(state: WorkbenchState, field: keyof AgentFormPatch) {
  const value = state[field]
  return formatValue(field, value)
}

function formatValue(field: keyof AgentFormPatch, value: AgentFormPatch[keyof AgentFormPatch] | WorkbenchState[keyof WorkbenchState]) {
  if (field === 'mode') return value === 'edit' ? '图生图' : '文生图'
  if (field === 'compressionRate' && typeof value === 'number') return `${Math.round(value * 100)}%`
  if (field === 'nanoBananaTemperature' && typeof value === 'number') return String(value)
  if (field === 'nanoBananaTopP' && typeof value === 'number') return String(value)
  if (value === undefined || value === '') return '空'
  return String(value)
}

const FIELD_LABELS: Record<keyof AgentFormPatch, string> = {
  mode: '模式',
  imageModelFamily: '生图模型',
  imageModel: '详细模型',
  prompt: '提示词',
  negativePrompt: '负面提示词',
  aspectRatio: '构图比例',
  resolutionTier: '分辨率档位',
  quality: '质量',
  moderation: '审查',
  count: '数量',
  compressionRate: '压缩率',
  outputFormat: '输出格式',
  nanoBananaTemperature: '采样温度',
  nanoBananaTopP: '核采样',
  nanoBananaMaxTokens: '最大 Token',
  nanoBananaSeed: '采样种子',
}
