import { memo } from 'react'
import { Badge } from '@/components/ui/badge'

type StatusBadgeStatus = 'success' | 'partial' | 'failed' | 'running' | 'queued' | 'pending'

const STATUS_TEXT: Record<StatusBadgeStatus, string> = {
  success: '成功',
  partial: '部分成功',
  failed: '失败',
  running: '生成中',
  queued: '排队',
  pending: '等待',
}

const STATUS_VARIANT: Record<StatusBadgeStatus, 'secondary' | 'outline' | 'destructive'> = {
  success: 'secondary',
  partial: 'outline',
  failed: 'destructive',
  running: 'secondary',
  queued: 'outline',
  pending: 'outline',
}

export const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const label = STATUS_TEXT[status as StatusBadgeStatus] ?? status
  const variant = STATUS_VARIANT[status as StatusBadgeStatus] ?? 'outline'
  return <Badge variant={variant}>{label}</Badge>
})
