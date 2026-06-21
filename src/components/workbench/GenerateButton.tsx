import { ImageIcon, Loader2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { DEFAULT_GENERATION_CONCURRENCY } from '../../lib/constants'
import { clampGenerationConcurrency } from '../../db/settings.repo'
import { useGenerateImagesMutation } from '../../features/image/useGenerateImages'
import { useWorkbenchStore } from '../../store/workbench.store'
import { Button } from '@/components/ui/button'

const LARGE_BATCH_CONFIRM_COUNT = 20

export function GenerateButton() {
  const count = useWorkbenchStore((state) => state.count)
  const activeJobCount = useWorkbenchStore((state) => state.activeJobCount)
  const queuedCount = useWorkbenchStore((state) => state.queue.length)
  const concurrency =
    useLiveQuery(async () => {
      const record = await db.settings.get('generationConcurrency')
      return clampGenerationConcurrency(record?.value)
    }, []) || DEFAULT_GENERATION_CONCURRENCY
  const mutation = useGenerateImagesMutation()

  function handleGenerate() {
    if (count > LARGE_BATCH_CONFIRM_COUNT) {
      const ok = confirm(`这次会为你提交 ${count} 张图片生成请求，当前个人并发上限为 ${concurrency}。可能产生较高费用，并增加限流或失败概率。确定继续吗？`)
      if (!ok) return
    }
    mutation.mutate()
  }

  return (
    <section className="rounded-xl bg-muted/35 p-3">
      <div className="grid gap-3">
        <div>
          <p className="text-sm font-semibold">本次准备生成 {count} 张图片</p>
          <p className="mt-1 text-xs text-muted-foreground">
            会拆分为 {count} 次请求，每次固定 n=1。你的并发上限 {concurrency}，当前运行 {activeJobCount} 个，排队 {queuedCount} 个。
          </p>
        </div>
        <Button type="button" className="w-full" disabled={mutation.isPending} onClick={handleGenerate}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          {mutation.isPending ? '提交中' : '开始我的生成'}
        </Button>
      </div>
    </section>
  )
}
