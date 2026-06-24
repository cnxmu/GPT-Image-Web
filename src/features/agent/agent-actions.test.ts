import { describe, expect, it } from 'vitest'
import { useWorkbenchStore } from '../../store/workbench.store'
import type { AgentProposedAction } from '../../types/api'
import { getActionTemplateDraft } from './agent-actions'

describe('agent actions', () => {
  it('uses the default base model when a createTemplate action only patches the image model family', () => {
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
      title: '保存 Nano Banana Pro 模板',
      status: 'pending',
      payload: {
        formPatch: {
          imageModelFamily: 'nano-banana-pro',
        },
      },
    }

    const draft = getActionTemplateDraft(action, useWorkbenchStore.getState())

    expect(draft.imageModelFamily).toBe('nano-banana-pro')
    expect(draft.imageModel).toBe('nano-banana-pro')
  })

  it('derives the image model family from a detailed model in createTemplate actions', () => {
    useWorkbenchStore.getState().resetForm()

    const action: AgentProposedAction = {
      id: 'action_2',
      type: 'createTemplate',
      title: '保存 Nano Banana 2 模板',
      status: 'pending',
      payload: {
        formPatch: {
          imageModel: 'nano-banana-2-4K',
        },
      },
    }

    const draft = getActionTemplateDraft(action, useWorkbenchStore.getState())

    expect(draft.imageModelFamily).toBe('nano-banana-2')
    expect(draft.imageModel).toBe('nano-banana-2-4K')
  })
})
