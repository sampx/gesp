# Phase 1: Foundation & Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 01-foundation-auth
**Areas discussed:** 认证策略, Session 存储, Admin 权限, 密码处理

---

## 认证策略

| Option | Description | Selected |
|--------|-------------|----------|
| Session-based (推荐) | 服务端 session 存储，客户端 cookie。简单安全，学员/Admin 用同一机制，仅 TTL 不同。 | ✓ |
| JWT stateless | 无服务端状态，token 存 cookie。适合分布式，需要 refresh token 处理。学员/Admin TTL 需不同策略。 | |
| Hybrid | Session cookie + JWT access token（new-api 模式）。API 调用用 JWT，Web 用 Session。复杂度高。 | |

**User's choice:** Session-based (推荐)
**Notes:** 用户确认复用 new-api 认证模式后，选择 Session-based + Optional Access Token 方案

---

## Session 存储

| Option | Description | Selected |
|--------|-------------|----------|
| SQLite (推荐) | 同关系 DB，无额外依赖。Drizzle 已有 SQLite 支持。适合 MVP 小规模。Session TTL 通过定时清理。 | ✓ |
| Redis | 高性能，原生 TTL 支持。适合分布式部署。增加运行依赖。MVP 可能不需要。 | |
| Cookie-only (不适用) | JWT 方案下使用，无服务端存储。已选择 Session-based，此选项不适用。 | |

**User's choice:** SQLite (推荐)

---

## Admin 权限

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic admins (推荐) | 数据库存储管理员账户，支持多管理员。符合 REQ-ADMIN-02/03。学员/Admin 分表或分角色字段。 | ✓ |
| Fixed credentials | 环境变量配置单管理员账号/密码。简单，无法多管理员。后续扩展需改架构。 | |
| Role-based (v2) | 学员/管理员/超级管理员三级。复杂，AUTH-04 只要求学员/Admin 两种角色。v2 可扩展。 | |

**User's choice:** Dynamic admins (推荐)

---

## 密码处理

| Option | Description | Selected |
|--------|-------------|----------|
| Bcrypt (推荐) | 业界标准，成熟稳定，Node.js 生态原生支持（bcryptjs）。默认 cost=10，可调整。抗 GPU 但非最优。 | ✓ |
| Argon2 | 现代算法，抗 GPU/ASIC 破解，密码竞赛冠军。Node.js 需 argon2 包（native binding）。复杂度高。 | |
| PBKDF2 | 兼容性好，可配置迭代次数。Node.js 原生 crypto 支持。不如 Bcrypt/Argon2 安全。 | |

**User's choice:** Bcrypt (推荐)

---

## Claude's Discretion

- Session 清理任务的触发频率
- Monorepo 依赖共享策略（workspace:* vs 固定版本）
- User 表额外字段（email, displayName 等）
- 前端 scaffold 的具体页面结构

---

## Deferred Ideas

None — discussion stayed within phase scope

---

## new-api 认证架构分析

用户要求复用 new-api 认证机制，分析结果：

**核心模式:**
1. Session-based + Access Token hybrid
2. Login → ValidateAndFill(bcrypt) → setupLogin(session)
3. Session: {id, username, role, status, group}
4. authHelper(minRole) middleware 检查 session 或 Access Token

**适配映射:**
| new-api (Go) | GESP (TypeScript/Hono) |
|--------------|------------------------|
| gin-sessions | Hono session middleware 或自定义 |
| bcrypt.DefaultCost | bcryptjs |
| Role int field | Role enum: student | admin |
| User model | Drizzle schema: users table |
| Access Token | 可选，学员端可能不需要 |

---

*Phase: 01-foundation-auth*
*Discussion completed: 2026-04-22*