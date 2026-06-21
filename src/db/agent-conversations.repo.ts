import { db } from './db'
import { nowIso } from '../lib/time'
import { createId } from '../lib/uid'
import type { AgentChatMessage, AgentConversationRecord } from '../types/api'

export const DEFAULT_AGENT_CONVERSATION_ID = 'default'

export async function listAgentConversations() {
  return db.agentConversations.orderBy('updatedAt').reverse().toArray()
}

export async function getAgentConversation(id = DEFAULT_AGENT_CONVERSATION_ID) {
  return db.agentConversations.get(id)
}

export async function createAgentConversation(title?: string) {
  const now = nowIso()
  const record: AgentConversationRecord = {
    id: createId('agent_conversation'),
    title: title?.trim() || '新对话',
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
  await db.agentConversations.put(record)
  return record
}

export async function saveAgentConversation(messages: AgentChatMessage[], id = DEFAULT_AGENT_CONVERSATION_ID, title?: string) {
  const existing = await getAgentConversation(id)
  const now = nowIso()
  const record: AgentConversationRecord = {
    id,
    title: title ?? existing?.title,
    messages,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }

  await db.agentConversations.put(record)
  return record
}

export async function renameAgentConversation(id: string, title: string) {
  const conversation = await getAgentConversation(id)
  if (!conversation) return undefined
  const record: AgentConversationRecord = {
    ...conversation,
    title: title.trim() || conversation.title || '未命名对话',
    updatedAt: nowIso(),
  }
  await db.agentConversations.put(record)
  return record
}

export async function clearAgentConversationMessages(id = DEFAULT_AGENT_CONVERSATION_ID) {
  return saveAgentConversation([], id)
}

export async function clearAgentConversation(id = DEFAULT_AGENT_CONVERSATION_ID) {
  await db.agentConversations.delete(id)
}

export async function deleteAgentConversation(id: string) {
  await clearAgentConversation(id)
}
