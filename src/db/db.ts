import Dexie, { type EntityTable } from 'dexie'
import type { AgentConversationRecord, AssetRecord, SecretRecord, SettingRecord } from '../types/api'
import type { HistoryRecord } from '../types/history'
import type { TemplateRecord } from '../types/template'

export class ImageWorkbenchDatabase extends Dexie {
  secrets!: EntityTable<SecretRecord, 'id'>
  templates!: EntityTable<TemplateRecord, 'id'>
  history!: EntityTable<HistoryRecord, 'id'>
  assets!: EntityTable<AssetRecord, 'id'>
  settings!: EntityTable<SettingRecord, 'id'>
  agentConversations!: EntityTable<AgentConversationRecord, 'id'>

  constructor() {
    super('ImageWorkbenchDB')
    this.version(1).stores({
      secrets: 'id, updatedAt',
      templates: 'id, name, mode, updatedAt, createdAt',
      history: 'id, status, mode, startedAt, finishedAt',
      assets: 'id, createdAt',
      settings: 'id, updatedAt',
    })
    this.version(2).stores({
      agentConversations: 'id, updatedAt, createdAt',
    })
  }
}

export const db = new ImageWorkbenchDatabase()
