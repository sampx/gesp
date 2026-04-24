---
phase: 02-知识库-双端骨架
plan: 07
subsystem: database
tags: [lancedb, vector-store, seed-pipeline, cache-invalidation]

# Dependency graph
requires:
  - phase: 02-知识库-双端骨架 (plans 01-06)
    provides: Knowledge base tables, VectorStore, KnowledgeBaseService, seed infrastructure
provides:
  - Fixed seed path resolution for workspace root access
  - LanceDB table cache invalidation after mutations
  - Working PUT update for knowledge points
affects: [knowledge-base, seed-pipeline, admin-api]

# Tech tracking
tech-stack:
  added: []
  patterns: [cache-invalidation-after-mutation]

key-files:
  created: []
  modified:
    - packages/backend/src/seed/knowledge.seed.ts
    - packages/backend/src/services/vector-store.ts

key-decisions:
  - "Use dbPath (gesp.lance) instead of dbDir (data/) for seed existence check to avoid false positive from SQLite"
  - "Invalidate tableCache after every mutation (insert/update/delete) to prevent stale LanceDB reads"

patterns-established:
  - "Cache invalidation: this.tableCache.delete(tableName) after every write operation in VectorStore"

requirements-completed: [KNOW-01, KNOW-02, KNOW-03, KNOW-04, KNOW-05]

# Metrics
duration: 5min
completed: 2026-04-24
---

# Phase 02 Plan 07: Backend Gap Fixes Summary

**Seed path resolution fixed (5 levels up) and LanceDB table cache invalidation added to all mutation methods**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-24T15:48:00Z
- **Completed:** 2026-04-24T15:50:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed resolveWorkspacePath to navigate 5 directory levels up to workspace root, enabling all 4 seed tables to load
- Fixed seed existence check to use LanceDB data path (gesp.lance) instead of shared data/ directory that contains SQLite's gesp.db
- Added tableCache.delete(tableName) after insert, update, and delete operations in VectorStore to prevent stale reads

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix seed path resolution and existence check** - `773e4a0` (fix)
2. **Task 2: Fix LanceDB PUT update cache invalidation** - `d9e110a` (fix)

## Files Created/Modified
- `packages/backend/src/seed/knowledge.seed.ts` - Fixed workspace path (5 levels), switched existence check to dbPath, removed unused readdirSync/dbDir
- `packages/backend/src/services/vector-store.ts` - Added tableCache.delete(tableName) to insert, update, and delete methods

## Decisions Made
- Used `dbPath` (gesp.lance) instead of `dbDir` (data/) for seed existence check — the shared data/ directory always exists because SQLite stores gesp.db there, causing false "already seeded" skips
- Cache invalidation applied to all three mutation methods (insert, update, delete) for consistency, even though insert's createTable path already sets a fresh cache entry

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Seed pipeline can now populate all 4 LanceDB tables from workspace seed data
- PUT /api/admin/knowledge/points/:id will return 200 instead of 500
- Cache invalidation ensures reads following writes always get fresh data

## Self-Check: PASSED

- FOUND: .planning/phases/02-知识库-双端骨架/02-07-SUMMARY.md
- FOUND: 773e4a0 (seed fix)
- FOUND: d9e110a (cache fix)

---
*Phase: 02-知识库-双端骨架*
*Completed: 2026-04-24*
