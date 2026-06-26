import {
  DEFAULT_COMPRESSION_RATE,
  IMAGE_MODEL,
  getImageSize,
  isAspectRatio,
  isImageModel,
  isImageModelFamily,
  isImageQuality,
  isModerationLevel,
  isOutputFormat,
  isResolutionTier,
} from '../../lib/constants'
import { snapshotFormFromStore } from '../../lib/form-snapshot'
import { nowIso } from '../../lib/time'
import { createId } from '../../lib/uid'
import type { WorkbenchState } from '../../store/workbench.store'
import type { AgentFormPatch, AgentProposedAction } from '../../types/api'
import type { HistoryRecord } from '../../types/history'
import type { TemplateRecord } from '../../types/template'

export interface AgentActionChange {
  field: keyof AgentFormPatch
  label: string
  before: string
  after: string
}

type AgentFormPatchState = Pick<WorkbenchState, keyof AgentFormPatch>

export { snapshotFormFromStore as formSnapshotFromStore }

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
    imageModelFamily: 'gpt-image-2',
    imageModel: IMAGE_MODEL,
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
    createdAt: now,
    updatedAt: now,
  }
}

export function getFormPatchChanges(patch: AgentFormPatch, state: AgentFormPatchState): AgentActionChange[] {
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
}

export function templateToFormPatch(template: TemplateRecord): AgentFormPatch {
  return {
    mode: template.mode,
    imageModelFamily: 'gpt-image-2',
    imageModel: IMAGE_MODEL,
    prompt: template.prompt,
    negativePrompt: template.negativePrompt || '',
    aspectRatio: template.aspectRatio,
    resolutionTier: template.resolutionTier,
    quality: template.quality,
    moderation: template.moderation,
    count: template.count,
    compressionRate: template.compressionRate,
    outputFormat: template.outputFormat,
  }
}

export function historyToFormPatch(record: HistoryRecord): AgentFormPatch {
  return sanitizeFormPatch({
    mode: record.mode,
    imageModelFamily: 'gpt-image-2',
    imageModel: IMAGE_MODEL,
    prompt: record.prompt,
    negativePrompt: record.negativePrompt || '',
    aspectRatio: record.params.aspectRatio,
    resolutionTier: record.params.resolutionTier,
    quality: record.params.quality,
    moderation: record.params.moderation,
    count: record.params.count,
    compressionRate: record.params.compressionRate ?? DEFAULT_COMPRESSION_RATE,
    outputFormat: record.params.outputFormat,
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

  return patch
}

function getStateFieldValue(state: AgentFormPatchState, field: keyof AgentFormPatch) {
  const value = state[field]
  return formatValue(field, value)
}

function formatValue(field: keyof AgentFormPatch, value: AgentFormPatch[keyof AgentFormPatch] | WorkbenchState[keyof WorkbenchState]) {
  if (field === 'mode') return value === 'edit' ? '图生图' : '文生图'
  if (field === 'compressionRate' && typeof value === 'number') return `${Math.round(value * 100)}%`
  if (value === undefined || value === '') return '空'
  return String(value)
}

const FIELD_LABELS: Record<keyof AgentFormPatch, string> = {
  mode: '模式',
  imageModelFamily: '生图模型',
  imageModel: '模型',
  prompt: '提示词',
  negativePrompt: '负面提示词',
  aspectRatio: '构图比例',
  resolutionTier: '分辨率档位',
  quality: '质量',
  moderation: '审查',
  count: '数量',
  compressionRate: '压缩率',
  outputFormat: '输出格式',
}
