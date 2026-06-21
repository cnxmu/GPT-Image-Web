import { clearHistory } from '../../db/history.repo'
import { clearAllLocalData as clearAllLocalDataFromDb, clearUnreferencedLocalAssets } from '../../db/local-data.repo'
import { clearTemplates } from '../../db/templates.repo'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AgentModelField } from './AgentModelField'
import { GenerationSafetyField } from './GenerationSafetyField'
import { SecretFields } from './SecretFields'

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

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-900 dark:text-amber-100">
            密钥只保存在你当前使用的这个浏览器里。换设备或换浏览器时需要重新填写；清除浏览器站点数据后也会一起删除。
          </div>
        </div>

        <DialogFooter className="flex-wrap sm:justify-between">
          <Button type="button" variant="outline" onClick={() => confirm('确定清空你的历史记录和历史图片？') && clearHistory()}>
            清空我的历史
          </Button>
          <Button type="button" variant="outline" onClick={cleanupAssets}>
            清理未引用图片
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
