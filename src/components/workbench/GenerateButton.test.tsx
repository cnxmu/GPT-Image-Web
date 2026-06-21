import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWorkbenchStore } from '../../store/workbench.store'
import { GenerateButton } from './GenerateButton'

const generateMutate = vi.fn()

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => 20,
}))

vi.mock('../../db/db', () => ({
  db: {
    settings: {
      get: vi.fn(async () => ({ id: 'generationConcurrency', value: 20 })),
    },
  },
}))

vi.mock('../../features/image/useGenerateImages', () => ({
  useGenerateImagesMutation: () => ({
    mutate: generateMutate,
    isPending: false,
  }),
}))

describe('GenerateButton', () => {
  afterEach(() => {
    cleanup()
    generateMutate.mockReset()
    vi.restoreAllMocks()
    useWorkbenchStore.getState().resetForm()
    useWorkbenchStore.getState().resetRuntimeStateForTest()
  })

  it('asks for confirmation before submitting a large batch', () => {
    useWorkbenchStore.getState().setCount(25)
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)

    render(<GenerateButton />)
    fireEvent.click(screen.getByRole('button', { name: '开始生成' }))

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('本次将提交 25 张图片生成任务'))
    expect(generateMutate).not.toHaveBeenCalled()
  })

  it('submits small batches without confirmation', () => {
    useWorkbenchStore.getState().setCount(2)
    const confirmSpy = vi.spyOn(window, 'confirm')

    render(<GenerateButton />)
    fireEvent.click(screen.getByRole('button', { name: '开始生成' }))

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(generateMutate).toHaveBeenCalledTimes(1)
  })
})
