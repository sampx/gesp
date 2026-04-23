---
phase: 01-基础设施与认证
plan: 01
subsystem: infra
tags: [monorepo, turborepo, bun-workspaces, hono, shared-types, typescript]

# Dependency graph
requires: []
provides:
  - Root monorepo structure with Bun workspaces and Turborepo pipeline
  - @gesp/shared package with User type, ApiResponse, ROLE and USER_STATUS constants
  - @gesp/backend package with Hono skeleton and OpenAPI spec endpoint
affects: [01-02, 01-03, 01-04, 01-05, 02-*]

# Tech tracking
tech-stack:
  added: [turbo@^2.0.0, typescript@^5.5.0, hono@^4.0.0, hono-openapi@^0.4.0, drizzle-orm@^0.39.0, bcryptjs@^3.0.0, zod@^3.23.0, vitest@^2.0.0]
  patterns:
    - "Bun workspaces monorepo with packages/* glob"
    - "Turborepo v2 tasks config (not pipeline)"
    - "hono-openapi via openAPISpecs middleware (not OpenAPIHono class)"
    - "Direct TS source imports (no build step for internal packages)"

key-files:
  created:
    - package.json
    - turbo.json
    - packages/shared/package.json
    - packages/shared/tsconfig.json
    - packages/shared/src/index.ts
    - packages/shared/src/types/user.ts
    - packages/shared/src/types/response.ts
    - packages/shared/src/constants/role.ts
    - packages/shared/src/constants/status.ts
    - packages/backend/package.json
    - packages/backend/tsconfig.json
    - packages/backend/bunfig.toml
    - packages/backend/src/index.ts
  modified: []

key-decisions:
  - "Turborepo v2 uses 'tasks' key instead of 'pipeline' for config"
  - "hono-openapi API uses openAPISpecs middleware, not OpenAPIHono class — corrected during implementation"
  - "Direct TS source imports (./src/index.ts) for internal packages, no dist build step"

patterns-established:
  - "Monorepo: root package.json defines workspaces, turbo.json orchestrates builds"
  - "Shared types: @gesp/shared exports all types and constants via barrel index.ts"
  - "Backend entry: Hono app with openAPISpecs middleware for OpenAPI documentation"

requirements-completed: []

# Metrics
duration: ~25min
completed: 2026-04-23
---

# Phase 1 Plan 01: Backend + Shared Package Initialization Summary

**Monorepo initialized with Bun workspaces, Turborepo v2 pipeline, @gesp/shared types package, and @gesp/backend Hono skeleton with OpenAPI docs**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-23T09:42:41+08:00
- **Completed:** 2026-04-23T11:07:04+08:00
- **Tasks:** 3
- **Files created:** 13

## Accomplishments
- Root monorepo configured with Bun workspaces (`packages/*`) and Turborepo v2 build orchestration
- `@gesp/shared` package with User interface (13 fields), ApiResponse generic, ROLE/USER_STATUS constants
- `@gesp/backend` package with Hono web framework, hono-openapi spec endpoint at `/api/doc`, Drizzle ORM, bcryptjs, Zod

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Root Monorepo Configuration** - `33c5724` (feat)
2. **Task 2: Create Shared Package** - `ae95628` (feat)
3. **Task 3: Create Backend Package** - `2a94ada` (feat)
4. **Task 3 fix: Correct hono-openapi API usage** - `1971d2c` (fix)

## Files Created/Modified
- `package.json` - Root monorepo config with Bun workspaces, turbo scripts, bun@1.3.11
- `turbo.json` - Turborepo v2 pipeline: build (with ^build deps), dev (persistent), typecheck, test
- `packages/shared/package.json` - @gesp/shared v0.0.1, ES module, direct TS source exports
- `packages/shared/tsconfig.json` - ES2022 target, Bundler module resolution, strict mode
- `packages/shared/src/types/user.ts` - User interface with id, username, password_hash, display_name, role, status, OAuth IDs, timestamps
- `packages/shared/src/types/response.ts` - ApiResponse<T> generic interface
- `packages/shared/src/constants/role.ts` - ROLE enum (STUDENT=1, ADMIN=10, ROOT=100)
- `packages/shared/src/constants/status.ts` - USER_STATUS enum (ENABLED=1, DISABLED=2)
- `packages/shared/src/index.ts` - Barrel exports for all types and constants
- `packages/backend/package.json` - @gesp/backend v0.0.1 with Hono, hono-openapi, Drizzle ORM, bcryptjs, Zod
- `packages/backend/tsconfig.json` - ES2022, bun-types, @gesp/shared path alias
- `packages/backend/bunfig.toml` - Test preload configuration
- `packages/backend/src/index.ts` - Hono app with health endpoint and OpenAPI spec at /api/doc

## Decisions Made
- **Turborepo v2 syntax**: Plan specified `"pipeline"` key but Turborepo v2 uses `"tasks"` — implemented with correct v2 syntax
- **hono-openapi API**: Plan used `OpenAPIHono` class import but hono-openapi 0.4.x uses `openAPISpecs` middleware with `Hono` class — corrected via fix commit
- **No build step for shared**: Internal packages use direct TS source imports (`./src/index.ts`), no pre-build required

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected hono-openapi API usage**
- **Found during:** Task 3 (Create Backend Package)
- **Issue:** Plan specified `import { OpenAPIHono } from "hono-openapi"` and `app.doc("/api/doc", ...)` but hono-openapi 0.4.x does not export `OpenAPIHono` class. The correct API is `import { openAPISpecs } from "hono-openapi"` used as middleware on a standard `Hono` instance.
- **Fix:** Changed to `import { Hono } from "hono"` + `import { openAPISpecs } from "hono-openapi"`, using `app.use("/api/doc", openAPISpecs(app, { documentation: { ... } }))` middleware pattern.
- **Files modified:** `packages/backend/src/index.ts`
- **Verification:** File structure matches hono-openapi 0.4.x API documentation
- **Committed in:** `1971d2c` (fix commit)

---

**Total deviations:** 1 auto-fixed (1 bug — incorrect library API usage in plan)
**Impact on plan:** Minor. The fix aligns implementation with actual hono-openapi 0.4.x API. No scope creep.

## Issues Encountered
None — plan executed smoothly with one API correction.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Monorepo structure is ready for adding auth, database, and AI layer packages
- `@gesp/shared` provides User types and constants needed by auth (plan 01-02)
- `@gesp/backend` Hono skeleton is ready for route mounting (auth routes, admin routes, student routes)
- Bun workspaces and Turborepo pipeline are functional

---
*Phase: 01-基础设施与认证*
*Completed: 2026-04-23*

## Self-Check: PASSED

- All 11 key files exist on disk
- All 4 commit hashes (33c5724, ae95628, 2a94ada, 1971d2c) verified in git history
- SUMMARY.md created in correct phase directory
