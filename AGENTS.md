<!-- WSF:project-start source:PROJECT.md -->
## Project

**GESP C++ 智能学习系统**

面向 GESP 1~8 级 C++ 等级考试的 AI 自适应智能学习平台，以 AI 智能体替代传统录课和 OJ 判题模式，覆盖"测评-学习-练习"全流程自动化。目标用户为青少年学员（中小学生），需要趣味性、可视化、互动性强的学习体验。

**架构特点：** Agent 引擎运行在 ellamaka 项目，gesp backend 作为业务层负责知识库查询、提示词组织、以及代理 ellamaka SDK 调用。

**Phase 2 架构调整：** 学员端和管理端合并为统一前端（NextJS 15 + shadcn/ui），通过路由和风格区分角色。

**Core Value:** **AI 全流程自动化** — 测评定级、教学讲解、练习判题全部由 AI 智能体驱动，学员获得个性化学习路径，系统越用越智能。

### Constraints

- **Runtime**: Bun（高性能 JS/TS 运行时）
- **Database**: SQLite（关系数据，用户/学习记录）+ LanceDB（向量存储，知识库检索）
- **Agent Engine**: ellamaka（独立运行，HTTP SDK 调用）
- **AI Provider**: 多协议多 Provider 支持（OpenAI、Anthropic、Google、豆包、DeepSeek 等）
- **Target User**: 非技术用户（青少年学员），UI 需趣味性、可视化强
- **Timeline**: MVP 需快速验证核心学习流程
<!-- WSF:project-end -->

<!-- WSF:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Backend Stack
| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Runtime** | Bun | 1.3.11+ | 高性能 JS/TS 运行时，原生 TypeScript 支持，快速启动。ellamaka 中已验证成功使用。 |
| **Web Framework** | Hono | 4.x | 轻量、类型安全，原生支持 Bun。优于 Express/NestJS 的选型。 |
| **OpenAPI** | hono-openapi | 0.4.x | 从路由生成 OpenAPI 规范，支持 SDK 生成。参考 ellamaka。 |
| **Agent Engine** | ellamaka SDK | — | 远程调用 Agent 引擎（HTTP SDK）。AI Provider 多协议支持由 ellamaka 处理。 |
| **ORM** | Drizzle ORM | 0.39.x | 类型安全 SQL，SQLite 下比 Prisma 更轻量。ellamaka 使用。 |
| **Relational DB** | SQLite | 3.x | 轻量、嵌入式，适合 MVP。基于文件，无需额外服务器。 |
| **Vector DB** | LanceDB | 0.10.x | 嵌入式向量数据库，与 Bun 兼容。适用于知识库语义检索。 |
### Frontend Stack（Phase 2 统一架构）
| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **统一前端** | NextJS 15 | 15.x | App Router、React Server Components。学员端+管理端合并为单一应用，通过路由区分。 |
| **UI Library** | shadcn/ui | latest | Radix UI + Tailwind CSS，高度可定制。学员端和管理端使用同一组件库但不同风格。 |
| **Styling** | Tailwind CSS | 3.x | 与 shadcn/ui 配合，支持主题切换（学员端活泼、管理端专业）|
| **State Management** | TanStack Query | 5.x | 服务端状态管理，缓存。 |
| **Forms** | React Hook Form + Zod | 7.x / 3.x | 类型安全的表单验证。 |
- 原 Student App + Admin App（React+Vite+Semi）→ 合并为 `apps/web/`（NextJS 15 + shadcn/ui）
- 学员端路由：`/student/*`（趣味风格）
- 管理端路由：`/admin/*`（专业风格）
- 统一登录入口：`/login`（三角色切换）
### Embedding Stack（Phase 2 新增）
| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Embedding Provider** | Ollama | local | 本地 embedding，无网络依赖，免费。macmini.local:11434 已可用。 |
| **Embedding Model** | nomic-embed-text-v2-moe | — | 高质量开源 embedding 模型，适合中英文混合内容。 |
| **Vector DB** | LanceDB | 0.10.x | 嵌入式向量数据库，与 Bun 兼容。文件模式存储 `./data/gesp.lance`。 |
### Monorepo Tooling
| Tool | Version | Purpose |
|------|---------|---------|
| **Turborepo** | 2.x | Monorepo 构建编排，远程缓存 |
| **Bun workspaces** | 1.3.x | 包管理（比 npm/pnpm 更快） |
### AI Provider SDKs（由 ellamaka 管理，gesp 不直接依赖）
### ellamaka Plugin SDK（gesp-plugin 使用）
## 不建议使用的技术
| Technology | Why Avoid |
|------------|-----------|
| NestJS | 框架过重，本项目不需要。Hono 更轻量且更快。 |
| Express | 较旧，类型安全性不如 Hono。无原生 Bun 优化。 |
| Prisma | Drizzle 在 SQLite + Bun 组合下更好，更轻量。 |
| MongoDB | 不适合结构化教育数据。SQLite 更简单。 |
| Pinecone/Qdrant（云端向量数据库）| LanceDB 嵌入式、零配置用于 MVP。云端向量数据库增加复杂度。 |
| Semi Design | Phase 2 改用 shadcn/ui，统一学员端和管理端组件库。 |
| Redux | TanStack Query 处理服务端状态，本地状态用 React hooks 即可。 |
| 经典 OJ 系统（Judge0、DOMjudge）| v1 使用 AI 模拟判题，不需要真实代码执行。无需沙盒。 |
## 集成模式
### 1. ellamaka SDK 代理模式（gesp → ellamaka）
### 2. LanceDB 集成模式（gesp backend 内）
### 3. Drizzle SQLite Schema 模式（参考 ellamaka）
## 配置文件
### Root package.json
### turbo.json
## Sources
- **ellamaka 项目** — Agent 引擎、SDK 设计、Plugin 系统（HIGH confidence）
- **ellamaka package.json** — 已验证 Bun、Hono 版本（HIGH confidence）
- **Vercel AI SDK docs** — 多 Provider 模式（由 ellamaka 使用，gesp 间接依赖）
- **LanceDB docs** — 嵌入式向量数据库模式（MEDIUM confidence, web search）
- **Turborepo docs** — Monorepo 配置（HIGH confidence, turbo.build）
<!-- WSF:stack-end -->

---

## 1. 架构概览

```
Monorepo
├── @gesp/shared    — 常量、类型定义（ROLE / USER_STATUS / ApiResponse）
└── @gesp/backend   — Hono API Server
    ├── routes      → services → db
    ├── middleware  — session 管理 + 角色守卫
    ├── db          — Drizzle ORM + SQLite (./data/gesp.db)
    └── seed        — root admin 自动初始化
```

详细架构与代码规范见 `packages/backend/AGENTS.md`

---

## 2. 目录结构

```
gesp/
├── packages/
│   ├── backend/          # API 服务器（详见 packages/backend/AGENTS.md）
│   └── shared/           # 跨包共享类型和常量
│       └── src/
│           ├── types/        # ApiResponse, User
│           └── constants/    # ROLE (1/10/100), USER_STATUS (1/2)
├── scripts/
│   ├── seed-knowledge.ts # 知识库 seed 脚本（手动执行）
│   └── verify-auth.ts    # 端到端验证脚本
├── turbo.json
└── package.json
```

---

## 3. 命令速查

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

## 4. 代码约束

- **禁止** `export default app`（Bun 自动 serve 导致端口冲突）
- 密码必须 bcryptjs 哈希，Session cookie httpOnly + sameSite=Strict
- 禁止提交 `data/`、`.env`、`node_modules/`、`dist/`
- Shared 包禁止依赖 Backend；Backend 通过 `@gesp/shared` 引用共享类型

<!-- WSF:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- WSF:conventions-end -->

<!-- WSF:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- WSF:architecture-end -->

<!-- WSF:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- WSF:skills-end -->

<!-- WSF:workflow-start source:WSF defaults -->
## WSF Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a WSF command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/wsf-quick` for small fixes, doc updates, and ad-hoc tasks
- `/wsf-debug` for investigation and bug fixing
- `/wsf-execute-phase` for planned phase work

Do not make direct repo edits outside a WSF workflow unless the user explicitly asks to bypass it.
<!-- WSF:workflow-end -->

<!-- WSF:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/wsf-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- WSF:profile-end -->
