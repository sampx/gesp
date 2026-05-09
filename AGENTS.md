<!-- WSF:project-start source:PROJECT.md -->
## Project

**GESP C++ 智能学习系统**

面向 GESP 1~8 级 C++ 等级考试的 AI 自适应智能学习平台，以 AI 智能体替代传统录课和 OJ 判题模式，覆盖"测评-学习-练习"全流程自动化。目标用户为青少年学员（中小学生），需要趣味性、可视化、互动性强的学习体验。

<!-- WSF:project-end -->

<!-- WSF:stack-start source:codebase/STACK.md -->
## Technology Stack

## 语言
- TypeScript 5.5+ — 全栈统一语言，Strict mode 启用
- JavaScript (ESM) — module 格式 `"type": "module"`
## 运行时
- Bun 1.3.11 — 后端运行时 + 包管理器，原生 TypeScript 支持
- Node.js (间接依赖) — Next.js 15 构建运行时
- Bun workspaces — 工作区管理，`packageManager: "bun@1.3.11"`
- Lockfile: `bun.lock` 存在
## Monorepo 架构
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
| (自定义) | — | 纯文本日志，控制台+文件双输出，北京时间，通过 `logger.{info,warn,error,debug}` 调用 |
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
- `Geist` — 主字体（CSS variable `--font-sans`）
- `Inter` — 备用字体，权重 400/600
## 关键依赖
- `hono` ^4.0.0 — 后端所有路由、中间件基于 Hono 构建，入口 `packages/backend/src/index.ts`
- `next` ^15.0.0 — 前端唯一应用，学员端 `/student/*` + 管理端 `/admin/*`
- `drizzle-orm` ^0.39.0 — SQLite 关系数据 ORM
- `@lancedb/lancedb` 0.22.3 — LanceDB 向量存储
- `zod` v4 — 全栈验证，前后端共用（body 校验、OpenAPI schema 生成、表单验证）
- 自定义 logger — 纯文本格式，北京时间，控制台+文件统一输出（`packages/backend/src/utils/logger.ts`）
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
- **端口**:
### 生产部署
- **部署目标**: 待定（Bun 可直接 serve，或构建后部署）
- **数据库**: SQLite 文件 + LanceDB 文件模式
- **外部依赖**: ellamaka 实例（Agent 引擎），Embedding Provider（Ollama/OpenAI）
- **平台限制**: LanceDB 原生绑定仅支持 darwin-arm64 / Linux x64；Intel Mac 需使用 `node --import tsx` 运行 seed 脚本
<!-- WSF:stack-end -->

---

## 1. 架构概览

```
gesp/
├── packages/
│   ├── backend/          # API 服务器（详见 packages/backend/AGENTS.md）
│   └── shared/           # 跨包共享类型和常量
│       └── src/
│           ├── types/        # ApiResponse, User
│           └── constants/    # ROLE (1/10/100), USER_STATUS (1/2)
├── apps/
│   └── web/              # NextJS 15 学员前端（App Router）
│       └── src/
│           ├── app/              # App Router 路由（server/client 组件）
│           │   ├── student/      # 学员端路由（assessment, dashboard 等）
│           │   └── admin/        # 管理端路由
│           ├── components/       # 可复用 UI 组件
│           │   ├── assessment/   # 测评页面组件
│           │   └── ui/           # shadcn/ui 基础组件
│           └── lib/              # 工具函数（server-api.ts 等）
├── scripts/
│   ├── seed-knowledge.ts # 知识库 seed 脚本（手动执行）
│   └── verify-auth.ts    # 端到端验证脚本
├── turbo.json
└── package.json
```

---

## 2. 命令速查

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动开发服务器（自动建表 + seed root admin） |
| `bun run db:push` | 同步表结构 |
| `bun run typecheck` | 类型检查 |
| `bun run test` | 单元测试 |
| `bun run seed:knowledge` | 知识库 seed（补 seed 缺失表） |
| `bun run seed:knowledge -- --force` | 知识库 seed（强制重建全部表） |
| `EMBEDDING_PROVIDER=mock bun run seed:knowledge` | 知识库 seed（mock embedding，无需 Ollama） |
| `bun scripts/verify-auth.ts` | 认证系统 E2E 验证（需先 dev） |

### 知识库 Seed 说明

知识库（LanceDB）的 4 张表需要手动 seed，后端启动时不会自动执行：

| 表 | 数据源 | 说明 |
|---|---|---|
| knowledge_points | `packages/backend/src/seed/knowledge-points-gesp-cpp-1-8.json` | GESP 1-8 级知识点 |
| practice_questions | `docs/products/gesp/seed/practice-cpp-l1.json`（空间仓库） | 练习题 |
| exam_questions | `docs/products/gesp/seed/exam-cpp-l1-2026-03.json`（空间仓库） | 真题 |
| lesson_plans | `docs/products/gesp/seed/lesson-cpp-g3-05.json`（空间仓库） | 教案 |

逐表检测：已有数据的表自动跳过，只 seed 空表。`--force` 跳过检测强制重建。

---

<!-- WSF:conventions-start source:CONVENTIONS.md -->
## Conventions

## 命名模式
- 统一使用 kebab-case 命名文件和目录
- 路由文件：`routes/auth.ts`、`routes/admin-users.ts`、`routes/assessment.ts`
- 服务文件：`services/auth.service.ts`、`services/assessment.ts`
- 工具文件：`utils/password.ts`、`utils/response.ts`、`utils/logger.ts`
- 中间件文件：`middleware/auth.ts`、`middleware/session.ts`、`middleware/request-logger.ts`
- 数据库 schema 文件：`db/schema/users.ts`、`db/schema/sessions.ts`、`db/schema/assessment.ts`
- 测试文件：`__tests__/auth-register.test.ts`、`__tests__/password.test.ts`（与源码目录平级的 `__tests__/` 目录内，使用 `.test.ts` 后缀）
- Seed 文件：`db/seed/admin.seed.ts`、`seed/assessment-questions.seed.ts`（使用 `.seed.ts` 后缀）
- 使用 camelCase：`registerUser`、`loginUser`、`hashPassword`、`verifyPassword`
- 中间件工厂函数使用 PascalCase 后缀：`StudentAuth()`、`AdminAuth()`、`RootAuth()`
- 工具函数使用动词开头：`createSession`、`validateSession`、`destroySession`
- 私有辅助函数在文件内定义，不导出，使用 camelCase：`validateSessionAndSetUser`、`formatQuestion`、`getNextOrder`
- Server Actions 使用 PascalCase 后缀 `Action`：`loginAction`、`logoutAction`
- 使用 camelCase：`sessionId`、`passwordHash`、`displayName`
- 常量使用 UPPER_SNAKE_CASE：`SALT_ROUNDS`、`SESSION_TTL`、`DEFAULT_QUESTION_LIMIT`
- 数据库字段定义使用 snake_case（Drizzle schema 中）：`user_id`、`password_hash`、`display_name`
- JSON body 字段统一使用 snake_case：`old_password`、`new_password`、`display_name`
- 接口使用 PascalCase：`ApiResponse<T>`、`TokenPayload`、`RoundResult`、`CandidateSummary`
- Drizzle 推断类型使用 `$inferSelect` 模式：`typeof users.$inferSelect`
- 自定义类型别名使用 PascalCase：`type LevelHistoryEntry`、`type KnowledgeStat`
## 代码风格
- 未检测到独立的 Prettier/ESLint 配置文件，依赖 TypeScript strict mode
- 2 空格缩进（从现有代码观察）
- 函数定义使用 `async/await`，禁止 Promise 链
- 使用 `export default` 导出路由实例，使用命名导出导出工具函数和中间件
- strict mode 启用（所有 `tsconfig.json` 中配置）
- 所有函数参数和返回值必须显式标注类型
- 禁止使用 `any` 类型（测试中允许 `as any` 用于 mock 类型断言）
- 使用 `interface` 定义对象类型（如 `ApiResponse<T>`、`TokenPayload`）
- 使用 `type` 定义联合类型和映射类型（如 `type LevelHistoryEntry`）
## 导入组织
- `@gesp/shared` 通过 `tsconfig.json` 的 `paths` 映射到 `packages/shared/src`
- 前端使用 `@/` 别名指向 `apps/web/src/`（`tsconfig.json` 中配置）
## 错误处理
- Service 函数返回 `{ success: boolean; data?: T; error?: string }` 结构
- 不在 service 层抛出异常，而是通过返回值传递错误信息
- 安全敏感错误信息使用通用描述（如 "注册失败，请尝试不同的凭据" 代替 "用户名已存在"）
- 防御性 catch：捕获数据库约束冲突（`SQLITE_CONSTRAINT_UNIQUE`）并转换为友好错误
## 日志规范
| 级别 | 用途 | 示例 |
|------|------|------|
| `debug` | 调试信息（缓存命中、SQL 详情） | `logger.debug({ session_id }, "Session updated")` |
| `info` | 主要生产级别（关键业务事件） | `logger.info({ user_id }, "User registered")` |
| `warn` | 可恢复异常 | `logger.warn({ err }, "Failed to notify agent")` |
| `error` | 操作失败 | `logger.error({ err, session_id }, "SSE stream error")` |
## 注释
- Service 层文件顶部使用块注释描述文件职责（见 `services/assessment.ts`）
- 公共导出函数使用 JSDoc 注释，包含 `@param` 和 `@returns`
- 复杂算法和业务规则使用行内注释引用需求编号：`// Per D-05: backend direct comparison`
## 函数设计
- 工具函数和中间件保持简洁（< 30 行）
- Service 函数适中（30-100 行），如 `registerUserWithRole`、`loginUser`
- 大型路由文件（`assessment.ts` 896 行）应拆分为更小的模块
- Helper 函数提取到文件顶部，不导出，如 `formatQuestion`、`getNextOrder`
- 优先使用具名参数对象（多个参数时）：`createAssessmentSession({ student_id, course_id, start_level })`
- service 函数显式声明参数类型：`registerUser(username: string, password: string, displayName: string)`
- Service 层统一返回对象：`{ success: boolean; data?: T; error?: string }`
- Route handler 返回 Hono Response 对象（通过 `success()`、`error()` 等工具函数）
- 使用 Drizzle `$inferSelect` 类型推断返回值：`typeof users.$inferSelect`
## 模块设计
- 路由文件：`export default app`（Hono 实例）
- 工具文件：命名导出 `export function hashPassword(...)`
- Service 文件：命名导出 `export async function registerUser(...)`
- Schema 文件：命名导出 `export const users = sqliteTable(...)`
- 中间件：命名导出函数和中间件工厂
- `packages/shared/src/index.ts` 使用 `export * from` 聚合导出
- `packages/backend/src/db/schema/index.ts` 使用 `export * from` 聚合所有 schema
- `packages/backend/src/index.ts` 作为入口，启动 bootstrap 流程
## 数据库操作
<!-- WSF:conventions-end -->

<!-- WSF:architecture-start source:ARCHITECTURE.md -->
## Architecture

## 模式概览
- 后端启动时自动执行 `pushSchema()` → `runSeeds()` → `Bun.serve()` （自举模式）
- 路由按角色路径前缀隔离（`/api/admin/*`、`/api/student/*`、`/api/assessment`）
- 前端为统一 NextJS 15 应用，通过路由区分学员端和管理端
- Agent 引擎运行在独立项目 ellamaka，通过 HTTP SDK 代理调用
- SQLite（关系数据）+ LanceDB（向量存储）双数据库并存
## 层
- 目的: 用户界面
- 位置: `apps/web/src/app/`, `apps/web/src/components/`
- 包含: NextJS 15 App Router 页面（Server/Client 组件）、shadcn/ui 基础组件、业务 UI 组件
- 依赖: Tailwind CSS、shadcn/ui、React Hook Form、Sonner
- 被: 浏览器用户直接访问
- 目的: HTTP API 服务、请求处理
- 位置: `packages/backend/src/routes/`
- 包含: 路由定义、请求响应处理、OpenAPI 文档端点
- 依赖: Hono、hono-openapi、@scalar/hono-api-reference
- 被: 前端 (`apps/web`) 通过 `fetch` 调用
- 目的: 业务逻辑封装
- 位置: `packages/backend/src/services/`
- 包含: `auth.service.ts`（认证业务）、`assessment.ts`（测评业务）、`knowledge-base.ts`（知识库服务）、`vector-store.ts`（向量存储）、`ellamaka-client.ts`（Agent 引擎代理）、`embedding.ts`（嵌入提供者）
- 依赖: `@gesp/shared`、数据库层、外部服务
- 被: 路线路由层调用
- 目的: 横切关注点（认证、日志、会话）
- 位置: `packages/backend/src/middleware/`
- 包含: `session.ts`（会话管理）、`auth.ts`（角色守卫：StudentAuth/AdminAuth/RootAuth）、`request-logger.ts`（请求日志）
- 依赖: Hono Context
- 被: 路由层和入口挂载
- 目的: 持久化存储
- 位置: `packages/backend/src/db/`（关系数据）和 `data/` 目录（SQLite 文件 + LanceDB 向量文件）
- 包含: Drizzle ORM 实例、schema 定义（`users`、`sessions` 等）、种子脚本
- 依赖: `drizzle-orm`、`bun-sqlite`、`@lancedb/lancedb`
- 被: 服务层和种子脚本调用
- 目的: 跨包类型和常量共享
- 位置: `packages/shared/src/`
- 包含: `types/`（ApiResponse、User 接口）、`constants/`（ROLE、USER_STATUS）
- 依赖: 无（不依赖业务逻辑）
- 被: backend、web 包共同引用
## 数据流
- **后端**: 无状态（进程启动时初始化单例服务，路由间无共享状态）
- **前端**: 依赖 `fetch` 直接调用后端 API，无客户端状态管理库（未引入 TanStack Query）
- **会话**: 服务端 session（`sessions` 表 + cookie），TTL 按角色差异化
## 关键抽象
- 目的: 三层权限模型
- 值: `ROLE.STUDENT = 1` / `ROLE.ADMIN = 10` / `ROLE.ROOT = 100`
- 模式: 数值等级 ≥ 比较（AdminAuth = role ≥ 10）
- 目的: 统一 API 响应结构
- 模式: `{ success: boolean, message?, data?, error?, code? }`
- 工具函数: `success()` / `error()` / `unauthorized()` / `forbidden()`
- 目的: 知识库统一访问接口
- 组成: `VectorStore`（LanceDB 文件存储）+ `EmbeddingProvider`（Ollama/Mock）
- 支持: 查询、插入、语义检索
- 目的: 代理调用外部 Agent 引擎
- 配置: 通过 `ELLAMAKA_URL` 环境变量指定地址
- 模式: HTTP SDK 调用，非嵌入式
## 入口点
- 位置: `packages/backend/src/index.ts`
- 触发: `bun run dev` / `bun run build` → Bun 自动加载
- 职责: 引导启动（schema push → seeds → 服务初始化 → Bun.serve）
- **注意**：禁止 `export default app`，必须手动 `Bun.serve()`
- 位置: `apps/web/src/app/layout.tsx`
- 触发: `next dev -p 3001` / `next build`
- 职责: 根布局、全局上下文（主题、认证状态）
- 位置: `packages/backend/src/index.ts`
- 端点: `GET /api/doc`（OpenAPI JSON）/ `GET /api/doc/ui`（Scalar 调试界面）
- 用途: API 调试和前端参考
- 位置: `packages/backend/src/routes/debug.ts`
- 端点: `GET /debug/*`
- 条件: 仅开发环境或 `ENABLE_DEBUG=true` 时启用
## 错误处理
- 响应工具函数统一包装错误（`error()` / `unauthorized()` / `forbidden()`）
- 中间件层面处理认证失败（`requireSession` 返回 401/403）
- Zod v4 验证错误自动格式化为 `{ error: { name: "ZodError", message: "<JSON>" } }`
- 请求日志中间件按状态码分级（500+ = error，400+ = warn，其他 = info）
## 横切关注点
<!-- WSF:architecture-end -->


