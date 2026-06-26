import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({
  title,
  detail,
  action,
  compact = false,
}: {
  title: string
  detail?: string
  action?: ReactNode
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'grid place-items-center rounded-xl bg-muted/40 px-4 text-center',
        compact ? 'min-h-20 py-4' : 'min-h-32 py-6',
      )}
    >
      <div className="grid gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {detail ? <p className="max-w-sm text-xs leading-5 text-muted-foreground">{detail}</p> : null}
        {action}
      </div>
    </div>
  )
}
