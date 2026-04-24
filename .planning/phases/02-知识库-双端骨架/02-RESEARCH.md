# Phase 02: 知识库 + 双端骨架 — Research

**Date:** 2026-04-24
**Status:** Complete

## 1. LanceDB Integration

- **NPM package:** `@lancedb/lancedb` (v0.27.2), JS/TS bindings with Apache Arrow schema
- **Bun compatibility:** LanceDB JS bindings use native Node addons; Bun compatibility needs testing. The package uses `vectordb` native module; if Bun can't load it, fallback to Node.js for seed/embedding scripts or use LanceDB's REST API mode
- **Schema definition:** Use Arrow Schema (not Drizzle), matching the data model in `gesp-data-models.md`. Each table (`knowledge_points`, `lesson_plans`, `practice_questions`, `exam_questions`) gets an Arrow schema with a `vector` column
- **Vector search:** LanceDB supports `table.search(vector).limit(N).toArray()` for cosine similarity. Also supports FTS via `table.search("text").toArray()`
- **Embedding auto-generation:** LanceDB has `EmbeddingFunction` class — can wrap Ollama/OpenAI embedding calls to auto-generate vectors on insert. Use `EmbeddingFunction` with custom `embed()` method calling Ollama API
- **Storage:** File mode at `packages/backend/data/gesp.lance` (`.gitignore`)
- **VectorStore abstraction:** Define `interface VectorStore { search(query, limit): Promise<Result[]>; insert(table, records): Promise<void> }`. Phase 2 implements `LanceDBFileStore`. Constructor pattern: `new LanceDBFileStore({ dbPath, embeddingProvider })`

## 2. NextJS 15 + shadcn/ui Setup

- **NextJS version:** 15.x (App Router, React Server Components). Check latest: next@15.4+ is stable
- **Turborepo integration:** Create `apps/web/` with its own `package.json` and `tsconfig.json`. Turborepo `workspaces` must be updated to `["apps/*", "packages/*"]`. Turbo pipeline already handles `dev`, `build`, `typecheck`, `test`
- **shadcn/ui initialization:** `npx shadcn@latest init` in `apps/web/`. Uses CSS variables theming (OKLCH). Components install to `apps/web/src/components/ui/`
- **Tailwind CSS:** Already comes with shadcn/ui init. Configure in `apps/web/tailwind.config.ts`
- **Shared UI package:** `packages/ui/` — extracts common shadcn components and theme utilities. Student and admin apps share the same components but apply different CSS variable sets (one playful, one professional)
- **Theme strategy:** Two CSS variable files: `student-theme.css` (warm, colorful, rounded) and `admin-theme.css` (neutral, dense, sharp). Applied via `layout.tsx` per route group
- **Dev command:** `bun run dev` at root starts both backend + web via Turbo pipeline

## 3. Multi-Role Auth Routing

- **NextJS Middleware:** `apps/web/src/middleware.ts` — checks `session_id` cookie validity by calling `GET /api/auth/me` on backend. Unauthenticated → redirect to `/login`. Note: NextJS middleware runs on Edge Runtime — cannot use Node.js crypto, use `fetch()` for backend calls
- **Route groups:** `(student)/` and `(admin)/` — share same layout but different themes. Route groups don't affect URL path
- **Redirect logic:**
  - `/login` → POST to `/api/auth/login` (backend validates user+role). On success, redirect based on `user.role`:
    - role >= 10 (admin/root) → `/admin/dashboard`
    - role < 10 (student) → `/student/dashboard`
  - Unauthenticated visiting `/student/*` or `/admin/*` → redirect to `/login`
  - Student visiting `/admin/*` → redirect to `/403`
- **Auth state:** Store minimal user info (`{ id, username, role }`) in a React Context or Zustand store. Fetch via `GET /api/auth/me` on app mount
- **Role guard component:** `<RoleGate allowedRoles={['admin', 'root']}>` wraps admin pages. Client component — reads role from auth state
- **Backend API prefix convention** (from Phase 1): `/api/auth/*`, `/api/admin/*`, `/api/student/*`. Phase 2 adds `/api/admin/knowledge/*`, `/api/student/knowledge/*`

## 4. Monorepo Restructuring

- **Current structure:** `packages/{backend, shared}/`
- **Target structure:** `apps/web/`, `packages/{backend, shared, ui}/`
- **Steps:**
  1. Create `apps/web/` with `create-next-app` or manual setup
  2. Create `packages/ui/` (exports shadcn components + theme CSS)
  3. Update root `package.json` workspaces: `["apps/*", "packages/*"]`
  4. Update `turbo.json` if needed (current config is generic enough)
  5. Verify `bun run dev` starts both backend and web
- **Shared package reuse:** `@gesp/shared` already exports `ROLE` constants (1=student, 10=admin, 100=root). Web imports these for role guards and UI logic
- **No need to move existing packages/** — they stay where they are. Only new additions are `apps/web/` and `packages/ui/`
- **Build dependencies:** `@gesp/web` depends on `@gesp/shared` and `@gesp/ui`. `@gesp/ui` depends on nothing (standalone component library)

## 5. Embedding Provider Abstraction

- **Interface** (in `packages/backend/src/services/embedding.ts`):

```typescript
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
```

- **Ollama provider:** Calls `POST {EMBEDDING_BASE_URL}/embeddings` with `{ model: EMBEDDING_MODEL, input: text }`. OpenAI-compatible API. Model: `nomic-embed-text-v2-moe` on `macmini.local:11434`
- **OpenAI provider:** Calls `POST https://api.openai.com/v1/embeddings` with `{ model: "text-embedding-3-small", input: text }`. Uses `OPENAI_API_KEY` env var
- **Provider selection:** `EMBEDDING_PROVIDER` env var. Factory function: `createEmbeddingProvider(provider: 'ollama' | 'openai'): EmbeddingProvider`. Default: `ollama` in dev, `openai` in production
- **Vector dimension:** `nomic-embed-text-v2-moe` outputs 768d. `text-embedding-3-small` outputs 1536d. Dimension is detected at runtime from first embedding call and stored in LanceDB schema
- **Batch processing:** Ollama API supports batch embedding (`"input": ["text1", "text2"]`). OpenAI also supports arrays. Process seed data in batches of 100

## 6. Seed Data Pipeline

- **Seed data location:** `docs/products/gesp/seed/` (space-level docs)
- **Existing files:**
  - `exam-cpp-l1-2026-03.json` — 30 multiple-choice questions (L1 真题)
  - `practice-cpp-l1.json` — 40 practice questions
  - `lesson-cpp-g3-05.json` — 1 lesson plan
- **Knowledge points:** Not yet in seed data. GESP 1-8 级大纲知识点需要先结构化（从官方大纲提取，存为 JSON），然后导入 LanceDB `knowledge_points` 表
- **Pipeline script:** `packages/backend/src/seed/knowledge.seed.ts`:
  1. Read JSON files from seed directory
  2. Map to LanceDB Arrow schema (generate UUIDs, construct embedding text)
  3. Call `EmbeddingProvider.embedBatch()` on all records
  4. Insert into LanceDB tables
- **Run script:** `bun run packages/backend/src/seed/knowledge.seed.ts` or add as Turborepo task
- **Re-seed safety:** Check if LanceDB directory exists, skip if already seeded (or add `--force` flag)
- **Knowledge point source:** GESP 1-8 级大纲在 `docs/products/gesp/` 下需创建 `knowledge-points-gesp-cpp-1-8.json`，按数据模型 Schema 的字段结构化。这是 Phase 2 的必要前置工作

## 7. Knowledge Base API Design

- **Routes** (Hono, in `packages/backend/src/routes/knowledge.ts`):

```
Admin routes (require AdminAuth):
  GET    /api/admin/knowledge/points         — list all knowledge points (paginated)
  GET    /api/admin/knowledge/points/:id     — get single point detail
  POST   /api/admin/knowledge/points         — create new knowledge point
  PUT    /api/admin/knowledge/points/:id     — update knowledge point
  DELETE /api/admin/knowledge/points/:id     — delete knowledge point
  GET    /api/admin/knowledge/points/search  — semantic search (?q=xxx&limit=10)
  (similar CRUD for lessons, questions, exams)

Student routes (require StudentAuth):
  GET    /api/student/knowledge/search       — semantic search (?q=xxx&limit=5)
```

- **Pagination:** Query params `?page=1&limit=20`. Response includes `{ data, total, page, limit }`
- **Semantic search:** `POST /api/admin/knowledge/points/search { query: "欧几里得算法", limit: 10 }` — calls `embeddingProvider.embed(query)` then `lancedb.store.search(vector, limit)`
- **Validation:** Zod schemas for all request bodies (`zValidator` middleware, same pattern as Phase 1 auth routes)
- **Response format:** `{ success: true, data: T }` — same as existing convention
- **Service layer:** `packages/backend/src/services/knowledge-base.ts` — encapsulates LanceDB operations, exposed to route handlers

## 8. Frontend Component Architecture

- **Layout strategy:**
  - `apps/web/src/app/(student)/layout.tsx` — student layout: sidebar nav (Dashboard, 测评, 学习, 练习) + header with user info
  - `apps/web/src/app/(admin)/layout.tsx` — admin layout: sidebar nav (Dashboard, 知识库, 学员, 数据, 设置) + breadcrumb + header
  - Shared `<AuthLayout>` wraps both, checks auth state
- **Login page:** `apps/web/src/app/login/page.tsx` — role selection cards (学员/教员/管理员) → username/password form → submit → redirect
- **shadcn components needed:**
  - Layout: `Sidebar`, `Sheet` (mobile), `Breadcrumb`, `Avatar`
  - Navigation: `Tabs`, `NavigationMenu`
  - Data display: `Table`, `DataTable`, `Card`, `Badge`
  - Forms: `Input`, `Select`, `Textarea`, `Button`, `Label`, `Form` (react-hook-form integration)
  - Feedback: `Toast` (sonner), `Dialog`, `Alert`
  - Admin KB pages: `Table` + `Sheet` (detail/edit), `Command` (search)
- **Theme switching:** Student uses `student-theme.css` (rounded-xl, warm colors, larger fonts, emoji-friendly). Admin uses `admin-theme.css` (rounded-md, neutral colors, compact density). Both are shadcn CSS variable overrides applied via `<html data-theme="student|admin">`
- **Placeholder pages:** Student routes (dashboard, assessment, learning, practice) and admin routes (dashboard, students, analytics, settings) render `<PlaceholderPage title="..." description="Coming in Phase X" />` component

## 9. UI-SPEC Considerations

- **Dual-style design contract:** UI-SPEC must define separate visual specs for student (playful, warm, C++/game-themed) and admin (professional, dense, data-centric)
- **Color palettes:**
  - Student: primary=amber/orange, background=warm gray, accent=teal/green, card=rounded with shadows
  - Admin: primary=slate/blue, background=cool gray, accent=indigo, card=subtle border
- **Typography:** Student uses larger base font (18px), rounded font (Inter or similar). Admin uses standard (14-16px), system font stack
- **Navigation patterns:** Student uses bottom tab bar (mobile-first, C++ icon theme). Admin uses left sidebar (desktop-first, text+icon)
- **Knowledge base UI:** List page with filterable table (level, block, tags). Detail page as side sheet with Markdown rendering. Edit form with react-hook-form + zod validation
- **Login page:** Role cards in horizontal layout (mobile: vertical stack). Selected card has accent border. Unified form below. C++ mascot/illustration optional

## 10. Risks and Gotchas

- **LanceDB + Bun:** LanceDB JS bindings rely on Node.js native addons (`vectordb`). Bun may fail to load these. Mitigation: test LanceDB import in Bun immediately. If incompatible, fallback options:
  - A: Run seed/embedding scripts with `node` (not bun) for LanceDB operations
  - B: Use LanceDB Remote (Rust server) accessed via HTTP — more complex setup
- **NextJS Middleware Edge Runtime:** Cannot access `crypto` or Node.js APIs. Auth check in middleware must use `fetch()` to backend `/api/auth/me`. If this adds unacceptable latency, move auth check to client-side layout component instead
- **Ollama availability:** `macmini.local:11434` may be unreachable from other machines. Development on macmini is fine; CI needs mock embedding provider or skip embedding tests. Add `EMBEDDING_PROVIDER=mock` for test environment
- **Embedding model dimension mismatch:** If switching between Ollama (768d) and OpenAI (1536d), existing vectors become invalid. LanceDB tables must be recreated. Store dimension in table metadata and check on startup
- **Knowledge point data creation:** GESP 1-8 级大纲需手工/半自动整理为结构化 JSON。这是阻断性前置任务 — 没有知识点数据，knowledge_points 表为空，语义搜索无结果
- **Seed data JSON structure:** Existing seed files use arbitrary JSON structure. Need to map to LanceDB Arrow schema (add UUIDs, compute embedding text field). Write adapter scripts per-file
- **Turbo dev pipeline:** `turbo dev` runs both backend and web concurrently. If backend crashes, web still starts but shows errors. Need better dev experience (maybe separate terminals, or `concurrently` in root scripts)
- **Session cookie in NextJS:** `session_id` cookie set by backend (Hono). NextJS middleware needs to read this cookie and validate via API. Cookie domain/path must match between backend (Hono on :3000) and frontend (NextJS on :3001). Consider API proxy in `next.config.js` to avoid CORS
- **Existing admin role:** Phase 1 calls it "admin" (role=10), ROADMAP SC#9 says "admin needs to be changed to root". The role name change is purely a UI label change — the numeric role values (1, 10, 100) are stable. Login page labels: 学员 (role=1), 教员 (role=10), 管理员/root (role=100)
- **shadcn/ui + Turborepo:** shadcn components install to `apps/web/src/components/ui/`. Shared UI package (`packages/ui/`) for common components adds Turborepo build dependency complexity. Start with components in `apps/web/`, extract to `packages/ui/` only when both apps need the same component

---
*Research completed: 2026-04-24*
*Methodology: Context7 lookup (LanceDB, NextJS, shadcn/ui) + codebase analysis (Phase 1 patterns, seed data, monorepo) + architectural synthesis*
