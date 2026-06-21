import { useMutation } from '@tanstack/react-query'
import { getSecret } from '../../db/secrets.repo'
import { getAgentModel } from '../../db/settings.repo'
import { AppError } from '../../lib/errors'
import type { AgentChatMessage } from '../../types/api'
import type { HistoryRecord } from '../../types/history'
import type { ImageFormState } from '../../types/image'
import type { TemplateRecord } from '../../types/template'
import { sendAgentChatMessage } from './agent.api'
import { collectAgentImageInputs } from './agent-images'

export function useAgentChatMutation() {
  return useMutation({
    mutationFn: async ({
      messages,
      formSnapshot,
      templates,
      history,
    }: {
      messages: AgentChatMessage[]
      formSnapshot: ImageFormState
      templates: TemplateRecord[]
      history: HistoryRecord[]
    }) => {
      const apiKey = (await getSecret('agentApiKey'))?.value
      if (!apiKey) throw new AppError('MISSING_AGENT_API_KEY', '请先在个人设置中保存 Agent API Key')
      const model = await getAgentModel()
      const imageInputs = await collectAgentImageInputs(messages)
      return sendAgentChatMessage({
        apiKey,
        model,
        messages,
        formSnapshot,
        templates,
        history,
        imageInputs,
      })
    },
  })
}
