import type { ReactNode } from 'react'

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-32 place-items-center rounded-xl bg-muted/40 px-4 py-6 text-center">
      <div className="grid gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {detail ? <p className="max-w-sm text-xs leading-5 text-muted-foreground">{detail}</p> : null}
        {action}
      </div>
    </div>
  )
}
