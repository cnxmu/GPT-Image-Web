import { useMutation } from '@tanstack/react-query'
import { getSecret } from '../../db/secrets.repo'
import { getAgentModel } from '../../db/settings.repo'
import { AppError } from '../../lib/errors'
import { optimizePrompt } from './agent.api'

export function useOptimizePromptMutation() {
  return useMutation({
    mutationFn: async ({ prompt, negativePrompt }: { prompt: string; negativePrompt: string }) => {
      const apiKey = (await getSecret('agentApiKey'))?.value
      if (!apiKey) throw new AppError('MISSING_AGENT_API_KEY', '请先在个人设置中保存 Agent API Key')
      if (!prompt.trim()) throw new AppError('INVALID_FORM', '请输入你想优化的提示词')
      const model = await getAgentModel()
      return optimizePrompt({
        apiKey,
        model,
        prompt,
        negativePrompt,
      })
    },
  })
}
