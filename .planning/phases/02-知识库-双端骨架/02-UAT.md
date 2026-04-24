---
status: complete
phase: 02-知识库-双端骨架
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md]
started: 2026-04-24T14:12:39Z
updated: 2026-04-24T14:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running backend/frontend. Start `bun run dev`. Both backend and frontend start without errors.
result: pass
diagnosis: Backend (Hono) on port 3000, Frontend (NextJS) on port 3001. Turborepo boots cleanly. Schema push + seed completes.

### 2. Login Page with Role Selection
expected: Navigate to /login. Page displays 3 role cards with proper shadcn/ui styling.
result: issue
reported: "login 页面能打开, 页面太难看, 几乎无样式"
severity: cosmetic
diagnosis: Tailwind CSS and shadcn/ui styles not rendering correctly.

### 2b. Test Account Availability
expected: Student and teacher accounts exist for testing login flow. Registration button available.
result: blocked
blocked_by: test_account
reason: "无学员和教员账号可以登录验证, 无注册按钮, 无法验证"

### 3. Admin Login and Redirect (CR-01 Fix)
expected: Admin login redirects to accessible dashboard.
result: issue
reported: "root(admin)可以登录, 但 dashboard 界面 404"
severity: blocker
diagnosis: NextJS Route Group `(admin)` does NOT appear in URL. Redirect to `/admin/dashboard` → 404. Actual path is `/dashboard`.

### 4. Student Login and Dashboard
expected: Student login redirects to student dashboard with feature cards.
result: blocked
blocked_by: test_account
reason: No student account available.

### 5. Admin Dashboard
expected: Admin dashboard shows stat cards, sidebar, placeholder sections.
result: blocked
blocked_by: navigation
reason: Blocked by Test 3 - 404 redirect issue prevents access.

### 6. Knowledge Base Seed Pipeline
expected: Seed pipeline completes without errors, populating LanceDB tables with knowledge points.
result: issue
severity: major
diagnosis: |
  **Bug 1:** Seed script checks `data/` directory (contains gesp.db) instead of `data/gesp.lance` — falsely reports "already exists".
  **Bug 2:** `resolveWorkspacePath` uses 4 levels of `..` from `packages/backend/src/seed/` which only reaches gesp project root, not workspace root (needs 5 levels). Missing 3 of 4 seed data files.
  **Verified:** All seed JSON files exist in workspace `docs/products/gesp/seed/`. Only `knowledge-points-gesp-cpp-1-8.json` is in the backend package and works.

### 7. Knowledge API - List Points (WR-01 Fix)
expected: GET /api/admin/knowledge/points returns paginated results. Level/block filters work.
result: pass
diagnosis: Automated test verified — list returns 200 with data array, level=3 filter returns 200, block=基础语法 filter returns 200. Items have id, point, level fields.

### 8. Knowledge API - CRUD Operations
expected: Can POST create, GET by id, PUT update, DELETE knowledge points.
result: issue
severity: major
diagnosis: |
  **CREATE (201):** ✅ Works — creates point with auto-generated UUID and mock embedding.
  **GET by id:** ✅ Works immediately after create.
  **PUT update:** ❌ 500 — `Record not found` error. Root cause: LanceDB table cache returns stale table instance after delete+re-insert pattern, or getById fails to find newly inserted records across different table connections.
  **DELETE:** ✅ Works.
  **Student search:** ✅ Works — capped at 5 results.

### 9. Middleware Auth Gate (CR-02 Fix)
expected: Unauthenticated/invalid session requests return 401. Backend unreachable → fail-closed.
result: pass
diagnosis: Automated test verified — no session → 401, invalid session → 401. Fail-closed confirmed.

### 10. Admin Knowledge Points UI
expected: DataTable with columns, filters, detail sheet, create/delete.
result: blocked
blocked_by: navigation
reason: Blocked by Test 3 - Route Group 404 prevents access to /admin/* pages.

### 11. Knowledge Detail Sheet Editing State (WR-04 Fix)
expected: Sheet resets to view mode when reopened.
result: blocked
blocked_by: navigation
reason: Blocked by Test 3 - cannot access UI to test.

### 12. LanceDB ID Sanitization (CR-03 Fix)
expected: Invalid UUID format IDs are rejected for getById, update, delete.
result: pass
diagnosis: Automated test verified — GET/PUT/DELETE with "not-a-uuid" all rejected (500 with error, not 200).

### 13. Student Knowledge Search
expected: Student search endpoint returns results capped at 5.
result: pass
diagnosis: Automated test verified — admin session can access student search, returns ≤5 results.

## Summary

total: 13
passed: 4
issues: 4
pending: 0
skipped: 0
blocked: 5

## Gaps

```yaml
- truth: "Login page displays with proper shadcn/ui styling"
  status: failed
  reason: "User reported: login 页面能打开, 页面太难看, 几乎无样式"
  severity: cosmetic
  test: 2
  artifacts:
    - "apps/web/src/app/globals.css"
    - "apps/web/src/app/layout.tsx"
  missing: []
  root_cause: "Tailwind/shadcn styles not rendering - need investigation"

- truth: "Admin login redirects to accessible dashboard at /admin/dashboard"
  status: failed
  reason: "User reported: root(admin)可以登录, 但 dashboard 界面 404"
  severity: blocker
  test: 3
  artifacts:
    - "apps/web/src/app/(admin)/dashboard/page.tsx"
    - "apps/web/src/app/(student)/dashboard/page.tsx"
    - "apps/web/src/app/login/actions.ts"
    - "apps/web/src/middleware.ts"
  missing: []
  root_cause: "NextJS Route Group `(admin)` does NOT appear in URL. Redirect to `/admin/dashboard` → 404. Middleware checks `/admin/*` → never matches."
  fix_recommendation: "Remove Route Groups, restructure to flat `/admin/dashboard/page.tsx` and `/student/dashboard/page.tsx`"

- truth: "Seed pipeline populates all 4 LanceDB tables from workspace seed data"
  status: failed
  reason: "3 of 4 seed data files not found (practice/exam/lesson). Path resolution off by one directory level."
  severity: major
  test: 6
  artifacts:
    - "packages/backend/src/seed/knowledge.seed.ts:39-42"
    - "packages/backend/src/seed/knowledge.seed.ts:305"
  missing:
    - "docs/products/gesp/seed/practice-cpp-l1.json (exists but path resolution incorrect)"
    - "docs/products/gesp/seed/exam-cpp-l1-2026-03.json (exists but path resolution incorrect)"
    - "docs/products/gesp/seed/lesson-cpp-g3-05.json (exists but path resolution incorrect)"
  root_cause: "resolveWorkspacePath uses 4 `..` from packages/backend/src/seed/ = gesp project root, needs 5 `..` for workspace root. Also, seed existence check uses data/ dir instead of gesp.lance file."

- truth: "Knowledge API PUT update returns success"
  status: failed
  reason: "PUT /points/:id returns 500 - Record not found after create"
  severity: major
  test: 8
  artifacts:
    - "packages/backend/src/services/knowledge-base.ts:98-130"
    - "packages/backend/src/services/vector-store.ts:225-232"
  missing: []
  root_cause: "LanceDB getById fails to find recently created record. Possibly a table cache issue where delete+re-insert pattern invalidates cached table reference, or LanceDB connection state inconsistency between requests."
```
