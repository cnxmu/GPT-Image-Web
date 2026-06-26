import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

export function Field({
  label,
  labelAccessory,
  hint,
  children,
}: {
  label: string
  labelAccessory?: ReactNode
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        {labelAccessory}
      </div>
      {children}
      {hint ? <p className="text-xs leading-4 text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
