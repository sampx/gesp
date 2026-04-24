---
phase: 02-知识库-双端骨架
fixed_at: 2026-04-24T14:05:23Z
review_path: .planning/phases/02-知识库-双端骨架/02-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-04-24T14:05:23Z
**Source review:** .planning/phases/02-知识库-双端骨架/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9
- Fixed: 9
- Skipped: 0

## Fixed Issues

### CR-01: Login redirect error swallowed by catch block

**Files modified:** `apps/web/src/app/login/actions.ts`
**Commit:** c528f67
**Applied fix:** Moved `redirect()` call outside the `try/catch` block. The redirect path is now computed inside `try` via a `redirectPath` variable, and `redirect(redirectPath)` is called after the `catch`. This prevents the `NEXT_REDIRECT` error from being caught.

### CR-02: Middleware grants full access on backend network failure

**Files modified:** `apps/web/src/middleware.ts`
**Commit:** d9ba1ce
**Applied fix:** Changed the `catch` block from `NextResponse.next()` (fail-open) to `NextResponse.redirect("/login")` with session cookie deletion (fail-closed). Unauthenticated users are no longer granted access when the backend is unreachable.

### CR-03: Unsanitized string interpolation in LanceDB filter expressions

**Files modified:** `packages/backend/src/services/vector-store.ts`
**Commit:** d74f699
**Applied fix:** Added `sanitizeId()` function that validates IDs against a UUID regex before interpolation into LanceDB `where()`/`delete()` filter expressions. Applied in `getById()`, `update()`, and `delete()` methods.

### WR-01: Frontend filter parameters silently ignored by backend

**Files modified:** `packages/backend/src/routes/knowledge.ts`
**Commit:** a94d5ad
**Applied fix:** Extended `paginationSchema` with `listPointsSchema` that accepts optional `level` (1-8) and `block` (string) query params. The `/points` GET handler now builds a LanceDB filter string from these params and passes it to `kb.list()`. Block values are escaped for single quotes.

### WR-02: Login cookie sameSite setting mismatches security requirement

**Files modified:** `apps/web/src/app/login/actions.ts`
**Commit:** 4f3a617
**Applied fix:** Changed `sameSite: "lax"` to `sameSite: "strict"` to match the project's documented security requirement in AGENTS.md.

### WR-03: Dead code — roleMap never used in login action

**Files modified:** `apps/web/src/app/login/actions.ts`
**Commit:** c2fd29b
**Applied fix:** Removed unused `role` variable and `roleMap` constant from `loginAction`. The redirect logic already uses the backend-returned role directly.

### WR-04: KnowledgeDetailSheet editing state not reset between openings

**Files modified:** `apps/web/src/components/knowledge-detail-sheet.tsx`
**Commit:** de4b6ff
**Applied fix:** Added `useEffect` hook that resets `editing` state when `mode` or `open` props change. Also added `useEffect` to the React import. The editing state now correctly resets to `false` for "view" mode when the sheet is reopened.

### WR-05: Seed script uses console.log instead of project logger

**Files modified:** `packages/backend/src/seed/knowledge.seed.ts`
**Commit:** 86c658b
**Applied fix:** Imported `logger` from `../utils/logger` and replaced all `console.log()` calls with `logger.info()` (structured logging with context objects) and `console.error()` with `logger.error()`. Follows the project's pino logging convention with snake_case field names.

### WR-06: Non-null assertion on selectedPoint without guard

**Files modified:** `apps/web/src/app/(admin)/knowledge/points/page.tsx`
**Commit:** e8083e2
**Applied fix:** Replaced `selectedPoint!.id` non-null assertion with an `else if (selectedPoint)` guard. The update now only executes when `selectedPoint` is confirmed non-null, preventing potential runtime errors from inconsistent state.

---

_Fixed: 2026-04-24T14:05:23Z_
_Fixer: the agent (wsf-code-fixer)_
_Iteration: 1_
