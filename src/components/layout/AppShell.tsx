import { lazy, Suspense, useMemo, useState } from 'react'
import { SidebarHistory } from './SidebarHistory'
import { SidebarTemplates } from './SidebarTemplates'
import { TopBar } from './TopBar'
import { PromptEditor } from '../workbench/PromptEditor'
import { ParameterPanel } from '../workbench/ParameterPanel'
import { GenerateButton } from '../workbench/GenerateButton'
import { ResultGrid } from '../workbench/ResultGrid'
import { StatsBar } from '../workbench/StatsBar'
import { useHistory } from '../../features/history/useHistory'
import { aggregateStats } from '../../lib/stats'
import { useNow } from '../../lib/use-now'
import { useWorkbenchStore } from '../../store/workbench.store'
import { getGenerationBatchStats } from '../../store/workbench-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const SettingsDialog = lazy(async () => {
  const mod = await import('../settings/SettingsDialog')
  return { default: mod.SettingsDialog }
})

const ReferenceImageUploader = lazy(async () => {
  const mod = await import('../workbench/ReferenceImageUploader')
  return { default: mod.ReferenceImageUploader }
})

export function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const history = useHistory()
  const now = useNow()
  const batches = useWorkbenchStore((state) => state.batches)
  const sessionStats = useMemo(() => getGenerationBatchStats(batches, now), [batches, now])
  const globalStats = useMemo(() => {
    const historyStats = aggregateStats(history || [])
    return {
      total: historyStats.total,
      success: historyStats.success,
      failed: historyStats.failed,
      slowestMs: Math.max(historyStats.slowestMs, sessionStats.slowestMs),
    }
  }, [history, sessionStats])
  const mode = useWorkbenchStore((state) => state.mode)
  const error = useWorkbenchStore((state) => state.error)

  return (
    <div className="min-h-svh bg-background text-foreground">
      <TopBar stats={globalStats} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="mx-auto grid w-full max-w-[1840px] gap-4 px-4 py-4 xl:grid-cols-[280px_minmax(0,1fr)_340px] 2xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <aside className="order-2 min-w-0 xl:sticky xl:top-[4.5rem] xl:order-1 xl:h-[calc(100svh-5.5rem)]">
          <Card className="h-full gap-0">
            <Tabs defaultValue="templates" className="min-h-0 flex-1 gap-0">
              <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
                <CardTitle className="text-sm">我的资源</CardTitle>
                <TabsList>
                  <TabsTrigger value="templates">个人模板</TabsTrigger>
                  <TabsTrigger value="history">我的历史</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                <TabsContent value="templates" className="m-0">
                  <SidebarTemplates />
                </TabsContent>
                <TabsContent value="history" className="m-0">
                  <SidebarHistory />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </aside>

        <section className="order-1 grid min-w-0 content-start gap-4 xl:order-2">
          <PromptEditor />
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <StatsBar />
          <ResultGrid />
        </section>

        <aside className="order-3 min-w-0 xl:sticky xl:top-[4.5rem] xl:h-[calc(100svh-5.5rem)]">
          <Card className="h-full gap-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">个人生成设置</CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3">
              <div className="scrollbar-none grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pr-1">
                <ParameterPanel />
                {mode === 'edit' ? (
                  <Suspense fallback={<div className="rounded-xl bg-muted/35 p-3 text-sm text-muted-foreground">正在载入参考图上传</div>}>
                    <ReferenceImageUploader />
                  </Suspense>
                ) : null}
              </div>
              <div className="shrink-0">
                <GenerateButton />
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>

      <Suspense fallback={null}>
        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </Suspense>
    </div>
  )
}
