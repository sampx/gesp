# 架构

**Analysis Date:** 2026-05-08

## 模式概览

**总体模式:** Monorepo (Bun workspaces + Turborepo 编排) + 客户端-服务器分离

**关键特征:**
- 后端启动时自动执行 `pushSchema()` → `runSeeds()` → `Bun.serve()` （自举模式）
- 路由按角色路径前缀隔离（`/api/admin/*`、`/api/student/*`、`/api/assessment`）
- 前端为统一 NextJS 15 应用，通过路由区分学员端和管理端
- Agent 引擎运行在独立项目 ellamaka，通过 HTTP SDK 代理调用
- SQLite（关系数据）+ LanceDB（向量存储）双数据库并存

## 层

**表示层 (Presentation):**
- 目的: 用户界面
- 位置: `apps/web/src/app/`, `apps/web/src/components/`
- 包含: NextJS 15 App Router 页面（Server/Client 组件）、shadcn/ui 基础组件、业务 UI 组件
- 依赖: Tailwind CSS、shadcn/ui、React Hook Form、Sonner
- 被: 浏览器用户直接访问

**API 层 (Application/API):**
- 目的: HTTP API 服务、请求处理
- 位置: `packages/backend/src/routes/`
- 包含: 路由定义、请求响应处理、OpenAPI 文档端点
- 依赖: Hono、hono-openapi、@scalar/hono-api-reference
- 被: 前端 (`apps/web`) 通过 `fetch` 调用

**服务层 (Domain/Service):**
- 目的: 业务逻辑封装
- 位置: `packages/backend/src/services/`
- 包含: `auth.service.ts`（认证业务）、`assessment.ts`（测评业务）、`knowledge-base.ts`（知识库服务）、`vector-store.ts`（向量存储）、`ellamaka-client.ts`（Agent 引擎代理）、`embedding.ts`（嵌入提供者）
- 依赖: `@gesp/shared`、数据库层、外部服务
- 被: 路线路由层调用

**中间件层 (Middleware):**
- 目的: 横切关注点（认证、日志、会话）
- 位置: `packages/backend/src/middleware/`
- 包含: `session.ts`（会话管理）、`auth.ts`（角色守卫：StudentAuth/AdminAuth/RootAuth）、`request-logger.ts`（请求日志）
- 依赖: Hono Context
- 被: 路由层和入口挂载

**数据层 (Data):**
- 目的: 持久化存储
- 位置: `packages/backend/src/db/`（关系数据）和 `data/` 目录（SQLite 文件 + LanceDB 向量文件）
- 包含: Drizzle ORM 实例、schema 定义（`users`、`sessions` 等）、种子脚本
- 依赖: `drizzle-orm`、`bun-sqlite`、`@lancedb/lancedb`
- 被: 服务层和种子脚本调用

**共享包 (Shared):**
- 目的: 跨包类型和常量共享
- 位置: `packages/shared/src/`
- 包含: `types/`（ApiResponse、User 接口）、`constants/`（ROLE、USER_STATUS）
- 依赖: 无（不依赖业务逻辑）
- 被: backend、web 包共同引用

## 数据流

**认证流程:**

1. 前端发送 POST `/api/auth/login` （用户名 + 密码）
2. 后端 `authRoutes` → `auth.service.loginUser()`
   - 验证用户名密码（bcryptjs 比对）
   - `createSession()` 写入 `sessions` 表，返回 `session_id` cookie
3. 前端收到 cookie，后续请求自动携带
4. GET `/api/auth/me` → `requireSession` 中间件 → `validateSession()` → 注入 `c.get("user")`
5. 登出: POST `/api/auth/logout` → `destroySession()`

**请求处理流:**

1. 请求到达 Hono 实例
2. `requestLogger` 中间件开始计时 → 执行 `await next()` → 路由处理完成后记录日志
3. 路由中间件链顺序执行（角色守卫 → 数据校验 → 业务处理）
4. 响应通过 `success()` / `error()` 等工具函数统一包装
5. `requestLogger` 根据状态码记录 info/warn/error

**知识库检索流:**

1. `bootstrap()` 中初始化 `embeddingProvider` + `LanceDBFileStore` + `KnowledgeBaseService`
2. 通过 `app.use()` 将 `knowledgeBaseService` 注入到 `/api/admin/knowledge/*` 和 `/api/student/knowledge/*` 路由上下文
3. 路由 handler 通过 `c.get("knowledgeBaseService")` 获取实例
4. 查询时调用 embedding API → LanceDB 语义检索 → 返回结果

**测评判题流:**

1. 测评题目通过 seed 脚本预置到 SQLite + LanceDB
2. 用户提交答案 → 后端评估逻辑
3. 复杂评估通过 `ellamaka-client.ts` 调用 Agent 引擎进行 AI 判题

**状态管理:**

- **后端**: 无状态（进程启动时初始化单例服务，路由间无共享状态）
- **前端**: 依赖 `fetch` 直接调用后端 API，无客户端状态管理库（未引入 TanStack Query）
- **会话**: 服务端 session（`sessions` 表 + cookie），TTL 按角色差异化

## 关键抽象

**角色系统 (`packages/shared/src/constants/index.ts`):**
- 目的: 三层权限模型
- 值: `ROLE.STUDENT = 1` / `ROLE.ADMIN = 10` / `ROLE.ROOT = 100`
- 模式: 数值等级 ≥ 比较（AdminAuth = role ≥ 10）

**响应格式 (`packages/backend/src/utils/response.ts`):**
- 目的: 统一 API 响应结构
- 模式: `{ success: boolean, message?, data?, error?, code? }`
- 工具函数: `success()` / `error()` / `unauthorized()` / `forbidden()`

**KnowledgeBaseService (`packages/backend/src/services/knowledge-base.ts`):**
- 目的: 知识库统一访问接口
- 组成: `VectorStore`（LanceDB 文件存储）+ `EmbeddingProvider`（Ollama/Mock）
- 支持: 查询、插入、语义检索

**EllamakaClient (`packages/backend/src/services/ellamaka-client.ts`):**
- 目的: 代理调用外部 Agent 引擎
- 配置: 通过 `ELLAMAKA_URL` 环境变量指定地址
- 模式: HTTP SDK 调用，非嵌入式

## 入口点

**后端入口 (`packages/backend/src/index.ts`):**
- 位置: `packages/backend/src/index.ts`
- 触发: `bun run dev` / `bun run build` → Bun 自动加载
- 职责: 引导启动（schema push → seeds → 服务初始化 → Bun.serve）
- **注意**：禁止 `export default app`，必须手动 `Bun.serve()`

**前端入口 (`apps/web/src/app/layout.tsx`):**
- 位置: `apps/web/src/app/layout.tsx`
- 触发: `next dev -p 3001` / `next build`
- 职责: 根布局、全局上下文（主题、认证状态）

**OpenAPI 文档端点:**
- 位置: `packages/backend/src/index.ts`
- 端点: `GET /api/doc`（OpenAPI JSON）/ `GET /api/doc/ui`（Scalar 调试界面）
- 用途: API 调试和前端参考

**调试端点:**
- 位置: `packages/backend/src/routes/debug.ts`
- 端点: `GET /debug/*`
- 条件: 仅开发环境或 `ENABLE_DEBUG=true` 时启用

## 错误处理

**策略:** 中间件统一捕获 + 路由层防御性处理

**模式:**
- 响应工具函数统一包装错误（`error()` / `unauthorized()` / `forbidden()`）
- 中间件层面处理认证失败（`requireSession` 返回 401/403）
- Zod v4 验证错误自动格式化为 `{ error: { name: "ZodError", message: "<JSON>" } }`
- 请求日志中间件按状态码分级（500+ = error，400+ = warn，其他 = info）

## 横切关注点

**日志:** pino 结构化日志，开发环境 pretty-print + 彩色，生产环境 JSON。统一使用 `logger`，禁止 `console.log`。
**验证:** Zod v4 + `@hono/zod-validator`，运行时 + OpenAPI schema 生成双用途
**认证:** Cookie-based session，httpOnly + sameSite=Strict，按角色分 TTL
**密码:** bcryptjs 哈希
**构建编排:** Turborepo 管理多包依赖和构建顺序
**代码质量:** Husky pre-commit hooks

---

*Architecture analysis: 2026-05-08*