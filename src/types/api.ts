import type {
  AgentModel,
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

export interface ImageGenerationRequest {
  model?: string
  prompt: string
  size: ImageSize
  quality: ImageQuality
  n: 1
  output_format: OutputFormat
  output_compression?: number
  moderation?: ModerationLevel
}

export interface ImageEditRequest extends ImageGenerationRequest {
  image: File[]
}

export interface AgentPromptRequest {
  model?: string
  input: string | Array<unknown>
  temperature?: number
}

export interface OptimizedPromptCandidate {
  prompt: string
  negativePrompt: string
  comparisonPoints: string[]
  rawText?: string
}

export type AgentActionType = 'formPatch' | 'generate' | 'applyTemplate' | 'showHistoryResult' | 'createTemplate' | 'explain'
export type AgentActionStatus = 'pending' | 'applied' | 'generated' | 'shown' | 'saved' | 'failed'

export interface AgentFormPatch {
  mode?: WorkbenchMode
  imageModelFamily?: ImageModelFamily
  imageModel?: ImageModel
  prompt?: string
  negativePrompt?: string
  aspectRatio?: AspectRatio
  resolutionTier?: ResolutionTier
  quality?: ImageQuality
  moderation?: ModerationLevel
  count?: number
  compressionRate?: number
  outputFormat?: OutputFormat
}

export type AgentActionPayload = Record<string, unknown>

export interface AgentProposedAction {
  id: string
  type: AgentActionType
  title: string
  description?: string
  payload?: AgentActionPayload
  status: AgentActionStatus
  error?: string
}

export interface AgentChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  attachments?: AgentImageAttachment[]
  proposedActions?: AgentProposedAction[]
}

export interface AgentImageAttachment {
  id: string
  assetId: string
  fileName: string
  mimeType: string
  sizeBytes: number
  width?: number
  height?: number
}

export interface AgentChatResponse {
  reply: string
  proposedActions?: AgentProposedAction[]
  rawText?: string
}

export interface AgentConversationRecord {
  id: string
  title?: string
  messages: AgentChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface SecretRecord {
  id: 'imageApiKey' | 'agentApiKey'
  value: string
  updatedAt: string
}

export interface AssetRecord {
  id: string
  blob: Blob
  mimeType: string
  width?: number
  height?: number
  createdAt: string
}

export interface SettingRecord {
  id: 'agentModel' | 'generationConcurrency' | string
  value: unknown
  updatedAt: string
}

export interface AppSettings {
  agentModel: AgentModel
}
