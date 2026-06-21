import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWorkbenchStore } from '../../store/workbench.store'
import { ReferenceImageUploader } from './ReferenceImageUploader'

describe('ReferenceImageUploader', () => {
  afterEach(() => {
    cleanup()
    useWorkbenchStore.getState().clearReferenceImages()
    useWorkbenchStore.getState().setError(undefined)
    vi.restoreAllMocks()
  })

  it('adds supported PNG/JPEG/WEBP files without changing the original file', async () => {
    render(<ReferenceImageUploader />)

    const file = new File(['image'], 'reference.webp', { type: 'image/webp' })
    const input = screen.getByLabelText('上传参考图') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(useWorkbenchStore.getState().referenceImages[0].file).toBe(file)
      expect(useWorkbenchStore.getState().error).toBeUndefined()
    })
  })

  it('opens and closes a preview dialog for uploaded reference images', async () => {
    render(<ReferenceImageUploader />)

    const file = new File(['image'], 'reference.png', { type: 'image/png' })
    const input = screen.getByLabelText('上传参考图') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await screen.findByText('reference.png')
    fireEvent.click(screen.getAllByTitle('预览参考图')[0])

    expect(await screen.findByRole('heading', { name: '参考图预览' })).toBeTruthy()
    expect(screen.getAllByText('reference.png').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '参考图预览' })).toBeNull()
      expect(useWorkbenchStore.getState().referenceImages).toHaveLength(1)
    })
  })

  it('rejects GIF reference images', async () => {
    render(<ReferenceImageUploader />)

    const file = new File(['image'], 'animated.gif', { type: 'image/gif' })
    const input = screen.getByLabelText('上传参考图') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(useWorkbenchStore.getState().referenceImages).toHaveLength(0)
      expect(useWorkbenchStore.getState().error).toBe('请选择 PNG、JPEG 或 WEBP 图片')
    })
  })
})
