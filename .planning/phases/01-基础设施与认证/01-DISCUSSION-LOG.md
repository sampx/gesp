# Phase 1: 基础设施与认证 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 1-基础设施与认证
**Areas discussed:** 认证机制, 目录结构, 数据库 Schema, API 基础规范

---

## 认证机制

| Option | Description | Selected |
|--------|-------------|----------|
| Session-based | httpOnly cookie + server-side session store | ✓ |
| JWT stateless | Token 存 client，无 server 状态 | |
| 混合模式 | JWT + refresh token | |

**User's choice:** Session-based
**Notes:** 与 research 架构中 SQLite session store 方向一致。

| Option | Description | Selected |
|--------|-------------|----------|
| bcrypt | 业界标准，自动 salt，cost 可调 | ✓ |
| Argon2id | 更强抗暴力破解，但依赖更重 | |
| scrypt | Node/Bun 内置方案 | |

**User's choice:** bcrypt
**Notes:** 与 new-api 现有实现保持一致。

| Option | Description | Selected |
|--------|-------------|----------|
| Seed data | 启动时自动创建管理员 | ✓ |
| CLI command | 手动命令创建管理员 | |
| Env config | 通过环境变量初始化凭据 | |

**User's choice:** Seed data
**Notes:** MVP 优先简单落地。

---

## 目录结构

| Option | Description | Selected |
|--------|-------------|----------|
| backend + shared | 仅初始化 Phase 1 所需包 | ✓ |
| backend + shared + student-app | 同步初始化学员端 | |
| 全部初始化 | 一次性搭建完整 monorepo | |

**User's choice:** backend + shared
**Notes:** 先聚焦 backend 基础设施与认证。

| Option | Description | Selected |
|--------|-------------|----------|
| 分层架构 | `routes / services / db / middleware` | ✓ |
| 扁平结构 | 少量文件快速起步 | |
| 模块化 | `modules/auth` 等按功能拆分 | |

**User's choice:** 分层架构
**Notes:** 更利于 Phase 2+ 扩展。

| Option | Description | Selected |
|--------|-------------|----------|
| 类型定义 + 常量 | shared 最小职责 | ✓ |
| 类型 + 工具函数 | 预留更多公共逻辑 | |
| 类型 + 常量 + SDK 类型 | 提前为 plugin / SDK 预埋 | |

**User's choice:** 类型定义 + 常量
**Notes:** 避免过早抽象。

---

## 数据库 Schema

| Option | Description | Selected |
|--------|-------------|----------|
| 与 new-api 认证设计一致 | 保留认证骨架，去掉无关字段 | ✓ |
| 极简 users 表 | 仅最小认证字段 | |
| 分拆 users / profiles | 认证资料分层 | |

**User's choice:** 与 new-api 认证设计一致
**Notes:** 明确要求去除 quota 等与本系统无关字段，但保留认证相关设计。

| Option | Description | Selected |
|--------|-------------|----------|
| 单表 users + role | 与 new-api 相同 | ✓ |
| student/admin 分表 | 角色硬隔离 | |
| users + profiles | 认证与资料分离 | |

**User's choice:** 与 new-api 采用同样的设计
**Notes:** 进一步明确沿用单表 + role 模式。

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 root + OAuth schema | 保留 root，保留 oidc/wechat/telegram/github/email schema，不实现 OAuth 流程 | ✓ |
| 只保留 admin | 不设 root | |
| 只保留最小 OAuth 字段 | 仅 email/oidc | |

**User's choice:** 保留 oidc wechat telegram github email, 落 schema, 不实现 oauth 流程；保留 root 管理员。
**Notes:** root 角色保留，OAuth provider 仅落表字段。

---

## API 基础规范

| Option | Description | Selected |
|--------|-------------|----------|
| `/api/auth/*`, `/api/admin/*`, `/api/student/*` | 与研究架构图一致 | ✓ |
| `/api/v1/...` | 显式版本化 | |
| 扁平路径 | 无 `/api` 分域 | |

**User's choice:** `/api/auth/*`, `/api/admin/*`, `/api/student/*`
**Notes:** 与 ARCHITECTURE.md 保持一致。

| Option | Description | Selected |
|--------|-------------|----------|
| `{ success, message, data }` | 沿用 new-api 风格 | ✓ |
| `{ success, message, data, error }` | 更规范但更重 | |
| 纯 REST 风格 | 直接 data / HTTP 错误 | |

**User's choice:** `{ success, message, data }`
**Notes:** admin 端与后续 API 一致性更好。

| Option | Description | Selected |
|--------|-------------|----------|
| `StudentAuth / AdminAuth / RootAuth` | 与 new-api 一致 | ✓ |
| 单一 Auth + 路由判断 | 更灵活 | |
| `RequireRole(minRole)` | 更抽象 | |

**User's choice:** `StudentAuth / AdminAuth / RootAuth`
**Notes:** 权限边界清晰。

| Option | Description | Selected |
|--------|-------------|----------|
| OpenAPI v3 规范 | API 作为 contract-first 设计 | ✓ |

**User's choice:** API 需要符合 OpenAPI v3 规范，并写入上下文。
**Notes:** 补充为强约束，影响 planner 对 route / contract / SDK 生成的设计。

---

## the agent's Discretion

- Session TTL 的具体实现细节
- 管理员 seed 的默认凭据与 env override 形式

## Deferred Ideas

- OAuth 登录流程本身延后
- student-app / admin-app 初始化延后
- 更复杂的 profile / 权限 / 审计能力延后
