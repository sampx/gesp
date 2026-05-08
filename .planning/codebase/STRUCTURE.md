# 代码库结构

**Analysis Date:** 2026-05-08

## 目录布局

```
gesp/
├── apps/
│   └── web/                    # NextJS 15 统一前端应用
│       ├── src/
│       │   ├── app/            # App Router 路由目录
│       │   │   ├── student/    # 学员端路由（测评、仪表盘等）
│       │   │   ├── admin/      # 管理端路由
│       │   │   ├── login/      # 统一登录页
│       │   │   ├── register/   # 注册页
│       │   │   ├── 403/        # 无权限页面
│       │   │   ├── layout.tsx  # 根布局
│       │   │   └── page.tsx    # 首页
│       │   ├── components/     # 可复用 UI 组件
│       │   │   ├── ui/         # shadcn/ui 基础组件
│       │   │   └── assessment/ # 测评业务组件
│       │   ├── hooks/          # 自定义 React Hooks
│       │   ├── lib/            # 工具函数和 API 客户端
│       │   └── middleware.ts   # Next.js 中间件
│       ├── components.json     # shadcn/ui 配置
│       └── next.config.ts      # Next.js 配置
├── packages/
│   ├── backend/                # Hono API 服务器
│   │   ├── src/
│   │   │   ├── index.ts        # 入口：引导 + Bun.serve()
│   │   │   ├── routes/         # 路由定义
│   │   │   ├── middleware/     # 认证、日志中间件
│   │   │   ├── services/       # 业务逻辑服务
│   │   │   ├── db/             # 数据库（Drizzle ORM + SQLite）
│   │   │   │   ├── index.ts    # Drizzle 实例
│   │   │   │   ├── schema/     # 表定义
│   │   │   │   └── seed/       # 数据种子脚本
│   │   │   ├── seed/           # 启动时种子脚本
│   │   │   ├── utils/          # 工具函数（响应、密码）
│   │   │   └── __tests__/      # Vitest 测试
│   │   ├── data/               # 运行时数据库文件（.gitignore）
│   │   │   ├── gesp.db         # SQLite 数据
│   │   │   └── gesp.lance/     # LanceDB 向量存储
│   │   └── drizzle.config.ts   # Drizzle Kit 配置
│   ├── shared/                 # 跨包共享类型和常量
│   │   └── src/
│   │       ├── types/          # TypeScript 接口（ApiResponse, User）
│   │       └── constants/      # 枚举常量（ROLE, USER_STATUS）
│   └── ui/                     # 共享 UI 组件包（预留）
├── scripts/
│   ├── gesp.sh                 # 工作空间 CLI 入口
│   ├── seed-knowledge.ts       # 知识库种子脚本（手动执行）
│   └── verify-auth.ts          # 认证 E2E 验证脚本
├── package.json                # Root manifest + Turborepo scripts
├── turbo.json                  # Turborepo pipeline 配置
└── .env.example                # 环境变量模板
```

## 目录用途

**`apps/web/`** (前端应用):
- 目的: NextJS 15 学员端+管理端统一应用
- 包含: App Router 页面、shadcn/ui 组件、React Hooks
- 关键文件: `src/app/layout.tsx`、`src/middleware.ts`、`next.config.ts`
- 端口: 开发 `3001`

**`packages/backend/`** (API 服务器):
- 目的: Hono 框架的 REST API + 业务逻辑
- 包含: 路由、服务、中间件、数据库
- 关键文件: `src/index.ts`（入口）、`src/routes/`（路由）、`src/middleware/auth.ts`（认证）
- 端口: 开发 `3000`

**`packages/shared/`** (共享包):
- 目的: 跨应用类型和常量
- 包含: TypeScript 类型定义、常量枚举
- 依赖约束: 不得依赖 backend 或其他业务包

**`packages/ui/`** (UI 共享包):
- 目的: 预留的共享 UI 组件包
- 状态: 存在但未使用

**`scripts/`** (脚本目录):
- 目的: 运维和种子脚本
- 注意: 非 Turborepo 管理，手动执行

**`data/`** (运行时数据):
- 目的: SQLite 和 LanceDB 存储
- 包含: `packages/backend/data/gesp.db`、`packages/backend/data/gesp.lance/`
- .gitignore: 是（不应提交）

## 关键文件位置

**入口点:**
- `packages/backend/src/index.ts`: 后端启动入口
- `apps/web/src/app/layout.tsx`: 前端根布局
- `apps/web/src/app/page.tsx`: 首页

**路由定义:**
- `packages/backend/src/routes/`:
  - `auth.ts` → `/api/auth/*`
  - `admin-users.ts` → `/api/admin/users/*`
  - `knowledge.ts` → `/api/admin/knowledge/*` + `/api/student/knowledge/*`
  - `assessment.ts` → `/api/assessment/*`
  - `debug.ts` → `/debug/*`

**数据库:**
- `packages/backend/src/db/index.ts`: Drizzle ORM 实例
- `packages/backend/src/db/schema/`: 表定义
- `packages/backend/drizzle.config.ts`: Drizzle Kit 配置

**配置:**
- `turbo.json`: Turborepo pipeline 定义
- `apps/web/components.json`: shadcn/ui 组件配置
- `packages/backend/bunfig.toml`: Bun 运行时配置

## 命名约定

**文件命名:**
- `kebab-case`: 路由文件和组件文件（如 `admin-users.ts`、`session.ts`）
- `camelCase.service.ts`: 服务文件（如 `auth.service.ts`）
- `kebab-case.seed.ts`: 种子脚本（如 `admin.seed.ts`）
- `index.ts`: 模块入口/导出聚合
- `.config.ts`: 配置文件
- `.test.ts` / `.spec.ts`: 测试文件

**目录命名:**
- 小写复数: `routes/`、`services/`、`middleware/`、`components/`、`hooks/`
- 小写单数: `schema/`、`seed/`、`utils/`
- 双下划线: `__tests__/`（测试聚合目录）

**包命名:**
- 范围前缀: `@gesp/backend`、`@gesp/web`、`@gesp/shared`、`@gesp/ui`
- 主包: `gesp-learning-platform`（`package.json` name）

## 如何添加新代码

**新增 API 路由:**
- 路由实现: `packages/backend/src/routes/xxx.ts`
- 挂载到入口: `packages/backend/src/index.ts` → `app.route("/api/xxx", xxxRoutes)`
- 中间件: `packages/backend/src/middleware/`（如需新中间件）
- 服务层: `packages/backend/src/services/xxx.service.ts`
- 测试: `packages/backend/src/__tests__/` 或路由旁置 `xxx.test.ts`

**新增数据库表:**
- 表定义: `packages/backend/src/db/schema/xxx.ts`
- 导出: `packages/backend/src/db/schema/index.ts`
- 关联定义: `packages/backend/src/db/schema/relations.ts`
- 种子数据: `packages/backend/src/db/seed/` 或 `packages/backend/src/seed/`

**新增前端页面（学员端）:**
- 路由: `apps/web/src/app/student/xxx/`（App Router 目录路由）
- 页面: `apps/web/src/app/student/xxx/page.tsx`
- 组件: `apps/web/src/components/xxx/`
- API 调用: `apps/web/src/lib/`

**新增前端页面（管理端）:**
- 路由: `apps/web/src/app/admin/xxx/`
- 页面: `apps/web/src/app/admin/xxx/page.tsx`
- 组件: 复用 `apps/web/src/components/ui/` 但用管理风格变体

**新增共享类型/常量:**
- 类型: `packages/shared/src/types/`
- 常量: `packages/shared/src/constants/`

## 特殊目录

**`data/`** (`packages/backend/data/`):
- 目的: SQLite 和 LanceDB 运行时文件
- 生成: 自动（启动时）
- 提交: 否（.gitignore）

**`.next/`** (`apps/web/.next/`):
- 目的: Next.js 构建缓存
- 生成: `next build` 自动生成
- 提交: 否

**`.turbo/`** (各包内):
- 目的: Turborepo 远程缓存
- 生成: `turbo` 运行后自动生成
- 提交: 否（但 cache key 可提交，视配置）

**`logs/`** (根目录和 backend 内):
- 目的: 日志输出缓冲
- 生成: 应用运行时
- 提交: 否

---

*Structure analysis: 2026-05-08*