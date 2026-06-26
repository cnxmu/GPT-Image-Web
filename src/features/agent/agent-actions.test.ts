import { describe, expect, it } from 'vitest'
import { useWorkbenchStore } from '../../store/workbench.store'
import type { AgentProposedAction } from '../../types/api'
import { getActionTemplateDraft } from './agent-actions'

describe('agent actions', () => {
  it('saves createTemplate actions as user templates with the fixed image model', () => {
    useWorkbenchStore.getState().resetForm()
    useWorkbenchStore.setState({
      imageModelFamily: 'gpt-image-2',
      imageModel: 'gpt-image-2',
      prompt: '当前提示词',
      negativePrompt: '当前负面词',
    })

    const action: AgentProposedAction = {
      id: 'action_1',
      type: 'createTemplate',
      title: '保存人像模板',
      status: 'pending',
      payload: {
        name: '人像模板',
        description: '适合个人头像',
        formPatch: {
          prompt: '清晰自然的人像摄影',
          aspectRatio: '1:1',
        },
      },
    }

    const draft = getActionTemplateDraft(action, useWorkbenchStore.getState())

    expect(draft.source).toBe('user')
    expect(draft.name).toBe('人像模板')
    expect(draft.description).toBe('适合个人头像')
    expect(draft.imageModelFamily).toBe('gpt-image-2')
    expect(draft.imageModel).toBe('gpt-image-2')
    expect(draft.prompt).toBe('清晰自然的人像摄影')
  })

  it('ignores unsupported model patches in createTemplate actions', () => {
    useWorkbenchStore.getState().resetForm()

    const action: AgentProposedAction = {
      id: 'action_2',
      type: 'createTemplate',
      title: '保存产品模板',
      status: 'pending',
      payload: {
        formPatch: {
          imageModel: 'unknown-image-model',
          imageModelFamily: 'unknown-family',
        },
      },
    }

    const draft = getActionTemplateDraft(action, useWorkbenchStore.getState())

    expect(draft.imageModelFamily).toBe('gpt-image-2')
    expect(draft.imageModel).toBe('gpt-image-2')
  })
})
