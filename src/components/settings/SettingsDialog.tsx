import { db } from '../../db/db'
import { clearAssets } from '../../db/assets.repo'
import { clearHistory } from '../../db/history.repo'
import { clearSecrets } from '../../db/secrets.repo'
import { clearTemplates } from '../../db/templates.repo'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AgentModelField } from './AgentModelField'
import { GenerationSafetyField } from './GenerationSafetyField'
import { SecretFields } from './SecretFields'

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  async function clearAllLocalData() {
    if (!confirm('确定清除密钥、模板、历史、资源和设置？此操作不可恢复。')) return
    await Promise.all([clearSecrets(), clearTemplates(), clearHistory(), clearAssets(), db.settings.clear()])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="scrollbar-none max-h-[92svh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>管理本机密钥、Agent 模型和本地数据。</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <SecretFields />
          <AgentModelField />
          <GenerationSafetyField />

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-900 dark:text-amber-100">
            密钥仅保存在当前浏览器本地 IndexedDB。请使用 HTTPS 和访问控制部署；公开部署时不应内置平台级密钥，需要后端代理或边缘函数保护密钥。
          </div>
        </div>

        <DialogFooter className="flex-wrap sm:justify-between">
          <Button type="button" variant="outline" onClick={() => confirm('确定清空历史记录？') && clearHistory()}>
            清空历史与历史图片
          </Button>
          <Button type="button" variant="outline" onClick={() => confirm('确定清空本地资源缓存？这会删除 Agent 图片和参考图缓存。') && clearAssets()}>
            清空资源缓存
          </Button>
          <Button type="button" variant="outline" onClick={() => confirm('确定清空模板？') && clearTemplates()}>
            清空模板
          </Button>
          <Button type="button" variant="destructive" onClick={clearAllLocalData}>
            清除全部本地数据
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
