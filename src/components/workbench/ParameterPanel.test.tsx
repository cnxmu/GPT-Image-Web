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

  it('shows only gpt-image-2 as the image model', () => {
    render(<ParameterPanel />)

    expect(screen.getByText('gpt-image-2')).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: /生图模型/i })).toBeNull()
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
})
