# Stack Recommendations

**Domain:** AI-Powered Adaptive Learning Platform for GESP C++
**Researched:** 2026-04-22
**Confidence:** HIGH (based on ellamaka reference + official docs verification)

## Recommended Stack

### Backend Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Runtime** | Bun | 1.3.11+ | High performance JS/TS runtime, native TypeScript support, fast startup. Used in ellamaka successfully. |
| **Web Framework** | Hono | 4.x | Lightweight, type-safe, works with Bun natively. Better than Express/NestJS for this use case. |
| **OpenAPI** | hono-openapi | 0.4.x | Auto-generate OpenAPI spec from routes, enables SDK generation. Reference: ellamaka. |
| **AI SDK** | Vercel AI SDK | 4.x (ai package) | Multi-provider support (OpenAI, Anthropic, Google, DeepSeek, Doubao, etc.). Unified streaming interface. |
| **ORM** | Drizzle ORM | 0.39.x | Type-safe SQL, better than Prisma for SQLite. Used in ellamaka. |
| **Relational DB** | SQLite | 3.x | Lightweight, embedded, perfect for MVP. File-based, no server needed. |
| **Vector DB** | LanceDB | 0.10.x | Embedded vector DB, works with Bun. Good for knowledge base semantic search. |

### Frontend Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| **Student App** | NextJS | 15.x | App Router, React Server Components for SEO, streaming support. |
| **Admin App** | React + Vite | 18.x / 6.x | Fast dev server, HMR. Reference: new-api web structure. |
| **Admin UI Library** | Semi Design | 2.x | Enterprise-grade components, Chinese-friendly. Used in new-api. |
| **Student UI** | Tailwind CSS + Kobalte | 3.x / 0.13.x | Modern styling + SolidJS components for interactive parts. |
| **State Management** | TanStack Query | 5.x | Server state management, caching. |
| **Forms** | React Hook Form + Zod | 7.x / 3.x | Type-safe form validation. |

### Monorepo Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| **Turborepo** | 2.x | Monorepo build orchestration, remote caching |
| **Bun workspaces** | 1.3.x | Package management (faster than npm/pnpm) |

### AI Provider SDKs (Vercel AI SDK ecosystem)

```json
{
  "@ai-sdk/openai": "3.0.x",
  "@ai-sdk/anthropic": "3.0.x",
  "@ai-sdk/google": "3.0.x",
  "@ai-sdk/google-vertex": "4.0.x",
  "@ai-sdk/openai-compatible": "2.0.x",  // For DeepSeek, Doubao, etc.
  "ai": "4.x"  // Core AI SDK
}
```

---

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| NestJS | Heavy framework, not needed for this project. Hono is lighter and faster. |
| Express | Older, less type-safe than Hono. No native Bun optimizations. |
| Prisma | Drizzle is better for SQLite + Bun, lighter weight. |
| MongoDB | Not suitable for structured educational data. SQLite is simpler. |
| Pinecone/Qdrant (cloud vector DB) | LanceDB is embedded, zero-config for MVP. Cloud vector DB adds complexity. |
| Redux | TanStack Query handles server state, local state with React hooks. |
| Classic OJ systems (Judge0, DOMjudge) | v1 uses AI模拟判题, not real code execution. No sandbox needed. |

---

## Integration Patterns

### 1. AI SDK Multi-Provider Pattern (参考 ellamaka)

```typescript
// packages/backend/src/provider/index.ts

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Provider registry - fallback chain
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

// Model registry with provider mapping
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

### 2. LanceDB Integration Pattern

```typescript
// packages/backend/src/db/lance/index.ts

import * as lancedb from "@lancedb/lancedb";

const db = await lancedb.connect("./data/knowledge.lance");

// Create tables
await db.createTable("knowledge_points", [
  { id: "1", content: "...", embedding: [], metadata: {} }
]);

// Vector search
const table = await db.openTable("knowledge_points");
const results = await table
  .vectorSearch(embedding)
  .limit(10)
  .toArray();
```

### 3. Drizzle SQLite Schema Pattern (参考 ellamaka)

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
  analysis: text(), // JSON from AI grading
  created_at: integer().notNull(),
});
```

---

## Configuration Files

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

- **ellamaka package.json** — Verified Bun, Hono, AI SDK versions (HIGH confidence)
- **Vercel AI SDK docs** — Multi-provider patterns (HIGH confidence, context7 verified)
- **LanceDB docs** — Embedded vector DB patterns (MEDIUM confidence, web search)
- **Turborepo docs** — Monorepo configuration (HIGH confidence, turbo.build)