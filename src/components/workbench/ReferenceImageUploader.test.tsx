import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

  it('keeps extra reference images behind the manager entry', async () => {
    render(<ReferenceImageUploader />)

    const files = Array.from({ length: 6 }, (_, index) => new File(['image'], `reference-${index}.png`, { type: 'image/png' }))
    const input = screen.getByLabelText('上传参考图') as HTMLInputElement
    fireEvent.change(input, { target: { files } })

    await waitFor(() => {
      expect(useWorkbenchStore.getState().referenceImages).toHaveLength(6)
    })
    expect(screen.getByRole('button', { name: '还有 2 张，查看全部' })).toBeTruthy()
    expect(screen.queryByText('reference-5.png')).toBeNull()
  })

  it('keeps the manager dialog open after closing a reference preview', async () => {
    render(<ReferenceImageUploader />)

    const files = Array.from({ length: 5 }, (_, index) => new File(['image'], `reference-${index}.png`, { type: 'image/png' }))
    const input = screen.getByLabelText('上传参考图') as HTMLInputElement
    fireEvent.change(input, { target: { files } })

    await screen.findByRole('button', { name: '还有 1 张，查看全部' })
    fireEvent.click(screen.getByRole('button', { name: '还有 1 张，查看全部' }))
    expect(await screen.findByRole('heading', { name: '全部参考图' })).toBeTruthy()

    const managerGrid = screen.getByTestId('reference-manager-grid')
    fireEvent.click(within(managerGrid).getAllByTitle('预览参考图')[0])
    expect(screen.getByTestId('reference-manager-preview')).toBeTruthy()
    fireEvent.click(screen.getByTitle('关闭参考图预览'))

    await waitFor(() => {
      expect(screen.queryByTestId('reference-manager-preview')).toBeNull()
      expect(screen.getByRole('heading', { name: '全部参考图' })).toBeTruthy()
    })
  })

  it('renders large manager lists in chunks', async () => {
    render(<ReferenceImageUploader />)

    const files = Array.from({ length: 30 }, (_, index) => new File(['image'], `reference-${index}.png`, { type: 'image/png' }))
    const input = screen.getByLabelText('上传参考图') as HTMLInputElement
    fireEvent.change(input, { target: { files } })

    await screen.findByRole('button', { name: '还有 26 张，查看全部' })
    fireEvent.click(screen.getByRole('button', { name: '还有 26 张，查看全部' }))

    expect(await screen.findByText('共 30 张，已显示 24 张，点击缩略图可以预览。')).toBeTruthy()
    expect(screen.getByRole('button', { name: '再显示 6 张' })).toBeTruthy()
    expect(screen.queryByText('reference-29.png')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '再显示 6 张' }))
    await waitFor(() => {
      expect(screen.getAllByText('reference-29.png').length).toBeGreaterThan(0)
    })
  })

  it('clears all uploaded reference images after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    render(<ReferenceImageUploader />)

    const files = [
      new File(['image'], 'reference-a.png', { type: 'image/png' }),
      new File(['image'], 'reference-b.webp', { type: 'image/webp' }),
    ]
    const input = screen.getByLabelText('上传参考图') as HTMLInputElement
    fireEvent.change(input, { target: { files } })

    await waitFor(() => {
      expect(useWorkbenchStore.getState().referenceImages).toHaveLength(2)
    })
    fireEvent.click(screen.getByRole('button', { name: '清空' }))

    await waitFor(() => {
      expect(useWorkbenchStore.getState().referenceImages).toHaveLength(0)
    })
  })

  it('keeps uploaded reference images when clearing is canceled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    render(<ReferenceImageUploader />)

    const file = new File(['image'], 'reference.png', { type: 'image/png' })
    const input = screen.getByLabelText('上传参考图') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(useWorkbenchStore.getState().referenceImages).toHaveLength(1)
    })
    fireEvent.click(screen.getByRole('button', { name: '清空' }))

    expect(useWorkbenchStore.getState().referenceImages).toHaveLength(1)
  })
})
