# 个人 AI 生图控制台 - 网页端

一个面向个人用户的 AI 生图控制台，支持文生图、图生图、批量队列、我的历史回显、个人模板管理、提示词优化，以及带图片分析能力的 Agent 对话工作流。

GitHub 仓库：<https://github.com/cnxmu/GPT-Image-Web>

## 功能概览

- 文生图和图生图：支持 `gpt-image-2`、`nano-banana-2`、`nano-banana-pro`。
- 批量队列：数量会拆成多次请求逐张发送，单次请求固定 `n=1`。
- 可配置并发：默认并发上限 `20`，可在设置中调整为 `1-100`。
- 当前轮结果区：新一轮生成只显示当前批次；旧批次进入“我的历史”。
- 我的历史回显：点击历史可回填参数，并显示历史结果或恢复中的运行批次。
- 刷新续跑：页面刷新后会自动恢复未完成的本地生成任务。
- 本地图片资产：参考图、Agent 图片和新生成结果都保存在本机 IndexedDB 里。
- 参考图与对话图片预览：支持大图查看。
- 个人 Agent：支持多会话、图片分析、参数建议、应用模板、展示历史、创建模板、确认后生成。
- 内置预设模板：头像、壁纸、电商图、产品海报、公众号封面、视频封面、小红书封面、内容头图、短视频竖版封面。
- 基础 SEO：包含标题、描述、关键词、Open Graph、Twitter Card、JSON-LD、`robots.txt`、`sitemap.xml`、`manifest.webmanifest`。

## 模型说明

### `gpt-image-2`

- 文生图走 `/v1/images/generations`
- 图生图走 `/v1/images/edits`
- 当前可调参数：
  - 构图比例
  - 分辨率档位
  - 最终尺寸
  - 质量
  - 审查
  - 输出格式
  - 数量
  - 压缩率

### `nano-banana-2` / `nano-banana-pro`

- 文生图和图生图都走 `/v1/chat/completions`
- 支持详细模型切换：
  - `nano-banana-2`
  - `nano-banana-2-1K`
  - `nano-banana-2-2K`
  - `nano-banana-2-4K`
  - `nano-banana-pro-1K`
  - `nano-banana-pro-2K`
  - `nano-banana-pro-4K`
- 当前可调参数：
  - 构图比例
  - 数量
  - 最大 Token
  - 采样温度
  - 核采样
  - 采样种子
- Nano Banana 不使用 `gpt-image-2` 那套质量、审查、输出格式、压缩率、最终尺寸参数面板。
- 可单独填写 “Nano Banana API Key”；留空时会回退使用普通“生图 API Key”。

### 关于 `524`

如果 Nano Banana 生成时出现 `524`，通常表示中转站等待上游模型响应超时，不是前端本地存储的问题。现在代码已经做了几项减压处理：

- Nano Banana 默认 `max_tokens` 为 `1024`
- 请求会尽量只发送必要提示内容
- `seed` 为空时不会发送空值字段

如果仍偶发 `524`，优先尝试：

- 换成 `1K` 或更低细节模型
- 数量先设为 `1`
- 减少参考图数量
- 稍后重试

## 技术栈

- Vite
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui + Radix UI
- Zustand
- Dexie / IndexedDB
- TanStack Query
- Vitest

## 快速开始

```bash
npm install
npm run dev
```

默认开发地址通常为：

```text
http://127.0.0.1:5173/
```

## 常用命令

```bash
npm run dev      # 本地开发
npm run build    # 生产构建，输出 dist/
npm run preview  # 本地预览生产包
npm run test     # 单元测试
npm run lint     # 代码检查
```

## 首次使用

打开网页后，点击右上角“个人设置”：

- 填写“生图 API Key”
- 按需填写 “Nano Banana API Key（可选）”
- 填写 “Agent API Key”
- 选择 Agent 模型：`gpt-5.5`、`gpt-5.4`、`gpt-5.4-mini`
- 调整生成并发上限：默认 `20`，范围 `1-100`

密钥、模板、历史、会话和图片资产都只保存在当前浏览器的 IndexedDB。

## 如何修改 API 端点

当前版本的接口基地址写死在代码里，修改位置是：

[src/lib/constants.ts](E:/Users/cnxmu/Documents/kaifa/生图工作站-网页端/src/lib/constants.ts:1)

关键代码：

```ts
export const API_BASE_URL = 'https://www.www.com'
```

这个地址会同时影响以下接口：

- `/v1/images/generations`
- `/v1/images/edits`
- `/v1/chat/completions`
- `/v1/responses`

也就是说，你只需要改这一处，文生图、图生图、Nano Banana 和 Agent 对话就都会一起切到新的接口域名。

例如改成：

```ts
export const API_BASE_URL = 'https://你的接口域名'
```

修改后需要重新执行：

```bash
npm run build
```

如果你已经部署到服务器，还需要把新的 `dist/` 内容重新上传覆盖生产环境文件。

## 生产部署只需要上传什么

生产环境构建完成后，只需要部署 `dist/` 目录里的内容。

不需要上传这些开发文件：

- `src/`
- `public/`
- `node_modules/`
- `.git/`
- 测试文件
- 本地文档文件

如果你的站点目录是 `/www/wwwroot/img-web/`，常见做法就是把 `dist/` 里的文件和文件夹直接上传到这个目录里，让最终目录里能看到：

- `index.html`
- `assets/`
- `ai-img.svg`
- `manifest.webmanifest`
- `robots.txt`
- `sitemap.xml`
- `og-image.png`

更完整说明见 [部署文档.md](./部署文档.md)。

## SEO 与静态资源

项目已包含基础 SEO 文件：

- `index.html`：标题、描述、关键词、Open Graph、Twitter Card、JSON-LD
- `public/robots.txt`：抓取规则
- `public/sitemap.xml`：站点地图
- `public/manifest.webmanifest`：Web App 信息
- `public/og-image.png`：分享预览图

上线前请把以下文件中的占位域名 `https://example.com/` 改成你的正式域名，然后重新构建：

- `public/robots.txt`
- `public/sitemap.xml`

如果你希望社交平台稳定抓取分享图，也可以把 `index.html` 里的 `og:image` 和 `twitter:image` 改成正式域名绝对地址。

## 本地数据与清理

浏览器 IndexedDB 中会保存：

- 生图 API Key
- Nano Banana API Key
- Agent API Key
- 生图历史
- 个人模板
- Agent 对话
- 图生图参考图
- Agent 上传图片
- 新生成结果图片

设置里可以执行：

- 清空我的历史
- 清理未引用图片
- 清空个人模板
- 清除我的本地数据

“清理未引用图片”只会删除没有被历史或 Agent 对话引用的孤立图片资产，不会破坏仍可回显的历史结果。

## 安全说明

本项目默认是纯前端静态应用，不内置任何公共 API Key。你填写的 Key 只保存在你当前使用的浏览器里。

如果你要长期部署给自己用，建议至少做到：

- 使用 HTTPS
- 给站点加访问控制
- 不把 Key 写进源码、构建产物或公开配置
- 给 Nginx 或网关加安全响应头

仓库里已经附带一个可参考的安全头片段：

```text
deploy/nginx-security-headers.conf
```

## 文档

- [使用文档.md](./使用文档.md)
- [部署文档.md](./部署文档.md)
