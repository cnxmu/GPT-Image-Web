import {
  ASPECT_RATIOS,
  IMAGE_MODEL_FAMILIES,
  IMAGE_QUALITIES,
  MAX_IMAGE_COUNT,
  MIN_IMAGE_COUNT,
  MODERATION_LEVELS,
  OUTPUT_FORMATS,
  RESOLUTION_TIERS,
  shouldSendOutputCompression,
  type ImageQuality,
  type ImageModelFamily,
  type ModerationLevel,
  type OutputFormat,
} from '../../lib/constants'
import { useWorkbenchStore } from '../../store/workbench.store'
import { useShallow } from 'zustand/shallow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field } from './field'

export function ParameterPanel() {
  const state = useWorkbenchStore(
    useShallow((s) => ({
      mode: s.mode,
      imageModelFamily: s.imageModelFamily,
      aspectRatio: s.aspectRatio,
      resolutionTier: s.resolutionTier,
      size: s.size,
      quality: s.quality,
      moderation: s.moderation,
      count: s.count,
      compressionRate: s.compressionRate,
      outputFormat: s.outputFormat,
    })),
  )
  const setMode = useWorkbenchStore((s) => s.setMode)
  const setImageModelFamily = useWorkbenchStore((s) => s.setImageModelFamily)
  const setAspectRatio = useWorkbenchStore((s) => s.setAspectRatio)
  const setResolutionTier = useWorkbenchStore((s) => s.setResolutionTier)
  const setQuality = useWorkbenchStore((s) => s.setQuality)
  const setModeration = useWorkbenchStore((s) => s.setModeration)
  const setCount = useWorkbenchStore((s) => s.setCount)
  const setCompressionRate = useWorkbenchStore((s) => s.setCompressionRate)
  const setOutputFormat = useWorkbenchStore((s) => s.setOutputFormat)
  const compressionEnabled = shouldSendOutputCompression(state.outputFormat)
  const isNanoBanana = state.imageModelFamily === 'nano-banana-2' || state.imageModelFamily === 'nano-banana-pro'

  return (
    <section className="grid gap-3">
      <p className="text-sm font-semibold">参数</p>

      <Field label="模式">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <Button
            type="button"
            variant={state.mode === 'generation' ? 'secondary' : 'ghost'}
            className="h-7"
            onClick={() => setMode('generation')}
          >
            文生图
          </Button>
          <Button
            type="button"
            variant={state.mode === 'edit' ? 'secondary' : 'ghost'}
            className="h-7"
            onClick={() => setMode('edit')}
          >
            图生图
          </Button>
        </div>
      </Field>

      <Field label="生图模型">
        <Select value={state.imageModelFamily} onValueChange={(value) => setImageModelFamily(value as ImageModelFamily)}>
          <SelectTrigger className="w-full" aria-label="生图模型">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_MODEL_FAMILIES.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs leading-4 text-muted-foreground">
          Nano Banana 使用单独的 Nano Banana API Key。
        </p>
      </Field>

      <Field label="构图比例">
        <div className="grid grid-cols-4 gap-1.5">
          {ASPECT_RATIOS.map((ratio) => (
            <Button
              key={ratio}
              type="button"
              size="sm"
              variant={state.aspectRatio === ratio ? 'default' : 'outline'}
              onClick={() => setAspectRatio(ratio)}
            >
              {ratio}
            </Button>
          ))}
        </div>
      </Field>

      <Field label="分辨率档位">
        <div className="grid grid-cols-3 gap-1.5">
          {RESOLUTION_TIERS.map((tier) => (
            <Button
              key={tier}
              type="button"
              size="sm"
              variant={state.resolutionTier === tier ? 'default' : 'outline'}
              onClick={() => setResolutionTier(tier)}
            >
              {tier}
            </Button>
          ))}
        </div>
      </Field>

      <div className="flex items-center justify-between rounded-lg bg-muted/45 px-3 py-1.5">
        <p className="text-xs text-muted-foreground">最终尺寸</p>
        <p className="text-sm font-semibold">{state.size}</p>
      </div>

      {isNanoBanana ? (
        <div className="rounded-lg bg-muted/45 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Nano Banana 仅使用构图比例和分辨率档位作为图片参数；质量、审查、输出格式和压缩率是 gpt-image-2 专属参数。
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="质量">
              <Select value={state.quality} onValueChange={(value) => setQuality(value as ImageQuality)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_QUALITIES.map((quality) => (
                    <SelectItem key={quality} value={quality}>
                      {quality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="审查">
              <Select value={state.moderation} onValueChange={(value) => setModeration(value as ModerationLevel)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODERATION_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="输出格式">
            <Select value={state.outputFormat} onValueChange={(value) => setOutputFormat(value as OutputFormat)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_FORMATS.map((format) => (
                  <SelectItem key={format} value={format}>
                    {format.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label={`压缩率 ${Math.round(state.compressionRate * 100)}%`}
            hint={compressionEnabled ? '仅影响 JPEG / WebP 输出。' : 'PNG 为无损格式，请求不会传 output_compression。'}
          >
            <input
              className="w-full accent-primary disabled:opacity-40"
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              value={state.compressionRate}
              disabled={!compressionEnabled}
              onChange={(event) => setCompressionRate(Number(event.target.value))}
            />
          </Field>
        </>
      )}

      <Field label="数量">
        <Input
          type="number"
          min={MIN_IMAGE_COUNT}
          max={MAX_IMAGE_COUNT}
          value={state.count}
          onChange={(event) => setCount(Number(event.target.value))}
        />
      </Field>
    </section>
  )
}
