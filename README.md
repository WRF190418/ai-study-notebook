# StudyNote AI

面向大学生的 AI 网页笔记本 MVP。第一版聚焦“课程主页 + 笔记整理体验”：用户注册登录后拥有独立学习空间，可以上传截图、粘贴文字或输入大纲，由内置真实 AI API 整理为可保存的 Markdown / LaTeX 笔记，并生成闪卡和思维导图。

## 运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

`.env.local` 至少需要：

```bash
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4o-mini
AUTH_SECRET=replace-with-a-long-random-secret
```

如果使用 OpenAI 兼容服务，可以额外设置：

```bash
OPENAI_BASE_URL=https://your-compatible-endpoint/v1
```

## 已实现

- 邮箱密码注册 / 登录 / 退出
- 多用户数据隔离
- 课程主页、Lecture 卡片、课程搜索
- 图片 / PDF / PPTX / DOCX / TXT / Markdown / 文字 / 大纲整理入口
- 图片优先使用本地中英文 OCR，再交给文字模型整理；可选启用视觉模型
- 服务端真实 AI API 调用
- AI 输出保存为笔记
- Markdown、GFM 表格、KaTeX LaTeX 公式渲染
- 闪卡与思维导图展示
- 桌面和移动响应式布局
- Playwright 冒烟测试

## 架构

```text
app/
  api/
    auth/        账号注册、登录、退出
    ai/          内置 AI 整理接口
    workspace/   当前用户学习空间
components/      登录页、课程工作台、Markdown 渲染
lib/
  ai.ts          AI Provider 入口，后续可扩展 Trae Provider
  auth.ts        httpOnly JWT session
  db.ts          持久化存储封装
  types.ts       核心数据模型
```

当前 MVP 使用 `data/app-db.json` 做本地持久化，并在写入层做了串行队列，方便本机快速体验多人注册。正式上线建议把 `lib/db.ts` 替换为 PostgreSQL + Prisma，文件和截图进入对象存储，例如 S3、R2 或 OSS。

## Railway 部署

项目根目录包含 `railway.json`，连接 GitHub 后 Railway 会自动构建并部署 `main` 分支。

1. 创建 Railway Web Service 并连接 GitHub 仓库。
2. 配置 `.env.example` 中使用到的 AI Key 与 `AUTH_SECRET`。
3. 为 Web Service 添加 Volume，挂载路径设为 `/app/data`。
4. 在 Networking 中生成固定的 `*.up.railway.app` 域名。

服务健康检查地址为 `/api/health`。应用也支持通过 `APP_DATA_DIR` 指定其他持久化目录。

## 验收

```bash
npm run typecheck
npm run build
npm run smoke
```

视觉验收截图会生成在：

```text
test-results/workspace-desktop.png
test-results/workspace-mobile.png
```
