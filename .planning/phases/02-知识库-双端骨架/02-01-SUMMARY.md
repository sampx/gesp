---
phase: 02-知识库-双端骨架
plan: 01
subsystem: ui, infra
tags: [nextjs, tailwind-v4, shadcn, monorepo, turborepo, dual-theme]

# Dependency graph
requires:
  - phase: 01.1
    provides: Backend API with auth, existing packages/backend and packages/shared
provides:
  - NextJS 15 app in apps/web/ with Tailwind v4 + shadcn/ui
  - packages/ui shared component package (placeholder)
  - Dual CSS variable themes (student warm / admin cool)
  - Route group layouts for (student) and (admin)
  - Turborepo pipeline with apps/* + packages/* workspaces
affects: [02-02, 02-03, 02-04, 02-05, "all frontend phases"]

# Tech tracking
tech-stack:
  added: [nextjs@15, tailwindcss@4, shadcn@4, tw-animate-css, lucide-react, class-variance-authority, tailwind-merge, clsx, sonner, @tailwindcss/postcss]
  patterns: [data-theme CSS variable switching, @theme inline for Tailwind v4, route groups for layout isolation]

key-files:
  created:
    - apps/web/package.json
    - apps/web/src/app/globals.css
    - apps/web/src/app/layout.tsx
    - apps/web/src/app/page.tsx
    - apps/web/src/app/(student)/layout.tsx
    - apps/web/src/app/(admin)/layout.tsx
    - apps/web/src/components/admin-sidebar.tsx
    - apps/web/src/lib/utils.ts
    - apps/web/components.json
    - apps/web/src/components/ui/*.tsx (18 components)
    - packages/ui/package.json
    - packages/ui/src/index.ts
  modified:
    - package.json (workspaces: apps/* + packages/*)
    - turbo.json (added .next/** to build outputs)

key-decisions:
  - "Upgraded Tailwind v3 to v4 for shadcn v4 compatibility"
  - "Used @theme inline CSS config instead of tailwind.config.ts for Tailwind v4"
  - "Removed conflicting page.tsx from route groups (URL-transparent)"
  - "Dual themes use oklch color space with data-theme attribute selector"

patterns-established:
  - "Dual theme pattern: data-theme attribute on layout wrapper + CSS variables in globals.css"
  - "Route group pattern: (student) and (admin) for layout isolation"
  - "AdminSidebar: collapsible sidebar with active state detection"
  - "Monorepo layout: apps/web/ + packages/{backend,shared,ui}"

requirements-completed: []

# Metrics
duration: 14min
completed: 2026-04-24
---

# Phase 02 Plan 01: Monorepo Frontend Skeleton Summary

**NextJS 15 + Tailwind v4 + shadcn/ui monorepo with dual-theme CSS variables (student warm/admin cool), 18 UI components, and Turborepo pipeline**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-24T10:43:36Z
- **Completed:** 2026-04-24T10:58:31Z
- **Tasks:** 4
- **Files modified:** 30+

## Accomplishments
- Established apps/web/ (NextJS 15) + packages/ui/ monorepo structure with Bun workspaces
- Installed 18 shadcn/ui components for student and admin interfaces
- Created dual CSS variable themes: student (warm amber, rounded) and admin (cool indigo, sharp)
- Built (student) and (admin) route group layouts with AdminSidebar component
- Verified Turborepo dev pipeline works for both backend and web

## Task Commits

Each task was committed atomically:

1. **Task 1: Create apps/web/ and packages/ui/ with monorepo wiring** - `7f8c5a4` (feat)
2. **Task 2: Initialize shadcn/ui components in apps/web/** - `6fbbcb7` (feat)
3. **Task 3: Create (student) and (admin) route group layouts** - `5bc2202` (feat)
4. **Task 4: Verify Turbo dev pipeline + generated file updates** - `e694e35` (chore)

## Files Created/Modified
- `package.json` - Root workspace config with apps/* + packages/*, dev:web/dev:backend scripts
- `turbo.json` - Added .next/** to build outputs
- `apps/web/package.json` - NextJS 15 + Tailwind v4 + shadcn deps
- `apps/web/src/app/globals.css` - Dual themes in oklch + Tailwind v4 @theme inline config
- `apps/web/src/app/layout.tsx` - Root layout with Inter + Geist fonts
- `apps/web/src/app/(student)/layout.tsx` - Student layout with data-theme="student"
- `apps/web/src/app/(admin)/layout.tsx` - Admin layout with AdminSidebar
- `apps/web/src/components/admin-sidebar.tsx` - Collapsible admin sidebar with 5 nav items
- `apps/web/src/components/ui/*.tsx` - 18 shadcn components (button, card, dialog, etc.)
- `apps/web/src/lib/utils.ts` - cn() utility with clsx + tailwind-merge
- `apps/web/components.json` - shadcn config (base-nova style)
- `packages/ui/package.json` - Shared UI package placeholder
- `packages/ui/src/index.ts` - Empty re-export placeholder

## Decisions Made
- **Tailwind v4 upgrade:** shadcn v4 requires Tailwind v4 CSS-first config; upgraded from v3.4.17 to v4.2.4 for compatibility
- **@theme inline approach:** Used Tailwind v4's `@theme inline` directive in globals.css instead of tailwind.config.ts
- **oklch color space:** Dual themes use oklch for modern color representation, matching shadcn v4 defaults
- **Route groups without page.tsx:** Removed conflicting page.tsx from (student) and (admin) route groups since they're URL-transparent and conflict with root page.tsx
- **18 components (no toast):** shadcn v4 removed toast in favor of sonner; installed 18 components instead of 19

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Upgraded Tailwind v3 to v4 for shadcn v4 compatibility**
- **Found during:** Task 2 (shadcn/ui init)
- **Issue:** shadcn v4 (installed as latest) generates Tailwind v4 CSS (`@import "shadcn/tailwind.css"`, `@theme inline`) incompatible with Tailwind v3
- **Fix:** Upgraded tailwindcss from ^3.4.17 to ^4.0.0, replaced postcss config with @tailwindcss/postcss, removed tailwind.config.ts, rewrote globals.css with @theme inline
- **Files modified:** apps/web/package.json, apps/web/postcss.config.mjs, apps/web/src/app/globals.css
- **Verification:** `bun run build` passes successfully
- **Committed in:** 6fbbcb7 (Task 2 commit)

**2. [Rule 1 - Bug] Removed conflicting page.tsx from route groups**
- **Found during:** Task 3 (route group layouts)
- **Issue:** (student)/page.tsx and (admin)/page.tsx both resolve to `/` path, conflicting with each other and root page.tsx
- **Fix:** Removed both route group page.tsx files; actual student/admin routes will be nested deeper
- **Files modified:** apps/web/src/app/(student)/page.tsx (deleted), apps/web/src/app/(admin)/page.tsx (deleted)
- **Verification:** `bun run build` passes
- **Committed in:** 5bc2202 (Task 3 commit)

**3. [Rule 3 - Blocking] Fixed invalid `@import "shadcn/tailwind.css"` reference**
- **Found during:** Task 2 (build verification)
- **Issue:** shadcn CLI is not a CSS module; `@import "shadcn/tailwind.css"` resolves to nothing
- **Fix:** Removed the import, used `@theme inline` directive to register CSS variables as Tailwind utilities
- **Files modified:** apps/web/src/app/globals.css
- **Verification:** `bun run build` passes
- **Committed in:** 6fbbcb7 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All auto-fixes necessary for build success. No scope creep.

## Issues Encountered
- `shadcn form` component not available in shadcn v4 registry — deferred to when needed
- `toast` component replaced by `sonner` in shadcn v4 — used sonner instead

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Monorepo frontend skeleton ready for knowledge base backend (02-02) and student/admin page development
- `bun run dev` starts both backend and web via Turborepo
- shadcn components available for immediate use in page development
- Dual themes functional — student warm amber, admin cool indigo

---
*Phase: 02-知识库-双端骨架*
*Completed: 2026-04-24*
