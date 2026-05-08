# 测试模式

**分析日期：** 2026-05-08

## 测试框架

**Runner：**
- Vitest 2.x
- 配置：`packages/backend/vitest.config.ts`
- Assertion Library：Vitest 内置 `expect`

**运行命令：**
```bash
bun test                  # 运行所有测试（在 packages/backend/ 目录下）
bun test src/**/*.test.ts # 运行指定测试文件
```

**配置详情（`packages/backend/vitest.config.ts`）：**
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,           // 全局 describe/it/expect 可用
    environment: "node",     // Node.js 环境
    include: ["src/**/*.test.ts"],  // 匹配测试文件模式
  },
});
```

**注意：** Vitest 仅在 `packages/backend/` 中配置。前端 `apps/web/` 尚未配置测试框架。`packages/shared/` 和 `packages/ui/` 无测试配置。

## 测试文件组织

**位置：**
- 与源码目录平级的 `__tests__/` 目录内：`packages/backend/src/__tests__/`
- 测试文件与源码不在同一目录（非 co-located），而是集中在 `__tests__/` 目录下

**命名：**
- 测试文件使用 `.test.ts` 后缀
- 文件名与对应的源码模块关联：`auth-register.test.ts` → `services/auth.service.ts` 中的注册功能
- 特定功能测试：`password.test.ts` → `utils/password.ts`
- 中间件测试：`auth-middleware.test.ts` → `middleware/auth.ts`
- 路由测试：`debug-route.test.ts` → `routes/debug.ts`
- Seed 测试：`seed.test.ts`、`seed-password.test.ts` → `db/seed/admin.seed.ts`

**目录结构：**
```
packages/backend/src/
├── __tests__/
│   ├── setup.ts              # 全局测试初始化
│   ├── auth-register.test.ts # 认证注册测试
│   ├── auth-middleware.test.ts
│   ├── password.test.ts
│   ├── seed.test.ts
│   ├── seed-password.test.ts
│   ├── session-id.test.ts
│   ├── openapi.test.ts
│   └── debug-route.test.ts
├── services/
├── utils/
├── middleware/
└── routes/
```

## 测试结构

**Suite 组织：**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Auth Register — Security (D-R5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return generic error when username already exists", async () => {
    // arrange
    (db.query.users.findFirst as any).mockResolvedValueOnce({ ... });

    // act
    const result = await registerUser("existinguser", "password123", "Test");

    // assert
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).not.toContain("already exists");
  });
});
```

**模式：**
- 使用 `describe` 分组测试场景（按功能或安全需求分组）
- 每个 `it` 块描述具体测试场景，使用 "should..." 描述预期行为
- `beforeEach` 中调用 `vi.clearAllMocks()` 重置 mock 状态
- 测试文件顶部的 `vi.mock()` 调用会在导入前执行（hoisting），在 import 之前设置 mock
- Arrange-Act-Assert 三段式结构

## Mocking

**Framework：** Vitest 内置 `vi.mock()`

**Mock 数据库模式：**
```typescript
// Mock database — 在 import 之前执行（Vitest 会自动提升）
vi.mock("../db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: "test-id", username: "testuser", role: 1, display_name: "testuser", password_hash: "hash", updated_at: new Date() },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ... }]),
        }),
      }),
    }),
  },
}));
```

**Mock 工具函数：**
```typescript
vi.mock("../utils/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashedpassword"),
  verifyPassword: vi.fn(),
}));
```

**运行时 mock 修改：**
```typescript
// 使用 mockResolvedValueOnce 设置单次返回值
(db.query.users.findFirst as any).mockResolvedValueOnce({
  id: "existing-id",
  username: "existinguser",
  role: 1,
});
```

**Mock Hono 应用（集成测试模式）：**
```typescript
import { Hono } from "hono";
import debugRoutes from "../routes/debug";

describe("Debug Route", () => {
  const app = new Hono();
  app.route("/debug", debugRoutes);  // 挂载路由到测试实例

  it("should serve HTML on GET /debug", async () => {
    const res = await app.request("/debug");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });
});
```

**Mock 环境变量：**
```typescript
const originalEnv = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

it("should throw when NODE_ENV=production and ROOT_PASSWORD not set", async () => {
  process.env.NODE_ENV = "production";
  delete process.env.ROOT_PASSWORD;
  await expect(seedAdmin()).rejects.toThrow("ROOT_PASSWORD must be set");
});
```

**Mock 规则：**
- Mock 所有外部依赖（数据库、文件 I/O、密码哈希）
- 不要 Mock 正在测试的函数本身
- 使用 `mockResolvedValueOnce` 设置单次行为，用 `mockResolvedValue` 设置默认行为
- 测试文件中对 mock 的调用使用 `as any` 断言类型（TypeScript 限制）

## Fixtures 和 Factory

**测试数据：**
- 未检测到共享 fixtures/factories 文件
- 测试数据直接在 `it` 块内内联定义
- 示例：`(db.query.users.findFirst as any).mockResolvedValueOnce({ id: "existing-id", username: "existinguser", role: 1 })`

**位置：**
- 无集中 fixtures 目录，测试数据分散在各测试文件中

## 覆盖率

**要求：** 未强制配置覆盖率目标

**查看覆盖率：** 未配置覆盖率报告命令（vitest.config.ts 中无 coverage 配置块）

## 测试类型

**单元测试：**
- 当前主要测试类型为单元测试
- 测试单个函数/服务的行为，如 `auth-register.test.ts` 测试 `registerUser`、`changePassword` 等函数
- 使用 mock 隔离外部依赖（数据库、密码哈希）

**集成测试：**
- 路由级别集成测试：使用 `new Hono()` 创建应用实例，挂载路由后通过 `app.request()` 发送请求
- 示例：`debug-route.test.ts` 测试路由的 HTTP 响应
- 示例：`session-id.test.ts` 测试工具函数的确定性行为
- `openapi.test.ts` 为占位测试（实际验证需要运行服务器）

**E2E 测试：**
- 未配置 Playwright/Cypress 等 E2E 测试框架
- 存在手动验证脚本：`scripts/verify-auth.ts`（需在开发服务器运行时执行）

## 常见模式

**异步测试：**
```typescript
it("should succeed with correct old password", async () => {
  // setup mock
  (db.query.users.findFirst as any).mockResolvedValueOnce({ ... });
  (verifyPassword as any).mockResolvedValueOnce(true);

  // call service
  const result = await changePassword("user-id", "oldpass123", "newpass123");

  // assert
  expect(result.success).toBe(true);
});
```

**错误测试：**
```typescript
// 使用 reject/resolve 模式
it("should throw Error when NODE_ENV=production and ROOT_PASSWORD not set", async () => {
  process.env.NODE_ENV = "production";
  delete process.env.ROOT_PASSWORD;
  await expect(seedAdmin()).rejects.toThrow("ROOT_PASSWORD must be set");
});

// 使用 success/error 返回值模式
it("should fail with wrong old password", async () => {
  // ...
  expect(result.success).toBe(false);
  expect(result.error).toContain("旧密码不正确");
});
```

**竞争条件测试：**
```typescript
it("defensive: catches DB constraint violation on insert for duplicate username", async () => {
  // 模拟竞争条件：findFirst 返回 null，但 insert 抛出约束错误
  (db.query.users.findFirst as any).mockResolvedValueOnce(null);
  const constraintError = new Error("SQLITE_CONSTRAINT_UNIQUE: UNIQUE constraint failed: users.username");
  (db.insert as any).mockReturnValueOnce({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockRejectedValue(constraintError),
    }),
  });
  const result = await registerUserWithRole("race_user", "password123", ROLE.STUDENT);
  expect(result.success).toBe(false);
  expect(result.error).toContain("注册失败");
});
```

**安全性测试（用户枚举防护）：**
```typescript
it("should return generic error when username already exists (no 'already exists' in message)", async () => {
  // ...
  expect(result.error).not.toContain("already exists");
  expect(result.error).not.toContain("Username");
});
```

**Setup 文件（`packages/backend/src/__tests__/setup.ts`）：**
```typescript
import { beforeAll, afterAll } from "vitest";

beforeAll(async () => {
  process.env.NODE_ENV = "test";
});

afterAll(async () => {
  // Cleanup
});
```

## 测试覆盖现状

**已覆盖：**
- 密码工具（`password.test.ts`）：哈希、验证、不同密码相同哈希
- 认证注册（`auth-register.test.ts`）：注册流程、重复用户名处理、角色注册、密码修改
- Seed 密码（`seed-password.test.ts`）：生产/开发环境下 seed 行为
- Session ID 生成（`session-id.test.ts`）：长度、字符集、随机性、熵验证
- Debug 路由（`debug-route.test.ts`）：HTML 输出、按钮存在性、health 检查
- 认证中间件（`auth-middleware.test.ts`）：角色层级验证（占位测试）

**覆盖不完整/占位：**
- `auth-middleware.test.ts`：仅验证常量值，未实际测试中间件行为（注释标注 "Full implementation requires test database setup"）
- `openapi.test.ts`：占位测试，未实际验证 OpenAPI 端点（注释标注 "Full test requires running server"）
- `seed.test.ts`：占位测试，仅验证函数存在性
- Assessment 服务（`services/assessment.ts` 540 行）：无对应测试文件
- Knowledge 路由和服务：无测试
- 所有前端代码（`apps/web/`）：无测试配置

---

*测试分析：2026-05-08*
