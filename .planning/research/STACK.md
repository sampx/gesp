# Stack Recommendations

**Domain:** GESP C++ AI 自适应学习平台
**Researched:** 2026-04-22
**Confidence:** HIGH（基于 ellamaka 参考 + 官方文档验证）

## Recommended Stack

### Backend Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Runtime** | Bun | 1.3.11+ | 高性能 JS/TS 运行时，原生 TypeScript 支持，快速启动。ellamaka 中已验证成功使用。 |
| **Web Framework** | Hono | 4.x | 轻量、类型安全，原生支持 Bun。优于 Express/NestJS 的选型。 |
| **OpenAPI** | hono-openapi | 0.4.x | 从路由生成 OpenAPI 规范，支持 SDK 生成。参考 ellamaka。 |
| **AI SDK** | Vercel AI SDK | 4.x（ai 包） | 多 Provider 支持（OpenAI、Anthropic、Google、DeepSeek、豆包等）。统一流式接口。 |
| **ORM** | Drizzle ORM | 0.39.x | 类型安全 SQL，SQLite 下比 Prisma 更轻量。ellamaka 使用。 |
| **Relational DB** | SQLite | 3.x | 轻量、嵌入式，适合 MVP。基于文件，无需额外服务器。 |
| **Vector DB** | LanceDB | 0.10.x | 嵌入式向量数据库，与 Bun 兼容。适用于知识库语义检索。 |

### Frontend Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Student App** | NextJS | 15.x | App Router、React Server Components 支持 SEO 和流式渲染。 |
| **Admin App** | React + Vite | 18.x / 6.x | 快速开发服务器，HMR。参考 new-api Web 结构。 |
| **Admin UI Library** | Semi Design | 2.x | 企业级组件库，中文友好。new-api 使用。 |
| **Student UI** | Tailwind CSS + Kobalte | 3.x / 0.13.x | 现代样式 + SolidJS 组件用于交互部分。 |
| **State Management** | TanStack Query | 5.x | 服务端状态管理，缓存。 |
| **Forms** | React Hook Form + Zod | 7.x / 3.x | 类型安全的表单验证。 |

### Monorepo Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| **Turborepo** | 2.x | Monorepo 构建编排，远程缓存 |
| **Bun workspaces** | 1.3.x | 包管理（比 npm/pnpm 更快） |

### AI Provider SDKs（Vercel AI SDK 生态系统）

```json
{
  "@ai-sdk/openai": "3.0.x",
  "@ai-sdk/anthropic": "3.0.x",
  "@ai-sdk/google": "3.0.x",
  "@ai-sdk/google-vertex": "4.0.x",
  "@ai-sdk/openai-compatible": "2.0.x",  // 用于 DeepSeek、豆包等
  "ai": "4.x"  // AI SDK 核心
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
| Redux | TanStack Query 处理服务端状态，本地状态用 React hooks 即可。 |
| 经典 OJ 系统（Judge0、DOMjudge）| v1 使用 AI 模拟判题，不需要真实代码执行。无需沙盒。 |

---

## 集成模式

### 1. AI SDK 多 Provider 模式（参考 ellamaka）

```typescript
// packages/backend/src/provider/index.ts

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Provider 注册表 — 降级链
const providers = {
  openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  deepseek: createOpenAICompatible({
    name: "deepseek",
    baseURL: "https://api.deepseek.com/v1",
    apiKey: process.env.DEEPSEEK_API_KEY,
  }),
  doubao: createOpenAICompatible({
    name: "doubao",
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    apiKey: process.env.DOUBAO_API_KEY,
  }),
};

// 模型注册表与 Provider 映射
export const models = {
  "gpt-4o": { provider: "openai", modelId: "gpt-4o" },
  "claude-sonnet-4": { provider: "anthropic", modelId: "claude-sonnet-4-20250514" },
  "deepseek-chat": { provider: "deepseek", modelId: "deepseek-chat" },
  "doubao-pro": { provider: "doubao", modelId: "doubao-pro-32k" },
};

export function getLanguageModel(modelKey: string) {
  const config = models[modelKey];
  const provider = providers[config.provider];
  return provider.languageModel(config.modelId);
}
```

### 2. LanceDB 集成模式

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
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "turbo dev",
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

- **ellamaka package.json** — 已验证 Bun、Hono、AI SDK 版本（HIGH confidence）
- **Vercel AI SDK docs** — 多 Provider 模式（HIGH confidence, context7 verified）
- **LanceDB docs** — 嵌入式向量数据库模式（MEDIUM confidence, web search）
- **Turborepo docs** — Monorepo 配置（HIGH confidence, turbo.build）
