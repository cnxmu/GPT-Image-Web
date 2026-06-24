import {
  ASPECT_RATIOS,
  IMAGE_MODEL_FAMILIES,
  IMAGE_QUALITIES,
  MAX_IMAGE_COUNT,
  MAX_NANO_BANANA_TEMPERATURE,
  MAX_NANO_BANANA_TOP_P,
  MIN_IMAGE_COUNT,
  MIN_NANO_BANANA_MAX_TOKENS,
  MIN_NANO_BANANA_TEMPERATURE,
  MIN_NANO_BANANA_TOP_P,
  MODERATION_LEVELS,
  OUTPUT_FORMATS,
  RESOLUTION_TIERS,
  getImageModelOptions,
  shouldSendOutputCompression,
  type ImageModel,
  type ImageModelFamily,
  type ImageQuality,
  type ModerationLevel,
  type OutputFormat,
} from '../../lib/constants'
import { useWorkbenchStore } from '../../store/workbench.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field } from './field'

export function ParameterPanel() {
  const state = useWorkbenchStore()
  const compressionEnabled = shouldSendOutputCompression(state.outputFormat)
  const isNanoBanana = state.imageModelFamily !== 'gpt-image-2'

  return (
    <section className="grid gap-4">
        <p className="text-sm font-semibold">参数</p>
        <Field label="模式">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <Button
              type="button"
              variant={state.mode === 'generation' ? 'secondary' : 'ghost'}
              className="h-8"
              onClick={() => state.setMode('generation')}
            >
              文生图
            </Button>
            <Button
              type="button"
              variant={state.mode === 'edit' ? 'secondary' : 'ghost'}
              className="h-8"
              onClick={() => state.setMode('edit')}
            >
              图生图
            </Button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="生图模型">
            <Select value={state.imageModelFamily} onValueChange={(value) => state.setImageModelFamily(value as ImageModelFamily)}>
              <SelectTrigger className="w-full" aria-label="生图模型">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_MODEL_FAMILIES.map((family) => (
                  <SelectItem key={family} value={family}>
                    {family}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {state.imageModelFamily === 'gpt-image-2' ? (
            <Field label="当前模型">
              <div className="flex h-9 items-center rounded-md bg-muted/45 px-3 text-sm">{state.imageModel}</div>
            </Field>
          ) : (
            <Field label="详细模型">
              <Select value={state.imageModel} onValueChange={(value) => state.setImageModel(value as ImageModel)}>
                <SelectTrigger className="w-full" aria-label="详细模型">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getImageModelOptions(state.imageModelFamily).map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>

        <Field label="构图比例">
          <div className="grid grid-cols-4 gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <Button
                key={ratio}
                type="button"
                size="sm"
                variant={state.aspectRatio === ratio ? 'default' : 'outline'}
                onClick={() => state.setAspectRatio(ratio)}
              >
                {ratio}
              </Button>
            ))}
          </div>
        </Field>

        {isNanoBanana ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="数量" hint="批量生成由本地队列逐张发送，接口 n 保持 1。">
                <Input
                  type="number"
                  min={MIN_IMAGE_COUNT}
                  max={MAX_IMAGE_COUNT}
                  value={state.count}
                  onChange={(event) => state.setCount(Number(event.target.value))}
                />
              </Field>
              <Field label="最大 Token">
                <Input
                  type="number"
                  min={MIN_NANO_BANANA_MAX_TOKENS}
                  value={state.nanoBananaMaxTokens}
                  onChange={(event) => state.setNanoBananaMaxTokens(Number(event.target.value))}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={`采样温度 ${state.nanoBananaTemperature}`}>
                <input
                  className="w-full accent-primary"
                  type="range"
                  min={MIN_NANO_BANANA_TEMPERATURE}
                  max={MAX_NANO_BANANA_TEMPERATURE}
                  step={0.1}
                  value={state.nanoBananaTemperature}
                  onChange={(event) => state.setNanoBananaTemperature(Number(event.target.value))}
                />
              </Field>
              <Field label={`核采样 ${state.nanoBananaTopP}`}>
                <input
                  className="w-full accent-primary"
                  type="range"
                  min={MIN_NANO_BANANA_TOP_P}
                  max={MAX_NANO_BANANA_TOP_P}
                  step={0.05}
                  value={state.nanoBananaTopP}
                  onChange={(event) => state.setNanoBananaTopP(Number(event.target.value))}
                />
              </Field>
            </div>

            <Field label="采样种子" hint="留空时由模型自行决定。">
              <Input
                type="number"
                value={state.nanoBananaSeed ?? ''}
                onChange={(event) =>
                  state.setNanoBananaSeed(event.target.value === '' ? undefined : Number(event.target.value))
                }
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="分辨率档位">
              <div className="grid grid-cols-3 gap-2">
                {RESOLUTION_TIERS.map((tier) => (
                  <Button
                    key={tier}
                    type="button"
                    size="sm"
                    variant={state.resolutionTier === tier ? 'default' : 'outline'}
                    onClick={() => state.setResolutionTier(tier)}
                  >
                    {tier}
                  </Button>
                ))}
              </div>
            </Field>

            <div className="rounded-xl bg-muted/45 px-3 py-2">
              <p className="text-xs text-muted-foreground">最终尺寸</p>
              <p className="mt-1 text-lg font-semibold">{state.size}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="质量">
                <Select value={state.quality} onValueChange={(value) => state.setQuality(value as ImageQuality)}>
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
                <Select value={state.moderation} onValueChange={(value) => state.setModeration(value as ModerationLevel)}>
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

            <div className="grid grid-cols-2 gap-3">
              <Field label="输出格式">
                <Select value={state.outputFormat} onValueChange={(value) => state.setOutputFormat(value as OutputFormat)}>
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

              <Field label="数量">
                <Input
                  type="number"
                  min={MIN_IMAGE_COUNT}
                  max={MAX_IMAGE_COUNT}
                  value={state.count}
                  onChange={(event) => state.setCount(Number(event.target.value))}
                />
              </Field>
            </div>

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
                onChange={(event) => state.setCompressionRate(Number(event.target.value))}
              />
            </Field>
          </>
        )}
    </section>
  )
}
