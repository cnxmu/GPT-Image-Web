import { useMemo, useState } from 'react'
import { SidebarHistory } from './SidebarHistory'
import { SidebarTemplates } from './SidebarTemplates'
import { TopBar } from './TopBar'
import { SettingsDialog } from '../settings/SettingsDialog'
import { PromptEditor } from '../workbench/PromptEditor'
import { ParameterPanel } from '../workbench/ParameterPanel'
import { ReferenceImageUploader } from '../workbench/ReferenceImageUploader'
import { GenerateButton } from '../workbench/GenerateButton'
import { ResultGrid } from '../workbench/ResultGrid'
import { StatsBar } from '../workbench/StatsBar'
import { useHistory } from '../../features/history/useHistory'
import { aggregateStats } from '../../lib/stats'
import { useNow } from '../../lib/use-now'
import { getGenerationBatchStats, useWorkbenchStore } from '../../store/workbench.store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
        <aside className="scrollbar-none order-2 min-w-0 xl:sticky xl:top-[4.5rem] xl:order-1 xl:max-h-[calc(100svh-5.5rem)] xl:overflow-y-auto">
          <Card className="gap-0">
            <Tabs defaultValue="templates" className="min-h-0 gap-0">
              <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
                <CardTitle className="text-sm">资源导航</CardTitle>
                <TabsList>
                  <TabsTrigger value="templates">模板</TabsTrigger>
                  <TabsTrigger value="history">历史</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="px-3 pb-3">
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

        <aside className="scrollbar-none order-3 min-w-0 xl:sticky xl:top-[4.5rem] xl:max-h-[calc(100svh-5.5rem)] xl:overflow-y-auto">
          <Card className="gap-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">生成检查器</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 px-3 pb-3">
              <ParameterPanel />
              {mode === 'edit' ? <ReferenceImageUploader /> : null}
              <GenerateButton />
            </CardContent>
          </Card>
        </aside>
      </main>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
