import { useMemo } from 'react'
import { formatDuration } from '../../lib/time'
import { useNow } from '../../lib/use-now'
import { getGenerationBatchStats, useWorkbenchStore } from '../../store/workbench.store'
import { Card, CardContent } from '@/components/ui/card'

export function StatsBar() {
  const now = useNow()
  const allBatches = useWorkbenchStore((state) => state.batches)
  const visibleBatchIds = useWorkbenchStore((state) => state.visibleBatchIds)
  const batches = useMemo(
    () => allBatches.filter((batch) => visibleBatchIds.includes(batch.id)),
    [allBatches, visibleBatchIds],
  )
  const stats = useMemo(() => getGenerationBatchStats(batches, now), [batches, now])

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Metric label="本次生成总数" value={stats.total} />
      <Metric label="成功" value={stats.success} tone="success" />
      <Metric label="失败" value={stats.failed} tone="danger" />
      <Metric label="最慢耗时" value={formatDuration(stats.slowestMs)} />
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: 'success' | 'danger' }) {
  return (
    <Card size="sm" className="shadow-none">
      <CardContent className="px-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === 'success'
            ? 'mt-1 text-xl font-semibold text-emerald-600'
            : tone === 'danger'
              ? 'mt-1 text-xl font-semibold text-destructive'
              : 'mt-1 text-xl font-semibold'
        }
      >
        {value}
      </p>
      </CardContent>
    </Card>
  )
}
