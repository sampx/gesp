<!-- WSF:project-start source:PROJECT.md -->
## Project

**GESP C++ 智能学习系统**

面向 GESP 1~4 级 C++ 等级考试的 AI 自适应智能学习平台，以 AI 智能体替代传统录课和 OJ 判题模式，覆盖"测评-学习-练习-复盘-系统迭代"全流程自动化。目标用户为青少年学员（中小学生），需要趣味性、可视化、互动性强的学习体验。

**Core Value:** **AI 全流程自动化** — 测评定级、教学讲解、练习判题全部由 AI 智能体驱动，学员获得个性化学习路径，系统越用越智能。

### Constraints

- **Runtime**: Bun（参考 ellamaka，高性能 JS/TS 运行时）
- **Database**: SQLite（轻量、嵌入式）+ LanceDB（向量存储，用于知识库检索）
- **Target User**: 青少年学员，UI 需趣味性、可视化强
- **Timeline**: MVP 需快速验证核心学习流程
<!-- WSF:project-end -->

<!-- WSF:stack-start source:research/STACK.md -->
## Technology Stack

### Backend (已实现)
| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Bun | 1.3.11+ |
| Web Framework | Hono | 4.x |
| ORM | Drizzle ORM | 0.39.x |
| Database | SQLite | 3.x |
| Validation | Zod + @hono/zod-validator | 3.x / 0.7.x |
| Test | Vitest | 2.x |

### Frontend (计划中)
| Layer | Technology | Version |
|-------|------------|---------|
| Student App | NextJS | 15.x |
| Admin App | React + Vite | 18.x / 6.x |
| Admin UI | Semi Design | 2.x |
| Student UI | Tailwind CSS + Kobalte | 3.x / 0.13.x |

### Monorepo Tooling
| Tool | Version | Purpose |
|------|---------|---------|
| Turborepo | 2.x | Build orchestration |
| Bun workspaces | 1.3.x | Package management |
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
│   └── verify-auth.ts   # 端到端验证脚本
├── turbo.json
└── package.json
```

---

## 3. 命令速查

| 命令 | 说明 |
|------|------|
| `bun run dev` | 启动开发服务器（自动建表 + seed） |
| `bun run db:push` | 同步表结构 |
| `bun run typecheck` | 类型检查 |
| `bun run test` | 单元测试 |
| `bun scripts/verify-auth.ts` | 认证系统 E2E 验证（需先 dev） |

---

## 4. 代码约束

- **禁止** `export default app`（Bun 自动 serve 导致端口冲突）
- 密码必须 bcryptjs 哈希，Session cookie httpOnly + sameSite=Strict
- 禁止提交 `data/`、`.env`、`node_modules/`、`dist/`
- Shared 包禁止依赖 Backend；Backend 通过 `@gesp/shared` 引用共享类型

<!-- WSF:conventions-start source:CONVENTIONS.md -->
<!-- WSF:conventions-end -->

<!-- WSF:architecture-start source:ARCHITECTURE.md -->
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
