import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWorkbenchStore } from '../../store/workbench.store'
import type { AgentChatMessage, AgentConversationRecord } from '../../types/api'
import type { HistoryRecord } from '../../types/history'
import type { TemplateRecord } from '../../types/template'
import { AgentChatPanel } from './AgentChatPanel'
import { createAgentImageAttachment } from '../../features/agent/agent-images'

let savedMessages: AgentChatMessage[] = []
let mockConversations: AgentConversationRecord[] = []
let mockTemplates: TemplateRecord[] = []
let mockHistory: HistoryRecord[] = []
let deletedAssetIds: string[] = []
const generateMutate = vi.fn()
const upsertTemplate = vi.fn()
const chatMutateAsync = vi.fn()

function syncDefaultConversation() {
  mockConversations = [
    {
      id: 'default',
      title: '默认对话',
      messages: savedMessages,
      createdAt: '2026-06-20T00:00:00.000Z',
      updatedAt: '2026-06-20T00:00:00.000Z',
    },
  ]
}

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (factory: () => unknown) => factory(),
}))

vi.mock('../../db/db', () => ({
  db: {
    templates: {
      orderBy: () => ({
        reverse: () => ({
          toArray: () => mockTemplates,
        }),
      }),
    },
    assets: {
      get: (id: string) => ({
        id,
        blob: new Blob(['image'], { type: 'image/png' }),
        mimeType: 'image/png',
        createdAt: '2026-06-20T00:00:00.000Z',
      }),
    },
    history: {
      orderBy: () => ({
        reverse: () => ({
          limit: () => ({
            toArray: () => mockHistory,
          }),
        }),
      }),
    },
    settings: {
      get: vi.fn(async () => undefined),
    },
  },
}))

vi.mock('../../db/assets.repo', () => ({
  deleteAssets: vi.fn(async (ids: string[]) => {
    deletedAssetIds = [...deletedAssetIds, ...ids]
  }),
}))

vi.mock('../../db/templates.repo', () => ({
  upsertTemplate: (template: TemplateRecord) => upsertTemplate(template),
}))

vi.mock('../../features/agent/agent-images', async () => {
  const actual = await vi.importActual<typeof import('../../features/agent/agent-images')>('../../features/agent/agent-images')
  return {
    ...actual,
    createAgentImageAttachment: vi.fn(async (file: File) => ({
      id: `attachment_${file.name}`,
      assetId: `asset_${file.name}`,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      width: 64,
      height: 64,
    })),
    attachmentToFile: vi.fn(async (attachment) => new File(['image'], attachment.fileName, { type: attachment.mimeType })),
  }
})

vi.mock('../../db/agent-conversations.repo', () => ({
  listAgentConversations: vi.fn(async () => mockConversations),
  getAgentConversation: vi.fn(async (id = 'default') => mockConversations.find((item) => item.id === id)),
  createAgentConversation: vi.fn(async () => {
    const record = {
      id: `conversation_${mockConversations.length + 1}`,
      title: '新对话',
      messages: [],
      createdAt: '2026-06-20T00:00:00.000Z',
      updatedAt: `2026-06-20T00:00:0${mockConversations.length + 1}.000Z`,
    }
    mockConversations = [record, ...mockConversations]
    return record
  }),
  saveAgentConversation: vi.fn(async (messages: AgentChatMessage[], id = 'default', title?: string) => {
    const existing = mockConversations.find((item) => item.id === id)
    const record = {
      id,
      title: title ?? existing?.title,
      messages,
      createdAt: existing?.createdAt || '2026-06-20T00:00:00.000Z',
      updatedAt: '2026-06-20T00:01:00.000Z',
    }
    mockConversations = existing
      ? mockConversations.map((item) => (item.id === id ? record : item))
      : [record, ...mockConversations]
    if (id === 'default') savedMessages = messages
    return record
  }),
  clearAgentConversationMessages: vi.fn(async (id = 'default') => {
    const existing = mockConversations.find((item) => item.id === id)
    const record = {
      id,
      title: existing?.title,
      messages: [],
      createdAt: existing?.createdAt || '2026-06-20T00:00:00.000Z',
      updatedAt: '2026-06-20T00:02:00.000Z',
    }
    mockConversations = mockConversations.map((item) => (item.id === id ? record : item))
    if (id === 'default') savedMessages = []
    return record
  }),
  renameAgentConversation: vi.fn(async (id: string, title: string) => {
    const existing = mockConversations.find((item) => item.id === id)
    if (!existing) return undefined
    const record = { ...existing, title, updatedAt: '2026-06-20T00:03:00.000Z' }
    mockConversations = mockConversations.map((item) => (item.id === id ? record : item))
    return record
  }),
  deleteAgentConversation: vi.fn(async (id: string) => {
    mockConversations = mockConversations.filter((item) => item.id !== id)
  }),
}))

vi.mock('../../features/agent/useAgentChat', () => ({
  useAgentChatMutation: () => ({
    mutateAsync: chatMutateAsync,
    isPending: false,
  }),
}))

vi.mock('../../features/image/useGenerateImages', () => ({
  useGenerateImagesMutation: () => ({
    mutate: generateMutate,
    isPending: false,
  }),
}))

describe('AgentChatPanel', () => {
  afterEach(() => {
    cleanup()
    savedMessages = []
    mockConversations = []
    mockTemplates = []
    mockHistory = []
    deletedAssetIds = []
    generateMutate.mockReset()
    upsertTemplate.mockReset()
    chatMutateAsync.mockReset()
    chatMutateAsync.mockResolvedValue({
      reply: '已收到',
      proposedActions: undefined,
    })
    vi.restoreAllMocks()
    useWorkbenchStore.setState({
      prompt: '',
      negativePrompt: '',
      aspectRatio: '1:1',
      mode: 'generation',
      referenceImages: [],
      error: undefined,
    })
  })

  it('previews a form patch and applies it only after confirmation', async () => {
    savedMessages = [
      {
        id: 'message_1',
        role: 'assistant',
        content: '建议先改成海报构图。',
        createdAt: '2026-06-20T00:00:00.000Z',
        proposedActions: [
          {
            id: 'action_1',
            type: 'formPatch',
            title: '改成海报风格',
            payload: {
              formPatch: {
                prompt: '电影海报风格的未来城市',
                aspectRatio: '16:9',
              },
            },
            status: 'pending',
          },
        ],
      },
    ]
    syncDefaultConversation()

    render(<AgentChatPanel />)

    await screen.findByText('建议：电影海报风格的未来城市')
    expect(useWorkbenchStore.getState().prompt).toBe('')

    fireEvent.click(screen.getByRole('button', { name: '应用' }))

    await waitFor(() => {
      expect(useWorkbenchStore.getState().prompt).toBe('电影海报风格的未来城市')
      expect(useWorkbenchStore.getState().aspectRatio).toBe('16:9')
      expect(screen.getAllByText('已应用').length).toBeGreaterThan(0)
    })
  })

  it('applies generate action patches and submits the existing generation mutation', async () => {
    savedMessages = [
      {
        id: 'message_1',
        role: 'assistant',
        content: '这版可以生成。',
        createdAt: '2026-06-20T00:00:00.000Z',
        proposedActions: [
          {
            id: 'action_1',
            type: 'generate',
            title: '应用并生成',
            payload: {
              formPatch: {
                prompt: '未来城市天际线，清晨薄雾，电影感光线',
                negativePrompt: '模糊，低清晰度，水印，文字',
              },
            },
            status: 'pending',
          },
        ],
      },
    ]
    syncDefaultConversation()

    render(<AgentChatPanel />)

    fireEvent.click(await screen.findByRole('button', { name: '应用并生成' }))

    await waitFor(() => {
      expect(useWorkbenchStore.getState().prompt).toBe('未来城市天际线，清晨薄雾，电影感光线')
      expect(useWorkbenchStore.getState().negativePrompt).toBe('模糊，低清晰度，水印，文字')
      expect(generateMutate).toHaveBeenCalledTimes(1)
      expect(screen.getAllByText('已生成').length).toBeGreaterThan(0)
    })
  })

  it('restores persisted agent conversation on mount', async () => {
    savedMessages = [
      {
        id: 'message_1',
        role: 'assistant',
        content: '我会记住这次对话。',
        createdAt: '2026-06-20T00:00:00.000Z',
      },
    ]
    syncDefaultConversation()

    render(<AgentChatPanel />)

    expect(await screen.findByText('我会记住这次对话。')).toBeTruthy()
  })

  it('creates a new agent conversation without clearing the old one', async () => {
    savedMessages = [
      {
        id: 'message_1',
        role: 'assistant',
        content: '旧对话内容',
        createdAt: '2026-06-20T00:00:00.000Z',
      },
    ]
    syncDefaultConversation()

    render(<AgentChatPanel />)

    expect(await screen.findByText('旧对话内容')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '新对话' }))

    await waitFor(() => {
      expect(screen.queryByText('旧对话内容')).toBeNull()
      expect(mockConversations).toHaveLength(2)
      expect(mockConversations.find((item) => item.id === 'default')?.messages).toHaveLength(1)
    })
  })

  it('shows agent conversations only after opening history dialog', async () => {
    mockConversations = [
      {
        id: 'conversation_2',
        title: '第二个会话',
        messages: [],
        createdAt: '2026-06-20T00:01:00.000Z',
        updatedAt: '2026-06-20T00:01:00.000Z',
      },
      {
        id: 'default',
        title: '默认对话',
        messages: [],
        createdAt: '2026-06-20T00:00:00.000Z',
        updatedAt: '2026-06-20T00:00:00.000Z',
      },
    ]

    render(<AgentChatPanel />)

    expect(screen.queryByTestId('agent-conversation-history-list')).toBeNull()

    fireEvent.click(await screen.findByRole('button', { name: '我的会话' }))

    const list = await screen.findByTestId('agent-conversation-history-list')
    expect(within(list).getByText('第二个会话')).toBeTruthy()
    expect(within(list).getByText('默认对话')).toBeTruthy()
    expect(within(list).getByText('当前')).toBeTruthy()
  })

  it('switches between agent conversations without mixing messages', async () => {
    mockConversations = [
      {
        id: 'conversation_2',
        title: '第二个会话',
        messages: [
          {
            id: 'message_2',
            role: 'assistant',
            content: '第二个会话内容',
            createdAt: '2026-06-20T00:01:00.000Z',
          },
        ],
        createdAt: '2026-06-20T00:01:00.000Z',
        updatedAt: '2026-06-20T00:01:00.000Z',
      },
      {
        id: 'default',
        title: '默认对话',
        messages: [
          {
            id: 'message_1',
            role: 'assistant',
            content: '默认会话内容',
            createdAt: '2026-06-20T00:00:00.000Z',
          },
        ],
        createdAt: '2026-06-20T00:00:00.000Z',
        updatedAt: '2026-06-20T00:00:00.000Z',
      },
    ]

    render(<AgentChatPanel />)

    expect(await screen.findByText('第二个会话内容')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '我的会话' }))
    const list = await screen.findByTestId('agent-conversation-history-list')
    fireEvent.click(within(list).getByText('默认对话'))

    await waitFor(() => {
      expect(screen.getByText('默认会话内容')).toBeTruthy()
      expect(screen.queryByText('第二个会话内容')).toBeNull()
      expect(screen.queryByTestId('agent-conversation-history-list')).toBeNull()
    })
  })

  it('renames an agent conversation', async () => {
    savedMessages = []
    syncDefaultConversation()
    vi.spyOn(window, 'prompt').mockReturnValueOnce('新的会话标题')

    render(<AgentChatPanel />)

    fireEvent.click(await screen.findByRole('button', { name: '我的会话' }))
    const list = await screen.findByTestId('agent-conversation-history-list')
    fireEvent.click(within(list).getByTitle('重命名我的对话'))

    await waitFor(() => {
      expect(screen.getAllByText('新的会话标题').length).toBeGreaterThan(0)
      expect(mockConversations[0].title).toBe('新的会话标题')
    })
  })

  it('deletes an agent conversation and clears its image assets', async () => {
    mockConversations = [
      {
        id: 'conversation_1',
        title: '带图会话',
        messages: [
          {
            id: 'message_1',
            role: 'user',
            content: '看图',
            createdAt: '2026-06-20T00:00:00.000Z',
            attachments: [
              {
                id: 'attachment_1',
                assetId: 'asset_1',
                fileName: 'scene.png',
                mimeType: 'image/png',
                sizeBytes: 10,
              },
            ],
          },
        ],
        createdAt: '2026-06-20T00:00:00.000Z',
        updatedAt: '2026-06-20T00:00:00.000Z',
      },
      {
        id: 'conversation_2',
        title: '保留会话',
        messages: [],
        createdAt: '2026-06-20T00:01:00.000Z',
        updatedAt: '2026-06-20T00:01:00.000Z',
      },
    ]
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)

    render(<AgentChatPanel />)

    fireEvent.click(await screen.findByRole('button', { name: '我的会话' }))
    const row = await screen.findByTestId('agent-conversation-row-conversation_1')
    fireEvent.click(within(row).getByTitle('删除我的对话'))

    await waitFor(() => {
      expect(mockConversations.find((item) => item.id === 'conversation_1')).toBeUndefined()
      expect(deletedAssetIds).toEqual(['asset_1'])
    })
  })

  it('applies a template action after confirmation', async () => {
    mockTemplates = [
      {
        id: 'template_1',
        name: '电影海报',
        mode: 'generation',
        prompt: '模板提示词',
        negativePrompt: '模板负面词',
        aspectRatio: '16:9',
        resolutionTier: '1K',
        size: '1920x1080',
        quality: 'high',
        moderation: 'auto',
        count: 2,
        compressionRate: 0.8,
        outputFormat: 'png',
        createdAt: '2026-06-20T00:00:00.000Z',
        updatedAt: '2026-06-20T00:00:00.000Z',
      },
    ]
    savedMessages = [
      {
        id: 'message_1',
        role: 'assistant',
        content: '可以套这个模板。',
        createdAt: '2026-06-20T00:00:00.000Z',
        proposedActions: [
          {
            id: 'action_1',
            type: 'applyTemplate',
            title: '应用电影海报模板',
            payload: { templateId: 'template_1' },
            status: 'pending',
          },
        ],
      },
    ]
    syncDefaultConversation()

    render(<AgentChatPanel />)

    fireEvent.click(await screen.findByRole('button', { name: '应用模板' }))

    await waitFor(() => {
      expect(useWorkbenchStore.getState()).toMatchObject({
        prompt: '模板提示词',
        negativePrompt: '模板负面词',
        aspectRatio: '16:9',
        count: 2,
      })
      expect(screen.getAllByText('已应用').length).toBeGreaterThan(0)
    })
  })

  it('saves a createTemplate action as a user template after confirmation', async () => {
    useWorkbenchStore.setState({
      prompt: '当前提示词',
      negativePrompt: '当前负面词',
      aspectRatio: '1:1',
      resolutionTier: '1K',
      count: 1,
    })
    savedMessages = [
      {
        id: 'message_1',
        role: 'assistant',
        content: '可以把这套方案保存成模板。',
        createdAt: '2026-06-20T00:00:00.000Z',
        proposedActions: [
          {
            id: 'action_1',
            type: 'createTemplate',
            title: '保存海报模板',
            payload: {
              name: 'Agent 海报模板',
              description: '保存 Agent 方案',
              formPatch: {
                prompt: 'Agent 模板提示词',
                aspectRatio: '16:9',
                count: 2,
              },
            },
            status: 'pending',
          },
        ],
      },
    ]
    syncDefaultConversation()

    render(<AgentChatPanel />)

    expect(await screen.findByText('我的模板：Agent 海报模板')).toBeTruthy()
    expect(screen.getByText('给自己的描述：保存 Agent 方案')).toBeTruthy()
    expect(upsertTemplate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '保存为我的模板' }))

    await waitFor(() => {
      expect(upsertTemplate).toHaveBeenCalledTimes(1)
      expect(upsertTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'user',
          name: 'Agent 海报模板',
          description: '保存 Agent 方案',
          prompt: 'Agent 模板提示词',
          negativePrompt: '当前负面词',
          aspectRatio: '16:9',
          resolutionTier: '1K',
          size: '1920x1080',
          count: 2,
        }),
      )
      expect(screen.getAllByText('已保存').length).toBeGreaterThan(0)
    })
  })

  it('shows a history result action after confirmation', async () => {
    mockHistory = [
      {
        id: 'history_1',
        mode: 'generation',
        prompt: '历史提示词',
        negativePrompt: '历史负面词',
        params: {
          aspectRatio: '16:9',
          resolutionTier: '1K',
          size: '1920x1080',
          quality: 'high',
          moderation: 'auto',
          count: 1,
          compressionRate: 0.8,
          outputFormat: 'png',
        },
        status: 'success',
        total: 1,
        success: 1,
        failed: 0,
        slowestMs: 1200,
        startedAt: '2026-06-20T00:00:00.000Z',
        finishedAt: '2026-06-20T00:00:02.000Z',
        durationMs: 2000,
        results: [
          {
            id: 'result_1',
            jobIndex: 0,
            status: 'success',
            url: 'https://example.com/a.png',
            durationMs: 1200,
          },
        ],
      },
    ]
    savedMessages = [
      {
        id: 'message_1',
        role: 'assistant',
        content: '可以展示这条历史。',
        createdAt: '2026-06-20T00:00:00.000Z',
        proposedActions: [
          {
            id: 'action_1',
            type: 'showHistoryResult',
            title: '展示最近成功历史',
            payload: { historyId: 'history_1' },
            status: 'pending',
          },
        ],
      },
    ]
    syncDefaultConversation()

    render(<AgentChatPanel />)

    fireEvent.click(await screen.findByRole('button', { name: '展示历史' }))

    await waitFor(() => {
      expect(useWorkbenchStore.getState().prompt).toBe('历史提示词')
      expect(useWorkbenchStore.getState().batches[0]).toMatchObject({
        source: 'history',
        historyRecordId: 'history_1',
      })
      expect(screen.getAllByText('已展示').length).toBeGreaterThan(0)
    })
  })

  it('uploads images as message attachments without requiring text', async () => {
    render(<AgentChatPanel />)

    const input = screen.getByTestId('agent-file-input') as HTMLInputElement
    const file = new File(['image'], 'scene.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('scene.png')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => {
      expect(mockConversations[0].messages[0]).toMatchObject({
        role: 'user',
        content: '',
        attachments: [
          {
            fileName: 'scene.png',
            mimeType: 'image/png',
            width: 64,
            height: 64,
          },
        ],
      })
    })
  })

  it('asks for confirmation before sending large images to Agent', async () => {
    render(<AgentChatPanel />)

    const input = screen.getByTestId('agent-file-input') as HTMLInputElement
    const largeFile = new File([new Uint8Array(11 * 1024 * 1024)], 'large.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [largeFile] } })

    await screen.findByText('large.png')
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('超过 10MB'))
    expect(chatMutateAsync).not.toHaveBeenCalled()
  })

  it('opens a preview dialog for pending agent images', async () => {
    render(<AgentChatPanel />)

    const input = screen.getByTestId('agent-file-input') as HTMLInputElement
    const file = new File(['image'], 'pending.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    await screen.findByText('pending.png')
    fireEvent.click(screen.getAllByTitle('预览图片')[0])

    expect(await screen.findByRole('heading', { name: '图片预览' })).toBeTruthy()
    expect(screen.getAllByText('pending.png').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '图片预览' })).toBeNull()
      expect(screen.getByText('pending.png')).toBeTruthy()
    })
  })

  it('adds dragged images as pending agent attachments', async () => {
    render(<AgentChatPanel />)

    const file = new File(['image'], 'dragged.webp', { type: 'image/webp' })
    fireEvent.drop(screen.getByTestId('agent-image-dropzone'), {
      dataTransfer: {
        files: [file],
        items: [
          {
            kind: 'file',
            type: file.type,
            getAsFile: () => file,
          },
        ],
        types: ['Files'],
      },
    })

    expect(await screen.findByText('dragged.webp')).toBeTruthy()
    expect(createAgentImageAttachment).toHaveBeenCalledWith(file)
  })

  it('rejects GIF images in agent chat uploads', async () => {
    render(<AgentChatPanel />)

    const input = screen.getByTestId('agent-file-input') as HTMLInputElement
    const file = new File(['image'], 'animated.gif', { type: 'image/gif' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(useWorkbenchStore.getState().error).toBe('请选择 PNG、JPEG 或 WEBP 图片')
      expect(screen.queryByText('animated.gif')).toBeNull()
    })
  })

  it('limits one agent message to eight images', async () => {
    render(<AgentChatPanel />)

    const input = screen.getByTestId('agent-file-input') as HTMLInputElement
    const files = Array.from({ length: 10 }, (_, index) => new File(['image'], `scene-${index}.png`, { type: 'image/png' }))
    fireEvent.change(input, { target: { files } })

    await screen.findByText('scene-7.png')
    expect(screen.queryByText('scene-8.png')).toBeNull()
    expect(useWorkbenchStore.getState().error).toContain('最多上传 8 张图片')
  })

  it('adds a persisted agent image to edit reference images', async () => {
    savedMessages = [
      {
        id: 'message_1',
        role: 'user',
        content: '分析这张图',
        createdAt: '2026-06-20T00:00:00.000Z',
        attachments: [
          {
            id: 'attachment_1',
            assetId: 'asset_1',
            fileName: 'scene.png',
            mimeType: 'image/png',
            sizeBytes: 10,
          },
        ],
      },
    ]
    syncDefaultConversation()

    render(<AgentChatPanel />)

    fireEvent.click(await screen.findByTitle('加入参考图'))

    await waitFor(() => {
      expect(useWorkbenchStore.getState().mode).toBe('edit')
      expect(useWorkbenchStore.getState().referenceImages[0].file.name).toBe('scene.png')
    })
  })

  it('previews a persisted agent image and keeps add-reference available', async () => {
    savedMessages = [
      {
        id: 'message_1',
        role: 'user',
        content: '分析这张图',
        createdAt: '2026-06-20T00:00:00.000Z',
        attachments: [
          {
            id: 'attachment_1',
            assetId: 'asset_1',
            fileName: 'scene.png',
            mimeType: 'image/png',
            sizeBytes: 10,
            width: 64,
            height: 64,
          },
        ],
      },
    ]
    syncDefaultConversation()

    render(<AgentChatPanel />)

    await screen.findByText('scene.png')
    fireEvent.click(screen.getAllByTitle('预览图片')[0])

    expect(await screen.findByRole('heading', { name: '图片预览' })).toBeTruthy()
    expect(screen.getByText(/scene\.png · 64x64/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    fireEvent.click(await screen.findByTitle('加入参考图'))

    await waitFor(() => {
      expect(useWorkbenchStore.getState().mode).toBe('edit')
      expect(useWorkbenchStore.getState().referenceImages[0].file.name).toBe('scene.png')
    })
  })

  it('clears conversation images from local assets', async () => {
    savedMessages = [
      {
        id: 'message_1',
        role: 'user',
        content: '分析这张图',
        createdAt: '2026-06-20T00:00:00.000Z',
        attachments: [
          {
            id: 'attachment_1',
            assetId: 'asset_1',
            fileName: 'scene.png',
            mimeType: 'image/png',
            sizeBytes: 10,
          },
        ],
      },
    ]
    syncDefaultConversation()

    render(<AgentChatPanel />)

    fireEvent.click(await screen.findByRole('button', { name: '清空当前对话' }))

    await waitFor(() => {
      expect(savedMessages).toEqual([])
      expect(deletedAssetIds).toEqual(['asset_1'])
    })
  })
})
