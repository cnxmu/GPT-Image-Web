import { Settings } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { API_BASE_URL } from '../../lib/constants'
import { formatDuration } from '../../lib/time'
import type { GenerationStats } from '../../types/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function TopBar({ stats, onOpenSettings }: { stats: GenerationStats; onOpenSettings: () => void }) {
  const secrets = useLiveQuery(() => db.secrets.toArray(), [], [])
  const hasImageKey = secrets.some((item) => item.id === 'imageApiKey' && item.value)
  const hasBananaImageKey = secrets.some((item) => item.id === 'bananaImageApiKey' && item.value)
  const hasAgentKey = secrets.some((item) => item.id === 'agentApiKey' && item.value)

  return (
    <header className="sticky top-0 z-20 bg-background/90 shadow-sm shadow-slate-950/5 backdrop-blur">
      <div className="mx-auto flex min-h-14 w-full max-w-[1840px] flex-wrap items-center gap-3 px-4 py-2">
        <div className="mr-auto">
          <h1 className="text-base font-semibold leading-6">个人 AI 生图控制台</h1>
          <p className="text-xs text-muted-foreground">个人接口：{API_BASE_URL}</p>
        </div>

        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          <TopMetric label="我的总生成" value={stats.total} />
          <TopMetric label="成功" value={stats.success} tone="success" />
          <TopMetric label="失败" value={stats.failed} tone="danger" />
          <TopMetric label="最慢耗时" value={formatDuration(stats.slowestMs)} />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <KeyBadge active={hasImageKey} label="我的生图密钥" />
          <KeyBadge active={hasBananaImageKey} label="Nano Banana 密钥" />
          <KeyBadge active={hasAgentKey} label="我的 Agent 密钥" />
        </div>

        <Button type="button" variant="outline" size="icon" title="设置" onClick={onOpenSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

function TopMetric({ label, value, tone }: { label: string; value: string | number; tone?: 'success' | 'danger' }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-1.5">
      <span className="mr-1 text-xs text-muted-foreground">{label}</span>
      <span
        className={
          tone === 'success'
            ? 'text-sm font-semibold text-emerald-600'
            : tone === 'danger'
              ? 'text-sm font-semibold text-destructive'
              : 'text-sm font-semibold'
        }
      >
        {value}
      </span>
    </div>
  )
}

function KeyBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <Badge variant={active ? 'secondary' : 'outline'} className={active ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}>
      {label}{active ? '已保存' : '未保存'}
    </Badge>
  )
}
