# 技术栈

**Analysis Date:** 2026-05-08

## 语言

**主要语言:**
- TypeScript 5.5+ — 全栈统一语言，Strict mode 启用
- JavaScript (ESM) — module 格式 `"type": "module"`

## 运行时

**环境:**
- Bun 1.3.11 — 后端运行时 + 包管理器，原生 TypeScript 支持
- Node.js (间接依赖) — Next.js 15 构建运行时

**包管理器:**
- Bun workspaces — 工作区管理，`packageManager: "bun@1.3.11"`
- Lockfile: `bun.lock` 存在

## Monorepo 架构

**组织方式:**
- `workspaces: ["apps/*", "packages/*"]` — root package.json 第 4 行
- 包命名空间: `@gesp/*`

## 框架

### 后端框架 (`packages/backend/`)
| 框架 | 版本 | 用途 |
|------|------|------|
| Hono | ^4.0.0 | 轻量 Web 框架，原生 Bun 支持，类型安全路由 |
| hono-openapi | ^1.0.0 | 从路由生成 OpenAPI 规范 |
| @hono/zod-validator | ^0.7.6 | Zod 验证中间件 |
| @hono/standard-validator | ^0.2.2 | Standard Schema 验证 |
| @scalar/hono-api-reference | ^0.10.10 | API 文档 UI（挂载于 `/api/doc/ui`） |

### 前端框架 (`apps/web/`)
| 框架 | 版本 | 用途 |
|------|------|------|
| Next.js | ^15.0.0 | App Router + React Server Components，统一学员端/管理端 |
| React | ^19.0.0 | UI 库 |
| Tailwind CSS | ^4.0.0 | 原子化 CSS + shadcn/ui 基础样式 |
| shadcn | ^4.4.0 | 组件库 CLI（base-nova 风格） |

### 数据访问层
| 库 | 版本 | 用途 |
|------|------|------|
| Drizzle ORM | ^0.39.0 | 类型安全 SQL ORM，使用 `bun-sqlite` 驱动 |
| drizzle-kit | ^0.30.0 | Schema 迁移工具 |
| @lancedb/lancedb | 0.22.3 | 向量数据库 JavaScript SDK |
| @lancedb/lancedb-darwin-arm64 | 0.27.2 | LanceDB macOS ARM64 原生绑定（Apple Silicon） |

### 验证库
| 库 | 版本 | 用途 |
|------|------|------|
| Zod | ^4.3.6 | Schema 验证 + OpenAPI schema 生成（v4 原生支持 Standard Schema） |
| @hookform/resolvers | ^5.2.2 | React Hook Form + Zod 集成 |

### 安全与认证
| 库 | 版本 | 用途 |
|------|------|------|
| bcryptjs | ^3.0.0 | 密码哈希（替代原生 bcrypt，零编译依赖） |

### 日志
| 库 | 版本 | 用途 |
|------|------|------|
| pino | ^9.0.0 | 结构化日志库，多 stream 输出（终端彩色 + 文件 JSON） |
| pino-pretty | ^11.0.0 | 开发环境日志美化输出 |

### 测试
| 库 | 版本 | 用途 |
|------|------|------|
| vitest | ^2.0.0 | 后端单元测试框架 |
| better-sqlite3 | ^12.9.0 | 测试用同步 SQLite（devDependencies） |

### 构建工具
| 工具 | 版本 | 用途 |
|------|------|------|
| Turborepo | ^2.0.0 | Monorepo 任务调度，远程缓存 |
| husky | ^9.1.7 | Git hooks 管理 |
| tsx | ^4.21.0 | TypeScript 直接执行（脚本用） |
| bun-types | ^1.3.0 | Bun 类型声明 |

## 前端依赖详情

**UI 组件生态 (`apps/web/package.json`):**
- `@base-ui/react` ^1.4.1 — 无样式基础组件
- `class-variance-authority` ^0.7.1 — 组件变体模式
- `clsx` ^2.1.1 — 条件 className 合并
- `tailwind-merge` ^3.5.0 — Tailwind 类名冲突解决
- `lucide-react` ^1.9.0 — 图标库
- `next-themes` ^0.4.6 — 主题切换（light/dark）
- `sonner` ^2.0.7 — Toast 通知
- `react-markdown` ^10.1.0 — Markdown 渲染（测评场景）
- `react-hook-form` ^7.73.1 — 表单管理
- `@tanstack/react-table` ^8.21.3 — 数据表格

**字体 (`apps/web/src/app/layout.tsx`):**
- `Geist` — 主字体（CSS variable `--font-sans`）
- `Inter` — 备用字体，权重 400/600

## 关键依赖

**核心依赖:**
- `hono` ^4.0.0 — 后端所有路由、中间件基于 Hono 构建，入口 `packages/backend/src/index.ts`
- `next` ^15.0.0 — 前端唯一应用，学员端 `/student/*` + 管理端 `/admin/*`
- `drizzle-orm` ^0.39.0 — SQLite 关系数据 ORM
- `@lancedb/lancedb` 0.22.3 — LanceDB 向量存储

**基础设施:**
- `zod` v4 — 全栈验证，前后端共用（body 校验、OpenAPI schema 生成、表单验证）
- `pino` — 生产级结构化日志，开发环境双输出（终端 + 文件）

## 配置

### 环境配置
- **来源**: `.env`（根目录），通过 `bun --env-file=../../.env` 注入
- **模板**: `.env.example` 包含所有必要变量占位
- **关键变量**（见环境变量部分）

### 数据库配置
- **SQLite**: `DATABASE_URL=./data/gesp.db`（`packages/backend/drizzle.config.ts`）
- **LanceDB**: `LANCEDB_PATH=./data/gesp.lance`（默认路径，代码 `src/index.ts:68`）
- Schema 定义: `packages/backend/src/db/schema/*.ts`

### TypeScript 配置
- **后端**: `packages/backend/tsconfig.json` — strict mode，paths 映射 `@gesp/shared`
- **前端**: `apps/web/tsconfig.json` — strict，路径别名 `@/*` 映射 `src/*`
- **Shared**: `packages/shared/tsconfig.json` — 纯类型包
- **UI**: `packages/ui/tsconfig.json` — 纯 UI 组件包

### 构建配置
- `turbo.json` — 定义 build/dev/typecheck/test 任务及依赖关系
- `apps/web/components.json` — shadcn/ui 配置（base-nova 风格，lucide 图标，RSC 模式）

## 平台要求

### 开发环境
- **操作系统**: macOS（Apple Silicon 优先 — LanceDB darwin-arm64 绑定）
- **运行时**: Bun 1.3.11+
- **本地服务**:
  - ellamaka Agent 引擎: `http://localhost:4141`（独立运行）
  - Ollama embedding: `macmini.local:11434`（局域网设备）
- **端口**:
  - 后端 API: `3000`（可配置 `PORT`）
  - Web 前端: `3001`（`next dev -p 3001`）

### 生产部署
- **部署目标**: 待定（Bun 可直接 serve，或构建后部署）
- **数据库**: SQLite 文件 + LanceDB 文件模式
- **外部依赖**: ellamaka 实例（Agent 引擎），Embedding Provider（Ollama/OpenAI）
- **平台限制**: LanceDB 原生绑定仅支持 darwin-arm64 / Linux x64；Intel Mac 需使用 `node --import tsx` 运行 seed 脚本

---

*Stack analysis: 2026-05-08*
