import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface ImagePreviewData {
  src: string
  title?: string
  fileName?: string
  width?: number
  height?: number
}

export function ImagePreviewDialog({
  preview,
  onClose,
}: {
  preview: ImagePreviewData | null
  onClose: () => void
}) {
  return (
    <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="px-4 py-3">
          <DialogTitle>{preview?.title || '图片预览'}</DialogTitle>
          {preview?.fileName ? (
            <p className="truncate pr-8 text-xs text-muted-foreground">
              {preview.fileName}
              {preview.width && preview.height ? ` · ${preview.width}x${preview.height}` : ''}
            </p>
          ) : null}
        </DialogHeader>
        {preview ? (
          <div className="scrollbar-none grid max-h-[78svh] place-items-center overflow-auto bg-muted p-4">
            <img src={preview.src} alt={preview.fileName || preview.title || '图片预览'} className="max-h-[74svh] max-w-full object-contain" />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
