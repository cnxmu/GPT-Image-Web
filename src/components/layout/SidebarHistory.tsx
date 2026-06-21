import { RotateCcw, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { clearHistory, deleteHistory } from '../../db/history.repo'
import { useHistory } from '../../features/history/useHistory'
import { formatDateTime, formatDuration } from '../../lib/time'
import { useWorkbenchStore } from '../../store/workbench.store'
import type { HistoryRecord } from '../../types/history'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '../workbench/empty-state'

type HistoryFilter = 'all' | 'success' | 'failed'

export function SidebarHistory() {
  const history = useHistory()
  const applyHistory = useWorkbenchStore((state) => state.applyHistory)
  const showHistoryResult = useWorkbenchStore((state) => state.showHistoryResult)
  const [filter, setFilter] = useState<HistoryFilter>('all')

  function handleApplyHistory(record: HistoryRecord) {
    applyHistory(record)
    showHistoryResult(record)
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return history
    if (filter === 'success') return history.filter((item) => item.status === 'success' || item.status === 'partial')
    return history.filter((item) => item.status === 'failed' || item.failed > 0)
  }, [history, filter])

  return (
    <div className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">我的历史</p>
          <Button type="button" size="sm" variant="ghost" onClick={() => confirm('确定清空你的历史记录和历史图片？') && clearHistory()}>
            清空
          </Button>
        </div>
        <div className="flex gap-2 rounded-xl bg-muted/35 p-1">
          {(['all', 'success', 'failed'] as const).map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={filter === item ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setFilter(item)}
            >
              {item === 'all' ? '全部' : item === 'success' ? '成功' : '失败'}
            </Button>
          ))}
        </div>

        <div className="scrollbar-none grid max-h-[calc(100svh-13rem)] gap-2 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <EmptyState title="还没有历史记录" detail="你的每次生成都会自动保存在本机 IndexedDB。" />
          ) : (
            filtered.map((item) => <HistoryItem key={item.id} item={item} onApply={() => handleApplyHistory(item)} />)
          )}
        </div>
    </div>
  )
}

function HistoryItem({ item, onApply }: { item: HistoryRecord; onApply: () => void }) {
  return (
    <article className="rounded-xl bg-muted/40 p-3 transition hover:bg-muted/70">
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 text-left" onClick={onApply}>
          <h3 className="line-clamp-2 text-sm font-semibold leading-5">
            {item.prompt || '未命名生成'}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(item.startedAt)} · {item.params.size} · {formatDuration(item.slowestMs)}
          </p>
        </button>
        <Button type="button" size="icon" variant="ghost" title="删除这条历史" onClick={() => deleteHistory(item.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <StatusBadge status={item.status} />
        <p className="text-xs text-muted-foreground">
          {item.success}/{item.total} 成功 · {item.failed} 失败
        </p>
      </div>

      {item.error ? <p className="mt-2 rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">{item.error}</p> : null}

      <Button type="button" className="mt-3 w-full" size="sm" variant="outline" onClick={onApply}>
        <RotateCcw className="h-4 w-4" />
        使用这次参数
      </Button>
    </article>
  )
}

function StatusBadge({ status }: { status: HistoryRecord['status'] }) {
  const label = status === 'success' ? '成功' : status === 'partial' ? '部分成功' : status === 'failed' ? '失败' : status === 'running' ? '运行中' : '等待'
  const variant =
    status === 'success'
      ? 'secondary'
      : status === 'partial'
        ? 'outline'
        : status === 'failed'
          ? 'destructive'
          : 'outline'
  return <Badge variant={variant}>{label}</Badge>
}
