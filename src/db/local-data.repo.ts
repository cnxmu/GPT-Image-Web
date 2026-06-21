import { clearAssets, clearUnreferencedAssets } from './assets.repo'
import { db } from './db'
import { clearHistory, getHistoryAssetIds } from './history.repo'
import { clearSecrets } from './secrets.repo'
import { clearTemplates } from './templates.repo'
import type { AgentConversationRecord } from '../types/api'

function getConversationAssetIds(conversations: AgentConversationRecord[]) {
  return conversations.flatMap((conversation) =>
    conversation.messages.flatMap((message) => message.attachments?.map((attachment) => attachment.assetId) || []),
  )
}

export async function getReferencedLocalAssetIds() {
  const [history, conversations] = await Promise.all([db.history.toArray(), db.agentConversations.toArray()])
  return Array.from(new Set([...getHistoryAssetIds(history), ...getConversationAssetIds(conversations)]))
}

export async function clearUnreferencedLocalAssets() {
  return clearUnreferencedAssets(await getReferencedLocalAssetIds())
}

export async function clearAllLocalData() {
  await clearSecrets()
  await clearTemplates()
  await clearHistory()
  await clearAssets()
  await db.settings.clear()
  await db.agentConversations.clear()
}
