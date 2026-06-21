import { getAsset, putAsset } from '../../db/assets.repo'
import { nowIso } from '../../lib/time'
import { createId } from '../../lib/uid'
import type { AgentChatMessage, AgentImageAttachment } from '../../types/api'
import type { AssetRecord } from '../../types/api'

export const MAX_AGENT_MESSAGE_IMAGES = 8
export const LARGE_AGENT_IMAGE_BYTES = 10 * 1024 * 1024
export const AGENT_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const

export interface AgentImageInput {
  attachment: AgentImageAttachment
  dataUrl: string
}

export function isSupportedAgentImage(file: File) {
  return AGENT_IMAGE_MIME_TYPES.includes(file.type as (typeof AGENT_IMAGE_MIME_TYPES)[number])
}

export async function createAgentImageAttachment(file: File): Promise<AgentImageAttachment> {
  const dimensions = await getImageDimensions(file).catch(() => undefined)
  const assetId = createId('asset')
  const attachment: AgentImageAttachment = {
    id: createId('agent_img'),
    assetId,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    width: dimensions?.width,
    height: dimensions?.height,
  }
  const asset: AssetRecord = {
    id: assetId,
    blob: file,
    mimeType: attachment.mimeType,
    width: dimensions?.width,
    height: dimensions?.height,
    createdAt: nowIso(),
  }

  await putAsset(asset)
  return attachment
}

export async function collectAgentImageInputs(messages: AgentChatMessage[], maxImages = MAX_AGENT_MESSAGE_IMAGES) {
  const attachments = messages
    .flatMap((message) => message.attachments || [])
    .slice()
    .reverse()
    .slice(0, maxImages)

  const inputs: AgentImageInput[] = []
  for (const attachment of attachments) {
    const asset = await getAsset(attachment.assetId)
    if (!asset) continue
    inputs.push({
      attachment,
      dataUrl: await blobToDataUrl(asset.blob, attachment.mimeType || asset.mimeType),
    })
  }

  return inputs
}

export function getAttachmentAssetIds(messages: AgentChatMessage[]) {
  return Array.from(new Set(messages.flatMap((message) => message.attachments?.map((item) => item.assetId) || [])))
}

export async function attachmentToFile(attachment: AgentImageAttachment) {
  const asset = await getAsset(attachment.assetId)
  if (!asset) return undefined
  return new File([asset.blob], attachment.fileName, {
    type: attachment.mimeType || asset.mimeType,
    lastModified: Date.now(),
  })
}

async function blobToDataUrl(blob: Blob, mimeType: string) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

  if (dataUrl.startsWith('data:')) return dataUrl

  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
  return `data:${mimeType};base64,${base64}`
}

async function getImageDimensions(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('无法读取图片尺寸'))
      image.src = url
    })
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}
