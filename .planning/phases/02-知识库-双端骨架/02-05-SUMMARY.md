---
phase: 02-知识库-双端骨架
plan: 05
subsystem: ui
tags: [react-hook-form, zod, shadcn, base-ui, nextjs, data-table, crud]

requires:
  - phase: 02-03
    provides: Knowledge API endpoints (/api/admin/knowledge/points CRUD)
  - phase: 02-04
    provides: Auth middleware, NextJS proxy config, login page
  - phase: 02-01
    provides: Frontend skeleton with admin/student layouts and shadcn components

provides:
  - Admin knowledge points CRUD UI (DataTable + Sheet + Dialog)
  - use-knowledge-api hook for frontend-to-backend knowledge CRUD
  - Student dashboard with 3 feature entry cards
  - Admin dashboard with 4 stat cards
  - KnowledgeForm with Zod validation + react-hook-form

affects: [03-测评引擎, 06-仪表板整合, 07-管理端完整界面]

tech-stack:
  added: [react-hook-form, @hookform/resolvers, zod@4, react-markdown, @tanstack/react-table]
  patterns: [custom-hook-for-api-calls, zod-schema-form-validation, sheet-based-detail-view, feature-card-component]

key-files:
  created:
    - apps/web/src/components/knowledge-data-table.tsx
    - apps/web/src/components/knowledge-form.tsx
    - apps/web/src/components/knowledge-detail-sheet.tsx
    - apps/web/src/components/student-feature-card.tsx
    - apps/web/src/hooks/use-knowledge-api.ts
    - apps/web/src/app/(admin)/knowledge/points/page.tsx
    - apps/web/src/app/(student)/dashboard/page.tsx
    - apps/web/src/app/(admin)/dashboard/page.tsx
    - apps/web/src/components/ui/table.tsx
  modified:
    - apps/web/package.json

key-decisions:
  - "Built form with react-hook-form directly instead of shadcn Form wrapper (base-nova style doesn't include form component)"
  - "Used `as any` cast on zodResolver to bridge Zod 4 type mismatch with @hookform/resolvers"
  - "API hook uses simple custom hook pattern (not TanStack Query) for MVP simplicity"
  - "Select filter value 'all' maps to undefined (clear filter) in hook setFilters"
  - "Tags stored as comma-separated string in form, converted to array on API call"

patterns-established:
  - "use-knowledge-api pattern: custom hook with useCallback/useEffect for fetch-on-mount, toast feedback"
  - "KnowledgeDetailSheet: toggles between view/edit/create modes via state, no close/reopen"
  - "StudentFeatureCard: Link wrapper around Card with border-l-4 accent color"

requirements-completed: [KNOW-04, KNOW-05, UI-SKEL-01, UI-SKEL-02]

duration: 11min
completed: 2026-04-24
---

# Phase 02 Plan 05: Admin Knowledge CRUD UI + Student Dashboard Summary

**Admin knowledge CRUD interface with DataTable + Sheet + Zod form, student dashboard with feature cards, and admin dashboard with stat cards**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-24T11:20:55Z
- **Completed:** 2026-04-24T11:33:02Z
- **Tasks:** 5
- **Files modified:** 10

## Accomplishments
- Admin knowledge points management page with full CRUD: list, filter, view, create, edit, delete
- KnowledgeDataTable with 6 columns, level/block filter dropdowns, skeleton loading, pagination
- KnowledgeForm with react-hook-form + Zod 4 validation (point, level, block, mastery_verb, description, tags)
- KnowledgeDetailSheet toggling view/edit/create modes with inline form editing
- Student dashboard with 3 feature entry cards (测评/学习/练习) linking to future routes
- Admin dashboard with 4 stat cards and Phase 7 placeholder sections

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies** - `8fdfd79` (chore)
2. **Task 2: KnowledgeDataTable component** - `e15fdf8` (feat)
3. **Task 3: KnowledgeForm + KnowledgeDetailSheet** - `68f84c4` (feat)
4. **Task 4: use-knowledge-api hook + management page** - `822b51a` (feat)
5. **Task 5: Dashboard replacements** - `47ced68` (feat)

## Files Created/Modified
- `apps/web/package.json` - Added react-hook-form, @hookform/resolvers, zod, react-markdown, @tanstack/react-table
- `apps/web/src/components/ui/table.tsx` - shadcn Table component (added via CLI)
- `apps/web/src/components/knowledge-data-table.tsx` - DataTable with filters, pagination, actions
- `apps/web/src/components/knowledge-form.tsx` - Zod-validated form for knowledge point create/edit
- `apps/web/src/components/knowledge-detail-sheet.tsx` - Sheet with view/edit/create mode toggle
- `apps/web/src/hooks/use-knowledge-api.ts` - Custom hook for CRUD API calls with toast feedback
- `apps/web/src/app/(admin)/knowledge/points/page.tsx` - Admin knowledge management page
- `apps/web/src/components/student-feature-card.tsx` - Reusable feature card with accent border
- `apps/web/src/app/(student)/dashboard/page.tsx` - Student dashboard with 3 entry cards
- `apps/web/src/app/(admin)/dashboard/page.tsx` - Admin dashboard with 4 stat cards

## Decisions Made
- **Form without shadcn Form wrapper**: base-nova style doesn't include a Form component. Built form directly with react-hook-form + shadcn Input/Select/Textarea, which is cleaner and avoids a missing dependency.
- **Zod 4 type cast**: `@hookform/resolvers` v5 supports Zod 4 at runtime but TypeScript types don't align (`$ZodObjectDef` vs `Zod3Type`). Used `zodResolver(schema as any)` cast — runtime works correctly, type safety preserved through schema inference.
- **Simple custom hook over TanStack Query**: For MVP, a straightforward useState/useEffect/useCallback hook is sufficient. TanStack Query can be added later when caching/refetch complexity warrants it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted Select component API for @base-ui/react**
- **Found during:** Task 2 (KnowledgeDataTable)
- **Issue:** Plan template used Radix Select API (`onValueChange(value: string)`), but project uses `@base-ui/react` Select with `onValueChange(value: string | null, eventDetails)`
- **Fix:** Updated Props to accept `string | null`, used "all" as clear-filter value instead of empty string
- **Files modified:** knowledge-data-table.tsx

**2. [Rule 3 - Blocking] Built form without shadcn Form component**
- **Found during:** Task 3 (KnowledgeForm)
- **Issue:** shadcn `form` component doesn't exist in base-nova style. `bunx shadcn add form` silently failed.
- **Fix:** Built form with react-hook-form's `useForm` + `register`/`handleSubmit` directly, using Label/Input/Select/Textarea from existing shadcn components
- **Files modified:** knowledge-form.tsx

**3. [Rule 1 - Bug] Fixed Zod 4 + hookform resolver type mismatch**
- **Found during:** Task 3 (KnowledgeForm)
- **Issue:** Zod 4 `z.coerce.number()` and `.default()` produce input/output type divergence that confuses resolver types
- **Fix:** Simplified schema to use plain types (no coerce, no defaults), set defaults in useForm config instead
- **Files modified:** knowledge-form.tsx

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 blocking)
**Impact on plan:** All deviations necessary to work with actual project's @base-ui/react components and Zod 4. No scope creep.

## Issues Encountered
- Pre-existing backend typecheck errors in `packages/backend/src/routes/knowledge.ts` and `src/index.ts` from Plan 03 — not related to frontend changes, deferred.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Admin stat values "—" | `apps/web/src/app/(admin)/dashboard/page.tsx` | No backend API for stats yet; Phase 7 will wire real data |
| Student progress chart placeholder | `apps/web/src/app/(student)/dashboard/page.tsx` | Phase 6 content per plan |
| Admin stats/analytics placeholders | `apps/web/src/app/(admin)/dashboard/page.tsx` | Phase 7 content per plan |
| Block filter dropdown populated from current page data only | `knowledge-data-table.tsx` | Backend doesn't provide distinct block list; works for MVP |

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Knowledge CRUD UI is fully wired to backend API through NextJS proxy
- Student dashboard has entry cards linking to /student/assessment, /student/learning, /student/practice
- Admin dashboard has stat card placeholders ready for Phase 7 real data
- Next phase can build assessment/learning/practice pages and route them properly

## Self-Check: PASSED

All 9 created files verified present. All 5 task commits verified in git log.

---
*Phase: 02-知识库-双端骨架*
*Completed: 2026-04-24*
