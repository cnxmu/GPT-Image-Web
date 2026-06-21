import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SYSTEM_TEMPLATES } from '../../features/templates/system-templates'
import { useWorkbenchStore } from '../../store/workbench.store'
import type { TemplateRecord } from '../../types/template'
import { SidebarTemplates } from './SidebarTemplates'

const deleteTemplate = vi.fn()
let mockTemplates: TemplateRecord[] = []

vi.mock('../../features/templates/useTemplates', () => ({
  useTemplates: () => mockTemplates,
}))

vi.mock('../../db/templates.repo', () => ({
  deleteTemplate: (id: string) => deleteTemplate(id),
  upsertTemplate: vi.fn(),
}))

function userTemplate(): TemplateRecord {
  return {
    id: 'user_template',
    source: 'user',
    name: '个人模板',
    mode: 'generation',
    prompt: '个人提示词',
    negativePrompt: '个人负面词',
    aspectRatio: '16:9',
    resolutionTier: '1K',
    size: '1920x1080',
    quality: 'high',
    moderation: 'auto',
    count: 1,
    compressionRate: 0.8,
    outputFormat: 'png',
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z',
  }
}

describe('SidebarTemplates', () => {
  afterEach(() => {
    cleanup()
    mockTemplates = []
    deleteTemplate.mockReset()
    useWorkbenchStore.getState().resetForm()
    useWorkbenchStore.getState().resetRuntimeStateForTest()
  })

  it('keeps system templates collapsed by default and expands them on demand', () => {
    mockTemplates = [SYSTEM_TEMPLATES[0]]

    render(<SidebarTemplates />)

    expect(screen.queryByText('个人头像预设')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /内置预设/ }))

    expect(screen.getByText('个人头像预设')).toBeTruthy()
    expect(screen.getAllByText('内置预设').length).toBeGreaterThan(0)
    expect(screen.queryByTitle('删除个人模板')).toBeNull()
  })

  it('applies a system template when clicked', () => {
    mockTemplates = [SYSTEM_TEMPLATES[0]]

    render(<SidebarTemplates />)
    fireEvent.click(screen.getByRole('button', { name: /内置预设/ }))
    fireEvent.click(screen.getByText('个人头像预设'))

    expect(useWorkbenchStore.getState()).toMatchObject({
      prompt: SYSTEM_TEMPLATES[0].prompt,
      aspectRatio: SYSTEM_TEMPLATES[0].aspectRatio,
      outputFormat: SYSTEM_TEMPLATES[0].outputFormat,
    })
  })

  it('keeps delete available for user templates', () => {
    mockTemplates = [userTemplate()]

    render(<SidebarTemplates />)
    fireEvent.click(screen.getByTitle('删除个人模板'))

    expect(deleteTemplate).toHaveBeenCalledWith('user_template')
  })
})
