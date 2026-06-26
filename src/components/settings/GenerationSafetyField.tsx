import { useLiveQuery } from 'dexie-react-hooks'
import {
  DEFAULT_GENERATION_CONCURRENCY,
  MAX_GENERATION_CONCURRENCY,
  MIN_GENERATION_CONCURRENCY,
} from '../../lib/constants'
import { db } from '../../db/db'
import {
  clampGenerationConcurrency,
  setGenerationConcurrency,
} from '../../db/settings.repo'
import { Field } from '../workbench/field'
import { Input } from '@/components/ui/input'

export function GenerationSafetyField() {
  const concurrency =
    useLiveQuery(async () => {
      const record = await db.settings.get('generationConcurrency')
      return clampGenerationConcurrency(record?.value)
    }, []) || DEFAULT_GENERATION_CONCURRENCY
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
    </div>
  )
}
