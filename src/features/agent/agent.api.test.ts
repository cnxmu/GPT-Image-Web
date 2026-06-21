import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseAgentChatResponse, parseOptimizedPromptCandidate, sendAgentChatMessage } from './agent.api'

const formSnapshot = {
  mode: 'generation',
  prompt: '提示词',
  negativePrompt: '',
  aspectRatio: '1:1',
  resolutionTier: '1K',
  size: '1024x1024',
  quality: 'high',
  moderation: 'auto',
  count: 1,
  compressionRate: 0.8,
  outputFormat: 'png',
} as const

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parseOptimizedPromptCandidate', () => {
  it('parses strict JSON candidates', () => {
    const candidate = parseOptimizedPromptCandidate(
      JSON.stringify({
        prompt: '电影感咖啡杯，柔和侧光，浅景深',
        negativePrompt: '低清晰度，变形，水印',
        comparisonPoints: ['补充了镜头语言', '增加了光线细节'],
      }),
      '咖啡杯',
      '',
    )

    expect(candidate.prompt).toContain('电影感咖啡杯')
    expect(candidate.negativePrompt).toContain('低清晰度')
    expect(candidate.comparisonPoints).toEqual(['补充了镜头语言', '增加了光线细节'])
  })

  it('falls back to section parsing for non-json text', () => {
    const candidate = parseOptimizedPromptCandidate(
      `正向提示词：精致陶瓷咖啡杯，电商主图，干净背景\n负面提示词：模糊，噪点，文字，水印\n对比说明：主体更明确\n- 增加了商业摄影风格`,
      '咖啡杯',
      '',
    )

    expect(candidate.prompt).toContain('精致陶瓷咖啡杯')
    expect(candidate.negativePrompt).toContain('模糊')
    expect(candidate.comparisonPoints.join(' ')).toContain('主体更明确')
  })

  it('generates a negative prompt when the model omits one', () => {
    const candidate = parseOptimizedPromptCandidate('{"prompt":"清晰的人像摄影","comparisonPoints":["补充了摄影风格"]}', '人像', '')

    expect(candidate.prompt).toBe('清晰的人像摄影')
    expect(candidate.negativePrompt.length).toBeGreaterThan(0)
    expect(candidate.comparisonPoints).toEqual(['补充了摄影风格'])
  })
})

describe('parseAgentChatResponse', () => {
  it('parses JSON chat replies with proposed actions', () => {
    const response = parseAgentChatResponse(
      JSON.stringify({
        reply: '我整理了一组可确认动作。',
        proposedActions: [
          {
            type: 'formPatch',
            title: '改成雨夜霓虹风格',
            payload: {
              formPatch: {
                prompt: '雨夜霓虹街道，电影感构图，湿润反光路面',
                negativePrompt: '模糊，低清晰度，水印，文字',
              },
            },
          },
          {
            type: 'generate',
            title: '应用并生成',
            payload: {
              formPatch: {
                aspectRatio: '16:9',
              },
            },
          },
        ],
      }),
    )

    expect(response.reply).toBe('我整理了一组可确认动作。')
    expect(response.proposedActions).toHaveLength(2)
    expect(response.proposedActions?.[0]).toMatchObject({
      type: 'formPatch',
      title: '改成雨夜霓虹风格',
      status: 'pending',
    })
    expect(response.proposedActions?.[1]).toMatchObject({
      type: 'generate',
      title: '应用并生成',
      status: 'pending',
    })
  })

  it('parses createTemplate actions', () => {
    const response = parseAgentChatResponse(
      JSON.stringify({
        reply: '可以保存成模板。',
        proposedActions: [
          {
            type: 'createTemplate',
            title: '保存海报模板',
            payload: {
              name: '海报模板',
              description: '适合产品海报',
              formPatch: {
                prompt: '产品海报',
                aspectRatio: '4:3',
              },
            },
          },
        ],
      }),
    )

    expect(response.reply).toBe('可以保存成模板。')
    expect(response.proposedActions).toHaveLength(1)
    expect(response.proposedActions?.[0]).toMatchObject({
      type: 'createTemplate',
      title: '保存海报模板',
      status: 'pending',
      payload: {
        name: '海报模板',
        description: '适合产品海报',
        formPatch: {
          prompt: '产品海报',
          aspectRatio: '4:3',
        },
      },
    })
  })

  it('falls back to plain assistant text for non-json replies', () => {
    const response = parseAgentChatResponse('可以，我先帮你细化一下画面方向。')

    expect(response.reply).toBe('可以，我先帮你细化一下画面方向。')
    expect(response.proposedActions).toBeUndefined()
  })
})

describe('sendAgentChatMessage', () => {
  it('sends image inputs with original detail for gpt-5.5', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: '{"reply":"已分析","proposedActions":[]}' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await sendAgentChatMessage({
      apiKey: 'agent-key',
      model: 'gpt-5.5',
      messages: [],
      formSnapshot,
      templates: [],
      history: [],
      imageInputs: [
        {
          attachment: {
            id: 'img_1',
            assetId: 'asset_1',
            fileName: 'a.png',
            mimeType: 'image/png',
            sizeBytes: 10,
          },
          dataUrl: 'data:image/png;base64,aaa',
        },
      ],
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body.input[1].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'input_image',
          image_url: 'data:image/png;base64,aaa',
          detail: 'original',
        }),
      ]),
    )
  })

  it('falls back image detail to high for other agent models', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ output_text: '{"reply":"已分析","proposedActions":[]}' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await sendAgentChatMessage({
      apiKey: 'agent-key',
      model: 'gpt-5.4-mini',
      messages: [],
      formSnapshot,
      templates: [],
      history: [],
      imageInputs: [
        {
          attachment: {
            id: 'img_1',
            assetId: 'asset_1',
            fileName: 'a.png',
            mimeType: 'image/png',
            sizeBytes: 10,
          },
          dataUrl: 'data:image/png;base64,aaa',
        },
      ],
    })

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body.input[1].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'input_image',
          detail: 'high',
        }),
      ]),
    )
  })
})
