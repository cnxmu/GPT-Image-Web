# 个人 AI 生图控制台 - GPT Image Web

一个面向个人使用的 AI 生图控制台。它把文生图、图生图、批量队列、历史回显、模板管理、提示词优化和个人 Agent 对话集中在一个网页工作台里。

GitHub 仓库：<https://github.com/cnxmu/GPT-Image-Web>

## 当前能力

- 文生图：使用 `gpt-image-2`，请求 `/v1/images/generations`。
- 图生图：使用 `gpt-image-2`，请求 `/v1/images/edits`，参考图原图上传。
- 批量生成：页面数量可以设到 `1-100`，内部按 `n=1` 拆成逐张请求。
- 并发控制：默认并发 `20`，可在个人设置中调整为 `1-100`。
- 当前结果区：新一轮生成只显示当前批次，旧批次保留在“我的历史”。
- 运行中历史：批次创建时就写入历史占位；刷新后会尝试恢复未完成任务。
- 本地图片资产：参考图、Agent 图片和生成结果都会保存到浏览器 IndexedDB。
- 本地 Blob 优先：生成结果保存成功后，结果卡片、预览和历史回显优先使用本地 `blob:` 地址。
- 个人模板：支持保存个人模板；内置头像、壁纸、电商图、产品海报和多种社媒预设。
- 个人 Agent：支持多会话、图片分析、提示词优化、参数建议、模板创建、历史回显和确认后生成。
- 图片上传规则：参考图和 Agent 图片都只支持 PNG、JPEG、WEBP，不支持 GIF/SVG，不压缩、不转码。
- 本地数据整理：支持清空历史、清空模板、清理未引用图片、保留最近 N 条历史或 Agent 会话。
- 基础 SEO：包含 favicon、manifest、Open Graph、Twitter Card、JSON-LD、robots 和 sitemap。

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
- 填写“Agent API Key”
- 选择 Agent 模型：`gpt-5.5`、`gpt-5.4`、`gpt-5.4-mini`
- 按需调整“生成并发上限”

密钥、历史、模板、Agent 会话和图片资产都只保存在当前浏览器 IndexedDB。

## 模型与接口

接口基地址在 [src/lib/constants.ts](E:/Users/cnxmu/Documents/kaifa/生图工作站-网页端/src/lib/constants.ts:1)：

```ts
export const API_BASE_URL = 'https://api.example.com'
```

当前接口：

- 文生图：`POST /v1/images/generations`
- 图生图：`POST /v1/images/edits`
- Agent：`POST /v1/responses`

生图请求固定使用：

- `model: gpt-image-2`
- `n: 1`

数量大于 1 时，由前端队列拆成多次请求。

## 生图参数

右侧“个人生成设置”当前支持：

- 模式：文生图 / 图生图
- 生图模型：固定 `gpt-image-2`
- 构图比例：`1:1`、`3:2`、`2:3`、`16:9`、`9:16`、`4:3`、`3:4`、`21:9`
- 分辨率档位：`1K`、`2K`、`4K`
- 最终尺寸：由构图比例和分辨率档位自动计算
- 质量：`low`、`medium`、`high`、`auto`
- 审查：`auto`、`low`
- 输出格式：`png`、`jpeg`、`webp`
- 数量：`1-100`
- 压缩率：仅 JPEG / WebP 会传 `output_compression`，PNG 不传

## 图片与历史

生成完成后，应用会先读取结果图的真实尺寸，再把图片保存为 IndexedDB 中的 Blob 资产。保存成功后：

- 运行态结果不再依赖远程图片 URL。
- 历史记录保存 `localAssetId`，不保存大段 base64。
- 结果卡片、预览弹窗、历史回显优先使用本地 `blob:` 地址。
- 删除历史会同步删除该历史引用的结果图和图生图参考图资产。

刷新页面会中断浏览器原请求。应用启动时会扫描 `running` 历史，把未完成 job 重新入队续跑；图生图会尝试从本地资产恢复原始参考图。

## 个人 Agent

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
- Agent API Key
- 设置项
- 个人模板
- 我的历史
- 图生图参考图
- Agent 会话
- Agent 上传图片
- 生成结果图片

个人设置中可以：

- 清空我的历史
- 清空个人模板
- 清理未引用图片
- 保留最近 20 / 50 / 100 条历史
- 保留最近 20 / 50 / 100 条 Agent 会话
- 清除我的本地数据

## 部署

生产构建：

```bash
npm run build
```

只需要上传 `dist/` 目录里的内容到服务器站点根目录。详见 [部署文档.md](./部署文档.md)。

## 文档

- [使用文档.md](./使用文档.md)
- [部署文档.md](./部署文档.md)
