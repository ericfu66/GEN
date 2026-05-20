# QY Gen

QY Gen 是一个基于 Next.js 的 BYOK AI 媒体创作工作台。它把文生图、图生图、文生视频、LLM 对话辅助、图像反推提示词和提示词广场整合在一个本地 Web 应用里。

## 功能

- 支持配置 OpenAI 兼容的 `/v1` 接口。
- 支持主媒体端点和可选的副 LLM/视觉端点。
- 支持文生图、图生图、文生视频三种生成入口。
- 支持上传图片或填写图片 URL，反向解析为可复用提示词。
- 内置 LLM 对话侧栏，用于讨论创意和优化提示词。
- 内置提示词广场，可保存、浏览和复用优秀提示词。
- 本地账号和会话系统，API Key 只在服务端保存和使用。
- 已适配手机端布局，覆盖工作台、图像解析页和提示词广场。

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Zustand
- Lucide React

## 快速开始

安装依赖：

```bash
npm install
```

创建本地环境变量文件：

```bash
cp .env.example .env
```

在 `.env` 中设置一个足够长且随机的 `APP_SECRET`：

```env
APP_SECRET="replace-with-a-long-random-secret"
DATA_DIR=".data"
```

启动开发服务器：

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

## 配置方式

登录后，在左侧 BYOK 配置面板填写：

- `API Base URL`：OpenAI 兼容的主端点地址。
- `API Key`：主端点密钥。
- `Chat API Base URL`：可选，副 LLM/视觉端点地址。
- `Chat API Key`：可选，副端点密钥。

保存时应用会请求 `/v1/models`，自动拉取模型列表，并根据模型名推断对话、图像、图生图和视频能力。

## 常用命令

```bash
npm run dev        # 启动本地开发服务器
npm run build      # 构建生产版本
npm run start      # 启动生产服务
npm run typecheck  # 执行 TypeScript 类型检查
```

## 安全说明

不要提交真实密钥、用户数据或运行时文件。仓库已忽略以下内容：

- `.env`
- `.env*.local`
- `.data`
- `.next`
- `node_modules`
- `public/uploads`
- `.claude`
- `.vercel`

只有 `.env.example` 应该提交到仓库。真实 API Key 会保存在本地运行时数据目录中，并且不会通过安全配置接口返回给前端。

生产环境必须设置强随机的 `APP_SECRET`。如果生产环境仍使用默认开发密钥，服务端会拒绝会话签发或校验流程。

## 项目结构

```text
app/                 Next.js 页面、路由和 UI 组件
app/api/             服务端接口：认证、配置、生成、对话、上传、广场
lib/client/          客户端 API 工具和 Zustand 状态
lib/server/          服务端认证、存储、模型供应商和安全工具
lib/types.ts         前后端共享类型
```

## 部署

构建项目：

```bash
npm run build
```

生产环境变量应配置在部署平台中，不要提交到 Git：

```env
APP_SECRET="a-long-random-production-secret"
DATA_DIR=".data"
```
