# 外部集成

**Analysis Date:** 2026-05-08

## APIs & 外部服务

### ellamaka Agent 引擎
- **用途**: AI 智能体核心引擎，负责测评定级、教学讲解、代码判题等 AI 驱动任务
- **连接方式**: HTTP SDK（`EllamakaClient`，`packages/backend/src/services/ellamaka-client.ts`）
- **默认地址**: `http://localhost:4141`（环境变量 `ELLAMAKA_URL`）
- **工作目录**: `ELLAMAKA_DIRECTORY`（环境变量，默认 `"default"`）
- **通信协议**:
  - `POST /session?directory={dir}` — 创建会话
  - `POST /session/{sessionId}/prompt_async?directory={dir}` — 异步发送提示
  - `GET /event?directory={dir}` — SSE 事件流订阅
- **重试策略**: 指数退避（3 次重试，1000ms/2000ms/4000ms 间隔）
- **超时**: 事件流 120 秒超时（`AbortSignal.timeout(120_000)`）

### Ollama Embedding
- **用途**: 本地向量生成，用于知识库语义检索
- **连接方式**: HTTP REST API（兼容 OpenAI `/embeddings` 协议）
- **地址**: `http://macmini.local:11434/v1`（环境变量 `EMBEDDING_BASE_URL`）
- **模型**: `nomic-embed-text-v2-moe`（环境变量 `EMBEDDING_MODEL`）
- **端点**: `POST {baseUrl}/embeddings`
- **故障回退**: 可切换至 OpenAI embedding（见下方）

### OpenAI Embedding (备用)
- **用途**: 云端 embedding 降级方案
- **端点**: `https://api.openai.com/v1/embeddings`
- **默认模型**: `text-embedding-3-small`
- **认证**: `Authorization: Bearer {OPENAI_API_KEY}`
- **环境变量**: `EMBEDDING_PROVIDER=openai`、`OPENAI_API_KEY`
- **代码位置**: `packages/backend/src/services/embedding.ts` (`OpenAIEmbeddingProvider`)

## 数据存储

### SQLite（关系型数据）
- **Provider**: `bun-sqlite` 驱动（Drizzle ORM）
- **连接**: 文件模式 `./data/gesp.db`（环境变量 `DATABASE_URL`）
- **ORM**: Drizzle ORM 0.39.x
- **迁移**: drizzle-kit push（启动时自动执行）
- **Schema 定义**: `packages/backend/src/db/schema/*.ts`
- **已知表**: `users`、`sessions`（后续扩展 assessment 相关表）

### LanceDB（向量存储）
- **Provider**: LanceDB 0.22.3 — 嵌入式文件模式
- **路径**: `./data/gesp.lance`（环境变量 `LANCEDB_PATH`）
- **表结构**:
  | 表名 | 用途 |
  |------|------|
  | `knowledge_points` | GESP 1-8 级知识点向量索引 |
  | `lesson_plans` | 教案向量索引 |
  | `practice_questions` | 练习题向量索引 |
  | `exam_questions` | 真题向量索引 |
- **代码封装**: `packages/backend/src/services/vector-store.ts` (`LanceDBFileStore`)
- **ID 过滤**: UUID 格式校验，防止 filter 注入（`sanitizeId` 函数）

### 文件存储
- **本地文件系统** — SQLite/LanceDB 均以文件模式运行
- **日志文件**: `./logs/gesp.log`（pino destination，环境变量 `LOG_DIR`、`LOG_FILE`）

### 缓存
- **无独立缓存层** — Next.js 内置 RSC 缓存 + TanStack Query 前端缓存（如使用）
- **Session 机制**: `session_id` cookie（httpOnly, sameSite=Strict），TTL：学员 1h/管理 24h

## 认证 & 身份

### 认证提供者
- **自建 Session 认证**（非 OAuth/JWT 主流方案）
- **实现方式**: `packages/backend/src/middleware/session.ts`
  - Cookie-based session（`session_id`）
  - HTTP-only、SameSite=Strict
  - 角色分级：`ROLE.STUDENT(1)` / `ROLE.ADMIN(10)` / `ROLE.ROOT(100)`
- **密码哈希**: bcryptjs（`packages/backend/src/utils/password.ts`）
- **角色守卫中间件**: `packages/backend/src/middleware/auth.ts`
  - `requireSession` — 任意已登录
  - `StudentAuth()` — role >= 1
  - `AdminAuth()` — role >= 10
  - `RootAuth()` — role >= 100

### JWT（评估专用）
- **用途**: Assessment 模块的 token 管理（Phase 03）
- **密钥**: `JWT_SECRET`（环境变量）
- **代码位置**: 待实现（`src/routes/assessment.ts` 中已定义路由框架）

## API 密钥

**GESP Plugin API Key:**
- **变量名**: `GESP_API_KEY`
- **用途**: ellamaka 插件认证
- **认证方式**: API Key 传递（具体协议由 ellamaka 处理）

## 日志 & 监控

### 错误追踪
- **无** — 暂无 Sentry/Bugsnag 等第三方错误追踪

### 日志
- **框架**: pino（结构化 JSON）
- **开发环境**: 双 stream — 终端（pino-pretty 彩色输出）+ 文件（JSON）
- **生产环境**: 文件 JSON 输出（环境变量 `LOG_LEVEL` 控制级别）
- **Log 轮转**: `LOG_MAX_FILES=7`（默认保留 7 个轮转文件）
- **HTTP 请求日志**: `packages/backend/src/middleware/request-logger.ts`（统一中间件记录 method/path/status/duration）

## CI/CD & 部署

### 托管
- **未配置** — MVP 阶段本地运行

### CI Pipeline
- **无** — 暂无 GitHub Actions 或其他 CI 配置

## 环境变量配置

### 必要变量

| 变量 | 默认值 | 用途 |
|------|--------|------|
| `PORT` | `3000` | 后端 API 端口 |
| `NODE_ENV` | `development` | 环境模式 |
| `DATABASE_URL` | `./data/gesp.db` | SQLite 数据库路径 |
| `SESSION_SECRET` | — | Session 加密密钥（**生产环境必须修改**） |
| `ELLAMAKA_URL` | `http://localhost:4141` | ellamaka Agent 引擎地址 |
| `ELLAMAKA_DIRECTORY` | `default` | ellamaka 工作目录 |

### 可选变量

| 变量 | 默认值 | 用途 |
|------|--------|------|
| `LOG_LEVEL` | `info` | 日志级别 |
| `LOG_DIR` | `../../logs` | 日志目录 |
| `LOG_FILE` | `gesp.log` | 日志文件名 |
| `LOG_MAX_FILES` | `7` | 日志轮转数量 |
| `BACKEND_URL` | `http://localhost:3000` | 前端调用后端地址 |
| `GESP_PLUGIN_DEBUG` | — | 插件调试日志开关 |
| `ENABLE_DEBUG` | — | 生产环境启用 debug 路由 |

### Embedding 变量

| 变量 | 默认值 | 用途 |
|------|--------|------|
| `EMBEDDING_PROVIDER` | `ollama` | 选择 embedding 提供商（`ollama`/`openai`/`mock`） |
| `EMBEDDING_BASE_URL` | `http://macmini.local:11434/v1` | Ollama 地址 |
| `EMBEDDING_MODEL` | `nomic-embed-text-v2-moe` | Embedding 模型 |
| `OPENAI_API_KEY` | — | OpenAI embedding 密钥（当 `EMBEDDING_PROVIDER=openai`） |
| `LANCEDB_PATH` | `./data/gesp.lance` | LanceDB 数据路径 |

### 评估模块变量

| 变量 | 默认值 | 用途 |
|------|--------|------|
| `JWT_SECRET` | — | Assessment JWT 密钥（**生产环境必须修改**） |
| `GESP_API_KEY` | — | GESP Plugin API Key |

### 密钥存放位置
- **开发**: `.env` 文件（空间根目录，已 `.gitignore`）
- **模板**: `.env.example`（提交到版本控制，不包含真实密钥）
- **生产**: 待定（需迁移至 secrets manager 或平台环境变量）

## Webhooks & 回调

**无** — 当前架构无 webhook 或外部回调端点。ellamaka 通过 SSE 事件流推送（`/event`），非 webhook 模式。

---

*Integration audit: 2026-05-08*
