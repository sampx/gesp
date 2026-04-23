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

## Recommended Stack
### Backend Stack
| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Runtime** | Bun | 1.3.11+ | High performance JS/TS runtime, native TypeScript support, fast startup. Used in ellamaka successfully. |
| **Web Framework** | Hono | 4.x | Lightweight, type-safe, works with Bun natively. Better than Express/NestJS for this use case. |
| **OpenAPI** | hono-openapi | 0.4.x | Auto-generate OpenAPI spec from routes, enables SDK generation. Reference: ellamaka. |
| **ORM** | Drizzle ORM | 0.39.x | Type-safe SQL, better than Prisma for SQLite. Used in ellamaka. |
| **Relational DB** | SQLite | 3.x | Lightweight, embedded, perfect for MVP. File-based, no server needed. |
| **Vector DB** | LanceDB | 0.10.x | Embedded vector DB, works with Bun. Good for knowledge base semantic search. |
### Frontend Stack
| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Student App** | NextJS | 15.x | App Router, React Server Components for SEO, streaming support. |
| **Admin App** | React + Vite | 18.x / 6.x | Fast dev server, HMR. Reference: new-api web structure. |
| **Admin UI Library** | Semi Design | 2.x | Enterprise-grade components, Chinese-friendly. Used in new-api. |
| **Student UI** | Tailwind CSS + Kobalte | 3.x / 0.13.x | Modern styling + SolidJS components for interactive parts. |
| **State Management** | TanStack Query | 5.x | Server state management, caching. |
| **Forms** | React Hook Form + Zod | 7.x / 3.x | Type-safe form validation. |
### Monorepo Tooling
| Tool | Version | Purpose |
|------|---------|---------|
| **Turborepo** | 2.x | Monorepo build orchestration, remote caching |
| **Bun workspaces** | 1.3.x | Package management (faster than npm/pnpm) |

## What NOT to Use
| Technology | Why Avoid |
|------------|-----------|
| NestJS | Heavy framework, not needed for this project. Hono is lighter and faster. |
| Express | Older, less type-safe than Hono. No native Bun optimizations. |
| Prisma | Drizzle is better for SQLite + Bun, lighter weight. |
| MongoDB | Not suitable for structured educational data. SQLite is simpler. |
| Pinecone/Qdrant (cloud vector DB) | LanceDB is embedded, zero-config for MVP. Cloud vector DB adds complexity. |
| Redux | TanStack Query handles server state, local state with React hooks. |
| Classic OJ systems (Judge0, DOMjudge) | v1 uses AI模拟判题, not real code execution. No sandbox needed. |
## Integration Patterns
### 1. LanceDB Integration Pattern
### 2. Drizzle SQLite Schema Pattern (参考 ellamaka)
## Configuration Files
### Root package.json
### turbo.json
## Sources
- **ellamaka package.json** — Verified Bun, Hono, AI SDK versions (HIGH confidence)
- **Vercel AI SDK docs** — Multi-provider patterns (HIGH confidence, context7 verified)
- **LanceDB docs** — Embedded vector DB patterns (MEDIUM confidence, web search)
- **Turborepo docs** — Monorepo configuration (HIGH confidence, turbo.build)
<!-- WSF:stack-end -->

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
