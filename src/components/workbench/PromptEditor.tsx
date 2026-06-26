import { WandSparkles } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useOptimizePromptMutation } from '../../features/agent/useOptimizePrompt'
import { toAppError } from '../../lib/errors'
import { useWorkbenchStore } from '../../store/workbench.store'
import type { OptimizedPromptCandidate } from '../../types/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Field } from './field'

type PromptTab = 'editor' | 'chat'

const AgentChatPanel = lazy(async () => {
  const mod = await import('./AgentChatPanel')
  return { default: mod.AgentChatPanel }
})

export function PromptEditor() {
  const prompt = useWorkbenchStore((state) => state.prompt)
  const negativePrompt = useWorkbenchStore((state) => state.negativePrompt)
  const setPrompt = useWorkbenchStore((state) => state.setPrompt)
  const setNegativePrompt = useWorkbenchStore((state) => state.setNegativePrompt)
  const setError = useWorkbenchStore((state) => state.setError)
  const [activeTab, setActiveTab] = useState<PromptTab>('editor')
  const [candidate, setCandidate] = useState<OptimizedPromptCandidate | null>(null)
  const optimizeMutation = useOptimizePromptMutation()

  async function handleOptimize() {
    setError(undefined)
    setCandidate(null)
    try {
      const result = await optimizeMutation.mutateAsync({ prompt, negativePrompt })
      setCandidate(result)
    } catch (error) {
      setError(toAppError(error).message)
    }
  }

  function applyCandidate() {
    if (!candidate) return
    setPrompt(candidate.prompt)
    setNegativePrompt(candidate.negativePrompt)
    setCandidate(null)
  }

  return (
    <Card className="gap-0">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PromptTab)}>
        <CardHeader className="flex items-center justify-between gap-3 pb-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <CardTitle className="shrink-0 text-sm">我的提示词</CardTitle>
            <TabsList>
              <TabsTrigger value="editor">编辑提示词</TabsTrigger>
              <TabsTrigger value="chat">个人 Agent</TabsTrigger>
            </TabsList>
          </div>
          {activeTab === 'editor' ? (
            <Button type="button" size="sm" variant="outline" onClick={handleOptimize} disabled={optimizeMutation.isPending}>
              <WandSparkles className="h-4 w-4" />
              {optimizeMutation.isPending ? '优化中' : '帮我优化'}
            </Button>
          ) : null}
        </CardHeader>

        <TabsContent value="editor" className="m-0">
          <CardContent className="grid gap-4 p-4 pt-1">
          <Field label="提示词">
            <Textarea
              className="min-h-44"
              rows={8}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="描述主体、场景、风格、构图、光线和细节"
            />
          </Field>

          <Field label="负面提示词" hint="可选，会合并到请求提示词中。">
            <Textarea
              className="min-h-44"
              rows={8}
              value={negativePrompt}
              onChange={(event) => setNegativePrompt(event.target.value)}
              placeholder="不希望出现的元素、瑕疵或风格"
            />
          </Field>

          {candidate ? (
            <div className="rounded-xl bg-accent/45 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">给我的优化候选</p>
                <Button type="button" size="sm" onClick={applyCandidate}>
                  使用这版
                </Button>
              </div>
              <div className="grid gap-3 text-sm leading-6">
                <CandidateBlock title="优化后的提示词" content={candidate.prompt} />
                <CandidateBlock title="优化后的负面提示词" content={candidate.negativePrompt} />
                <div>
                  <p className="mb-1 text-xs font-semibold">与原提示词对比</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {candidate.comparisonPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
          </CardContent>
        </TabsContent>

        <TabsContent value="chat" className="m-0">
          <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">正在载入你的个人 Agent</div>}>
            <AgentChatPanel />
          </Suspense>
        </TabsContent>
      </Tabs>
    </Card>
  )
}

function CandidateBlock({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold">{title}</p>
      <p className="whitespace-pre-wrap rounded-lg bg-background/80 p-2">{content}</p>
    </div>
  )
}
