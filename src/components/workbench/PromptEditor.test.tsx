import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PromptEditor } from './PromptEditor'
import { useWorkbenchStore } from '../../store/workbench.store'

const mutateAsync = vi.fn()

vi.mock('../../features/agent/useOptimizePrompt', () => ({
  useOptimizePromptMutation: () => ({
    mutateAsync,
    isPending: false,
  }),
}))

describe('PromptEditor', () => {
  afterEach(() => {
    mutateAsync.mockReset()
    useWorkbenchStore.setState({
      prompt: '',
      negativePrompt: '',
      error: undefined,
    })
  })

  it('applies optimized prompt and negative prompt together', async () => {
    useWorkbenchStore.setState({
      prompt: '咖啡杯',
      negativePrompt: '',
    })
    mutateAsync.mockResolvedValue({
      prompt: '电影感咖啡杯，干净背景',
      negativePrompt: '模糊，水印，文字',
      comparisonPoints: ['主体更明确'],
    })

    render(<PromptEditor />)

    fireEvent.click(screen.getByRole('button', { name: /帮我优化/ }))

    await screen.findByText('优化后的提示词')
    expect(mutateAsync).toHaveBeenCalledWith({ prompt: '咖啡杯', negativePrompt: '' })

    fireEvent.click(screen.getByRole('button', { name: '使用这版' }))

    await waitFor(() => {
      expect(useWorkbenchStore.getState().prompt).toBe('电影感咖啡杯，干净背景')
      expect(useWorkbenchStore.getState().negativePrompt).toBe('模糊，水印，文字')
      expect(screen.queryByText('给我的优化候选')).toBeNull()
    })
  })
})
