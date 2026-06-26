import { Eye, ImagePlus, Images, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { AGENT_IMAGE_MIME_TYPES, isSupportedAgentImage } from '../../features/agent/agent-images'
import { useWorkbenchStore } from '../../store/workbench.store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImagePreviewDialog, type ImagePreviewData } from './ImagePreviewDialog'

const REFERENCE_IMAGE_ERROR = '请选择 PNG、JPEG 或 WEBP 图片'
const INLINE_REFERENCE_IMAGE_LIMIT = 4
const MANAGER_REFERENCE_IMAGE_CHUNK = 24

export function ReferenceImageUploader() {
  const referenceImages = useWorkbenchStore((state) => state.referenceImages)
  const addReferenceFiles = useWorkbenchStore((state) => state.addReferenceFiles)
  const removeReferenceImage = useWorkbenchStore((state) => state.removeReferenceImage)
  const clearReferenceImages = useWorkbenchStore((state) => state.clearReferenceImages)
  const setError = useWorkbenchStore((state) => state.setError)
  const [preview, setPreview] = useState<ImagePreviewData | null>(null)
  const [managerPreview, setManagerPreview] = useState<ImagePreviewData | null>(null)
  const [managerOpen, setManagerOpen] = useState(false)
  const [managerVisibleCount, setManagerVisibleCount] = useState(MANAGER_REFERENCE_IMAGE_CHUNK)
  const visibleReferenceImages = referenceImages.slice(0, INLINE_REFERENCE_IMAGE_LIMIT)
  const hiddenReferenceCount = Math.max(0, referenceImages.length - visibleReferenceImages.length)
  const managerReferenceImages = referenceImages.slice(0, managerVisibleCount)
  const managerHiddenCount = Math.max(0, referenceImages.length - managerReferenceImages.length)

  function openManager() {
    setManagerVisibleCount(MANAGER_REFERENCE_IMAGE_CHUNK)
    setManagerPreview(null)
    setManagerOpen(true)
  }

  function handleManagerOpenChange(open: boolean) {
    if (open) setManagerVisibleCount(MANAGER_REFERENCE_IMAGE_CHUNK)
    if (!open) setManagerPreview(null)
    setManagerOpen(open)
  }

  const dropzone = useDropzone({
    accept: Object.fromEntries(AGENT_IMAGE_MIME_TYPES.map((type) => [type, []])),
    multiple: true,
    onDrop: (files) => {
      const accepted = files.filter(isSupportedAgentImage)
      if (accepted.length === 0) {
        setError(REFERENCE_IMAGE_ERROR)
        return
      }
      if (accepted.length < files.length) {
        setError(REFERENCE_IMAGE_ERROR)
      } else {
        setError(undefined)
      }
      addReferenceFiles(accepted)
    },
    onDropRejected: () => {
      setError(REFERENCE_IMAGE_ERROR)
    },
  })

  return (
    <section className="grid min-h-0 gap-2 rounded-xl bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-sm font-semibold">参考图</p>
          {referenceImages.length > 0 ? <span className="text-xs text-muted-foreground">{referenceImages.length} 张</span> : null}
        </div>
        {referenceImages.length > 0 ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={openManager}>
              <Images className="h-3.5 w-3.5" />
              管理全部
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => confirm('确定清空当前已上传的全部参考图？') && clearReferenceImages()}
            >
              清空
            </Button>
          </div>
        ) : null}
      </div>
      <div
        {...dropzone.getRootProps()}
        className="grid min-h-16 cursor-pointer place-items-center rounded-xl bg-muted/40 px-3 py-2 text-center transition hover:bg-primary/5"
      >
        <input {...dropzone.getInputProps({ 'aria-label': '上传参考图' })} />
        <div>
          <ImagePlus className="mx-auto h-4 w-4 text-muted-foreground" />
          <p className="mt-1 text-sm font-medium">拖拽或点击上传参考图</p>
          <p className="mt-0.5 text-xs text-muted-foreground">PNG / JPEG / WEBP，原图上传</p>
        </div>
      </div>

      {referenceImages.length > 0 ? (
        <div className="grid min-h-0 gap-2">
          <div className="grid grid-cols-4 gap-2">
            {visibleReferenceImages.map((item) => (
              <ReferenceThumb
                key={item.id}
                fileName={item.file.name}
                previewUrl={item.previewUrl}
                onPreview={() => setPreview({ src: item.previewUrl, title: '参考图预览', fileName: item.file.name })}
                onRemove={() => removeReferenceImage(item.id)}
              />
            ))}
          </div>
          {hiddenReferenceCount > 0 ? (
            <Button type="button" size="sm" variant="outline" className="h-7 w-full text-xs" onClick={openManager}>
              还有 {hiddenReferenceCount} 张，查看全部
            </Button>
          ) : null}
        </div>
      ) : null}

      <Dialog open={managerOpen} onOpenChange={handleManagerOpenChange}>
        <DialogContent className="max-h-[88svh] overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>全部参考图</DialogTitle>
            <p className="text-xs text-muted-foreground">
              共 {referenceImages.length} 张，已显示 {managerReferenceImages.length} 张，点击缩略图可以预览。
            </p>
          </DialogHeader>
          <div
            data-testid="reference-manager-grid"
            className="scrollbar-none grid max-h-[68svh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4"
          >
            {managerReferenceImages.map((item) => (
              <ReferenceThumb
                key={item.id}
                fileName={item.file.name}
                previewUrl={item.previewUrl}
                large
                onPreview={() => setManagerPreview({ src: item.previewUrl, title: '参考图预览', fileName: item.file.name })}
                onRemove={() => removeReferenceImage(item.id)}
              />
            ))}
            {managerHiddenCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="col-span-full"
                onClick={() => setManagerVisibleCount((count) => count + MANAGER_REFERENCE_IMAGE_CHUNK)}
              >
                再显示 {Math.min(MANAGER_REFERENCE_IMAGE_CHUNK, managerHiddenCount)} 张
              </Button>
            ) : null}
          </div>
          {managerPreview ? (
            <div data-testid="reference-manager-preview" className="absolute inset-0 z-10 grid grid-rows-[auto_minmax(0,1fr)] rounded-xl bg-popover">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-base font-medium">{managerPreview.title || '参考图预览'}</p>
                  {managerPreview.fileName ? <p className="truncate text-xs text-muted-foreground">{managerPreview.fileName}</p> : null}
                </div>
                <Button type="button" size="icon" variant="ghost" title="关闭参考图预览" aria-label="关闭参考图预览" onClick={() => setManagerPreview(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="scrollbar-none grid min-h-0 place-items-center overflow-auto bg-muted p-4">
                <img
                  src={managerPreview.src}
                  alt={managerPreview.fileName || managerPreview.title || '参考图预览'}
                  className="max-h-[72svh] max-w-full object-contain"
                  decoding="async"
                  draggable={false}
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ImagePreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </section>
  )
}

function ReferenceThumb({
  fileName,
  previewUrl,
  large = false,
  onPreview,
  onRemove,
}: {
  fileName: string
  previewUrl: string
  large?: boolean
  onPreview: () => void
  onRemove: () => void
}) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-muted shadow-sm ring-1 ring-border/50 [contain-intrinsic-size:144px_144px] [content-visibility:auto]">
      <button
        type="button"
        className="block w-full"
        title="预览参考图"
        onClick={onPreview}
      >
        <img
          src={previewUrl}
          alt={fileName}
          className={large ? 'aspect-square w-full object-cover' : 'aspect-square w-full object-cover'}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <span className="sr-only">{fileName}</span>
      </button>
      <div className="absolute right-1 top-1 flex gap-1">
        <button
          type="button"
          className="inline-flex size-6 items-center justify-center rounded-md bg-slate-950/65 text-white shadow-sm transition-colors hover:bg-slate-950/85"
          title="预览参考图"
          onClick={onPreview}
        >
          <Eye className="size-3.5" />
        </button>
        <button
          type="button"
          className="inline-flex size-6 items-center justify-center rounded-md bg-slate-950/65 text-white shadow-sm transition-colors hover:bg-destructive"
          title="删除参考图"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {large ? (
        <p className="absolute inset-x-0 bottom-0 truncate bg-slate-950/65 px-2 py-1 text-xs text-white">
          {fileName}
        </p>
      ) : null}
    </div>
  )
}
