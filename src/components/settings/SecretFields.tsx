import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../db/db'
import { deleteSecret, setSecret } from '../../db/secrets.repo'
import type { SecretRecord } from '../../types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '../workbench/field'

export function SecretFields() {
  const secrets = useLiveQuery(() => db.secrets.toArray(), [], [])
  const imageSecret = secrets.find((item) => item.id === 'imageApiKey')?.value || ''
  const agentSecret = secrets.find((item) => item.id === 'agentApiKey')?.value || ''
  const [imageApiKey, setImageApiKey] = useState<string | undefined>()
  const [agentApiKey, setAgentApiKey] = useState<string | undefined>()
  const [visible, setVisible] = useState(false)
  const currentImageApiKey = imageApiKey ?? imageSecret
  const currentAgentApiKey = agentApiKey ?? agentSecret

  return (
    <div className="grid gap-4">
      <SecretField
        id="imageApiKey"
        label="生图 API Key"
        value={currentImageApiKey}
        visible={visible}
        onChange={setImageApiKey}
      />
      <SecretField
        id="agentApiKey"
        label="Agent API Key"
        value={currentAgentApiKey}
        visible={visible}
        onChange={setAgentApiKey}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => Promise.all([setSecret('imageApiKey', currentImageApiKey.trim()), setSecret('agentApiKey', currentAgentApiKey.trim())])}
        >
          保存密钥
        </Button>
        <Button type="button" variant="secondary" onClick={() => setVisible((value) => !value)}>
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {visible ? '隐藏' : '显示'}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => confirm('确定清除全部密钥？') && Promise.all([deleteSecret('imageApiKey'), deleteSecret('agentApiKey')])}
        >
          <Trash2 className="h-4 w-4" />
          清除密钥
        </Button>
      </div>
    </div>
  )
}

function SecretField({
  id,
  label,
  value,
  visible,
  onChange,
}: {
  id: SecretRecord['id']
  label: string
  value: string
  visible: boolean
  onChange: (value: string) => void
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete="off"
          placeholder={`${label}，仅保存到本机 IndexedDB`}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button type="button" size="icon" variant="outline" title={`清除${label}`} onClick={() => deleteSecret(id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Field>
  )
}
