import { ChevronDown, ChevronRight, Plus, Save, Trash2 } from 'lucide-react'
import { useMemo, useState, memo } from 'react'
import { deleteTemplate, upsertTemplate } from '../../db/templates.repo'
import { useTemplates } from '../../features/templates/useTemplates'
import { getImageSize } from '../../lib/constants'
import { nowIso } from '../../lib/time'
import { createId } from '../../lib/uid'
import { useWorkbenchStore } from '../../store/workbench.store'
import type { TemplateRecord } from '../../types/template'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '../workbench/empty-state'

export function SidebarTemplates() {
  const templates = useTemplates()
  const applyTemplate = useWorkbenchStore((store) => store.applyTemplate)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemOpen, setSystemOpen] = useState(false)
  const userTemplates = useMemo(() => templates.filter((template) => template.source !== 'system'), [templates])
  const systemTemplates = useMemo(() => templates.filter((template) => template.source === 'system'), [templates])

  async function saveTemplate() {
    const state = useWorkbenchStore.getState()
    const now = nowIso()
    const template: TemplateRecord = {
      id: createId('template'),
      source: 'user',
      name: name.trim() || `我的模板 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
      description: description.trim() || undefined,
      mode: state.mode,
      imageModelFamily: state.imageModelFamily,
      imageModel: state.imageModel,
      prompt: state.prompt,
      negativePrompt: state.negativePrompt || undefined,
      aspectRatio: state.aspectRatio,
      resolutionTier: state.resolutionTier,
      size: getImageSize(state.aspectRatio, state.resolutionTier),
      quality: state.quality,
      moderation: state.moderation,
      count: state.count,
      compressionRate: state.compressionRate,
      outputFormat: state.outputFormat,
      createdAt: now,
      updatedAt: now,
    }

    await upsertTemplate(template)
    setName('')
    setDescription('')
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 rounded-xl bg-muted/35 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">保存个人模板</p>
          <Button type="button" size="icon-sm" variant="ghost" title="保存当前参数为个人模板" onClick={saveTemplate}>
            <Save className="h-4 w-4" />
          </Button>
        </div>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="我的模板名称" />
        <Textarea rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="给自己看的模板描述，可选" />
        <Button type="button" onClick={saveTemplate}>
          <Plus className="h-4 w-4" />
          保存为个人模板
        </Button>
      </div>

        <div className="grid gap-4">
          <section className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">个人模板</p>
              <Badge variant="secondary">{userTemplates.length}</Badge>
            </div>
            {userTemplates.length === 0 ? (
              <EmptyState title="还没有个人模板" detail="调好参数后可以保存为自己的常用模板，也可以让 Agent 帮你创建。" />
            ) : (
              userTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} onApply={applyTemplate} onDelete={deleteTemplate} />
              ))
            )}
          </section>

          <section className="grid gap-2">
            <button
              type="button"
              className="flex items-center justify-between rounded-xl bg-muted/35 px-3 py-2 text-left transition hover:bg-muted/60"
              onClick={() => setSystemOpen((open) => !open)}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                {systemOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                内置预设
              </span>
              <Badge variant="outline">{systemTemplates.length}</Badge>
            </button>
            {systemOpen ? (
              <div className="grid gap-2">
                {systemTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} onApply={applyTemplate} onDelete={deleteTemplate} />
                ))}
              </div>
            ) : null}
          </section>
        </div>
    </div>
  )
}

const TemplateCard = memo(function TemplateCard({
  template,
  onApply,
  onDelete,
}: {
  template: TemplateRecord
  onApply: (template: TemplateRecord) => void
  onDelete: (id: string) => void
}) {
  return (
    <article className="rounded-xl bg-muted/40 p-3 transition hover:bg-muted/70">
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 text-left" onClick={() => onApply(template)}>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{template.name}</h3>
            {template.source === 'system' ? <Badge variant="outline">内置预设</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {template.mode === 'generation' ? '文生图' : '图生图'} · {template.imageModel || 'gpt-image-2'} · {template.aspectRatio} · {template.resolutionTier} · {template.size}
          </p>
        </button>
        {template.source === 'system' ? null : (
          <Button type="button" size="icon" variant="ghost" title="删除个人模板" onClick={() => onDelete(template.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      {template.description ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{template.description}</p> : null}
      <p className="mt-2 line-clamp-3 text-xs leading-5">{template.prompt}</p>
    </article>
  )
})
