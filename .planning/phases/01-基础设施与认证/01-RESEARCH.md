# Phase 1: 基础设施与认证 - Research

**Researched:** 2026-04-22
**Status:** Complete
**Phase Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04

---

## Research Summary

本阶段需要从零搭建 gesp backend 的 Hono + Drizzle + SQLite 基础框架，并实现 Session-based 认证。核心研究聚焦于：

1. Hono session middleware 与 SQLite session store 实现方案
2. bcrypt 在 Bun 运行时下的集成方式
3. OpenAPI v3 规范在 Hono 中的落地（hono-openapi）
4. Drizzle SQLite 用户表 schema 设计（保留 new-api 认证骨架）
5. 分层认证中间件（StudentAuth / AdminAuth / RootAuth）实现模式
6. 差异化 Session TTL（学员 1h / 管理员 24h）实现策略

---

## Stack Recommendations

### Core Stack (Confirmed by STACK.md)

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Runtime | Bun | 1.3.11+ | 高性能 JS/TS 运行时，原生支持 TypeScript |
| Web Framework | Hono | 4.x | 轻量、类型安全，原生支持 Bun |
| OpenAPI | hono-openapi | 0.4.x | 从路由自动生成 OpenAPI spec |
| ORM | Drizzle ORM | 0.39.x | 类型安全 SQL，SQLite 下比 Prisma 更轻量 |
| Relational DB | SQLite | 3.x | 轻量、嵌入式，基于文件 |
| Monorepo | Turborepo + Bun workspaces | 2.x / 1.3.x | 构建编排 + 包管理 |

### Auth Stack

| Component | Technology | Version | Notes |
|-----------|------------|---------|-------|
| Password Hashing | bcryptjs | 3.x | Bun-compatible bcrypt 实现 |
| Session Store | Drizzle SQLite | — | 自定义 sessions table |
| Cookie | Hono cookie helpers | — | setCookie, getCookie, setSignedCookie |

---

## Session-Based Auth Implementation

### 1. Session Store Architecture

**Decision: SQLite-based session store via Drizzle**

Hono 没有内置 session middleware，需要自定义实现。方案：

```typescript
// projects/gesp/packages/backend/src/db/schema/sessions.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text().primaryKey(), // UUID session ID
  user_id: text().notNull().references(() => users.id),
  created_at: integer({ mode: "timestamp" }).notNull(),
  expires_at: integer({ mode: "timestamp" }).notNull(),
  role: integer().notNull(), // Store role for TTL differentiation
});
```

**Session lifecycle:**
1. Login → 创建 session record，设置 expires_at = now + TTL
2. Request → 检查 session 是否存在且未过期
3. Logout → 删除 session record
4. Expiration cleanup → 定期清理过期 sessions（可选）

### 2. Cookie Configuration

**httpOnly cookie with role-based TTL:**

```typescript
// projects/gesp/packages/backend/src/middleware/session.ts
import { setCookie, getCookie } from "hono/cookie";

const SESSION_TTL = {
  student: 60 * 60, // 1 hour (seconds)
  admin: 24 * 60 * 60, // 24 hours
  root: 24 * 60 * 60,
};

export async function createSession(c: Context, userId: string, role: number) {
  const sessionId = crypto.randomUUID();
  const ttl = role === 1 ? SESSION_TTL.student : SESSION_TTL.admin;
  
  // Write to DB
  await db.insert(sessions).values({
    id: sessionId,
    user_id: userId,
    created_at: new Date(),
    expires_at: new Date(Date.now() + ttl * 1000),
    role,
  });
  
  // Set cookie
  setCookie(c, "session_id", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: ttl,
    path: "/",
  });
}
```

### 3. Session Validation Middleware

**Dual validation: cookie + DB check:**

```typescript
export async function validateSession(c: Context, next: Next) {
  const sessionId = getCookie(c, "session_id");
  if (!sessionId) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }
  
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });
  
  if (!session || session.expires_at < new Date()) {
    // Expired or missing → clean up and reject
    if (session) await db.delete(sessions).where(eq(sessions.id, sessionId));
    return c.json({ success: false, message: "Session expired" }, 401);
  }
  
  // Store user info in context
  c.set("userId", session.user_id);
  c.set("role", session.role);
  await next();
}
```

---

## bcrypt Integration

### Bun-Compatible bcrypt

**Use bcryptjs (pure JS implementation):**

```bash
bun add bcryptjs
bun add -d @types/bcryptjs
```

```typescript
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Why bcryptjs:**
- Pure JS implementation，无需 native bindings
- Bun 完全兼容
- 与 Node.js bcrypt API 一致
- cost factor 可调（10 是推荐值）

---

## OpenAPI v3 with Hono

### hono-openapi Integration

**Route definition with Zod schemas:**

```typescript
// projects/gesp/packages/backend/src/routes/auth.ts
import { createRoute } from "hono-openapi";
import { z } from "zod";

const loginRoute = createRoute({
  method: "post",
  path: "/api/auth/login",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            username: z.string().min(3),
            password: z.string().min(6),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              user: z.object({
                id: z.string(),
                username: z.string(),
                display_name: z.string(),
                role: z.number(),
              }),
            }),
          }),
        },
      },
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
  },
});
```

**OpenAPI spec export:**

```typescript
// projects/gesp/packages/backend/src/index.ts
import { OpenAPIHono } from "hono-openapi";

const app = new OpenAPIHono();

// Register routes...
app.route("/api/auth", authRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/student", studentRoutes);

// Export OpenAPI spec
app.doc("/api/doc", {
  openapi: "3.0.0",
  info: { title: "GESP API", version: "1.0.0" },
});
```

---

## Directory Structure

### Backend Package Structure

```
projects/gesp/packages/backend/
├── src/
│   ├── index.ts              # Hono app entry + OpenAPI export
│   ├── routes/
│   │   ├── auth.ts           # /api/auth/* routes
│   │   ├── admin.ts          # /api/admin/* routes
│   │   └── student.ts        # /api/student/* routes
│   ├── services/
│   │   ├── auth.service.ts   # Login, register, session logic
│   │   └── user.service.ts   # User CRUD
│   ├── middleware/
│   │   ├── session.ts        # Session validation
│   │   ├── auth.ts           # Role-based auth (StudentAuth, AdminAuth, RootAuth)
│   │   └── error.ts          # Error handling
│   ├── db/
│   │   ├── index.ts          # Drizzle client init
│   │   ├── schema/
│   │   │   ├── users.ts      # Users table
│   │   │   └── sessions.ts   # Sessions table
│   │   └── seed/
│   │   │   └── admin.seed.ts # Initial admin seed
│   └── utils/
│   │   ├── password.ts       # bcrypt helpers
│   │   ├── response.ts       # { success, message, data } helpers
│   ├── types/
│   │   └── user.ts           # User type definitions
├── drizzle/
│   └── schema.ts             # Consolidated schema export
├── package.json
├── tsconfig.json
└── bunfig.toml               # Bun config
```

### Shared Package Structure

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── user.ts           # User type
│   │   ├── response.ts       # ApiResponse type
│   │   └── session.ts        # Session type
│   ├── constants/
│   │   ├── role.ts           # Role values (1, 10, 100)
│   │   ├── status.ts         # User status (enabled/disabled)
│   ├── index.ts              # Export all
├── package.json
├── tsconfig.json
```

---

## Database Schema Design

### Users Table (Aligned with new-api)

```typescript
// projects/gesp/packages/backend/src/db/schema/users.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text().notNull().unique(),
  password_hash: text().notNull(),
  display_name: text().notNull(),
  role: integer().notNull().default(1), // 1=student, 10=admin, 100=root
  status: integer().notNull().default(1), // 1=enabled, 2=disabled
  email: text().unique(),
  github_id: text().unique(),
  oidc_id: text().unique(),
  wechat_id: text().unique(),
  telegram_id: text().unique(),
  created_at: integer({ mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updated_at: integer({ mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Indexes
export const usersIndexes = {
  usernameIdx: index("users_username_idx").on(users.username),
  roleIdx: index("users_role_idx").on(users.role),
  emailIdx: index("users_email_idx").on(users.email),
};
```

### Sessions Table

```typescript
// projects/gesp/packages/backend/src/db/schema/sessions.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const sessions = sqliteTable("sessions", {
  id: text().primaryKey(), // UUID session ID
  user_id: text().notNull().references(() => users.id, { onDelete: "cascade" }),
  created_at: integer({ mode: "timestamp" }).notNull(),
  expires_at: integer({ mode: "timestamp" }).notNull(),
  role: integer().notNull(), // Copy role for TTL differentiation
});

export const sessionsIndexes = {
  userIdIdx: index("sessions_user_id_idx").on(sessions.user_id),
  expiresAtIdx: index("sessions_expires_at_idx").on(sessions.expires_at),
};
```

---

## Middleware Implementation

### Layered Auth Middleware

**Three-tier auth: StudentAuth / AdminAuth / RootAuth:**

```typescript
// projects/gesp/packages/backend/src/middleware/auth.ts
import { Context, Next } from "hono";

// Role constants
const ROLE = {
  STUDENT: 1,
  ADMIN: 10,
  ROOT: 100,
};

// Base session validation (shared)
async function validateSession(c: Context, next: Next) {
  const sessionId = getCookie(c, "session_id");
  if (!sessionId) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }
  
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { user: true },
  });
  
  if (!session || session.expires_at < new Date()) {
    return c.json({ success: false, message: "Session expired" }, 401);
  }
  
  c.set("user", session.user);
  c.set("session", session);
  await next();
}

// StudentAuth: role >= 1
export function StudentAuth() {
  return async (c: Context, next: Next) => {
    await validateSession(c, async () => {
      const user = c.get("user");
      if (user.role < ROLE.STUDENT) {
        return c.json({ success: false, message: "Forbidden" }, 403);
      }
      await next();
    });
  };
}

// AdminAuth: role >= 10
export function AdminAuth() {
  return async (c: Context, next: Next) => {
    await validateSession(c, async () => {
      const user = c.get("user");
      if (user.role < ROLE.ADMIN) {
        return c.json({ success: false, message: "Forbidden" }, 403);
      }
      await next();
    });
  };
}

// RootAuth: role >= 100
export function RootAuth() {
  return async (c: Context, next: Next) => {
    await validateSession(c, async () => {
      const user = c.get("user");
      if (user.role < ROLE.ROOT) {
        return c.json({ success: false, message: "Forbidden" }, 403);
      }
      await next();
    });
  };
}
```

---

## Initial Admin Seed

### Seed Data Implementation

```typescript
// projects/gesp/packages/backend/src/db/seed/admin.seed.ts
import { db } from "../index";
import { users } from "../schema/users";
import { hashPassword } from "../../utils/password";

export async function seedAdmin() {
  const existingRoot = await db.query.users.findFirst({
    where: eq(users.role, 100),
  });
  
  if (existingRoot) {
    console.log("Admin already exists, skipping seed");
    return;
  }
  
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  
  await db.insert(users).values({
    id: crypto.randomUUID(),
    username,
    password_hash: await hashPassword(password),
    display_name: "System Admin",
    role: 100,
    status: 1,
    created_at: new Date(),
    updated_at: new Date(),
  });
  
  console.log(`Admin seeded: ${username}`);
}

// Run on startup
// projects/gesp/packages/backend/src/index.ts
async function bootstrap() {
  await seedAdmin();
  // ... start server
}
```

**Security considerations:**
- Default password should be changed immediately after first login
- Production should use env vars for initial credentials
- Log seed action for audit trail

---

## Response Format

### Unified Response Helper

```typescript
// projects/gesp/packages/backend/src/utils/response.ts
import { Context } from "hono";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export function success<T>(c: Context, data: T, message = "Success"): Response {
  return c.json<ApiResponse<T>>({
    success: true,
    message,
    data,
  });
}

export function error(c: Context, message: string, status = 400): Response {
  return c.json<ApiResponse<never>>({
    success: false,
    message,
  }, status);
}
```

---

## Validation Architecture

### Nyquist Validation Strategy

**Phase 1 validation requirements:**

1. **Static Validation:**
   - TypeScript type safety (strict mode)
   - Zod schema validation for all API inputs
   - OpenAPI spec generation verification

2. **Runtime Validation:**
   - Password strength enforcement (min 6 chars)
   - Username uniqueness constraint
   - Session TTL enforcement

3. **Integration Validation:**
   - Database connection test
   - Session lifecycle test (create → validate → expire → cleanup)
   - Auth middleware chaining test

4. **Security Validation:**
   - httpOnly cookie verification
   - bcrypt hash verification
   - CSRF protection (SameSite=Strict)

### Validation Test Cases

| Test Case | Expected Result |
|-----------|-----------------|
| Login with valid credentials | Session created, cookie set |
| Login with invalid password | 401, no session |
| Access protected route without cookie | 401 Unauthorized |
| Access admin route as student | 403 Forbidden |
| Session expired (> TTL) | 401 Session expired |
| Register duplicate username | 400 Username exists |

---

## Risks & Mitigations

### Risk 1: Session Store Performance

**Risk:** SQLite-based session store may have performance issues with concurrent requests.

**Mitigation:**
- Use connection pooling (Drizzle's built-in)
- Add session cache layer if needed (Phase 2+)
- Regular cleanup of expired sessions

### Risk 2: bcrypt Performance

**Risk:** bcrypt hashing is CPU-intensive, may block Bun's single-threaded runtime.

**Mitigation:**
- Use async bcrypt API (bcryptjs is async)
- Cost factor 10 is acceptable for MVP
- Monitor performance, consider worker threads if needed

### Risk 3: OpenAPI Spec Drift

**Risk:** Manual route changes may not reflect in OpenAPI spec.

**Mitigation:**
- Use hono-openapi's route definition (auto-sync)
- CI check: regenerate spec and compare
- Type inference from Zod schemas

### Risk 4: Session TTL Bypass

**Risk:** Client may extend cookie TTL, bypassing server-side expiration.

**Mitigation:**
- **Dual validation:** both cookie maxAge and DB expires_at
- Session validation middleware always checks DB
- Server-side TTL is authoritative

### Risk 5: Seed Admin Security

**Risk:** Default admin password may remain unchanged in production.

**Mitigation:**
- Log seed action with warning
- Require password change on first login (Phase 2+)
- Production deployment guide: use env vars

---

## Integration Points

### Downstream Dependencies

| Component | Depends on Phase 1 | Integration |
|-----------|--------------------|-------------|
| Phase 2 (Knowledge Base) | backend framework, db connection | Use same Drizzle client |
| Phase 3 (Assessment Agent) | auth middleware, session context | Pass user context to agent |
| Phase 6 (student-app) | auth API, session cookie | Frontend consumes /api/auth/* |
| Phase 7 (admin-app) | auth API, AdminAuth middleware | Frontend consumes /api/admin/* |

### Upstream Dependencies

None — Phase 1 is the foundation.

---

## Reference Implementations

### new-api Auth Reference

| File | What to Borrow | What to Ignore |
|------|---------------|----------------|
| `model/user.go` | User schema, role values, password hash field | quota, invite_code, gateway fields |
| `controller/user.go` | Login/register flow, session cookie setting | OAuth flow, WeChat/Telegram integration |
| `middleware/auth.go` | Role-based middleware pattern | API key validation, quota checks |

**Key patterns to replicate:**
- Single users table with role integer
- bcrypt password hashing
- httpOnly session cookie
- Three-tier middleware (UserAuth/AdminAuth/RootAuth)
- `{ success, message, data }` response format

---

## Implementation Checklist

### Must Have (Phase 1)

- [ ] Backend package initialized (Hono + Drizzle + SQLite)
- [ ] Shared package initialized (types + constants)
- [ ] Users table schema (all locked fields)
- [ ] Sessions table schema
- [ ] bcrypt password utilities
- [ ] Session middleware (create/validate/destroy)
- [ ] Auth middleware (StudentAuth/AdminAuth/RootAuth)
- [ ] /api/auth/* routes (register, login, logout, me)
- [ ] Admin seed script
- [ ] OpenAPI spec export
- [ ] Response format helper

### Nice to Have (Phase 2+)

- [ ] Session cleanup cron job
- [ ] Password strength validation
- [ ] Rate limiting on login
- [ ] CSRF token for state-changing operations
- [ ] Audit logging

---

## Research Confidence

| Topic | Confidence | Source |
|-------|------------|--------|
| Hono + Bun compatibility | HIGH | ellamaka reference |
| Drizzle SQLite schema | HIGH | ellamaka reference + docs |
| bcryptjs with Bun | HIGH | Bun docs + npm compatibility |
| hono-openapi | MEDIUM | GitHub docs, needs testing |
| Session store pattern | MEDIUM | Custom implementation, needs validation |
| Role-based TTL | LOW-MEDIUM | First-time implementation, test thoroughly |

---

*Phase: 01-基础设施与认证*
*Research completed: 2026-04-22*