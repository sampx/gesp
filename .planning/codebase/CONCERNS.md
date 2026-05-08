# CONCERNS.md

**Analysis Date:** 2026-05-08

## 技术债务

### `assessment.ts` 路由文件过度膨胀 (895 行)

- **文件**: `packages/backend/src/routes/assessment.ts` (895 行)
- **影响**: 单文件承担 session 创建、答题提交、SSE 流、候选题过滤、自动选择定时器等全部逻辑，维护成本高，多人并行开发易冲突
- **修复方案**: 拆分为按功能职责的子路由文件（`start.ts`、`submit.ts`、`stream.ts`、`candidates.ts` 等），或抽取为独立 handler 函数

### OpenAPI schema 大量滥用 `z.any()` (8 处)

- **文件**: `packages/backend/src/routes/assessment.ts` 第 293/565/606/638/699/783/832/873 行
- **影响**: 失去 OpenAPI 规范生成的意义，API 文档界面无法展示请求/响应结构，前后端协作效率下降，SDK 生成失败
- **修复方案**: 为每个 endpoint 定义具体的 Zod response schema，尤其是 `/next-question`、`/progress`、`/resume`、`/stream`、`/candidates`、`/select`、`/evaluate`

### `any` 类型使用 (2 处)

- **文件**: `packages/backend/src/services/auth.service.ts` 第 53/191 行 (`catch (err: any)`)
- **影响**: 违反 AGENTS.md 代码约束（禁止使用 `any` 类型），失去类型安全
- **修复方案**: 使用 `err: unknown` 并通过 `instanceof Error` 判断

### StreamEvent 接口使用索引签名

- **文件**: `packages/backend/src/services/ellamaka-client.ts` 第 16 行 (`[key: string]: unknown`)
- **影响**: 失去编译时类型检查，任意字段都可以通过类型检查
- **修复方案**: 定义明确的字段列表，或使用更严格的联合类型

---

## 安全考虑

### In-Memory 锁在进程重启后丢失

- **文件**: `packages/backend/src/services/assessment.ts` 第 288 行（`const currentQuestionLocks = new Map<string, string>()`）
- **风险**: 测评过程中如果后端进程重启，所有 session 的题目锁定状态全部丢失，导致学员可以重复作答同一道题或题目"悬浮"无法继续
- **当前缓解**: 无
- **建议**: 将 question lock 状态持久化到 SQLite（assessment_sessions 表增加 `locked_question_id` 列），或使用 Redis 作为分布式锁

### 自动选择定时器无清理机制

- **文件**: `packages/backend/src/routes/assessment.ts` 第 204 行（`const autoSelectTimers = new Map<...>()`）
- **风险**: `autoSelectTimers` Map 无清理机制（仅在正常提交或超时后删除），如果 agent 长期不响应或 session 异常中断，timer 不会被清理，存在内存泄漏风险
- **建议**: 添加定时清理逻辑，或在 session abandon/complete 时统一清除

### 无认证限流

- **文件**: `packages/backend/src/routes/auth.ts`
- **风险**: `/api/auth/login` 和 `/api/auth/register` 无任何 rate limiting，遭受暴力破解攻击风险
- **当前缓解**: 仅有密码长度验证（≥6 字符）
- **建议**: 基于 IP 或 session 的速率限制（如 5 次登录失败后锁定 15 分钟）

### 调试路由可在生产环境通过环境变量开启

- **文件**: `packages/backend/src/index.ts` 第 102-105 行
- **风险**: 设置 `ENABLE_DEBUG=true` 即可在生产暴露完整的调试界面（含注册/登录/登出手动操作），且该界面无任何额外认证保护
- **建议**: 生产环境彻底禁用 debug route，不应依赖环境变量控制

### 调试页面 XSS 风险

- **文件**: `packages/backend/src/routes/debug.ts` 第 77/114/117/140/143 等行
- **风险**: 调试页面使用 `innerHTML` 设置结果，存在 XSS 风险
- **建议**: 生产环境禁用；或使用 `textContent` 替代 `innerHTML`

---

## 脆弱区域

### 测评状态机复杂度高

- **文件**: `packages/backend/src/routes/assessment.ts` (895 行) + `packages/backend/src/services/assessment.ts` (540 行)
- **脆弱原因**: 状态分布在三个层面：SQLite DB（session 持久状态）、in-memory Map（题目锁）、in-memory Timer（自动选择），三者之间一致性无法保证
- **安全修改建议**: 任何对测评流程的修改应先在单元测试覆盖下进行；修改后验证三种状态源的同步
- **测试覆盖**: **零测试** — 整个 assessment 模块（核心功能）没有单元测试

### `formatQuestion` 提前暴露答案

- **文件**: `packages/backend/src/routes/assessment.ts` 第 66-77 行
- **问题**: `formatQuestion()` 返回的 JSON 包含 `answer` 字段（第 73 行），注释标注"revealed after submission"，但实际在 `/start` 返回第一道题时就发送给了前端。前端可通过 Network 面板直接查看正确答案
- **安全影响**: 中等 — 测评场景中答案提前暴露，降低测评有效性
- **建议**: `formatQuestion` 默认不返回 `answer`，或增加参数控制是否暴露

### 前端 `server-api.ts` 无请求超时

- **文件**: `apps/web/src/lib/server-api.ts`
- **问题**: `serverFetch` 无 `signal` 超时配置，后端如果挂起会导致 SSR/RSC 请求永久等待
- **建议**: 添加 `AbortSignal.timeout(10000)` 或配置 fetch 超时

---

## 性能瓶颈

### SSE 流全量拉取 + 客户端过滤

- **文件**: `packages/backend/src/services/ellamaka-client.ts` 第 69-105 行
- **问题**: `streamEvents()` 连接到 `/event` 端点接收所有 session 的 SSE 事件，然后在客户端按 `event.sessionID` 逐条过滤。当多个并发评估 session 同时运行时，每条消息都要经过客户端解包和 JSON 解析
- **原因**: Ellamaka 服务端不支持按 sessionID 过滤事件
- **改进方向**: 在 Ellamaka 上游实现 session 级事件过滤 API

### `getSessionHistory` 加载全部答题记录

- **文件**: `packages/backend/src/routes/assessment.ts` 第 183-198 行
- **问题**: 恢复测评时加载该 session 的**所有**答题记录并序列化为 JSON string，无分页截断。如果学员答题记录很长，会影响恢复速度和 ellamaka context 窗口
- **改进方向**: 限制加载最近的 N 条记录，或使用摘要格式

---

## 扩展限制

### SQLite 单进程写入

- **文件**: `packages/backend/src/db/index.ts`
- **当前容量**: 支持单实例、单进程写入
- **限制**: 多实例并发写入会出现 WAL 锁竞争
- **扩展方向**: 若需要水平扩展，迁移到 PostgreSQL + Drizzle adapter

### In-Memory 状态不支持多实例

- **文件**: `packages/backend/src/services/assessment.ts` (question locks), `packages/backend/src/routes/assessment.ts` (auto-select timers)
- **问题**: 所有 in-memory Map/Timer 在多实例部署时会丢失或不同步
- **扩展方向**: 迁移至 Redis 作为 state store

---

## 测试覆盖缺口

### 测评模块零测试

- **未测试**: `packages/backend/src/services/assessment.ts` (核心测评逻辑：自适应算法、JWT 生成、round 评估、题目轮换)
- **未测试**: `packages/backend/src/routes/assessment.ts` (895 行：全部测评 API endpoint)
- **风险**: 测评是产品的核心功能，包含自适应定级、评分、session 管理等关键业务逻辑，无任何测试防护
- **优先级**: High

### 前端零测试

- **未测试**: `apps/web/src/` (全部 61 个前端源文件)
- **风险**: 学员界面、管理界面、测评交互均无测试覆盖
- **优先级**: Medium

### 知识库/VeloctorStore 零测试

- **未测试**: `packages/backend/src/services/vector-store.ts`、`packages/backend/src/services/knowledge-base.ts`、`packages/backend/src/services/embedding.ts`
- **风险**: 向量检索和知识库功能是 Phase 2 的核心，无测试覆盖
- **优先级**: High

---

*Concerns audit: 2026-05-08*
