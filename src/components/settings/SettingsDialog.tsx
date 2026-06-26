import { pruneAgentConversationsToLimit } from '../../db/agent-conversations.repo'
import { clearHistory, pruneHistoryToLimit } from '../../db/history.repo'
import { clearAllLocalData as clearAllLocalDataFromDb, clearUnreferencedLocalAssets } from '../../db/local-data.repo'
import { clearTemplates } from '../../db/templates.repo'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AgentModelField } from './AgentModelField'
import { GenerationSafetyField } from './GenerationSafetyField'
import { SecretFields } from './SecretFields'
import { Field } from '../workbench/field'

const RETENTION_LIMITS = [20, 50, 100]

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  async function clearAllLocalData() {
    if (!confirm('确定清除你保存在本机的密钥、模板、历史、资源和设置？此操作不可恢复。')) return
    await clearAllLocalDataFromDb()
    onClose()
  }

  async function cleanupAssets() {
    if (!confirm('确定清理未被你的历史或 Agent 对话引用的本地图片缓存？')) return
    const removed = await clearUnreferencedLocalAssets()
    alert(`已清理 ${removed} 个未引用资源。`)
  }

  async function pruneHistory(limit: number) {
    if (!confirm(`确定只保留最近 ${limit} 条历史记录？更早的历史和对应图片会从本机删除。`)) return
    const removed = await pruneHistoryToLimit(limit)
    await clearUnreferencedLocalAssets()
    alert(`已删除 ${removed} 条较早的历史记录。`)
  }

  async function pruneAgentConversations(limit: number) {
    if (!confirm(`确定只保留最近 ${limit} 条 Agent 会话？更早会话和会话图片会从本机删除。`)) return
    const removed = await pruneAgentConversationsToLimit(limit)
    await clearUnreferencedLocalAssets()
    alert(`已删除 ${removed} 条较早的 Agent 会话。`)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="scrollbar-none max-h-[92svh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>个人设置</DialogTitle>
          <DialogDescription>管理你保存在本机的密钥、Agent 模型和个人数据。</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <SecretFields />
          <AgentModelField />
          <GenerationSafetyField />
          <LocalDataCare onPruneHistory={pruneHistory} onPruneAgentConversations={pruneAgentConversations} onCleanupAssets={cleanupAssets} />

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-900 dark:text-amber-100">
            密钥只保存在你当前使用的这个浏览器里。换设备或换浏览器时需要重新填写；清除浏览器站点数据后也会一起删除。
          </div>
        </div>

        <DialogFooter className="flex-wrap sm:justify-between">
          <Button type="button" variant="outline" onClick={() => confirm('确定清空你的历史记录和历史图片？') && clearHistory()}>
            清空我的历史
          </Button>
          <Button type="button" variant="outline" onClick={() => confirm('确定清空你的个人模板？') && clearTemplates()}>
            清空个人模板
          </Button>
          <Button type="button" variant="destructive" onClick={clearAllLocalData}>
            清除我的本地数据
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LocalDataCare({
  onPruneHistory,
  onPruneAgentConversations,
  onCleanupAssets,
}: {
  onPruneHistory: (limit: number) => void
  onPruneAgentConversations: (limit: number) => void
  onCleanupAssets: () => void
}) {
  return (
    <div className="grid gap-3 rounded-xl bg-muted/35 p-3">
      <div>
        <p className="text-sm font-semibold">本地数据整理</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          长期生成后，可以按最近记录保留历史和 Agent 会话，旧图片会一起清理。
        </p>
      </div>
      <Field label="我的生成历史">
        <div className="flex flex-wrap gap-2">
          {RETENTION_LIMITS.map((limit) => (
            <Button key={limit} type="button" size="sm" variant="secondary" onClick={() => onPruneHistory(limit)}>
              保留最近 {limit} 条
            </Button>
          ))}
        </div>
      </Field>
      <Field label="我的 Agent 会话">
        <div className="flex flex-wrap gap-2">
          {RETENTION_LIMITS.map((limit) => (
            <Button key={limit} type="button" size="sm" variant="secondary" onClick={() => onPruneAgentConversations(limit)}>
              保留最近 {limit} 条
            </Button>
          ))}
        </div>
      </Field>
      <Button type="button" variant="outline" onClick={onCleanupAssets}>
        清理未引用图片
      </Button>
    </div>
  )
}
