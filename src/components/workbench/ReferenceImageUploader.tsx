import { Eye, ImagePlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { AGENT_IMAGE_MIME_TYPES, isSupportedAgentImage } from '../../features/agent/agent-images'
import { useWorkbenchStore } from '../../store/workbench.store'
import { Button } from '@/components/ui/button'
import { ImagePreviewDialog, type ImagePreviewData } from './ImagePreviewDialog'

const REFERENCE_IMAGE_ERROR = '请选择 PNG、JPEG 或 WEBP 图片'

export function ReferenceImageUploader() {
  const referenceImages = useWorkbenchStore((state) => state.referenceImages)
  const addReferenceFiles = useWorkbenchStore((state) => state.addReferenceFiles)
  const removeReferenceImage = useWorkbenchStore((state) => state.removeReferenceImage)
  const setError = useWorkbenchStore((state) => state.setError)
  const [preview, setPreview] = useState<ImagePreviewData | null>(null)

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
    <section className="grid gap-3">
      <p className="text-sm font-semibold">参考图</p>
      <div
        {...dropzone.getRootProps()}
        className="grid min-h-28 cursor-pointer place-items-center rounded-xl bg-muted/40 px-4 py-5 text-center transition hover:bg-primary/5"
      >
        <input {...dropzone.getInputProps({ 'aria-label': '上传参考图' })} />
        <div>
          <ImagePlus className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">拖拽或点击上传参考图</p>
          <p className="mt-1 text-xs text-muted-foreground">仅支持 PNG、JPEG、WEBP，原图上传，不压缩不转码</p>
        </div>
      </div>

      {referenceImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {referenceImages.map((item) => (
            <div key={item.id} className="group relative overflow-hidden rounded-xl bg-muted">
              <button
                type="button"
                className="block w-full"
                title="预览参考图"
                onClick={() => setPreview({ src: item.previewUrl, title: '参考图预览', fileName: item.file.name })}
              >
                <img src={item.previewUrl} alt={item.file.name} className="aspect-square w-full object-cover" />
              </button>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-slate-950/70 px-2 py-1.5">
                <p className="truncate text-xs text-white">{item.file.name}</p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title="预览参考图"
                    onClick={() => setPreview({ src: item.previewUrl, title: '参考图预览', fileName: item.file.name })}
                  >
                    <Eye className="h-4 w-4 text-white" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" title="删除参考图" onClick={() => removeReferenceImage(item.id)}>
                    <Trash2 className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <ImagePreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </section>
  )
}
