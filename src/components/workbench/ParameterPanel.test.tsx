import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWorkbenchStore } from '../../store/workbench.store'
import { ParameterPanel } from './ParameterPanel'

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => undefined)

let detailedModelsEnabled = false

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: () => detailedModelsEnabled,
}))

vi.mock('../../db/db', () => ({
  db: {
    settings: {
      get: vi.fn(),
    },
  },
}))

describe('ParameterPanel', () => {
  afterEach(() => {
    cleanup()
    detailedModelsEnabled = false
    useWorkbenchStore.getState().resetForm()
    useWorkbenchStore.getState().resetRuntimeStateForTest()
  })

  it('does not show output mode controls', () => {
    render(<ParameterPanel />)

    expect(screen.queryByText('输出方式')).toBeNull()
    expect(screen.queryByRole('button', { name: '流式' })).toBeNull()
    expect(screen.queryByRole('button', { name: '非流式' })).toBeNull()
  })

  it('hides detailed model choices for nano-banana families by default', async () => {
    render(<ParameterPanel />)

    fireEvent.click(screen.getByRole('combobox', { name: /生图模型/i }))
    fireEvent.click(await screen.findByRole('option', { name: 'nano-banana-2' }))

    expect(useWorkbenchStore.getState()).toMatchObject({
      imageModelFamily: 'nano-banana-2',
      imageModel: 'nano-banana-2',
    })
    expect(screen.queryByText('详细模型')).toBeNull()
    expect(screen.getByText('当前模型')).toBeTruthy()

    useWorkbenchStore.getState().setImageModel('nano-banana-2-4K')
    expect(useWorkbenchStore.getState().imageModel).toBe('nano-banana-2-4K')
    expect(screen.getAllByText('nano-banana-2')).toHaveLength(2)
  })

  it('shows detailed model choices when the setting is enabled', async () => {
    detailedModelsEnabled = true
    render(<ParameterPanel />)

    fireEvent.click(screen.getByRole('combobox', { name: /生图模型/i }))
    fireEvent.click(await screen.findByRole('option', { name: 'nano-banana-pro' }))

    expect(screen.getByText('详细模型')).toBeTruthy()
    fireEvent.click(screen.getByRole('combobox', { name: /详细模型/i }))
    fireEvent.click(await screen.findByRole('option', { name: 'nano-banana-pro-4K' }))

    expect(useWorkbenchStore.getState()).toMatchObject({
      imageModelFamily: 'nano-banana-pro',
      imageModel: 'nano-banana-pro-4K',
    })
  })

  it('shows nano-banana parameters and hides images api-only controls', async () => {
    render(<ParameterPanel />)

    fireEvent.click(screen.getByRole('combobox', { name: /生图模型/i }))
    fireEvent.click(await screen.findByRole('option', { name: 'nano-banana-pro' }))

    expect(screen.getByText('最大 Token')).toBeTruthy()
    expect(screen.getByText(/采样温度/)).toBeTruthy()
    expect(screen.getByText(/核采样/)).toBeTruthy()
    expect(screen.getByText('采样种子')).toBeTruthy()
    expect(screen.queryByText('质量')).toBeNull()
    expect(screen.queryByText('审查')).toBeNull()
    expect(screen.queryByText('输出格式')).toBeNull()
    expect(screen.queryByText(/压缩率/)).toBeNull()
  })
})
