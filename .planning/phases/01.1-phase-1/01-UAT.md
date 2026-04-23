---
status: diagnosed
phase: 01.1-phase-1
source: [01.1-01-SUMMARY.md, 01.1-02-SUMMARY.md]
started: 2026-04-23T18:08:11Z
updated: 2026-04-23T18:20:00Z
---

## Current Test

[testing paused — 2 issues diagnosed]

## Tests

### 1. Cold Start Smoke Test
expected: Kill server, clear temp state, start from scratch. bun run dev boots without errors, seed completes, health check returns live data.
result: issue
reported: "服务器可以启动，但 bun run test 有 1 个失败。Debug 界面可打开但按钮无响应，后台和界面均无日志"
severity: major

### 2. Session ID Entropy (256-bit)
expected: After successful login or registration, the session cookie value is a base64url string of ~43 characters (32 bytes encoded). Not a UUID format (no hyphens).
result: pending

### 3. Registration Error Obfuscation
expected: Register with existing username returns generic error "Registration failed. Please try different credentials." Not "Username already exists" or similar specific message.
result: pending

### 4. Production Password Enforcement
expected: Set NODE_ENV=production without ADMIN_PASSWORD. Server startup fails with Error thrown (not just warning). Seed does not create admin with default password.
result: pending

### 5. Debug Interface Accessible
expected: In development mode, navigate to /debug. Page loads with HTML interface showing Register, Login, GetUser, Logout buttons and a log output area.
result: pending

### 6. Debug Buttons Functional
expected: Click Register button → fills form, submits, shows success message in log. Click Login → authenticates with created user, shows success. Click GetUser → displays user info. Click Logout → clears session.
result: pending

### 7. Debug Production Gate
expected: Set NODE_ENV=production (without ENABLE_DEBUG). /debug returns 404 or access denied. Setting ENABLE_DEBUG=true restores access.
result: pending

### 8. Health Endpoint Working
expected: /debug/health returns JSON {status: "ok", phase: 1} (or similar health check response). No authentication required.
result: pending

## Summary

total: 8
passed: 0
issues: 2
pending: 6
skipped: 0
blocked: 0

## Gaps

- truth: "bun run test passes with no failures"
  status: failed
  reason: "User reported: bun run test 有 1 个失败 (auth-register.test.ts 第 4 case). CR-01 修复改变了 registerUser 调用顺序，Test 3 残留的 mock findFirst(undefined) 未被消耗，污染 Test 4 的 mock 队列"
  severity: major
  test: 1
  root_cause: "Vitest mockResolvedValueOnce 队列污染：Test 3 (line 57) mock 了 findFirst(undefined)，但因 CR-01 修复后密码检查提前到 DB 查询之前，密码 'short' 触发 early return → findFirst 未被调用 → mock 未被消耗 → beforeEach 的 vi.clearAllMocks() 只清除 call history，不清除 queued mock values → Test 4 的队列变成 [undefined (stale), existing user (fresh)] → findFirst 返回 undefined → 用户被创建 → success=true"
  artifacts:
    - path: "packages/backend/src/__tests__/auth-register.test.ts"
      issue: "Test 3 不必要地 mock 了 findFirst（该 case 根本不调用 DB）；vi.clearAllMocks() 不清除 queued mocks"
    - path: "packages/backend/src/services/auth.service.ts"
      issue: "CR-01 修复正确地将密码检查提前（安全正确），改变了执行顺序"
  missing:
    - "Test 3 删除不必要的 findFirst mock，或改用 vi.restoreAllMocks() 替代 vi.clearAllMocks()"
  debug_session: ".planning/debug/auth-register-test-failure.md"

- truth: "Debug 界面按钮点击后发起 API 请求并显示结果"
  status: failed
  reason: "User reported: Debug 界面可以打开，但注册/登录按钮都没有响应，后台无日志打印，界面上也无日志，完全没有反应"
  severity: major
  test: 1
  root_cause: "JavaScript 语法错误导致所有函数未定义：debug.ts line 97 的 document.createTextNode('\n') 在 TypeScript template literal 中被解释为真实换行符，HTML 输出的 JavaScript 字符串被断行（unclosed quote + continuation on next line）→ SyntaxError → 所有 onclick handler 函数 undefined → 点击无响应"
  artifacts:
    - path: "packages/backend/src/routes/debug.ts"
      issue: "line 97: document.createTextNode('\n') 需要双转义为 '\\n' 或使用 '\\u000a'"
  missing:
    - "将 '\n' 改为 '\\n' 或 '\\u000a'，确保浏览器收到正确的 JavaScript escape sequence"
  debug_session: ".planning/debug/debug-ui-buttons-not-working.md"