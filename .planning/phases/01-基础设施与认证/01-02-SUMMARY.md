---
phase: 01-基础设施与认证
plan: 02
subsystem: database
tags: [drizzle, sqlite, schema, users, sessions]

# Dependency graph
requires:
  - phase: 01-01
    provides: backend package with Hono skeleton and drizzle-orm dependency
provides:
  - Drizzle SQLite configuration and DB connection
  - Users table schema with all locked fields and indexes
  - Sessions table schema with foreign key to users
  - SQLite database file created and schema applied
affects: [01-03, 01-04, 01-05]

# Tech tracking
tech-stack:
  added: [drizzle-kit, better-sqlite3]
  patterns:
    - "Drizzle SQLite schema pattern: src/db/schema/*.ts with barrel export"
    - "DB connection via drizzle-orm/bun-sqlite with schema re-export"

key-files:
  created:
    - packages/backend/drizzle.config.ts
    - packages/backend/src/db/index.ts
    - packages/backend/src/db/schema/index.ts
    - packages/backend/src/db/schema/users.ts
    - packages/backend/src/db/schema/sessions.ts
    - packages/backend/.gitignore
  modified:
    - packages/backend/package.json

key-decisions:
  - "SQLite dialect with bun-sqlite driver for drizzle-orm"
  - "better-sqlite3 as dev dependency for drizzle-kit CLI tooling"
  - "Schema files organized as src/db/schema/*.ts with barrel index.ts"
  - "Indexes exported alongside table definitions for explicit management"

patterns-established:
  - "Schema pattern: sqliteTable with column-level constraints (unique, notNull, default)"
  - "Index pattern: separate exported object alongside table definition"
  - "Timestamp pattern: integer({ mode: 'timestamp' }) for SQLite datetime columns"

requirements-completed: [AUTH-01, AUTH-02]

# Metrics
duration: 7min
completed: 2026-04-23
---

# Phase 1 Plan 02: Database Schema Setup Summary

**Drizzle SQLite schema with users table (13 columns, 3 indexes) and sessions table (5 columns, 2 indexes, FK cascade)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-23T03:13:42Z
- **Completed:** 2026-04-23T03:21:09Z
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments
- Drizzle configuration with SQLite dialect and schema glob path
- Users table with all locked fields (id, username, password_hash, display_name, role, status, email, github_id, oidc_id, wechat_id, telegram_id, created_at, updated_at)
- Sessions table with foreign key cascade delete to users, role field for TTL differentiation
- Database file created at ./data/gesp.db with schema applied and verified

## Task Commits

Each task was committed atomically:

1. **Task 02-01: Create Drizzle Configuration** - `1410d08` (feat)
2. **Task 02-02: Create Users Table Schema** - `f614239` (feat)
3. **Task 02-03: Create Sessions Table Schema** - `11db604` (feat)
4. **Task 02-04: Push Database Schema** - `e6ecf04` (chore), `f4f49d1` (chore)

**Plan metadata:** pending (orchestrator owns STATE/ROADMAP updates)

## Files Created/Modified
- `packages/backend/drizzle.config.ts` - Drizzle Kit configuration with SQLite dialect
- `packages/backend/src/db/index.ts` - Database connection via drizzle-orm/bun-sqlite
- `packages/backend/src/db/schema/index.ts` - Barrel export for all schema modules
- `packages/backend/src/db/schema/users.ts` - Users table with 13 columns and 3 indexes
- `packages/backend/src/db/schema/sessions.ts` - Sessions table with 5 columns and 2 indexes
- `packages/backend/.gitignore` - Exclude node_modules, dist, data/ from git
- `packages/backend/package.json` - Added better-sqlite3 dev dependency

## Decisions Made
- Used `drizzle-orm/bun-sqlite` for runtime DB connection (Bun-native driver)
- Added `better-sqlite3` as dev dependency for `drizzle-kit push` CLI (drizzle-kit requires standard SQLite driver)
- Schema path pattern `./src/db/schema/*.ts` with barrel `index.ts` for clean imports
- `data/` directory for SQLite database file, excluded from version control

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Install better-sqlite3 for drizzle-kit**
- **Found during:** Task 02-04 (Push Database Schema)
- **Issue:** `drizzle-kit push` failed with "Please install either 'better-sqlite3' or '@libsql/client'"
- **Fix:** Installed `better-sqlite3` as dev dependency (`bun add -d better-sqlite3`)
- **Files modified:** `packages/backend/package.json`
- **Verification:** `drizzle-kit push` succeeds, database created
- **Committed in:** `f4f49d1`

**2. [Rule 3 - Blocking] Create data/ directory for SQLite file**
- **Found during:** Task 02-04 (Push Database Schema)
- **Issue:** `TypeError: Cannot open database because the directory does not exist`
- **Fix:** Created `packages/backend/data/` directory
- **Files modified:** None (directory only, excluded via .gitignore)
- **Verification:** `drizzle-kit push` succeeds, `./data/gesp.db` file created

**3. [Rule 2 - Missing Critical] Add .gitignore for backend package**
- **Found during:** Task 02-04 (Push Database Schema)
- **Issue:** No .gitignore — node_modules/, data/, .turbo/ would show as untracked
- **Fix:** Created `packages/backend/.gitignore` excluding node_modules, dist, data, IDE, turbo cache
- **Files modified:** `packages/backend/.gitignore` (new)
- **Verification:** `git status` shows clean working tree
- **Committed in:** `e6ecf04`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing critical)
**Impact on plan:** All auto-fixes necessary for task completion. No scope creep.

## Issues Encountered
- SQLite UNIQUE constraint appears as separate CREATE UNIQUE INDEX rather than inline — this is Drizzle's standard SQLite output format, functionally equivalent. No action needed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Database schema fully applied and verified
- DB connection (`src/db/index.ts`) ready for use by auth services (01-03)
- Schema exports available via barrel import (`src/db/schema`)
- Ready for auth service implementation (password utilities, session middleware)

---
*Phase: 01-基础设施与认证*
*Completed: 2026-04-23*

## Self-Check: PASSED

- ✅ `packages/backend/drizzle.config.ts` exists
- ✅ `packages/backend/src/db/index.ts` exists
- ✅ `packages/backend/src/db/schema/users.ts` exists
- ✅ `packages/backend/src/db/schema/sessions.ts` exists
- ✅ `packages/backend/src/db/schema/index.ts` exists
- ✅ `packages/backend/.gitignore` exists
- ✅ Commit `1410d08` found: feat(01-02): create drizzle configuration
- ✅ Commit `f614239` found: feat(01-02): create users table schema
- ✅ Commit `11db604` found: feat(01-02): create sessions table schema
- ✅ Commit `e6ecf04` found: chore(01-02): add .gitignore
- ✅ Commit `f4f49d1` found: chore(01-02): add better-sqlite3
- ✅ `bun run typecheck` passes (2/2 tasks successful)
- ✅ `./data/gesp.db` exists with sessions and users tables
