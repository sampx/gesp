---
phase: 02-知识库-双端骨架
plan: "04"
subsystem: auth, ui
tags: [nextjs, middleware, server-actions, shadcn-ui, session-cookie, role-based-access]

# Dependency graph
requires:
  - phase: 02-知识库-双端骨架
    provides: "NextJS web app with shadcn/ui components (Plan 01), backend auth API from Phase 1"
provides:
  - "Login page with 3-role selection (学员/教员/管理员)"
  - "Server action for auth with session cookie forwarding"
  - "NextJS middleware for auth gate on /student/* and /admin/*"
  - "API proxy via next.config.ts rewrites"
  - "403 forbidden page"
affects: [03-测评系统, 04-教学系统, 05-练习系统, 06-仪表板, 07-管理端]

# Tech tracking
tech-stack:
  added: []
  patterns: [server-actions-auth, middleware-session-validation, api-proxy-rewrites]

key-files:
  created:
    - apps/web/src/app/login/page.tsx
    - apps/web/src/app/login/actions.ts
    - apps/web/src/components/role-card.tsx
    - apps/web/src/middleware.ts
    - apps/web/src/app/403/page.tsx
    - apps/web/.env.local
  modified:
    - apps/web/src/app/layout.tsx
    - apps/web/next.config.ts
    - apps/web/tsconfig.json

key-decisions:
  - "Login uses server action pattern — credentials handled server-side, cookie set via cookies() API"
  - "Teacher role maps to ROLE.ADMIN (10) in backend — UI label distinction only"
  - "API proxy via next.config.ts rewrites avoids CORS issues between NextJS and backend"
  - "Middleware validates session via fetch to /api/auth/me on each protected route"

patterns-established:
  - "Server action auth: form action → server action → fetch backend → extract Set-Cookie → cookies().set()"
  - "Middleware auth gate: check cookie → validate via API → role-based route access"
  - "Generic error messages: '用户名或密码错误' on all failure modes to prevent user enumeration"

requirements-completed: [UI-SKEL-01, UI-SKEL-02]

# Metrics
duration: 4min
completed: 2026-04-24
---

# Phase 02 Plan 04: Login Page + Auth Middleware Summary

**Login page with 3-role card selection and NextJS middleware for session-based auth gate with role-based route protection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-24T11:13:37Z
- **Completed:** 2026-04-24T11:18:14Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Login page at /login with 学员🎮/教员📚/管理员⚙️ role card selection + credential form
- Server action authenticates against backend, forwards session cookie, redirects by role
- NextJS middleware protects /student/* and /admin/* routes with session validation
- API proxy in next.config.ts forwards /api/* to backend, avoiding CORS issues
- 403 forbidden page for unauthorized access attempts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create role card component + login page with server action** - `3057597` (feat)
2. **Task 2: Create NextJS middleware for auth gate** - `f849dc8` (feat)

## Files Created/Modified
- `apps/web/src/app/login/page.tsx` - Login page with role selection cards + credential form
- `apps/web/src/app/login/actions.ts` - Server action for auth with session cookie forwarding
- `apps/web/src/components/role-card.tsx` - Reusable role selection card component
- `apps/web/src/middleware.ts` - NextJS middleware for auth gate and role-based access
- `apps/web/next.config.ts` - Added API proxy rewrites for /api/* → backend
- `apps/web/src/app/403/page.tsx` - Forbidden page for unauthorized access
- `apps/web/.env.local` - BACKEND_URL default config
- `apps/web/src/app/layout.tsx` - Added Toaster component for toast notifications
- `apps/web/tsconfig.json` - Added @gesp/shared path alias

## Decisions Made
- Login uses server action pattern (not client-side fetch) — credentials never exposed to client JS, cookie set server-side via cookies() API
- Teacher role maps to ROLE.ADMIN (10) in backend — only a UI label distinction, same permissions
- API proxy via next.config.ts rewrites is cleaner than handling CORS — frontend calls /api/* which proxies to backend
- Middleware uses degraded mode on network errors (allows request through) rather than blocking all access

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed @gesp/shared import resolution**
- **Found during:** Task 1 (login action creation)
- **Issue:** Plan specified `import { ROLE } from "@gesp/shared/constants/role"` but shared package only exports `"."` (main index)
- **Fix:** Changed import to `import { ROLE } from "@gesp/shared"` and added paths alias in tsconfig.json (`"@gesp/shared": ["../../packages/shared/src"]`)
- **Files modified:** apps/web/src/app/login/actions.ts, apps/web/tsconfig.json
- **Verification:** TypeScript compilation passes with zero errors

**2. [Rule 2 - Missing Critical] Added Toaster to root layout**
- **Found during:** Task 1 (login page uses toast.error for error feedback)
- **Issue:** Toaster component not mounted in layout — toast notifications wouldn't render
- **Fix:** Added `import { Toaster } from "@/components/ui/sonner"` and `<Toaster />` to root layout
- **Files modified:** apps/web/src/app/layout.tsx

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None - TypeScript compilation clean after fixes applied

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Auth flow complete: login → session cookie → middleware validation → role-based redirect
- Ready for Phase 3-5 feature pages that will sit behind the auth gate
- API proxy configured, all /api/* calls route to backend transparently
- Toaster available globally for feedback across all pages

---
*Phase: 02-知识库-双端骨架*
*Completed: 2026-04-24*

## Self-Check: PASSED

All 6 created files verified present. Both task commits (3057597, f849dc8) verified in git history.
