import { API_ENDPOINTS, type AgentModel } from '../../lib/constants'
import { ensureOk } from '../../lib/http'
import type {
  AgentActionPayload,
  AgentActionStatus,
  AgentActionType,
  AgentChatMessage,
  AgentChatResponse,
  AgentProposedAction,
  OptimizedPromptCandidate,
} from '../../types/api'
import type { HistoryRecord } from '../../types/history'
import type { ImageFormState } from '../../types/image'
import type { TemplateRecord } from '../../types/template'
import type { AgentImageInput } from './agent-images'

export async function optimizePrompt({
  apiKey,
  model,
  prompt,
  negativePrompt,
}: {
  apiKey: string
  model: AgentModel
  prompt: string
  negativePrompt: string
}) {
  const response = await fetch(API_ENDPOINTS.responses, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content:
            '你是面向个人用户的 AI 生图提示词助手。请基于这个人自己的原始提示词和负面提示词，输出严格 JSON，不要使用 Markdown。JSON 字段必须为 prompt、negativePrompt、comparisonPoints。prompt 是优化后的正向生图提示词；negativePrompt 是优化后的负面提示词，即使对方没有提供负面提示词也必须生成；comparisonPoints 是 3 到 6 条中文要点，用个人化口吻说明优化后相对原提示词的改进。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt,
            negativePrompt,
          }),
        },
      ],
    }),
  })

  const body = await ensureOk(response)
  return parseOptimizedPromptCandidate(extractOutputText(body), prompt, negativePrompt)
}

export async function sendAgentChatMessage({
  apiKey,
  model,
  messages,
  formSnapshot,
  templates,
  history,
  imageInputs,
}: {
  apiKey: string
  model: AgentModel
  messages: AgentChatMessage[]
  formSnapshot: ImageFormState
  templates: TemplateRecord[]
  history: HistoryRecord[]
  imageInputs: AgentImageInput[]
}) {
  const contextText = JSON.stringify({
    currentForm: {
      mode: formSnapshot.mode,
      imageModelFamily: formSnapshot.imageModelFamily,
      imageModel: formSnapshot.imageModel,
      prompt: formSnapshot.prompt,
      negativePrompt: formSnapshot.negativePrompt,
      aspectRatio: formSnapshot.aspectRatio,
      resolutionTier: formSnapshot.resolutionTier,
      size: formSnapshot.size,
      quality: formSnapshot.quality,
      moderation: formSnapshot.moderation,
      count: formSnapshot.count,
      outputFormat: formSnapshot.outputFormat,
    },
    templates: templates.slice(0, 30).map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      mode: template.mode,
      imageModelFamily: template.imageModelFamily,
      imageModel: template.imageModel,
      prompt: template.prompt,
      negativePrompt: template.negativePrompt,
      aspectRatio: template.aspectRatio,
      resolutionTier: template.resolutionTier,
      quality: template.quality,
      count: template.count,
      outputFormat: template.outputFormat,
    })),
    history: history.slice(0, 30).map((record) => ({
      id: record.id,
      mode: record.mode,
      prompt: record.prompt,
      negativePrompt: record.negativePrompt,
      params: record.params,
      status: record.status,
      total: record.total,
      success: record.success,
      failed: record.failed,
      slowestMs: record.slowestMs,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      error: record.error,
      resultSummary: record.results.map((result) => ({
        status: result.status,
        actualWidth: result.actualWidth,
        actualHeight: result.actualHeight,
        durationMs: result.durationMs,
        error: result.error,
      })),
    })),
    messages: messages.map((message) => ({
      role: message.role,
      content: message.content,
      attachments: message.attachments?.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        width: attachment.width,
        height: attachment.height,
      })),
      proposedActions: message.proposedActions?.map((action) => ({
        type: action.type,
        title: action.title,
        description: action.description,
        payload: action.payload,
        status: action.status,
      })),
    })),
    imageInputCount: imageInputs.length,
  })

  const response = await fetch(API_ENDPOINTS.responses, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content:
            '你是个人 AI 生图控制台里的私人创作 Agent。你只能围绕对方自己的生图、图生图、提示词、参数、个人模板、我的历史结果、上传图片分析和失败排查提供帮助。对方可能会上传图片供你分析画面内容、风格、构图、色彩、主体和可复用提示词。必须只输出严格 JSON，不要 Markdown。JSON 字段为 reply、proposedActions。reply 是中文自然回复，使用面向个人用户的口吻。proposedActions 是数组，可以为空。动作类型只能是 formPatch、generate、applyTemplate、showHistoryResult、createTemplate、explain。所有会改变表单、应用模板、展示历史结果、创建模板或生图的意图都必须作为 proposedActions 给出，由对方确认后执行；不要声称已经执行。formPatch.payload.formPatch 只允许包含 mode、imageModelFamily、imageModel、prompt、negativePrompt、aspectRatio、resolutionTier、quality、moderation、count、compressionRate、outputFormat。imageModelFamily 和 imageModel 只能使用 gpt-image-2、nano-banana-2、nano-banana-pro。generate 可以带 payload.formPatch 表示生成前要应用的表单改动。createTemplate 用于把当前表单或建议表单保存成对方的个人模板，payload 可包含 name、description、formPatch。applyTemplate 必须带 templateId。showHistoryResult 必须带 historyId。explain 是纯说明动作，不应改变状态。',
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: contextText,
            },
            ...imageInputs.map((input) => ({
              type: 'input_image',
              image_url: input.dataUrl,
              detail: getImageDetail(model),
            })),
          ],
        },
      ],
    }),
  })

  const body = await ensureOk(response)
  return parseAgentChatResponse(extractOutputText(body))
}

function getImageDetail(model: AgentModel) {
  return model === 'gpt-5.5' ? 'original' : 'high'
}

export function parseOptimizedPromptCandidate(
  text: string,
  fallbackPrompt = '',
  fallbackNegativePrompt = '',
): OptimizedPromptCandidate {
  const rawText = text.trim()
  const jsonText = extractJsonObject(rawText)

  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText) as Partial<OptimizedPromptCandidate>
      const prompt = normalizeText(parsed.prompt) || fallbackPrompt
      const negativePrompt = normalizeText(parsed.negativePrompt) || fallbackNegativePrompt || 'low quality, blurry, distorted, extra limbs, watermark, text'
      const comparisonPoints = normalizePoints(parsed.comparisonPoints)

      return {
        prompt,
        negativePrompt,
        comparisonPoints: comparisonPoints.length > 0 ? comparisonPoints : ['已增强主体、画面细节和生成约束。'],
        rawText,
      }
    } catch {
      // Fall through to text parsing.
    }
  }

  return parsePlainTextCandidate(rawText, fallbackPrompt, fallbackNegativePrompt)
}

export function parseAgentChatResponse(text: string): AgentChatResponse {
  const rawText = text.trim()
  const jsonText = extractJsonObject(rawText)

  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText) as Partial<AgentChatResponse>
      const reply = normalizeText(parsed.reply) || rawText
      const proposedActions = normalizeProposedActions(parsed.proposedActions)

      return {
        reply,
        proposedActions,
        rawText,
      }
    } catch {
      // Fall through to plain assistant text.
    }
  }

  return {
    reply: rawText || '我这边没有收到有效回复，请再试一次。',
    rawText,
  }
}

export function extractOutputText(body: unknown) {
  const payload = body as {
    output_text?: string
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>
    choices?: Array<{ message?: { content?: string }; text?: string }>
  }

  if (payload.output_text) return payload.output_text

  const outputText = payload.output
    ?.flatMap((item) => item.content || [])
    .map((item) => item.text)
    .filter(Boolean)
    .join('\n')

  if (outputText) return outputText

  const choiceText = payload.choices?.map((item) => item.message?.content || item.text).find(Boolean)
  if (choiceText) return choiceText

  return ''
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start >= 0 && end > start) return text.slice(start, end + 1)

  return ''
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePoints(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/\n|；|;/)
      .map((item) => item.replace(/^[-*•\d.、\s]+/, '').trim())
      .filter(Boolean)
  }
  return []
}

function parsePlainTextCandidate(
  text: string,
  fallbackPrompt: string,
  fallbackNegativePrompt: string,
): OptimizedPromptCandidate {
  const prompt = pickSection(text, ['prompt', '正向提示词', '优化后提示词', '提示词']) || fallbackPrompt || text
  const negativePrompt =
    pickSection(text, ['negativePrompt', 'negative prompt', '负面提示词', '负向提示词']) ||
    fallbackNegativePrompt ||
    'low quality, blurry, distorted, extra limbs, watermark, text'
  const comparisonText = pickSection(text, ['comparisonPoints', '对比说明', '对比', '改进点', '说明'])
  const comparisonPoints = normalizePoints(comparisonText)

  return {
    prompt: prompt.trim(),
    negativePrompt: negativePrompt.trim(),
    comparisonPoints: comparisonPoints.length > 0 ? comparisonPoints : ['已在原提示词基础上补充画面主体、风格细节和负面约束。'],
    rawText: text,
  }
}

function normalizeProposedActions(value: unknown): AgentProposedAction[] | undefined {
  if (!Array.isArray(value)) return undefined

  const actions = value.map(normalizeProposedAction).filter((action): action is AgentProposedAction => Boolean(action))
  return actions.length > 0 ? actions : undefined
}

function normalizeProposedAction(value: unknown): AgentProposedAction | undefined {
  if (!value || typeof value !== 'object') return undefined

  const raw = value as {
    id?: unknown
    type?: unknown
    title?: unknown
    description?: unknown
    payload?: unknown
    status?: unknown
  }
  const type = normalizeActionType(raw.type)
  if (!type) return undefined

  const title = normalizeText(raw.title) || defaultActionTitle(type)
  const payload = raw.payload && typeof raw.payload === 'object' ? (raw.payload as AgentActionPayload) : undefined

  return {
    id: normalizeText(raw.id) || `${type}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    title,
    description: normalizeText(raw.description) || undefined,
    payload,
    status: normalizeActionStatus(raw.status) || 'pending',
  }
}

function normalizeActionType(value: unknown): AgentActionType | undefined {
  if (
    value === 'formPatch' ||
    value === 'generate' ||
    value === 'applyTemplate' ||
    value === 'showHistoryResult' ||
    value === 'createTemplate' ||
    value === 'explain'
  ) {
    return value
  }
  return undefined
}

function normalizeActionStatus(value: unknown): AgentActionStatus | undefined {
  if (value === 'pending' || value === 'applied' || value === 'generated' || value === 'shown' || value === 'saved' || value === 'failed') {
    return value
  }
  return undefined
}

function defaultActionTitle(type: AgentActionType) {
  const titles: Record<AgentActionType, string> = {
    formPatch: '应用表单改动',
    generate: '开始我的生成',
    applyTemplate: '应用模板',
    showHistoryResult: '展示历史结果',
    createTemplate: '保存为我的模板',
    explain: '查看说明',
  }
  return titles[type]
}

function pickSection(text: string, labels: string[]) {
  const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const nextLabel = [
    'prompt',
    '正向提示词',
    '优化后提示词',
    '提示词',
    'negativePrompt',
    'negative prompt',
    '负面提示词',
    '负向提示词',
    'comparisonPoints',
    '对比说明',
    '对比',
    '改进点',
    '说明',
  ]
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:${escaped})\\s*[:：]\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextLabel})\\s*[:：]|$)`, 'i')
  const match = text.match(pattern)
  return match?.[1]?.trim() || ''
}
