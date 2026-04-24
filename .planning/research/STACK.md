# Stack Recommendations

**Domain:** GESP C++ AI 自适应学习平台
**Researched:** 2026-04-22
**Updated:** 2026-04-24（Phase 2: 前端合并、Embedding Ollama）
**Confidence:** HIGH（基于 ellamaka 参考 + 官方文档验证）

## Recommended Stack

### Backend Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Runtime** | Bun | 1.3.11+ | 高性能 JS/TS 运行时，原生 TypeScript 支持，快速启动。ellamaka 中已验证成功使用。 |
| **Web Framework** | Hono | 4.x | 轻量、类型安全，原生支持 Bun。优于 Express/NestJS 的选型。 |
| **OpenAPI** | hono-openapi | 0.4.x | 从路由生成 OpenAPI 规范，支持 SDK 生成。参考 ellamaka。 |
| **Agent Engine** | ellamaka SDK | — | 远程调用 Agent 引擎（HTTP SDK）。AI Provider 多协议支持由 ellamaka 处理。 |
| **ORM** | Drizzle ORM | 0.39.x | 类型安全 SQL，SQLite 下比 Prisma 更轻量。ellamaka 使用。 |
| **Relational DB** | SQLite | 3.x | 轻量、嵌入式，适合 MVP。基于文件，无需额外服务器。 |
| **Vector DB** | LanceDB | 0.10.x | 嵌入式向量数据库，与 Bun 兼容。适用于知识库语义检索。 |

### Frontend Stack（Phase 2 统一架构）

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **统一前端** | NextJS 15 | 15.x | App Router、React Server Components。学员端+管理端合并为单一应用，通过路由区分。 |
| **UI Library** | shadcn/ui | latest | Radix UI + Tailwind CSS，高度可定制。学员端和管理端使用同一组件库但不同风格。 |
| **Styling** | Tailwind CSS | 3.x | 与 shadcn/ui 配合，支持主题切换（学员端活泼、管理端专业）|
| **State Management** | TanStack Query | 5.x | 服务端状态管理，缓存。 |
| **Forms** | React Hook Form + Zod | 7.x / 3.x | 类型安全的表单验证。 |

**Phase 2 架构变更（2026-04-24）：**
- 原 Student App + Admin App（React+Vite+Semi）→ 合并为 `apps/web/`（NextJS 15 + shadcn/ui）
- 学员端路由：`/student/*`（趣味风格）
- 管理端路由：`/admin/*`（专业风格）
- 统一登录入口：`/login`（三角色切换）

### Embedding Stack（Phase 2 新增）

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Embedding Provider** | Ollama | local | 本地 embedding，无网络依赖，免费。macmini.local:11434 已可用。 |
| **Embedding Model** | nomic-embed-text-v2-moe | — | 高质量开源 embedding 模型，适合中英文混合内容。 |
| **Vector DB** | LanceDB | 0.10.x | 嵌入式向量数据库，与 Bun 兼容。文件模式存储 `./data/gesp.lance`。 |

**配置环境变量：**
```bash
EMBEDDING_BASE_URL=http://macmini.local:11434/v1
EMBEDDING_MODEL=nomic-embed-text-v2-moe
EMBEDDING_PROVIDER=ollama  # 开发默认，生产可切 openai
```

### Monorepo Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| **Turborepo** | 2.x | Monorepo 构建编排，远程缓存 |
| **Bun workspaces** | 1.3.x | 包管理（比 npm/pnpm 更快） |

### AI Provider SDKs（由 ellamaka 管理，gesp 不直接依赖）

```json
// ellamaka 项目内的 AI SDK 依赖
{
  "@ai-sdk/openai": "3.0.x",
  "@ai-sdk/anthropic": "3.0.x",
  "@ai-sdk/google": "3.0.x",
  "@ai-sdk/google-vertex": "4.0.x",
  "@ai-sdk/openai-compatible": "2.0.x",  // 用于 DeepSeek、豆包等
  "ai": "4.x"  // AI SDK 核心
}
```

**gesp backend 不直接依赖 AI SDK** — 所有 AI 调用通过 ellamaka SDK 代理层转发。

### ellamaka Plugin SDK（gesp-plugin 使用）

```json
// ellamaka/gesp-plugin/package.json
{
  "@ellamaka/plugin-sdk": "workspace:*",  // ellamaka 内部包
  "@gesp/sdk": "workspace:*"             // gesp SDK（供 plugin 调用 gesp API）
}
```

---

## 不建议使用的技术

| Technology | Why Avoid |
|------------|-----------|
| NestJS | 框架过重，本项目不需要。Hono 更轻量且更快。 |
| Express | 较旧，类型安全性不如 Hono。无原生 Bun 优化。 |
| Prisma | Drizzle 在 SQLite + Bun 组合下更好，更轻量。 |
| MongoDB | 不适合结构化教育数据。SQLite 更简单。 |
| Pinecone/Qdrant（云端向量数据库）| LanceDB 嵌入式、零配置用于 MVP。云端向量数据库增加复杂度。 |
| Semi Design | Phase 2 改用 shadcn/ui，统一学员端和管理端组件库。 |
| Redux | TanStack Query 处理服务端状态，本地状态用 React hooks 即可。 |
| 经典 OJ 系统（Judge0、DOMjudge）| v1 使用 AI 模拟判题，不需要真实代码执行。无需沙盒。 |

---

## 集成模式

### 1. ellamaka SDK 代理模式（gesp → ellamaka）

```typescript
// packages/backend/src/ellamaka/client.ts

import { EllamakaClient } from "@ellamaka/sdk";

export const ellamakaClient = new EllamakaClient({
  baseURL: process.env.ELLAMAKA_URL || "http://localhost:3001",
  apiKey: process.env.ELLAMAKA_API_KEY,
});

// Stream agent response
export async function* streamAgent(agent: string, params: StreamParams): AsyncGenerator<SSEEvent> {
  const stream = await ellamakaClient.streamAgent({
    agent,
    messages: params.messages,
    context: params.context,
  });
  
  for await (const event of stream) {
    yield event;
  }
}

// One-shot agent call
export async function callAgent(agent: string, params: CallParams): Promise<AgentResult> {
  return await ellamakaClient.callAgent({ agent, ...params });
}
```

**AI Provider 选择由 ellamaka 管理** — gesp backend 只需指定 agent 名称，不关心具体模型。

### 2. LanceDB 集成模式（gesp backend 内）

```typescript
// packages/backend/src/db/lance/index.ts

import * as lancedb from "@lancedb/lancedb";

const db = await lancedb.connect("./data/knowledge.lance");

// 创建表
await db.createTable("knowledge_points", [
  { id: "1", content: "...", embedding: [], metadata: {} }
]);

// 向量搜索
const table = await db.openTable("knowledge_points");
const results = await table
  .vectorSearch(embedding)
  .limit(10)
  .toArray();
```

### 3. Drizzle SQLite Schema 模式（参考 ellamaka）

```typescript
// packages/backend/src/db/sqlite/schema.ts

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const students = sqliteTable("students", {
  id: text().primaryKey(),
  username: text().notNull().unique(),
  password_hash: text().notNull(),
  level: integer().default(1),
  created_at: integer().notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text().primaryKey(),
  student_id: text().notNull().references(() => students.id),
  type: text({ enum: ["assessment", "lesson", "practice"] }).notNull(),
  started_at: integer().notNull(),
  ended_at: integer(),
});

export const practice_records = sqliteTable("practice_records", {
  id: text().primaryKey(),
  session_id: text().notNull().references(() => sessions.id),
  question_id: text().notNull(),
  student_answer: text().notNull(),
  is_correct: integer({ mode: "boolean" }),
  analysis: text(), // AI 判题返回的 JSON
  created_at: integer().notNull(),
});
```

---

## 配置文件

### Root package.json

```json
{
  "name": "gesp-learning-platform",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "dev:backend": "turbo dev --filter=@gesp/backend",
    "dev:web": "turbo dev --filter=@gesp/web",
    "build": "turbo build",
    "typecheck": "turbo typecheck",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.5.0"
  },
  "packageManager": "bun@1.3.11"
}
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    }
  }
}
```

---

## Sources

- **ellamaka 项目** — Agent 引擎、SDK 设计、Plugin 系统（HIGH confidence）
- **ellamaka package.json** — 已验证 Bun、Hono 版本（HIGH confidence）
- **Vercel AI SDK docs** — 多 Provider 模式（由 ellamaka 使用，gesp 间接依赖）
- **LanceDB docs** — 嵌入式向量数据库模式（MEDIUM confidence, web search）
- **Turborepo docs** — Monorepo 配置（HIGH confidence, turbo.build）
