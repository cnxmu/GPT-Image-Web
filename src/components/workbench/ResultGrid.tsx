import { Check, Copy, Download, Eye, Loader2, RotateCcw, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState, memo } from 'react'
import { db } from '../../db/db'
import { getFilename } from '../../features/image/image.api'
import { getImageSrc } from '../../features/image/image.adapter'
import { copyImageToClipboard, downloadImage } from '../../lib/download'
import { formatDateTime, formatDuration } from '../../lib/time'
import { useNow } from '../../lib/use-now'
import { useWorkbenchStore } from '../../store/workbench.store'
import type { GenerationBatch, GenerationJob } from '../../types/image'
import { StatusBadge } from './StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from './empty-state'
import { ImagePreviewDialog, type ImagePreviewData } from './ImagePreviewDialog'

type ActionFeedbackState = 'idle' | 'loading' | 'success' | 'error'
const ACTION_FEEDBACK_RESET_MS = 1200

export function ResultGrid() {
  const allBatches = useWorkbenchStore((state) => state.batches)
  const visibleBatchIds = useWorkbenchStore((state) => state.visibleBatchIds)
  const batches = useMemo(
    () => allBatches.filter((batch) => visibleBatchIds.includes(batch.id)),
    [allBatches, visibleBatchIds],
  )
  const allDone = batches.length > 0 && batches.every(
    (b) => b.status === 'success' || b.status === 'failed' || b.status === 'partial',
  )
  const now = useNow(allDone ? 0 : 1000)
  const [preview, setPreview] = useState<ImagePreviewData | null>(null)

  const hasResults = batches.length > 0

  return (
    <Card className="gap-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">我的结果</CardTitle>
      </CardHeader>
      <CardContent className={hasResults ? 'grid gap-4 p-4' : 'grid p-4'}>
        {!hasResults ? (
          <EmptyState compact title="还没有本次结果" detail="点击生成后，这里会显示你的图片、耗时、真实尺寸和操作按钮。" />
        ) : (
          batches.map((batch) => <BatchResult key={batch.id} batch={batch} now={now} onPreview={setPreview} />)
        )}
      </CardContent>

      <ImagePreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </Card>
  )
}

const BatchResult = memo(function BatchResult({
  batch,
  now,
  onPreview,
}: {
  batch: GenerationBatch
  now: number
  onPreview: (preview: ImagePreviewData) => void
}) {
  const slowestMs = getBatchSlowestMs(batch, now)

  return (
    <section className="overflow-hidden rounded-xl bg-muted/35">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/80 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {batch.source === 'history' ? <Badge variant="outline">我的历史结果</Badge> : null}
            <StatusBadge status={batch.status} />
            <h3 className="text-sm font-semibold">
              {getBatchTitle(batch)}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(batch.createdAt)} · 成功 {batch.success}/{batch.total} · 失败 {batch.failed} · 最慢 {formatDuration(slowestMs)}
          </p>
          {batch.notice ? <p className="mt-1 text-xs text-primary">{batch.notice}</p> : null}
        </div>
        <p className="max-w-xl truncate text-xs text-muted-foreground">{batch.form.prompt}</p>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {batch.results.map((job) => (
          <JobCard key={job.id} job={job} outputFormat={batch.form.outputFormat} now={now} onPreview={onPreview} />
        ))}
      </div>
    </section>
  )
}, (prevProps, nextProps) => {
  // For terminal batches, skip re-renders triggered by now changes
  if (prevProps.batch !== nextProps.batch) return false
  if (prevProps.onPreview !== nextProps.onPreview) return false
  const terminal = nextProps.batch.status === 'success' || nextProps.batch.status === 'failed' || nextProps.batch.status === 'partial'
  if (!terminal) return false
  return true
})

function getBatchTitle(batch: GenerationBatch) {
  const mode = batch.form.mode === 'generation' ? '文生图' : '图生图'
  if (batch.form.imageModelFamily !== 'gpt-image-2') {
    return `${mode} · ${batch.form.imageModel} · ${batch.form.aspectRatio} · ${batch.form.resolutionTier} · ${batch.form.size}`
  }
  return `${mode} · ${batch.form.size} · ${batch.form.outputFormat.toUpperCase()}`
}

const JobCard = memo(function JobCard({
  job,
  outputFormat,
  now,
  onPreview,
}: {
  job: GenerationJob
  outputFormat: GenerationBatch['form']['outputFormat']
  now: number
  onPreview: (preview: ImagePreviewData) => void
}) {
  const src = useJobImageSrc(job)
  const durationMs = getJobDuration(job, now)
  const [downloadState, setDownloadState] = useState<ActionFeedbackState>('idle')
  const [copyState, setCopyState] = useState<ActionFeedbackState>('idle')

  async function runWithFeedback(action: () => Promise<void>, setState: (state: ActionFeedbackState) => void) {
    if (!src) return
    setState('loading')
    try {
      await action()
      setState('success')
    } catch {
      setState('error')
    } finally {
      window.setTimeout(() => setState('idle'), ACTION_FEEDBACK_RESET_MS)
    }
  }

  return (
    <article className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border/60">
      <div className="grid aspect-square place-items-center bg-muted">
        {job.status === 'success' && src ? (
          <img src={src} alt={`生成结果 ${job.jobIndex + 1}`} className="h-full w-full object-contain" loading="lazy" />
        ) : job.status === 'failed' ? (
          <div className="px-4 text-center text-sm text-destructive">{job.error || '生成失败'}</div>
        ) : job.status === 'running' ? (
          <div className="text-sm text-primary">生成中 · {formatDuration(durationMs)}</div>
        ) : (
          <div className="text-sm text-muted-foreground">排队中</div>
        )}
      </div>
      <div className="grid gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={job.status} />
          <span className="text-xs text-muted-foreground">{job.status === 'queued' ? '-' : formatDuration(durationMs)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          实际尺寸：
          {job.status === 'success'
            ? job.actualWidth && job.actualHeight
              ? `${job.actualWidth}x${job.actualHeight}`
              : '读取中'
            : '-'}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            title="预览"
            disabled={!src}
            onClick={() =>
              onPreview({
                src,
                title: '图片预览',
                fileName: getFilename(outputFormat, job.jobIndex),
                width: job.actualWidth,
                height: job.actualHeight,
              })
            }
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            title={getActionTitle('下载', downloadState)}
            disabled={!src || downloadState === 'loading'}
            aria-label={getActionTitle('下载', downloadState)}
            onClick={() => runWithFeedback(() => downloadImage(src, getFilename(outputFormat, job.jobIndex)), setDownloadState)}
          >
            <ActionFeedbackIcon state={downloadState} idleIcon="download" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            title={getActionTitle('复制', copyState)}
            disabled={!src || copyState === 'loading'}
            aria-label={getActionTitle('复制', copyState)}
            onClick={() => runWithFeedback(() => copyImageToClipboard(src), setCopyState)}
          >
            <ActionFeedbackIcon state={copyState} idleIcon="copy" />
          </Button>
          <Button type="button" size="icon" variant="ghost" title="重试占位" disabled>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  )
})

function getActionTitle(label: '下载' | '复制', state: ActionFeedbackState) {
  if (state === 'loading') return `${label}中`
  if (state === 'success') return label === '下载' ? '已下载' : '已复制'
  if (state === 'error') return `${label}失败`
  return label
}

function ActionFeedbackIcon({
  state,
  idleIcon,
}: {
  state: ActionFeedbackState
  idleIcon: 'download' | 'copy'
}) {
  if (state === 'loading') return <Loader2 className="h-4 w-4 animate-spin" />
  if (state === 'success') return <Check className="h-4 w-4 text-emerald-600" />
  if (state === 'error') return <X className="h-4 w-4 text-destructive" />
  return idleIcon === 'download' ? <Download className="h-4 w-4" /> : <Copy className="h-4 w-4" />
}

function useJobImageSrc(job: GenerationJob) {
  const directSrc = getImageSrc(job)
  const asset = useLiveQuery(
    () => (job.localAssetId ? db.assets.get(job.localAssetId) : undefined),
    [job.localAssetId],
  )
  const [assetSrc, setAssetSrc] = useState<{ assetId?: string; src: string }>({ src: '' })

  useEffect(() => {
    if (!asset || !job.localAssetId) return

    let disposed = false
    const objectUrl = URL.createObjectURL(asset.blob)
    const assetId = job.localAssetId
    queueMicrotask(() => {
      if (disposed) {
        URL.revokeObjectURL(objectUrl)
        return
      }
      setAssetSrc({ assetId, src: objectUrl })
    })

    return () => {
      disposed = true
      URL.revokeObjectURL(objectUrl)
    }
  }, [asset, job.localAssetId])

  return (assetSrc.assetId === job.localAssetId ? assetSrc.src : '') || directSrc
}

function getJobDuration(job: GenerationJob, now: number) {
  if (job.durationMs !== undefined) return job.durationMs
  if (job.status === 'running' && job.startedAt !== undefined) return Math.max(0, Math.round(now - job.startedAt))
  return 0
}

function getBatchSlowestMs(batch: GenerationBatch, now: number) {
  return batch.results.reduce((max, job) => Math.max(max, getJobDuration(job, now)), 0)
}
