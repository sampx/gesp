---
phase: 02-知识库-双端骨架
plan: "02"
subsystem: database, api
tags: [lancedb, embedding, ollama, vector-search, knowledge-base, seed]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Backend monorepo structure, Drizzle SQLite, auth system
provides:
  - EmbeddingProvider abstraction with 3 implementations (Ollama, OpenAI, Mock)
  - VectorStore abstraction with LanceDBFileStore (4 tables)
  - Seed pipeline for GESP C++ 1-8 knowledge base
  - 60+ structured knowledge points covering all 8 levels
affects: [02-03, 02-04, 02-05, knowledge-api, ai-agent]

# Tech tracking
tech-stack:
  added: ["@lancedb/lancedb@0.22.3", "crypto (built-in)"]
  patterns: ["EmbeddingProvider factory pattern", "VectorStore CRUD abstraction", "LanceDB file-mode storage"]

key-files:
  created:
    - packages/backend/src/services/embedding.ts
    - packages/backend/src/services/vector-store.ts
    - packages/backend/src/seed/knowledge-points-gesp-cpp-1-8.json
    - packages/backend/src/seed/knowledge.seed.ts
    - packages/backend/.env.example
  modified:
    - packages/backend/package.json
    - .gitignore

key-decisions:
  - "LanceDB 0.22.3 instead of 0.10.x — darwin-x64 compatibility requires 0.22.x; 0.27.x only supports darwin-arm64"
  - "MockEmbeddingProvider uses MD5-seeded LCG PRNG for deterministic 768-d vectors"
  - "Vector dimension detected at runtime from first embedding call, not hardcoded"
  - "Seed pipeline uses embedBatch with BATCH_SIZE=32 to avoid Ollama timeouts"

patterns-established:
  - "EmbeddingProvider factory: createEmbeddingProvider() reads env vars, returns correct implementation"
  - "LanceDBFileStore: lazy connect + table cache pattern for LanceDB connections"
  - "Seed pipeline: read JSON → build embedding texts → embedBatch → insert with vectors"

requirements-completed: [KNOW-01, KNOW-02, KNOW-03]

# Metrics
duration: "~45min (across 2 sessions)"
completed: 2026-04-24
---

# Phase 02 Plan 02: Knowledge Base Infrastructure Summary

**EmbeddingProvider + VectorStore abstractions with LanceDB file-mode, seed pipeline for 4 tables covering GESP C++ 1-8**

## Performance

- **Duration:** ~45 min (across 2 sessions, context handoff via .working-context.md)
- **Started:** 2026-04-24T18:00:00Z (Session 1: Tasks 1-2)
- **Completed:** 2026-04-24T19:30:00Z (Session 2: Task 3 + SUMMARY)
- **Tasks:** 3
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- EmbeddingProvider interface with 3 implementations (Ollama/OpenAI/Mock) and factory function
- VectorStore abstraction with LanceDBFileStore supporting search/insert/getAll/getById/update/delete/count
- 60+ GESP C++ knowledge points covering all 8 levels (1-8) in structured JSON
- Seed pipeline script reading 4 data sources, generating embeddings, populating LanceDB tables
- .env.example with embedding provider configuration for Ollama dev setup

## Task Commits

Each task was committed atomically:

1. **Task 1: EmbeddingProvider abstraction** - `ff9e185` (feat)
2. **Task 2: VectorStore abstraction + LanceDBFileStore** - `2b5d132` (feat)
3. **Task 3: Seed data + pipeline for GESP C++ 1-8** - `afd9e42` (feat)

**Plan metadata:** (pending) `docs(02-02): complete knowledge base plan execution`

## Files Created/Modified

- `packages/backend/src/services/embedding.ts` - EmbeddingProvider interface + OllamaEmbeddingProvider + OpenAIEmbeddingProvider + MockEmbeddingProvider + createEmbeddingProvider factory
- `packages/backend/src/services/vector-store.ts` - VectorStore interface + LanceDBFileStore with 4 table constants (KNOWLEDGE_POINTS, LESSON_PLANS, PRACTICE_QUESTIONS, EXAM_QUESTIONS)
- `packages/backend/src/seed/knowledge-points-gesp-cpp-1-8.json` - 60+ knowledge points covering GESP C++ levels 1-8 with id, language, level, block, point, mastery_verb, description, tags
- `packages/backend/src/seed/knowledge.seed.ts` - Seed pipeline: seedAll(force), reads 4 JSON sources, embedBatch, insert into LanceDB via VectorStore
- `packages/backend/.env.example` - Environment config with EMBEDDING_PROVIDER, EMBEDDING_BASE_URL, EMBEDDING_MODEL
- `packages/backend/package.json` - Added seed:knowledge script
- `.gitignore` - Added packages/backend/data/ (explicit LanceDB storage exclusion)

## Decisions Made

- **LanceDB 0.22.3**: Required for darwin-x64 (Intel Mac) compatibility. Version 0.27.x only supports darwin-arm64. The @lancedb/lancedb-darwin-arm64 optional dep exists but won't load on Intel.
- **Runtime dimension detection**: Embedding dimension (768 for nomic-embed-text-v2-moe, 1536 for text-embedding-3-small) is detected from first successful API call and cached, rather than hardcoded.
- **MockEmbeddingProvider deterministic vectors**: Uses MD5 hash → LCG PRNG for reproducible test vectors, enabling test isolation without external service dependencies.
- **Bun + LanceDB note**: Bun cannot correctly load LanceDB native bindings on some platforms. Seed scripts should use `node --import tsx` as fallback; vector-store.ts wraps require() in try/catch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] LanceDB version compatibility**
- **Found during:** Task 2 (VectorStore implementation)
- **Issue:** Plan specified LanceDB 0.10.x but latest compatible version for darwin-x64 is 0.22.3; version 0.27.x only supports darwin-arm64
- **Fix:** Installed @lancedb/lancedb@0.22.3, adapted API usage to match (connect, createTable, table.search, table.add patterns)
- **Files modified:** packages/backend/package.json
- **Committed in:** 2b5d132 (Task 2 commit)

**2. [Rule 2 - Missing Critical] LanceDB native binding graceful degradation**
- **Found during:** Task 2 (VectorStore implementation)
- **Issue:** LanceDB native binding fails on incompatible platforms, would crash the entire backend on import
- **Fix:** Wrapped require('@lancedb/lancedb') in try/catch with descriptive error message suggesting `node --import tsx` fallback
- **Files modified:** packages/backend/src/services/vector-store.ts
- **Committed in:** 2b5d132 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both auto-fixes essential for platform compatibility. No scope creep.

## Issues Encountered

- **Bun + LanceDB native binding**: Bun runtime cannot properly load LanceDB's native addon. Documented workaround: use `node --import tsx` for seed scripts. The backend server itself may need this workaround too when running on Intel Mac.

## User Setup Required

**External services require configuration for seed execution:**
- Ollama running at `http://macmini.local:11434` with `nomic-embed-text-v2-moe` model pulled
- Or set `EMBEDDING_PROVIDER=mock` for testing without Ollama
- Run: `cd packages/backend && bun run seed:knowledge` (or `node --import tsx src/seed/knowledge.seed.ts` on Intel Mac)

## Next Phase Readiness
- Knowledge base infrastructure complete, ready for Plan 02-03 (Knowledge API routes)
- Plan 02-03 will use VectorStore.search() to implement knowledge query endpoints
- Plan 02-04 can use EmbeddingProvider for text similarity in learning recommendations
- Seed data already prepared for practice_questions (40+), exam_questions (30+), lesson_plans (1+)

---
*Phase: 02-知识库-双端骨架*
*Completed: 2026-04-24*
