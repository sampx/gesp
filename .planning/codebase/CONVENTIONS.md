# 编码规范

**分析日期：** 2026-05-08

## 命名模式

**文件：**
- 统一使用 kebab-case 命名文件和目录
- 路由文件：`routes/auth.ts`、`routes/admin-users.ts`、`routes/assessment.ts`
- 服务文件：`services/auth.service.ts`、`services/assessment.ts`
- 工具文件：`utils/password.ts`、`utils/response.ts`、`utils/logger.ts`
- 中间件文件：`middleware/auth.ts`、`middleware/session.ts`、`middleware/request-logger.ts`
- 数据库 schema 文件：`db/schema/users.ts`、`db/schema/sessions.ts`、`db/schema/assessment.ts`
- 测试文件：`__tests__/auth-register.test.ts`、`__tests__/password.test.ts`（与源码目录平级的 `__tests__/` 目录内，使用 `.test.ts` 后缀）
- Seed 文件：`db/seed/admin.seed.ts`、`seed/assessment-questions.seed.ts`（使用 `.seed.ts` 后缀）

**函数：**
- 使用 camelCase：`registerUser`、`loginUser`、`hashPassword`、`verifyPassword`
- 中间件工厂函数使用 PascalCase 后缀：`StudentAuth()`、`AdminAuth()`、`RootAuth()`
- 工具函数使用动词开头：`createSession`、`validateSession`、`destroySession`
- 私有辅助函数在文件内定义，不导出，使用 camelCase：`validateSessionAndSetUser`、`formatQuestion`、`getNextOrder`
- Server Actions 使用 PascalCase 后缀 `Action`：`loginAction`、`logoutAction`

**变量：**
- 使用 camelCase：`sessionId`、`passwordHash`、`displayName`
- 常量使用 UPPER_SNAKE_CASE：`SALT_ROUNDS`、`SESSION_TTL`、`DEFAULT_QUESTION_LIMIT`
- 数据库字段定义使用 snake_case（Drizzle schema 中）：`user_id`、`password_hash`、`display_name`
- JSON body 字段统一使用 snake_case：`old_password`、`new_password`、`display_name`

**类型：**
- 接口使用 PascalCase：`ApiResponse<T>`、`TokenPayload`、`RoundResult`、`CandidateSummary`
- Drizzle 推断类型使用 `$inferSelect` 模式：`typeof users.$inferSelect`
- 自定义类型别名使用 PascalCase：`type LevelHistoryEntry`、`type KnowledgeStat`

## 代码风格

**格式化：**
- 未检测到独立的 Prettier/ESLint 配置文件，依赖 TypeScript strict mode
- 2 空格缩进（从现有代码观察）
- 函数定义使用 `async/await`，禁止 Promise 链
- 使用 `export default` 导出路由实例，使用命名导出导出工具函数和中间件

**TypeScript：**
- strict mode 启用（所有 `tsconfig.json` 中配置）
- 所有函数参数和返回值必须显式标注类型
- 禁止使用 `any` 类型（测试中允许 `as any` 用于 mock 类型断言）
- 使用 `interface` 定义对象类型（如 `ApiResponse<T>`、`TokenPayload`）
- 使用 `type` 定义联合类型和映射类型（如 `type LevelHistoryEntry`）

## 导入组织

**顺序：**
1. 第三方库导入（`import { Hono } from "hono"`、`import { z } from "zod"`）
2. `@gesp/shared` 共享包导入（`import { ROLE } from "@gesp/shared"`）
3. 相对路径导入——按层级从外到内：`../services/`、`../utils/`、`../middleware/`、`../db/`
4. 本地模块导入

**路径别名：**
- `@gesp/shared` 通过 `tsconfig.json` 的 `paths` 映射到 `packages/shared/src`
- 前端使用 `@/` 别名指向 `apps/web/src/`（`tsconfig.json` 中配置）

**路由文件模板（标准模式）：**
```typescript
// src/routes/xxx.ts
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { AdminAuth } from "../middleware/auth";
import { success, error } from "../utils/response";

const app = new Hono();
const bodySchema = z.object({ /* ... */ });
// ... 路由定义，使用 describeRoute + zValidator
export default app;
```

挂载到 `src/index.ts`：
```typescript
import xxxRoutes from "./routes/xxx";
app.route("/api/xxx", xxxRoutes);
```

## 错误处理

**响应格式：**
所有 API 响应遵循 `@gesp/shared` 中定义的 `ApiResponse<T>` 接口：
```typescript
// 成功响应
{ success: true, message: "Success", data: T }

// 业务失败响应
{ success: false, message: "错误信息" }
```

**响应工具函数（`packages/backend/src/utils/response.ts`）：**
```typescript
import { success, error, unauthorized, forbidden } from "../utils/response";

success(c, data, message?)   // HTTP 200
error(c, message, status?)   // 默认 HTTP 400
unauthorized(c, message?)    // HTTP 401
forbidden(c, message?)       // HTTP 403
```

**服务层错误模式：**
- Service 函数返回 `{ success: boolean; data?: T; error?: string }` 结构
- 不在 service 层抛出异常，而是通过返回值传递错误信息
- 安全敏感错误信息使用通用描述（如 "注册失败，请尝试不同的凭据" 代替 "用户名已存在"）
- 防御性 catch：捕获数据库约束冲突（`SQLITE_CONSTRAINT_UNIQUE`）并转换为友好错误

**竞争条件处理：**
```typescript
// 防御性：捕获 DB 约束冲突（竞争条件下 insert 可能失败）
try {
  const [user] = await db.insert(users).values({ ... }).returning();
  return { success: true, user };
} catch (err: any) {
  if (err?.message?.includes("UNIQUE constraint failed") || err?.code === "SQLITE_CONSTRAINT_UNIQUE") {
    return { success: false, error: "注册失败，请尝试不同的凭据" };
  }
  throw err;  // 非约束冲突异常继续抛出
}
```

**前端 Server Actions 错误模式：**
```typescript
// 使用通用错误消息，避免枚举漏洞
try {
  const res = await fetch(`${backendUrl}/api/auth/login`, { ... });
  if (!res.ok) return { error: "用户名或密码错误" };
} catch {
  return { error: "用户名或密码错误" };  // 网络错误也返回通用消息
}
```

## 日志规范

**日志库：** 使用 `pino` 结构化日志（位于 `packages/backend/src/utils/logger.ts`）

**配置模式：**
```typescript
const logger = pino(
  { level: logLevel },
  pino.multistream([
    {
      level: logLevel,
      stream: pino.transport({
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:yyyy-mm-dd HH:mm:ss" },
      }),
    },
    { level: "debug", stream: pino.destination({ dest: logFile, append: true, mkdir: true }) },
  ])
);
```

**日志级别语义：**
| 级别 | 用途 | 示例 |
|------|------|------|
| `debug` | 调试信息（缓存命中、SQL 详情） | `logger.debug({ session_id }, "Session updated")` |
| `info` | 主要生产级别（关键业务事件） | `logger.info({ user_id }, "User registered")` |
| `warn` | 可恢复异常 | `logger.warn({ err }, "Failed to notify agent")` |
| `error` | 操作失败 | `logger.error({ err, session_id }, "SSE stream error")` |

**日志编写规则：**
1. message 使用过去时态简明描述：`"User registered"`、`"Schema push completed"`
2. 上下文通过结构化字段传递，不拼接到 message
3. 字段命名统一 snake_case：`user_id`、`session_id`、`duration_ms`
4. 错误日志必须携带 Error 对象：`logger.error({ err: error }, "...")`
5. 禁止记录敏感信息（密码、token、session_id）
6. 批量操作记录摘要，不逐条记录
7. **禁止使用 `console.log` / `console.error`**——统一使用 `logger`

**请求日志中间件：** 通过 `middleware/request-logger.ts` 统一记录 HTTP 请求，不在每个 route handler 中手动记录。

## 注释

**JSDoc 使用：**
- Service 层文件顶部使用块注释描述文件职责（见 `services/assessment.ts`）
- 公共导出函数使用 JSDoc 注释，包含 `@param` 和 `@returns`
- 复杂算法和业务规则使用行内注释引用需求编号：`// Per D-05: backend direct comparison`

**路由分隔注释：** 使用分隔线注释区分不同路由组：
```typescript
// ---------------------------------------------------------------------------
// Student-facing endpoints
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Internal endpoints (API key auth)
// ---------------------------------------------------------------------------
```

## 函数设计

**大小：**
- 工具函数和中间件保持简洁（< 30 行）
- Service 函数适中（30-100 行），如 `registerUserWithRole`、`loginUser`
- 大型路由文件（`assessment.ts` 896 行）应拆分为更小的模块
- Helper 函数提取到文件顶部，不导出，如 `formatQuestion`、`getNextOrder`

**参数：**
- 优先使用具名参数对象（多个参数时）：`createAssessmentSession({ student_id, course_id, start_level })`
- service 函数显式声明参数类型：`registerUser(username: string, password: string, displayName: string)`

**返回值：**
- Service 层统一返回对象：`{ success: boolean; data?: T; error?: string }`
- Route handler 返回 Hono Response 对象（通过 `success()`、`error()` 等工具函数）
- 使用 Drizzle `$inferSelect` 类型推断返回值：`typeof users.$inferSelect`

## 模块设计

**导出模式：**
- 路由文件：`export default app`（Hono 实例）
- 工具文件：命名导出 `export function hashPassword(...)`
- Service 文件：命名导出 `export async function registerUser(...)`
- Schema 文件：命名导出 `export const users = sqliteTable(...)`
- 中间件：命名导出函数和中间件工厂

**Barrel Files：**
- `packages/shared/src/index.ts` 使用 `export * from` 聚合导出
- `packages/backend/src/db/schema/index.ts` 使用 `export * from` 聚合所有 schema
- `packages/backend/src/index.ts` 作为入口，启动 bootstrap 流程

**Hono Context 扩展：**
在 `middleware/session.ts` 中通过模块扩展注入类型：
```typescript
declare module "hono" {
  interface ContextVariableMap {
    user: typeof users.$inferSelect;
    session: typeof sessions.$inferSelect;
    knowledgeBaseService: KnowledgeBaseService;
  }
}
```

## 数据库操作

**Drizzle ORM 模式：**
```typescript
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

// 查询
const user = await db.query.users.findFirst({
  where: eq(users.username, username),
});

// 插入
const [newUser] = await db.insert(users).values({ ... }).returning();

// 更新
await db.update(users).set({ password_hash: hash }).where(eq(users.id, userId));

// 删除
await db.delete(sessions).where(eq(sessions.id, sessionId));
```

**禁止裸 SQL**——统一使用 Drizzle ORM API。

---

*规范分析：2026-05-08*
