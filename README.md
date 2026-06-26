# GPT Image Web - AI 生图工作站

GPT Image Web 是一个网页端 AI 生图工作站，集中支持文生图、图生图、批量生成队列、历史结果回显、模板管理、参考图预览、Agent 图片分析和提示词优化工作流。

GitHub 仓库：<https://github.com/cnxmu/GPT-Image-Web>

## 主要能力

- 多模型生图：支持 `gpt-image-2`、`nano-banana-2`、`nano-banana-pro`。
- 文生图 / 图生图：参考图按原图上传，不压缩、不转码。
- 批量队列：数量支持 `1-100`，单次请求固定 `n=1`，前端拆分为逐张任务。
- 并发保护：默认并发 `10`，最大并发 `10`，超过并发的任务自动排队等待。
- 当前结果区：新一轮生成只显示当前批次，旧批次保存在历史中。
- 运行中历史：生成批次创建时立即写入占位结果，刷新后会尝试恢复未完成任务。
- 本地图片资产：参考图、Agent 图片和生成结果保存到浏览器 IndexedDB。
- 本地 Blob 优先：结果保存成功后，结果卡片、预览和历史回显优先使用本地 `blob:` 地址。
- 模板系统：支持用户模板和内置头像、壁纸、电商图、产品海报、社媒封面等预设。
- Agent 工作流：支持多会话、图片分析、提示词优化、参数建议、模板创建、历史回显和确认后生成。
- 图片限制：参考图和 Agent 图片只支持 PNG、JPEG、WEBP，不支持 GIF/SVG。
- 交互反馈：结果图支持预览、下载、复制；下载/复制会显示加载、成功和失败反馈。
- 本地数据治理：支持清空历史、清空模板、清理未引用图片、保留最近 N 条历史或 Agent 会话。
- SEO：包含完整 title、description、canonical、Open Graph、Twitter Card、JSON-LD、manifest、robots 和 sitemap。

## 技术栈

- Vite 8
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui + Radix UI
- Zustand
- Dexie / IndexedDB
- TanStack Query
- react-dropzone
- Vitest

## 快速开始

```bash
npm install
npm run dev
```

默认开发地址通常是：

```text
http://127.0.0.1:5173/
```

常用命令：

```bash
npm run dev      # 本地开发
npm run build    # 生产构建，输出 dist/
npm run preview  # 本地预览生产包
npm run test     # 单元测试
npm run lint     # 代码检查
```

## 首次使用

打开网页后，进入右上角“个人设置”：

- 填写“生图 API Key”
- 如果使用 `nano-banana-2` 或 `nano-banana-pro`，填写“Nano Banana API Key”
- 填写“Agent API Key”
- 选择 Agent 模型：`gpt-5.5`、`gpt-5.4`、`gpt-5.4-mini`
- 按需调整“生成并发上限”，最大为 `10`

密钥、历史、模板、Agent 会话和图片资产都只保存在当前浏览器 IndexedDB。

## 模型与接口

接口基地址在 [src/lib/constants.ts](E:/Users/cnxmu/Documents/kaifa/生图工作站-网页端/src/lib/constants.ts:1)：

```ts
export const API_BASE_URL = 'https://api.google.com'
```

当前接口：

- `gpt-image-2` 文生图：`POST /v1/images/generations`
- `gpt-image-2` 图生图：`POST /v1/images/edits`
- `nano-banana-2`：`POST /v1beta/models/nano-banana-2:generateContent`
- `nano-banana-pro`：`POST /v1beta/models/nano-banana-pro:generateContent`
- Agent：`POST /v1/responses`

密钥分开保存：

- `gpt-image-2` 使用“生图 API Key”。
- `nano-banana-2` / `nano-banana-pro` 使用“Nano Banana API Key”。
- Agent 使用“Agent API Key”。

普通图片接口单次请求固定 `n: 1`。数量大于 1 时，由前端队列拆成多次请求。

Nano Banana 使用 `generateContent`：

- 文生图发送文本内容。
- 图生图把参考图原始文件作为 `inlineData` 发送。
- 构图比例传到 `generationConfig.imageConfig.aspectRatio`。
- 分辨率档位传到 `generationConfig.imageConfig.imageSize`。
- 固定 `responseModalities: ["IMAGE"]`、`thinkingConfig.thinkingLevel: "minimal"`、`tools: []`。
- 不发送 `quality`、`moderation`、`output_format`、`output_compression`。

## 生图参数

右侧“个人生成设置”支持：

- 模式：文生图 / 图生图
- 生图模型：`gpt-image-2`、`nano-banana-2`、`nano-banana-pro`
- 构图比例：`1:1`、`3:2`、`2:3`、`16:9`、`9:16`、`4:3`、`3:4`、`21:9`
- 分辨率档位：`1K`、`2K`、`4K`
- 最终尺寸：由构图比例和分辨率档位自动计算
- 数量：`1-100`

仅 `gpt-image-2` 支持：

- 质量：`low`、`medium`、`high`、`auto`
- 审查：`auto`、`low`
- 输出格式：`png`、`jpeg`、`webp`
- 压缩率：仅 JPEG / WebP 会传 `output_compression`，PNG 不传

选择 Nano Banana 时，页面会隐藏这些 `gpt-image-2` 专属参数。

## 图片与历史

生成完成后，应用会先读取结果图的真实尺寸，再把图片保存为 IndexedDB 中的 Blob 资产。保存成功后：

- 运行态结果不再依赖远程图片 URL。
- 历史记录保存 `localAssetId`，不保存大段 base64。
- 结果卡片、预览弹窗、历史回显优先使用本地 `blob:` 地址。
- 删除历史会同步删除该历史引用的结果图和图生图参考图资产。

刷新页面会中断浏览器原请求。应用启动时会扫描 `running` 历史，把未完成 job 重新入队续跑；图生图会尝试从本地资产恢复原始参考图。

## Agent

Agent 使用 `/v1/responses`。它会收到当前表单摘要、最多 30 个模板摘要、最多 30 条历史摘要、最近消息和最多 8 张图片输入。

Agent 可以提出这些确认动作：

- `formPatch`：预览并应用参数/提示词改动
- `generate`：应用建议并开始生成
- `applyTemplate`：应用指定模板
- `showHistoryResult`：回显指定历史
- `createTemplate`：保存为个人模板
- `explain`：纯文字解释

所有会改表单、创建模板、回显历史或触发生图的动作，都需要手动确认。

## 本地数据

IndexedDB 数据库名：`ImageWorkbenchDB`。

会保存：

- 生图 API Key
- Nano Banana API Key
- Agent API Key
- 设置项
- 用户模板
- 历史记录
- 图生图参考图
- Agent 会话
- Agent 上传图片
- 生成结果图片

个人设置中可以：

- 清空历史
- 清空用户模板
- 清理未引用图片
- 保留最近 20 / 50 / 100 条历史
- 保留最近 20 / 50 / 100 条 Agent 会话
- 清除本地数据

## SEO

项目已经内置 SEO 文件：

- `index.html`
- `public/robots.txt`
- `public/sitemap.xml`
- `public/manifest.webmanifest`
- `public/og-image.png`
- `public/ai-img.svg`

默认站点地址使用 `https://tu.xmu.la/`。如果部署到其它域名，请同步修改：

- `index.html` 中的 canonical、Open Graph、Twitter Card、JSON-LD 地址
- `public/robots.txt` 中的 Sitemap 地址
- `public/sitemap.xml` 中的站点 URL 和图片 URL
- `public/manifest.webmanifest` 中的 `id`

## 部署

生产构建：

```bash
npm run build
```

只需要上传 `dist/` 目录里的内容到服务器站点根目录。详见 [部署文档.md](./部署文档.md)。

## 文档

- [使用文档.md](./使用文档.md)
- [部署文档.md](./部署文档.md)
