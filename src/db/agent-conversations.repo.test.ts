import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentConversationRecord } from '../types/api'
import { pruneAgentConversationsToLimit } from './agent-conversations.repo'

const deleteAssets = vi.fn()
const conversations: AgentConversationRecord[] = [
  {
    id: 'old',
    title: '旧会话',
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z',
    messages: [
      {
        id: 'msg_old',
        role: 'user',
        content: '旧图',
        createdAt: '2026-06-20T00:00:00.000Z',
        attachments: [
          {
            id: 'att_old',
            assetId: 'asset_old',
            fileName: 'old.png',
            mimeType: 'image/png',
            sizeBytes: 10,
          },
        ],
      },
    ],
  },
  {
    id: 'new',
    title: '新会话',
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
    messages: [],
  },
]

vi.mock('./assets.repo', () => ({
  deleteAssets: (ids: string[]) => deleteAssets(ids),
}))

vi.mock('./db', () => ({
  db: {
    agentConversations: {
      orderBy: vi.fn(() => ({
        reverse: vi.fn(() => ({
          toArray: vi.fn(async () => [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
        })),
      })),
      bulkDelete: vi.fn(async () => undefined),
    },
  },
}))

describe('agent conversation cleanup', () => {
  beforeEach(() => {
    deleteAssets.mockReset()
  })

  it('keeps the newest conversations and deletes assets from older conversations', async () => {
    const { db } = await import('./db')

    await expect(pruneAgentConversationsToLimit(1)).resolves.toBe(1)

    expect(deleteAssets).toHaveBeenCalledWith(['asset_old'])
    expect(db.agentConversations.bulkDelete).toHaveBeenCalledWith(['old'])
  })
})
