---
phase: 03-测评定级智能体-测评界面
plan: "12"
subsystem: frontend-ui
tags: [gap-closure, ui-fix, select-label, state-reset, navigation]
dependency_graph:
  requires: [03-05]
  provides: [UI-ASSESS-01-fix]
  affects: [student-assessment-page, objective-question, student-navbar]
tech_stack:
  added: []
  patterns: [useEffect-state-reset, conditional-back-navigation]
key_files:
  created: []
  modified:
    - apps/web/src/app/student/assessment/page.tsx
    - apps/web/src/components/assessment/objective-question.tsx
    - apps/web/src/components/student-navbar.tsx
decisions:
  - Use useEffect to reset selected state on content change instead of key prop (per plan guidance)
  - Use explicit route target (/student/assessment) instead of router.back() for deterministic navigation
  - Show back button only on subroutes, not the assessment start page itself
metrics:
  duration: 5.3min
  completed: "2026-05-10"
---

# Phase 03 Plan 12: Gap Closure — Course Label, Objective Reset, Back Button Summary

Fixed 3 minor UI defects blocking UAT Test 2/4/10: course dropdown raw value display, stale objective selection state, and missing back navigation.

## Changes Made

### Task 1: Fix course label rendering and reset objective selection

**Files:** `apps/web/src/app/student/assessment/page.tsx`, `apps/web/src/components/assessment/objective-question.tsx`
**Commit:** 77cac78

- **Course label fix:** Replaced bare `<SelectValue />` with explicit label mapping `{courseId === "cpp" ? "C++ 编程" : courseId}` so the closed Select trigger shows the human-readable label instead of raw value "cpp".
- **Objective state reset:** Added `useEffect` watching `content` prop changes to call `setSelected("")` and `onAnswer("")`, ensuring internal selected state clears when a new objective question is rendered.

### Task 2: Add back button for assessment subpages

**File:** `apps/web/src/components/student-navbar.tsx`
**Commit:** 3a36473

- Added `ArrowLeft` icon import from lucide-react.
- Added `isAssessmentSubroute` regex check (`/^\/student\/assessment\/[^/]+/`) to detect detail/report pages.
- Rendered a compact back button (icon + "返回" label) before the brand title on assessment subroutes only.
- Back target is deterministic `/student/assessment`, not `router.back()`.

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `cd apps/web && bun run typecheck` — PASSED
- `grep "C++ 编程" apps/web/src/app/student/assessment/page.tsx` — FOUND (explicit label mapping)
- `grep "useEffect\|setSelected" apps/web/src/components/assessment/objective-question.tsx` — FOUND (reset logic)
- `grep "ArrowLeft\|/student/assessment" apps/web/src/components/student-navbar.tsx` — FOUND (back button)

## Self-Check: PASSED

- All 3 modified files exist on disk
- Both commits (77cac78, 3a36473) exist in git log
