# @gesp/backend — 模块规范

> **定位**：GESP 平台 API 服务器，基于 Hono + Drizzle + SQLite
> **项目规范**：`../../AGENTS.md`

---

## 1. 目录结构

```
packages/backend/
├── src/
│   ├── index.ts              # 入口：pushSchema → seed → Bun.serve
│   ├── routes/
│   │   └── auth.ts           # /api/auth — register/login/logout/me
│   ├── services/
│   │   └── auth.service.ts   # registerUser/loginUser/getUserById
│   ├── middleware/
│   │   ├── session.ts        # createSession/validateSession/destroySession
│   │   └── auth.ts           # StudentAuth/AdminAuth/RootAuth 角色守卫
│   ├── db/
│   │   ├── index.ts          # Drizzle 实例（bun-sqlite）
│   │   ├── schema/           # users / sessions / relations
│   │   └── seed/
│   │       └── admin.seed.ts # root admin 初始化
│   ├── utils/
│   │   ├── response.ts       # success/error/unauthorized/forbidden
│   │   └── password.ts       # hashPassword/verifyPassword (bcryptjs)
│   └── __tests__/            # Vitest 测试
├── data/                     # SQLite 数据库（.gitignore）
├── drizzle.config.ts         # Drizzle Kit 配置
├── vitest.config.ts
└── bunfig.toml
```

---

## 2. API 速查

Base URL: `http://localhost:3000`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | - | 健康检查 |
| POST | `/api/auth/register` | - | 学员注册 |
| POST | `/api/auth/login` | - | 登录（设 cookie） |
| POST | `/api/auth/logout` | session | 登出 |
| GET | `/api/auth/me` | session | 获取当前用户 |
| GET | `/api/doc` | - | OpenAPI spec (JSON) |
| GET | `/api/doc/ui` | - | Scalar API 调试界面 |

### 响应格式

```typescript
{ success: true, message: "Success", data: T }           // 成功
{ success: false, message: "错误信息" }                   // 业务失败
{ success: false, error: { name: "ZodError", message: "<JSON string>" } }  // Zod v4 验证失败
```

### Session 机制

- Cookie: `session_id`（httpOnly, sameSite=Strict）
- TTL: 学员 1h / 管理员&root 24h

### 角色层级

| 常量 | 值 | 说明 |
|------|-----|------|
| `ROLE.STUDENT` | 1 | 学员（默认） |
| `ROLE.ADMIN` | 10 | 管理员 |
| `ROLE.ROOT` | 100 | 超级管理员 |

---

## 3. 核心模块

### 响应工具 (`utils/response.ts`)

```typescript
import { success, error, unauthorized, forbidden } from "../utils/response";

success(c, data, message?)   // 200
error(c, message, status?)   // 400
unauthorized(c, message?)    // 401
forbidden(c, message?)       // 403
```

### 认证中间件 (`middleware/auth.ts`)

```typescript
import { requireSession, StudentAuth, AdminAuth, RootAuth } from "../middleware/auth";

app.get("/me", requireSession, handler);       // 任意已登录
app.get("/admin", AdminAuth(), handler);       // role >= 10
app.get("/root", RootAuth(), handler);         // role >= 100
```

### Session 操作 (`middleware/session.ts`)

```typescript
import { createSession, validateSession, destroySession } from "../middleware/session";

await createSession(c, userId, role);   // 创建 + 设 cookie
await validateSession(c, next);         // 校验 + 注入 c.get("user")
await destroySession(c);                // 删除 + 清 cookie
```

### 数据库访问

```typescript
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const user = await db.query.users.findFirst({ where: eq(users.id, id) });
const [newUser] = await db.insert(users).values({ ... }).returning();
```

---

## 4. 开发模板

### 新增路由

```typescript
// src/routes/xxx.ts
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { AdminAuth } from "../middleware/auth";
import { success } from "../utils/response";

const app = new Hono();
const bodySchema = z.object({ /* ... */ });
const responseSchema = z.object({ success: z.boolean() });

app.post("/xxx",
  AdminAuth(),
  zValidator("json", bodySchema),
  describeRoute({
    summary: "XXX 操作",
    responses: {
      200: {
        description: "成功",
        content: { "application/json": { schema: resolver(responseSchema) } },
      },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");
    return success(c, result);
  }
);

export default app;
```

挂载到 `src/index.ts`:
```typescript
import xxxRoutes from "./routes/xxx";
app.route("/api/xxx", xxxRoutes);
```

### 新增数据库表

1. 在 `src/db/schema/` 创建表定义文件
2. 在 `src/db/schema/index.ts` 导出
3. 在 `src/db/schema/relations.ts` 添加关联（如有）
4. 重启 `bun run dev`（自动 push schema）

---

## 6. 日志规范

### 日志库

使用 [pino](https://github.com/pinojs/pino) — Bun/Node.js 生态最快的结构化日志库。

```typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: process.env.NODE_ENV !== "production"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});
```

### 日志级别（严格按语义使用）

| 级别 | 用途 | 示例 |
|------|------|------|
| `trace` | 极细粒度跟踪，生产环境禁用 | 进入函数、循环迭代 |
| `debug` | 调试信息，生产环境通常禁用 | 缓存命中、SQL 查询详情 |
| `info` | **主要生产级别**，关键业务事件 | 用户注册、登录成功、订单创建 |
| `warn` | 可恢复的异常，需关注但不中断 | 频率接近阈值、降级处理 |
| `error` | 操作失败，需人工介入 | 登录失败、数据库写入失败 |
| `fatal` | 系统不可用，需立即响应 | 数据库连接池耗尽 |

### 日志格式

**结构化 JSON 输出到 stdout**（12-Factor App 原则）。每条日志包含标准字段：

```json
{
  "level": 30,
  "time": 1745428800000,
  "msg": "User registered",
  "user_id": "abc123",
  "username": "alice",
  "role": 1
}
```

**必须使用 `logger` 方法**，禁止 `console.log`：

```typescript
// ❌ 禁止
console.log("Schema push completed");
console.error("Login failed", error);

// ✅ 正确
logger.info("Schema push completed");
logger.error({ user_id, reason }, "Login failed");
```

### 日志编写规则

1. **message 是人类可读的简明描述**，使用过去时态动词开头
   - `logger.info({ user_id }, "User registered")`
   - `logger.error({ order_id, error }, "Payment processing failed")`

2. **上下文通过结构化字段传递**，不要拼接到 message 里
   ```typescript
   // ❌ 禁止
   logger.info(`User ${userId} logged in from ${ip}`);

   // ✅ 正确
   logger.info({ user_id: userId, client_ip: ip }, "User logged in");
   ```

3. **字段命名统一 snake_case**，包含单位后缀
   - `user_id`（不是 `userId`、`userID`）
   - `duration_ms`（不是 `duration`）
   - `db_table`、`http_method`、`http_status`

4. **错误日志必须携带 Error 对象**
   ```typescript
   // ✅ pino 自动序列化 stack
   logger.error({ err: error, user_id }, "Database query failed");
   ```

5. **禁止记录敏感信息**
   - 密码、token、session_id、身份证号、手机号
   - 完整的 request body（尤其是含密码字段时）

6. **在系统边界记录日志**
   - HTTP 请求/响应（通过中间件统一处理）
   - 数据库操作（仅 `debug` 级别记录慢查询）
   - 外部服务调用（AI API、第三方接口）

7. **批量操作记录摘要，不逐条记录**
   ```typescript
   // ❌ 禁止
   for (const item of items) {
     logger.debug({ item_id: item.id }, "Processing item");
   }

   // ✅ 正确
   logger.info({ batch_size: items.length }, "Batch processing started");
   // ... 处理
   logger.info({ batch_size: items.length, succeeded: 98, failed: 2 }, "Batch processing completed");
   ```

### 请求日志中间件

通过 Hono 中间件统一记录 HTTP 请求，不在每个 route handler 中手动记录：

```typescript
// middleware/request-logger.ts
import type { MiddlewareHandler } from "hono";

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const status = c.res.status;

  if (status >= 500) {
    logger.error(
      { method: c.req.method, path: c.req.path, status, duration_ms: ms },
      "Request failed"
    );
  } else if (status >= 400) {
    logger.warn(
      { method: c.req.method, path: c.req.path, status, duration_ms: ms },
      "Client error"
    );
  } else {
    logger.info(
      { method: c.req.method, path: c.req.path, status, duration_ms: ms },
      "Request completed"
    );
  }
};
```

### 环境差异

| 环境 | 最低级别 | 格式 | 额外行为 |
|------|---------|------|---------|
| development | `debug` | pretty-print（彩色） | 显示完整 stack trace |
| production | `info` | JSON | 仅 error 级别输出 stack trace |

---

## 5. 代码约束

- **禁止** `export default app` — Bun 自动调用 `Bun.serve()` 导致端口冲突
- **禁止** `console.log` / `console.error` — 统一使用 `logger`
- 启动流程：`pushSchema()` → `runSeeds()` → `Bun.serve()`
- 数据库路径：`./data/gesp.db`（`DATABASE_URL` 环境变量覆盖）
- ORM：Drizzle ORM（`drizzle-orm/bun-sqlite`），禁止裸 SQL
- 引用 Shared：`import { ROLE } from "@gesp/shared"`（paths 映射在 tsconfig.json）
- TypeScript strict mode，2 空格缩进
