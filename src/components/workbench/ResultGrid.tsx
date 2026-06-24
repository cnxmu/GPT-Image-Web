import { Copy, Download, Eye, RotateCcw } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { db } from '../../db/db'
import { getFilename } from '../../features/image/image.api'
import { getImageSrc } from '../../features/image/image.adapter'
import { copyImageToClipboard, downloadImage } from '../../lib/download'
import { formatDateTime, formatDuration } from '../../lib/time'
import { useNow } from '../../lib/use-now'
import { useWorkbenchStore } from '../../store/workbench.store'
import type { GenerationBatch, GenerationJob } from '../../types/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from './empty-state'
import { ImagePreviewDialog, type ImagePreviewData } from './ImagePreviewDialog'

export function ResultGrid() {
  const allBatches = useWorkbenchStore((state) => state.batches)
  const visibleBatchIds = useWorkbenchStore((state) => state.visibleBatchIds)
  const batches = useMemo(
    () => allBatches.filter((batch) => visibleBatchIds.includes(batch.id)),
    [allBatches, visibleBatchIds],
  )
  const now = useNow()
  const [preview, setPreview] = useState<ImagePreviewData | null>(null)

  return (
    <Card className="gap-0">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">我的结果</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4">
        {batches.length === 0 ? (
          <EmptyState title="还没有本次结果" detail="点击生成后，这里会显示你的图片、耗时、真实尺寸和操作按钮。" />
        ) : (
          batches.map((batch) => <BatchResult key={batch.id} batch={batch} now={now} onPreview={setPreview} />)
        )}
      </CardContent>

      <ImagePreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </Card>
  )
}

function BatchResult({
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
}

function getBatchTitle(batch: GenerationBatch) {
  const mode = batch.form.mode === 'generation' ? '文生图' : '图生图'
  if (batch.form.imageModelFamily !== 'gpt-image-2') {
    return `${mode} · ${batch.form.imageModel} · ${batch.form.aspectRatio}`
  }
  return `${mode} · ${batch.form.size} · ${batch.form.outputFormat.toUpperCase()}`
}

function JobCard({
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
            title="下载"
            disabled={!src}
            onClick={() => downloadImage(src, getFilename(outputFormat, job.jobIndex))}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="secondary" title="复制" disabled={!src} onClick={() => copyImageToClipboard(src)}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" title="重试占位" disabled>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  )
}

function useJobImageSrc(job: GenerationJob) {
  const directSrc = getImageSrc(job)
  const asset = useLiveQuery(
    () => (!directSrc && job.localAssetId ? db.assets.get(job.localAssetId) : undefined),
    [directSrc, job.localAssetId],
  )
  const [assetSrc, setAssetSrc] = useState<{ assetId?: string; src: string }>({ src: '' })

  useEffect(() => {
    if (directSrc || !asset || !job.localAssetId) return

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
  }, [asset, directSrc, job.localAssetId])

  return directSrc || (assetSrc.assetId === job.localAssetId ? assetSrc.src : '')
}

function getJobDuration(job: GenerationJob, now: number) {
  if (job.durationMs !== undefined) return job.durationMs
  if (job.status === 'running' && job.startedAt !== undefined) return Math.max(0, Math.round(now - job.startedAt))
  return 0
}

function getBatchSlowestMs(batch: GenerationBatch, now: number) {
  return batch.results.reduce((max, job) => Math.max(max, getJobDuration(job, now)), 0)
}

function StatusBadge({ status }: { status: GenerationBatch['status'] | GenerationJob['status'] }) {
  const text =
    status === 'success'
      ? '成功'
      : status === 'partial'
        ? '部分成功'
        : status === 'failed'
          ? '失败'
          : status === 'running'
            ? '生成中'
            : '排队'
  const variant =
    status === 'failed'
      ? 'destructive'
      : status === 'success' || status === 'running'
        ? 'secondary'
        : 'outline'
  return <Badge variant={variant}>{text}</Badge>
}
