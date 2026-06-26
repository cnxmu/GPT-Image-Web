import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useWorkbenchStore } from '../../store/workbench.store'
import { ParameterPanel } from './ParameterPanel'

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => undefined)

describe('ParameterPanel', () => {
  afterEach(() => {
    cleanup()
    useWorkbenchStore.getState().resetForm()
    useWorkbenchStore.getState().resetRuntimeStateForTest()
  })

  it('does not show output mode controls', () => {
    render(<ParameterPanel />)

    expect(screen.queryByText('输出方式')).toBeNull()
    expect(screen.queryByRole('button', { name: '流式' })).toBeNull()
    expect(screen.queryByRole('button', { name: '非流式' })).toBeNull()
  })

  it('shows selectable image models', () => {
    render(<ParameterPanel />)

    expect(screen.getByText('gpt-image-2')).toBeTruthy()
    fireEvent.click(screen.getByRole('combobox', { name: '生图模型' }))
    expect(screen.getByText('nano-banana-2')).toBeTruthy()
    expect(screen.getByText('nano-banana-pro')).toBeTruthy()
  })

  it('updates resolution tier and target size', () => {
    render(<ParameterPanel />)

    fireEvent.click(screen.getByRole('button', { name: '4K' }))

    expect(useWorkbenchStore.getState()).toMatchObject({
      resolutionTier: '4K',
      size: '4096x4096',
    })
    expect(screen.getByText('4096x4096')).toBeTruthy()
  })

  it('keeps image API controls visible', () => {
    render(<ParameterPanel />)

    expect(screen.getByText('质量')).toBeTruthy()
    expect(screen.getByText('审查')).toBeTruthy()
    expect(screen.getByText('输出格式')).toBeTruthy()
    expect(screen.getByText(/压缩率/)).toBeTruthy()
  })

  it('hides gpt-image-2-only controls for Nano Banana models', () => {
    render(<ParameterPanel />)

    fireEvent.click(screen.getByRole('combobox', { name: '生图模型' }))
    fireEvent.click(screen.getByText('nano-banana-pro'))

    expect(screen.queryByText('质量')).toBeNull()
    expect(screen.queryByText('审查')).toBeNull()
    expect(screen.queryByText('输出格式')).toBeNull()
    expect(screen.queryByText(/^压缩率 \d+%$/)).toBeNull()
    expect(screen.getByText(/Nano Banana 仅使用构图比例和分辨率档位/)).toBeTruthy()
    expect(screen.getByText('数量')).toBeTruthy()
  })
})
