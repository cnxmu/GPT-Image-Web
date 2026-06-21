import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useWorkbenchStore } from '../../store/workbench.store'
import { ParameterPanel } from './ParameterPanel'

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
})
