# Phase 1: Foundation & Auth - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

项目基础设施搭建 + 用户认证系统。学员可以注册登录并跨浏览器 session 持久化（1h TTL）。管理员可以登录并保持更长 session（24h TTL）。Monorepo 结构、数据库 schema、前后端 scaffold 在此阶段完成。

Requirements covered: AUTH-01, AUTH-02, AUTH-03, AUTH-04

</domain>

<decisions>
## Implementation Decisions

### Authentication Strategy
- **D-01:** Session-based authentication + Optional Access Token（复用 new-api 模式）
  - Primary: 服务端 session 存储，客户端 cookie
  - Fallback: Access Token for API calls（学员端可选，管理端可能需要）
  - Session 内容: `{id, username, role, status}`
- **D-02:** Session TTL 差异化：学员 1h，管理员 24h

### Session Storage
- **D-03:** SQLite session storage（同 DB，无额外依赖）
  - 使用 Drizzle ORM 创建 sessions table
  - Session TTL 通过定时清理任务实现

### Admin Access Control
- **D-04:** Dynamic admins（数据库存储管理员账户）
  - Role 分级: `student` | `admin` | `super_admin`（v2 可扩展）
  - User 表使用 role 字段区分用户类型
  - 支持多管理员账户
- **D-05:** Admin middleware 检查 role >= admin

### Password Handling
- **D-06:** bcrypt 密码哈希（bcryptjs in Node.js）
  - 使用 bcrypt.DefaultCost (cost=10)
  - Password2Hash(): `bcrypt.hash(password, salt)`
  - ValidatePasswordAndHash(): `bcrypt.compare(password, hash)`

### Monorepo Structure
- **D-07:** Turborepo + Bun workspaces
  ```
  packages/
    backend/        # Hono API 服务
    student-app/    # NextJS 学员端
    admin-app/      # React + Vite + Semi Design 管理端
    sdk/            # 共享 API client（OpenAPI 生成）
    shared/         # 共享类型和工具
    ui/             # 共享 UI 组件库
  ```

### Claude's Discretion
- Session 清理任务的触发频率
- Monorepo 依赖共享策略（workspace:* vs 固定版本）
- User 表额外字段（email, displayName 等）
- 前端 scaffold 的具体页面结构

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### new-api Authentication Reference
- `labs/fork/sampx/new-api/middleware/auth.go` — Session-based auth + Access Token fallback, authHelper pattern, role-based middleware (UserAuth/AdminAuth/RootAuth)
- `labs/fork/sampx/new-api/model/user.go` — User model schema: Id, Username, Password, Role, Status, Group, AccessToken; ValidateAndFill() login validation
- `labs/fork/sampx/new-api/common/crypto.go` — Password2Hash() bcrypt implementation, ValidatePasswordAndHash() validation
- `labs/fork/sampx/new-api/controller/user.go` — Login endpoint, setupLogin() session setup, Logout session clear

### ellamaka Backend Reference
- `projects/ellamaka/packages/opencode/src/server/server.ts` — Hono server setup, middleware chain pattern
- `projects/ellamaka/packages/opencode/src/server/middleware.ts` — AuthMiddleware, ErrorMiddleware, CorsMiddleware
- `projects/ellamaka/packages/opencode/package.json` — Dependencies: Hono, hono-openapi, Drizzle, Vercel AI SDK, bcrypt

### GESP Project Context
- `projects/gesp/.planning/PROJECT.md` — Core value, tech stack, monorepo structure, key decisions
- `projects/gesp/.planning/REQUIREMENTS.md` — AUTH-01~04 acceptance criteria
- `projects/gesp/.planning/research/STACK.md` — Tech stack versions, package.json templates
- `projects/gesp/.planning/research/ARCHITECTURE.md` — Build order, dual authentication system design

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from reference projects)
- **ellamaka**: Hono server setup pattern, middleware chain, hono-openapi spec generation, Drizzle schema patterns
- **new-api**: Complete auth flow (Login → setupLogin → authHelper), bcrypt usage, role-based middleware

### Established Patterns
- Session-based auth with role checking in middleware
- bcrypt password hashing with DefaultCost
- Hono middleware chain: Error → Auth → Logger → CORS
- Monorepo workspace structure with Turborepo

### Integration Points
- Backend package exposes auth endpoints: `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`
- Session middleware applied to protected routes
- Admin routes require role >= admin check

</code_context>

<specifics>
## Specific Ideas

- "复用 new-api 认证机制，此方面非常成熟"
- Session 内容参考 new-api: `{id, username, role, status, group}`
- 角色分级: student(1) → admin(10) → super_admin(100)（数值便于比较）
- 学员注册需要 username + password，暂不需要 email（v2 OAuth 需要）

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-auth*
*Context gathered: 2026-04-22*