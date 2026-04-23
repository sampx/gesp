# Phase 1: 基础设施与认证 - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段交付项目基础设施与认证底座：初始化 monorepo 中 Phase 1 所需包，搭建 gesp backend 的 Hono + Drizzle 基础框架，落地用户认证、会话管理、权限分层与初始数据库 schema，为后续知识库、智能体代理和前端应用提供统一基础。

</domain>

<decisions>
## Implementation Decisions

### 认证机制
- **D-01:** 认证采用 Session-based 方案，使用 httpOnly cookie + server-side session store。
- **D-02:** 密码哈希采用 bcrypt。
- **D-03:** 初始管理员通过 seed data 创建，首次启动自动写入默认管理员账号。

### 目录与包结构
- **D-04:** Phase 1 仅初始化 `packages/backend` 与 `packages/shared`。
- **D-05:** `packages/backend` 采用分层架构，按 `routes / services / db / middleware` 组织。
- **D-06:** `packages/shared` 在 Phase 1 仅包含共享类型定义与常量，不提前扩展工具函数或 SDK 类型。

### 用户与数据库模型
- **D-07:** 用户表沿用 new-api 的认证骨架，但仅保留本系统需要的字段：`id`, `username`, `password_hash`, `display_name`, `role`, `status`, `email`, `github_id`, `oidc_id`, `wechat_id`, `telegram_id`, `created_at`, `updated_at`。
- **D-08:** 用户与角色结构沿用 new-api 设计，采用单表 `users` + `role` 整数分级。
- **D-09:** 保留 `root` 超级管理员角色，角色值采用 `student=1`, `admin=10`, `root=100`。
- **D-10:** 保留 `email / github_id / oidc_id / wechat_id / telegram_id` 的 OAuth 相关 schema，但 Phase 1 不实现 OAuth 登录流程。

### API 与认证中间件规范
- **D-11:** API 路由前缀采用 `/api/auth/*`, `/api/admin/*`, `/api/student/*`。
- **D-12:** API 响应格式沿用 new-api 风格：`{ success, message, data }`。
- **D-13:** 认证中间件采用分层设计：`StudentAuth()`, `AdminAuth()`, `RootAuth()`。
- **D-14:** API 必须符合 OpenAPI v3 规范，作为 backend 路由设计与后续 SDK 生成的约束。

### the agent's Discretion
- Session TTL 的具体实现方式（cookie Max-Age、session store 过期策略、是否双重校验）由 researcher / planner 结合 Hono 生态决定，但必须满足：学员 1 小时、管理员 24 小时。
- 初始管理员默认账号的具体用户名与密码可在实现时以 seed + env override 的安全方式细化，但必须保留自动初始化能力。

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning baseline
- `.planning/PROJECT.md` — 项目定位、架构约束、monorepo 结构、技术栈与关键设计决策。
- `.planning/ROADMAP.md` — Phase 1 目标、Success Criteria、Phase 边界。
- `.planning/REQUIREMENTS.md` — AUTH-01 ~ AUTH-04 及整体需求映射。
- `.planning/STATE.md` — 当前项目状态与已锁定的近期架构决策。

### Phase research
- `.planning/research/ARCHITECTURE.md` — backend / ellamaka 分层架构、API Gateway 分区、数据层组织。
- `.planning/research/STACK.md` — Hono、Drizzle、SQLite、Bun、hono-openapi 等推荐技术栈。
- `.planning/research/SUMMARY.md` — research 总结与阶段规划上下文。

### Reference implementation
- `../../labs/fork/sampx/new-api/model/user.go` — 参考用户模型、角色体系、密码哈希入口与用户写入流程。（注意：仅借鉴认证相关设计，不照搬 quota / 邀请 / 网关字段）
- `../../labs/fork/sampx/new-api/controller/user.go` — 参考登录、注册、session 设置、响应格式 `{ success, message, data }`。
- `../../labs/fork/sampx/new-api/middleware/auth.go` — 参考分层认证中间件设计与 role 校验方式。

### API contract
- No local OpenAPI spec file yet — backend API 设计必须符合 OpenAPI v3 规范；后续应优先通过 `hono-openapi` 或等效方式输出规范文档。

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 当前 gesp 仓库尚无业务源码，Phase 1 需要从零建立 backend 与 shared 基础骨架。
- 可借鉴 `new-api` 的认证分层思路，但实现需适配 Bun + Hono + Drizzle，而非 Go + Gin + GORM。

### Established Patterns
- 项目层面已锁定：gesp backend 为唯一入口，负责业务逻辑、知识库查询、提示词组织与 ellamaka SDK 代理。
- OpenAPI 为约束的一部分，说明 route 设计不能只考虑运行时，还需考虑后续 SDK / 文档生成。

### Integration Points
- `packages/backend` 是后续 student-app、admin-app、以及 ellamaka SDK 代理层的统一接入点。
- `packages/shared` 将为 backend 与后续前端包提供角色常量、响应类型、用户类型等共享定义。

</code_context>

<specifics>
## Specific Ideas

- 尽量与 new-api 的认证设计保持一致，但去除与 gesp 学习系统无关的 quota、邀请、支付、第三方网关管理字段。
- OAuth 相关字段本阶段只落 schema，后续再实现 provider 流程。
- OpenAPI v3 规范需要明确写入上下文，避免 planner 只做普通 REST 路由而忽略 contract 生成。

</specifics>

<deferred>
## Deferred Ideas

- OAuth 登录流程本身（GitHub / OIDC / WeChat / Telegram）延后到后续阶段实现。
- student-app 与 admin-app 初始化延后到后续对应阶段，不在 Phase 1 落地。
- 更复杂的 profile 拆表、权限细分、审计日志等高级后台能力延后到后续阶段。

</deferred>

---

*Phase: 01-基础设施与认证*
*Context gathered: 2026-04-22*
