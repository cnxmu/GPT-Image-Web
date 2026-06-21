import type { TemplateRecord } from '../../types/template'

const SYSTEM_TIME = '2026-06-20T00:00:00.000Z'
const DEFAULT_NEGATIVE =
  '低清晰度，模糊，畸变，比例错误，多余肢体，文字乱码，水印，logo，噪点，过曝，欠曝，边缘破碎，重复主体'

export const SYSTEM_TEMPLATES: TemplateRecord[] = [
  {
    id: 'system_avatar_portrait',
    source: 'system',
    name: '个人头像预设',
    description: '适合个人头像、职业头像、社交平台头像，主体清晰，背景干净。',
    mode: 'generation',
    prompt:
      '生成一张高质量人物头像，主体为一位气质自然、自信、亲和的人物，半身近景构图，面部清晰，眼神自然，柔和棚拍光线，干净简洁背景，细腻皮肤质感，真实摄影风格，适合作为社交头像、职业头像和个人品牌头像。',
    negativePrompt: DEFAULT_NEGATIVE,
    aspectRatio: '1:1',
    resolutionTier: '1K',
    size: '1024x1024',
    quality: 'high',
    moderation: 'auto',
    count: 4,
    compressionRate: 0.8,
    outputFormat: 'png',
    createdAt: SYSTEM_TIME,
    updatedAt: SYSTEM_TIME,
  },
  {
    id: 'system_wallpaper_desktop',
    source: 'system',
    name: '个人壁纸预设',
    description: '适合桌面或横版壁纸，强调沉浸感、层次和留白。',
    mode: 'generation',
    prompt:
      '生成一张高质感横版壁纸，画面具有强烈空间层次和沉浸氛围，主体不拥挤，保留适合桌面图标的干净留白，电影级光影，细节丰富但不杂乱，色彩高级，画面清晰锐利，适合电脑桌面背景。',
    negativePrompt: DEFAULT_NEGATIVE,
    aspectRatio: '16:9',
    resolutionTier: '2K',
    size: '2560x1440',
    quality: 'high',
    moderation: 'auto',
    count: 2,
    compressionRate: 0.8,
    outputFormat: 'png',
    createdAt: SYSTEM_TIME,
    updatedAt: SYSTEM_TIME,
  },
  {
    id: 'system_ecommerce_product',
    source: 'system',
    name: '个人电商图预设',
    description: '适合商品主图、详情页卖点图和场景展示图。',
    mode: 'generation',
    prompt:
      '生成一张专业电商商品图，商品作为画面核心主体，轮廓清晰，材质真实，背景干净高级，光线柔和均匀，突出商品卖点和品质感，适合电商主图、详情页首屏和商品展示页面，构图简洁，商业摄影风格。',
    negativePrompt:
      '低清晰度，模糊，商品变形，材质错误，杂乱背景，多余文字，错误文字，水印，logo，手部畸形，重复商品，过度反光，阴影脏乱',
    aspectRatio: '1:1',
    resolutionTier: '1K',
    size: '1024x1024',
    quality: 'high',
    moderation: 'auto',
    count: 4,
    compressionRate: 0.8,
    outputFormat: 'png',
    createdAt: SYSTEM_TIME,
    updatedAt: SYSTEM_TIME,
  },
  {
    id: 'system_product_poster',
    source: 'system',
    name: '个人产品海报预设',
    description: '适合新品发布、活动促销、品牌视觉和产品广告海报。',
    mode: 'generation',
    prompt:
      '生成一张高级产品广告海报，产品居于视觉中心，具备强烈品牌感和商业冲击力，背景具有层次和氛围，光影精致，构图适合添加标题与卖点文案，画面留出清晰文字区域，整体风格现代、干净、高端，适合新品发布和活动推广。',
    negativePrompt:
      '低清晰度，模糊，产品变形，文字乱码，过多文字，水印，logo，杂乱排版，廉价质感，边缘破碎，比例错误，过曝，欠曝',
    aspectRatio: '4:3',
    resolutionTier: '2K',
    size: '2048x1536',
    quality: 'high',
    moderation: 'auto',
    count: 2,
    compressionRate: 0.8,
    outputFormat: 'png',
    createdAt: SYSTEM_TIME,
    updatedAt: SYSTEM_TIME,
  },
  {
    id: 'system_social_wechat_cover',
    source: 'system',
    name: '公众号封面个人预设',
    description: '适合微信公众号文章封面、头图和专题首图。',
    mode: 'generation',
    prompt:
      '生成一张适合微信公众号文章的封面头图，主题明确，视觉中心突出，构图稳定，保留标题文字区域，背景干净有层次，信息感强但不拥挤，适合知识分享、品牌内容、专题文章和活动推文。',
    negativePrompt: DEFAULT_NEGATIVE,
    aspectRatio: '16:9',
    resolutionTier: '1K',
    size: '1920x1080',
    quality: 'high',
    moderation: 'auto',
    count: 2,
    compressionRate: 0.8,
    outputFormat: 'png',
    createdAt: SYSTEM_TIME,
    updatedAt: SYSTEM_TIME,
  },
  {
    id: 'system_social_video_cover',
    source: 'system',
    name: '视频封面个人预设',
    description: '适合横版视频封面、课程封面、栏目封面。',
    mode: 'generation',
    prompt:
      '生成一张高点击率横版视频封面，主体鲜明，情绪和主题一眼可识别，画面对比清晰，背景有冲击力但不杂乱，保留大标题文字区域，适合知识视频、评测视频、教程视频和栏目封面。',
    negativePrompt:
      '低清晰度，模糊，文字乱码，水印，logo，主体太小，构图拥挤，表情怪异，边缘破碎，过度锐化，低质感',
    aspectRatio: '16:9',
    resolutionTier: '1K',
    size: '1920x1080',
    quality: 'high',
    moderation: 'auto',
    count: 3,
    compressionRate: 0.8,
    outputFormat: 'png',
    createdAt: SYSTEM_TIME,
    updatedAt: SYSTEM_TIME,
  },
  {
    id: 'system_social_xiaohongshu_cover',
    source: 'system',
    name: '小红书封面个人预设',
    description: '适合小红书笔记封面、种草内容和生活方式内容。',
    mode: 'generation',
    prompt:
      '生成一张适合小红书笔记的封面图，竖版构图，视觉清爽，主体明确，色彩明亮高级，生活方式氛围强，适合添加醒目标题与标签，画面有分享感、种草感和真实感。',
    negativePrompt:
      '低清晰度，模糊，文字乱码，水印，logo，构图混乱，过度滤镜，肤色异常，主体变形，廉价贴纸感，噪点',
    aspectRatio: '3:4',
    resolutionTier: '1K',
    size: '768x1024',
    quality: 'high',
    moderation: 'auto',
    count: 4,
    compressionRate: 0.8,
    outputFormat: 'png',
    createdAt: SYSTEM_TIME,
    updatedAt: SYSTEM_TIME,
  },
  {
    id: 'system_social_article_header',
    source: 'system',
    name: '内容头图个人预设',
    description: '适合博客、知识库、官网文章和长内容头图。',
    mode: 'generation',
    prompt:
      '生成一张适合内容文章的头图，主题抽象但清晰，画面具有专业感和知识感，构图简洁，留出标题区域，适合博客、知识库、专题页、官网文章和内容营销页面。',
    negativePrompt: DEFAULT_NEGATIVE,
    aspectRatio: '21:9',
    resolutionTier: '1K',
    size: '1792x768',
    quality: 'high',
    moderation: 'auto',
    count: 2,
    compressionRate: 0.8,
    outputFormat: 'png',
    createdAt: SYSTEM_TIME,
    updatedAt: SYSTEM_TIME,
  },
  {
    id: 'system_social_short_video_vertical',
    source: 'system',
    name: '短视频竖版个人预设',
    description: '适合抖音、视频号、快手等竖版短视频封面。',
    mode: 'generation',
    prompt:
      '生成一张竖版短视频封面，主体强烈突出，第一眼有吸引力，构图适合手机屏幕浏览，上方或中间保留大标题空间，色彩对比清晰，氛围明确，适合短视频平台推荐流。',
    negativePrompt:
      '低清晰度，模糊，文字乱码，水印，logo，主体太小，画面杂乱，过曝，欠曝，表情怪异，人物比例错误，廉价质感',
    aspectRatio: '9:16',
    resolutionTier: '1K',
    size: '1080x1920',
    quality: 'high',
    moderation: 'auto',
    count: 3,
    compressionRate: 0.8,
    outputFormat: 'png',
    createdAt: SYSTEM_TIME,
    updatedAt: SYSTEM_TIME,
  },
]

export function mergeSystemTemplates(userTemplates: TemplateRecord[] = []) {
  const systemIds = new Set(SYSTEM_TEMPLATES.map((template) => template.id))
  const safeUserTemplates = userTemplates
    .filter((template) => !systemIds.has(template.id))
    .map((template) => ({ ...template, source: template.source || 'user' as const }))

  return [...SYSTEM_TEMPLATES, ...safeUserTemplates]
}
