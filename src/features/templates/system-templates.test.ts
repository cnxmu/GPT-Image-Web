import { describe, expect, it } from 'vitest'
import type { TemplateRecord } from '../../types/template'
import { SYSTEM_TEMPLATES, mergeSystemTemplates } from './system-templates'

function userTemplate(partial: Partial<TemplateRecord> = {}): TemplateRecord {
  return {
    id: 'user_template',
    source: 'user',
    name: '用户模板',
    mode: 'generation',
    prompt: '用户提示词',
    negativePrompt: '用户负面词',
    aspectRatio: '1:1',
    resolutionTier: '1K',
    size: '1024x1024',
    quality: 'high',
    moderation: 'auto',
    count: 1,
    compressionRate: 0.8,
    outputFormat: 'png',
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z',
    ...partial,
  }
}

describe('system templates', () => {
  it('returns built-in templates when user templates are empty', () => {
    expect(mergeSystemTemplates([])).toEqual(SYSTEM_TEMPLATES)
    expect(SYSTEM_TEMPLATES.map((template) => template.name)).toEqual(
      expect.arrayContaining([
        '头像生成预设模板',
        '壁纸生成预设模板',
        '电商图生成预设模板',
        '产品海报预设模板',
        '公众号封面/头图预设模板',
        '视频封面预设模板',
        '小红书封面预设模板',
        '内容头图预设模板',
        '短视频竖版封面预设模板',
      ]),
    )
  })

  it('merges system and user templates', () => {
    const merged = mergeSystemTemplates([userTemplate()])

    expect(merged[0].source).toBe('system')
    expect(merged.at(-1)).toMatchObject({
      id: 'user_template',
      source: 'user',
    })
  })

  it('deduplicates user templates that collide with system ids', () => {
    const duplicate = userTemplate({ id: SYSTEM_TEMPLATES[0].id })
    const merged = mergeSystemTemplates([duplicate])

    expect(merged.filter((template) => template.id === SYSTEM_TEMPLATES[0].id)).toHaveLength(1)
  })
})
