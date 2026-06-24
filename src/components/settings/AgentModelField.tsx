import { useLiveQuery } from 'dexie-react-hooks'
import { AGENT_MODELS, DEFAULT_AGENT_MODEL, type AgentModel } from '../../lib/constants'
import { db } from '../../db/db'
import { setAgentModel } from '../../db/settings.repo'
import { Field } from '../workbench/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function AgentModelField() {
  const model =
    useLiveQuery(async () => {
      const record = await db.settings.get('agentModel')
      return typeof record?.value === 'string' && AGENT_MODELS.includes(record.value as AgentModel)
        ? (record.value as AgentModel)
        : DEFAULT_AGENT_MODEL
    }, []) || DEFAULT_AGENT_MODEL

  return (
    <Field label="Agent 模型" hint="用于提示词优化和个人 Agent 对话，不影响右侧选择的生图模型。">
      <Select value={model} onValueChange={(value) => setAgentModel(value as AgentModel)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AGENT_MODELS.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
