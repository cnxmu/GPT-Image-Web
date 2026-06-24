import { useLiveQuery } from 'dexie-react-hooks'
import {
  DEFAULT_GENERATION_CONCURRENCY,
  DEFAULT_NANO_BANANA_DETAILED_MODELS_ENABLED,
  MAX_GENERATION_CONCURRENCY,
  MIN_GENERATION_CONCURRENCY,
} from '../../lib/constants'
import { db } from '../../db/db'
import {
  clampGenerationConcurrency,
  normalizeNanoBananaDetailedModelsEnabled,
  setGenerationConcurrency,
  setNanoBananaDetailedModelsEnabled,
} from '../../db/settings.repo'
import { Field } from '../workbench/field'
import { Input } from '@/components/ui/input'

export function GenerationSafetyField() {
  const concurrency =
    useLiveQuery(async () => {
      const record = await db.settings.get('generationConcurrency')
      return clampGenerationConcurrency(record?.value)
    }, []) || DEFAULT_GENERATION_CONCURRENCY
  const detailedModelsEnabled =
    useLiveQuery(async () => {
      const record = await db.settings.get('nanoBananaDetailedModelsEnabled')
      return normalizeNanoBananaDetailedModelsEnabled(record?.value)
    }, []) ?? DEFAULT_NANO_BANANA_DETAILED_MODELS_ENABLED

  return (
    <div className="grid gap-4">
      <Field label="生成并发上限" hint={`默认 ${DEFAULT_GENERATION_CONCURRENCY}，可设 ${MIN_GENERATION_CONCURRENCY}-${MAX_GENERATION_CONCURRENCY}。数值越高越容易触发限流和浏览器内存压力。`}>
        <Input
          type="number"
          min={MIN_GENERATION_CONCURRENCY}
          max={MAX_GENERATION_CONCURRENCY}
          value={concurrency}
          onChange={(event) => setGenerationConcurrency(Number(event.target.value))}
        />
      </Field>
      <Field label="Nano Banana 详细模型" hint="关闭时只使用 nano-banana-2 / nano-banana-pro；开启后显示 1K、2K、4K 详细模型。">
        <label className="flex h-9 cursor-pointer items-center justify-between rounded-lg bg-muted/45 px-3 text-sm">
          <span>{detailedModelsEnabled ? '已启用' : '已关闭'}</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={detailedModelsEnabled}
            onChange={(event) => setNanoBananaDetailedModelsEnabled(event.target.checked)}
          />
        </label>
      </Field>
    </div>
  )
}
