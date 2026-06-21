import { Check, Edit3, Eye, History, ImagePlus, Loader2, MessageSquarePlus, Paperclip, Play, SendHorizontal, Sparkles, Trash2, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { deleteAssets } from '../../db/assets.repo'
import { upsertTemplate } from '../../db/templates.repo'
import {
  clearAgentConversationMessages,
  createAgentConversation,
  deleteAgentConversation,
  getAgentConversation,
  listAgentConversations,
  renameAgentConversation,
  saveAgentConversation,
} from '../../db/agent-conversations.repo'
import { db } from '../../db/db'
import {
  applyFormPatch,
  formSnapshotFromStore,
  getActionFormPatch,
  getActionHistoryId,
  getActionTemplateDraft,
  getActionTemplateId,
  getFormPatchChanges,
  historyToFormPatch,
  templateToFormPatch,
  type AgentActionChange,
} from '../../features/agent/agent-actions'
import {
  AGENT_IMAGE_MIME_TYPES,
  LARGE_AGENT_IMAGE_BYTES,
  MAX_AGENT_MESSAGE_IMAGES,
  attachmentToFile,
  createAgentImageAttachment,
  getAttachmentAssetIds,
  isSupportedAgentImage,
} from '../../features/agent/agent-images'
import { useAgentChatMutation } from '../../features/agent/useAgentChat'
import { useGenerateImagesMutation } from '../../features/image/useGenerateImages'
import { toAppError } from '../../lib/errors'
import { nowIso } from '../../lib/time'
import { createId } from '../../lib/uid'
import { cn } from '../../lib/cn'
import { useWorkbenchStore } from '../../store/workbench.store'
import type { AgentChatMessage, AgentConversationRecord, AgentImageAttachment, AgentProposedAction } from '../../types/api'
import type { HistoryRecord } from '../../types/history'
import type { TemplateRecord } from '../../types/template'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ImagePreviewDialog, type ImagePreviewData } from './ImagePreviewDialog'

type AgentImagePreviewData = ImagePreviewData & { revokeOnClose?: boolean }

export function AgentChatPanel() {
  const [conversations, setConversations] = useState<AgentConversationRecord[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string>()
  const [messages, setMessages] = useState<AgentChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<AgentImageAttachment[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [imagePreview, setImagePreview] = useState<AgentImagePreviewData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const setError = useWorkbenchStore((state) => state.setError)
  const addReferenceFiles = useWorkbenchStore((state) => state.addReferenceFiles)
  const setMode = useWorkbenchStore((state) => state.setMode)
  const templates = useLiveQuery(() => db.templates.orderBy('updatedAt').reverse().toArray(), [], [])
  const history = useLiveQuery(() => db.history.orderBy('startedAt').reverse().limit(80).toArray(), [], [])
  const chatMutation = useAgentChatMutation()
  const generateMutation = useGenerateImagesMutation()
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId)
  const dropzone = useDropzone({
    accept: Object.fromEntries(AGENT_IMAGE_MIME_TYPES.map((type) => [type, []])),
    multiple: true,
    noClick: true,
    noKeyboard: true,
    onDrop: (files) => {
      void handleFiles(files)
    },
    onDropRejected: () => {
      setError('请选择 PNG、JPEG 或 WEBP 图片')
    },
  })

  useEffect(() => {
    let alive = true
    async function initializeConversations() {
      let records = await listAgentConversations()
      if (records.length === 0) {
        records = [await createAgentConversation()]
      }
      if (!alive) return
      const active = records[0]
      setConversations(records)
      setActiveConversationId(active.id)
      setMessages(active.messages || [])
      setLoaded(true)
    }
    void initializeConversations()
    return () => {
      alive = false
    }
  }, [])

  async function persistMessages(nextMessages: AgentChatMessage[]) {
    if (!activeConversationId) return
    setMessages(nextMessages)
    const saved = await saveAgentConversation(nextMessages, activeConversationId, getConversationTitle(activeConversation, nextMessages))
    setConversations((current) => sortConversations(current.map((item) => (item.id === saved.id ? saved : item))))
  }

  async function switchConversation(id: string) {
    if (id === activeConversationId) return
    const conversation = await getAgentConversation(id)
    if (!conversation) return
    setActiveConversationId(conversation.id)
    setMessages(conversation.messages || [])
    setPendingAttachments([])
    setDraft('')
  }

  async function handleSelectConversation(id: string) {
    await switchConversation(id)
    setHistoryOpen(false)
  }

  async function handleNewConversation() {
    const conversation = await createAgentConversation()
    setConversations((current) => [conversation, ...current])
    setActiveConversationId(conversation.id)
    setMessages([])
    setPendingAttachments([])
    setDraft('')
    setHistoryOpen(false)
  }

  async function handleRenameConversation(conversation: AgentConversationRecord) {
    const nextTitle = prompt('重命名我的对话', conversation.title || getConversationTitle(conversation, conversation.messages))
    if (nextTitle === null) return
    const renamed = await renameAgentConversation(conversation.id, nextTitle)
    if (!renamed) return
    setConversations((current) => sortConversations(current.map((item) => (item.id === renamed.id ? renamed : item))))
  }

  async function handleClearConversation() {
    if (!activeConversationId) return
    await deleteAssets(getAttachmentAssetIds(messages))
    const saved = await clearAgentConversationMessages(activeConversationId)
    setMessages([])
    setPendingAttachments([])
    setConversations((current) => sortConversations(current.map((item) => (item.id === saved.id ? saved : item))))
  }

  async function handleDeleteConversation(conversation: AgentConversationRecord) {
    if (!confirm(`确定删除「${conversation.title || getConversationTitle(conversation, conversation.messages)}」？`)) return
    await deleteAssets(getAttachmentAssetIds(conversation.messages || []))
    await deleteAgentConversation(conversation.id)
    const remaining = conversations.filter((item) => item.id !== conversation.id)
    if (remaining.length === 0) {
      const created = await createAgentConversation()
      setConversations([created])
      setActiveConversationId(created.id)
      setMessages([])
      setPendingAttachments([])
      setDraft('')
      return
    }
    const nextActive = conversation.id === activeConversationId ? sortConversations(remaining)[0] : activeConversation
    setConversations(sortConversations(remaining))
    if (nextActive) {
      setActiveConversationId(nextActive.id)
      setMessages(nextActive.messages || [])
      setPendingAttachments([])
      setDraft('')
    }
  }

  async function handleSend() {
    const content = draft.trim()
    if ((!content && pendingAttachments.length === 0) || chatMutation.isPending) return
    const largeAttachments = pendingAttachments.filter((attachment) => attachment.sizeBytes > LARGE_AGENT_IMAGE_BYTES)
    if (largeAttachments.length > 0) {
      const totalMb = largeAttachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0) / 1024 / 1024
      const ok = confirm(`你这次有 ${largeAttachments.length} 张图片超过 10MB，发送给 Agent 时会转为 base64，可能较慢并增加请求体积。约 ${totalMb.toFixed(1)}MB，确定发送吗？`)
      if (!ok) return
    }

    const userMessage: AgentChatMessage = {
      id: createId('chat'),
      role: 'user',
      content,
      createdAt: nowIso(),
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
    }
    const nextMessages = [...messages, userMessage]

    setError(undefined)
    setDraft('')
    setPendingAttachments([])
    await persistMessages(nextMessages)

    try {
      const response = await chatMutation.mutateAsync({
        messages: nextMessages.slice(-12),
        formSnapshot: formSnapshotFromStore(useWorkbenchStore.getState()),
        templates,
        history,
      })
      const assistantMessage: AgentChatMessage = {
        id: createId('chat'),
        role: 'assistant',
        content: response.reply,
        createdAt: nowIso(),
        proposedActions: response.proposedActions,
      }
      await persistMessages([...nextMessages, assistantMessage])
    } catch (error) {
      setError(toAppError(error).message)
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const remaining = MAX_AGENT_MESSAGE_IMAGES - pendingAttachments.length
    if (remaining <= 0) {
      setError(`你每条 Agent 消息最多上传 ${MAX_AGENT_MESSAGE_IMAGES} 张图片`)
      return
    }

    const uniqueFiles = dedupeFiles(Array.from(files))
    const accepted = uniqueFiles.filter(isSupportedAgentImage).slice(0, remaining)
    if (accepted.length === 0) {
      setError('请选择 PNG、JPEG 或 WEBP 图片')
      return
    }
    if (uniqueFiles.length > accepted.length) {
      setError(`你每条 Agent 消息最多上传 ${MAX_AGENT_MESSAGE_IMAGES} 张图片，已保留前 ${accepted.length} 张可用图片`)
    } else {
      setError(undefined)
    }

    const attachments = await Promise.all(accepted.map((file) => createAgentImageAttachment(file)))
    setPendingAttachments((current) => [...current, ...attachments])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function removePendingAttachment(attachment: AgentImageAttachment) {
    await deleteAssets([attachment.assetId])
    setPendingAttachments((current) => current.filter((item) => item.id !== attachment.id))
  }

  async function handleAddReference(attachment: AgentImageAttachment) {
    const file = await attachmentToFile(attachment)
    if (!file) {
      setError('这张图片的本地文件不存在，可能已被清理')
      return
    }
    addReferenceFiles([file])
    setMode('edit')
    setError(undefined)
  }

  function closeImagePreview() {
    if (imagePreview?.revokeOnClose) URL.revokeObjectURL(imagePreview.src)
    setImagePreview(null)
  }

  async function updateAction(messageId: string, actionId: string, patch: Partial<AgentProposedAction>) {
    const nextMessages = messages.map((message) => {
      if (message.id !== messageId) return message
      return {
        ...message,
        proposedActions: message.proposedActions?.map((action) =>
          action.id === actionId ? { ...action, ...patch } : action,
        ),
      }
    })
    await persistMessages(nextMessages)
  }

  async function executeAction(messageId: string, action: AgentProposedAction) {
    const store = useWorkbenchStore.getState()
    setError(undefined)

    try {
      if (action.type === 'formPatch') {
        applyFormPatch(getActionFormPatch(action), store)
        await updateAction(messageId, action.id, { status: 'applied', error: undefined })
        return
      }

      if (action.type === 'generate') {
        applyFormPatch(getActionFormPatch(action), store)
        generateMutation.mutate()
        await updateAction(messageId, action.id, { status: 'generated', error: undefined })
        return
      }

      if (action.type === 'applyTemplate') {
        const template = templates.find((item) => item.id === getActionTemplateId(action))
        if (!template) throw new Error('未找到这个模板')
        store.applyTemplate(template)
        await updateAction(messageId, action.id, { status: 'applied', error: undefined })
        return
      }

      if (action.type === 'createTemplate') {
        await upsertTemplate(getActionTemplateDraft(action, store))
        await updateAction(messageId, action.id, { status: 'saved', error: undefined })
        return
      }

      if (action.type === 'showHistoryResult') {
        const record = history.find((item) => item.id === getActionHistoryId(action))
        if (!record) throw new Error('未找到你的这条历史')
        store.applyHistory(record)
        store.showHistoryResult(record)
        await updateAction(messageId, action.id, { status: 'shown', error: undefined })
        return
      }

      await updateAction(messageId, action.id, { status: 'shown', error: undefined })
    } catch (error) {
      const appError = toAppError(error)
      setError(appError.message)
      await updateAction(messageId, action.id, { status: 'failed', error: appError.message })
    }
  }

  return (
    <div
      {...dropzone.getRootProps()}
      data-testid="agent-image-dropzone"
      className={cn(
        'grid gap-4 rounded-2xl p-4 pt-1 transition',
        dropzone.isDragActive ? 'bg-primary/5 ring-2 ring-primary/25' : 'ring-0',
      )}
    >
      <input {...dropzone.getInputProps()} className="hidden" />
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">我的 Agent</p>
            <p className="mt-1 truncate text-sm font-semibold">
              {activeConversation ? getConversationTitle(activeConversation, activeConversation.messages) : '新对话'}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{messages.length} 条消息</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={handleNewConversation}>
              <MessageSquarePlus className="h-4 w-4" />
              新对话
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4" />
              我的会话
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={handleClearConversation} disabled={messages.length === 0}>
              <Trash2 className="h-4 w-4" />
              清空当前对话
            </Button>
          </div>
        </div>
      </div>

      <ConversationHistoryDialog
        open={historyOpen}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onOpenChange={setHistoryOpen}
        onSelect={(id) => {
          void handleSelectConversation(id)
        }}
        onRename={(conversation) => {
          void handleRenameConversation(conversation)
        }}
        onDelete={(conversation) => {
          void handleDeleteConversation(conversation)
        }}
      />

      <div className="scrollbar-none grid max-h-[560px] min-h-72 content-start gap-3 overflow-y-auto rounded-xl bg-muted/35 p-3">
        {!loaded ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            正在载入你的对话
          </div>
        ) : messages.length === 0 ? (
          <div className="grid place-items-center text-sm text-muted-foreground">还没有对话</div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              templates={templates}
              history={history}
              onAddReference={handleAddReference}
              onPreviewImage={setImagePreview}
              onExecute={(action) => executeAction(message.id, action)}
            />
          ))
        )}
        {chatMutation.isPending ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Agent 正在为你回复
          </div>
        ) : null}
      </div>

      <div className="grid gap-2">
        {pendingAttachments.length > 0 ? (
          <AttachmentStrip
            attachments={pendingAttachments}
            variant="pending"
            onRemove={removePendingAttachment}
            onPreview={setImagePreview}
          />
        ) : null}
        <Textarea
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              void handleSend()
            }
          }}
          placeholder="让 Agent 帮你改提示词、套个人模板、复用历史或解释失败原因"
        />
        <div className="flex items-center justify-between gap-2">
          <div>
            <input
              ref={fileInputRef}
              data-testid="agent-file-input"
              type="file"
              accept={AGENT_IMAGE_MIME_TYPES.join(',')}
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) void handleFiles(event.target.files)
              }}
            />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-4 w-4" />
              上传图片
            </Button>
          </div>
          <Button type="button" onClick={handleSend} disabled={(!draft.trim() && pendingAttachments.length === 0) || chatMutation.isPending}>
            {chatMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            {chatMutation.isPending ? '发送中' : '发送'}
          </Button>
        </div>
      </div>
      <ImagePreviewDialog preview={imagePreview} onClose={closeImagePreview} />
    </div>
  )
}

function ConversationHistoryDialog({
  open,
  conversations,
  activeConversationId,
  onOpenChange,
  onSelect,
  onRename,
  onDelete,
}: {
  open: boolean
  conversations: AgentConversationRecord[]
  activeConversationId?: string
  onOpenChange: (open: boolean) => void
  onSelect: (id: string) => void
  onRename: (conversation: AgentConversationRecord) => void
  onDelete: (conversation: AgentConversationRecord) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[82svh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>我的 Agent 会话</DialogTitle>
          <DialogDescription>切换、重命名或删除你保存在本机的 Agent 对话。</DialogDescription>
        </DialogHeader>
        <div data-testid="agent-conversation-history-list" className="scrollbar-none grid max-h-[60svh] gap-2 overflow-y-auto pr-1">
          {sortConversations(conversations).map((conversation) => {
            const active = conversation.id === activeConversationId
            return (
              <div
                key={conversation.id}
                data-testid={`agent-conversation-row-${conversation.id}`}
                className={cn(
                  'flex items-center gap-3 rounded-xl bg-muted/45 p-3 transition hover:bg-muted/70',
                  active ? 'ring-1 ring-primary/30' : 'ring-1 ring-transparent',
                )}
              >
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(conversation.id)}>
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-semibold">{conversation.title || getConversationTitle(conversation, conversation.messages)}</p>
                    {active ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">当前</span> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {conversation.messages.length} 条消息 · {formatConversationTime(conversation.updatedAt)}
                  </p>
                </button>
                <Button type="button" size="icon-xs" variant="ghost" title="重命名我的对话" onClick={() => onRename(conversation)}>
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="icon-xs" variant="ghost" title="删除我的对话" onClick={() => onDelete(conversation)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MessageBubble({
  message,
  templates,
  history,
  onAddReference,
  onPreviewImage,
  onExecute,
}: {
  message: AgentChatMessage
  templates: TemplateRecord[]
  history: HistoryRecord[]
  onAddReference: (attachment: AgentImageAttachment) => void
  onPreviewImage: (preview: AgentImagePreviewData) => void
  onExecute: (action: AgentProposedAction) => void
}) {
  const isUser = message.role === 'user'

  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          isUser
            ? 'max-w-[88%] rounded-lg bg-primary px-3 py-2 text-sm leading-6 text-primary-foreground'
            : 'max-w-[94%] rounded-lg bg-card px-3 py-2 text-sm leading-6 shadow-sm ring-1 ring-border/60'
        }
      >
        {message.content ? <p className="whitespace-pre-wrap">{message.content}</p> : null}
        {message.attachments?.length ? (
          <AttachmentStrip attachments={message.attachments} variant="message" onAddReference={onAddReference} onPreview={onPreviewImage} />
        ) : null}
        {message.proposedActions?.length ? (
          <div className="mt-3 grid gap-3">
            {message.proposedActions.map((action) => (
              <AgentActionCard
                key={action.id}
                action={action}
                templates={templates}
                history={history}
                onExecute={() => onExecute(action)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function AttachmentStrip({
  attachments,
  variant,
  onRemove,
  onAddReference,
  onPreview,
}: {
  attachments: AgentImageAttachment[]
  variant: 'pending' | 'message'
  onRemove?: (attachment: AgentImageAttachment) => void
  onAddReference?: (attachment: AgentImageAttachment) => void
  onPreview: (preview: AgentImagePreviewData) => void
}) {
  return (
    <div className={variant === 'pending' ? 'grid grid-cols-4 gap-2 md:grid-cols-8' : 'mt-3 grid grid-cols-2 gap-2 md:grid-cols-4'}>
      {attachments.map((attachment) => (
        <AttachmentPreview
          key={attachment.id}
          attachment={attachment}
          variant={variant}
          onRemove={onRemove}
          onAddReference={onAddReference}
          onPreview={onPreview}
        />
      ))}
    </div>
  )
}

function AttachmentPreview({
  attachment,
  variant,
  onRemove,
  onAddReference,
  onPreview,
}: {
  attachment: AgentImageAttachment
  variant: 'pending' | 'message'
  onRemove?: (attachment: AgentImageAttachment) => void
  onAddReference?: (attachment: AgentImageAttachment) => void
  onPreview: (preview: AgentImagePreviewData) => void
}) {
  const asset = useLiveQuery(() => db.assets.get(attachment.assetId), [attachment.assetId])
  const imageUrl = useMemo(() => (asset ? URL.createObjectURL(asset.blob) : ''), [asset])

  function openPreview() {
    if (!asset) return
    onPreview({
      src: URL.createObjectURL(asset.blob),
      title: '图片预览',
      fileName: attachment.fileName,
      width: attachment.width,
      height: attachment.height,
      revokeOnClose: true,
    })
  }

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  return (
    <div className="group relative overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border/60">
      {imageUrl ? (
        <button
          type="button"
          className="block w-full"
          title="预览图片"
          onClick={openPreview}
        >
          <img src={imageUrl} alt={attachment.fileName} className="aspect-square w-full object-cover" />
        </button>
      ) : (
        <div className="grid aspect-square place-items-center text-xs text-muted-foreground">图片已清理</div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-slate-950/75 px-2 py-1.5">
        <p className="truncate text-xs text-white">{attachment.fileName}</p>
        {attachment.width && attachment.height ? <p className="text-[10px] text-slate-200">{attachment.width}x{attachment.height}</p> : null}
      </div>
      <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
        {imageUrl ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            title="预览图片"
            onClick={openPreview}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ) : null}
        {variant === 'pending' ? (
          <Button type="button" size="icon" variant="secondary" title="移除图片" onClick={() => onRemove?.(attachment)}>
            <X className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" size="icon" variant="secondary" title="加入参考图" onClick={() => onAddReference?.(attachment)}>
            <ImagePlus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

function AgentActionCard({
  action,
  templates,
  history,
  onExecute,
}: {
  action: AgentProposedAction
  templates: TemplateRecord[]
  history: HistoryRecord[]
  onExecute: () => void
}) {
  const state = useWorkbenchStore()
  const isDone = action.status !== 'pending'
  const patch = getPreviewPatch(action, templates, history)
  const changes = patch ? getFormPatchChanges(patch, state) : []

  return (
    <div className="grid gap-3 rounded-xl bg-accent/35 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">{action.title}</p>
          {action.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.description}</p> : null}
        </div>
        {action.type === 'explain' ? <StatusLabel status={action.status} /> : <ActionButton action={action} onExecute={onExecute} />}
      </div>

      {action.type === 'explain' ? null : <ActionPreview action={action} changes={changes} templates={templates} history={history} />}

      {action.error ? <p className="text-xs text-destructive">{action.error}</p> : null}
      {isDone && action.type !== 'explain' ? <StatusLabel status={action.status} /> : null}
    </div>
  )
}

function ActionButton({ action, onExecute }: { action: AgentProposedAction; onExecute: () => void }) {
  const labels: Record<AgentProposedAction['type'], string> = {
    formPatch: '应用',
    generate: '应用并生成',
    applyTemplate: '应用模板',
    showHistoryResult: '展示历史',
    createTemplate: '保存为我的模板',
    explain: '知道了',
  }
  const done = action.status !== 'pending'

  return (
    <Button type="button" size="sm" variant={done ? 'secondary' : 'default'} onClick={onExecute} disabled={done}>
      {action.type === 'generate' ? <Play className="h-4 w-4" /> : action.type === 'showHistoryResult' ? <History className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      {done ? doneLabel(action.status) : labels[action.type]}
    </Button>
  )
}

function ActionPreview({
  action,
  changes,
  templates,
  history,
}: {
  action: AgentProposedAction
  changes: AgentActionChange[]
  templates: TemplateRecord[]
  history: HistoryRecord[]
}) {
  if (action.type === 'applyTemplate') {
    const template = templates.find((item) => item.id === getActionTemplateId(action))
    return <p className="text-xs">要使用的模板：{template ? template.name : '未找到模板'}</p>
  }

  if (action.type === 'showHistoryResult') {
    const record = history.find((item) => item.id === getActionHistoryId(action))
    return <p className="text-xs">我的历史：{record ? `${record.status}，成功 ${record.success}/${record.total}` : '未找到这条历史'}</p>
  }

  if (action.type === 'createTemplate') {
    const draft = getActionTemplateDraft(action, useWorkbenchStore.getState())
    return (
      <div className="grid gap-2 text-xs">
        <p>我的模板：{draft.name}</p>
        {draft.description ? <p className="text-muted-foreground">给自己的描述：{draft.description}</p> : null}
        {changes.length === 0 ? <p className="text-slate-500 dark:text-slate-400">将按你当前表单保存为个人模板。</p> : null}
      </div>
    )
  }

  if (changes.length === 0) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">没有可预览的表单改动。</p>
  }

  return (
    <div className="grid gap-2">
      {changes.map((change) => (
        <div key={change.field} className="grid gap-1 rounded-lg bg-background/80 p-2 text-xs">
          <p className="font-semibold text-sky-900 dark:text-sky-100">{change.label}</p>
          <p className="whitespace-pre-wrap text-slate-500 dark:text-slate-400">当前：{change.before}</p>
          <p className="whitespace-pre-wrap text-slate-800 dark:text-slate-100">建议：{change.after}</p>
        </div>
      ))}
    </div>
  )
}

function StatusLabel({ status }: { status: AgentProposedAction['status'] }) {
  if (status === 'pending') return null
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
      <Check className="h-3.5 w-3.5" />
      {doneLabel(status)}
    </span>
  )
}

function doneLabel(status: AgentProposedAction['status']) {
  const labels: Record<AgentProposedAction['status'], string> = {
    pending: '待确认',
    applied: '已应用',
    generated: '已生成',
    shown: '已展示',
    saved: '已保存',
    failed: '失败',
  }
  return labels[status]
}

function getConversationTitle(conversation: AgentConversationRecord | undefined, messages: AgentChatMessage[]) {
  if (conversation?.title) return conversation.title
  const firstUserMessage = messages.find((message) => message.role === 'user' && message.content.trim())
  const title = firstUserMessage?.content.trim() || messages[0]?.content.trim()
  return title ? title.slice(0, 24) : '新对话'
}

function sortConversations(conversations: AgentConversationRecord[]) {
  return [...conversations].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

function formatConversationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dedupeFiles(files: File[]) {
  const seen = new Set<string>()
  return files.filter((file) => {
    const key = `${file.name}:${file.type}:${file.size}:${file.lastModified}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getPreviewPatch(action: AgentProposedAction, templates: TemplateRecord[], history: HistoryRecord[]) {
  if (action.type === 'formPatch' || action.type === 'generate' || action.type === 'createTemplate') return getActionFormPatch(action)
  if (action.type === 'applyTemplate') {
    const template = templates.find((item) => item.id === getActionTemplateId(action))
    return template ? templateToFormPatch(template) : undefined
  }
  if (action.type === 'showHistoryResult') {
    const record = history.find((item) => item.id === getActionHistoryId(action))
    return record ? historyToFormPatch(record) : undefined
  }
  return undefined
}
