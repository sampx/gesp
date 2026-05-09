---
phase: 03-测评定级智能体-测评界面
plan: 10
subsystem: frontend
tags: [assessment, progress, chat, header, SSE, prefetch, readiness, redirect]

requires:
  - phase: 03
    plan: 07
    provides: progress tracking API (ProgressData with 7 fields), answer scoring, completion contract
  - phase: 03
    plan: 08
    provides: question_ready/assessment_done SSE events, session history
provides:
  - Accurate progress bar display with time countdown and remaining counts
  - Header-based chat toggle (Bot icon left of user avatar)
  - Ready-gated next button with background prefetch
  - Reliable assessment_done redirect to report page
affects: [03-UAT]

tech-stack:
  added: []
  patterns: [SSE system event callbacks, context-based header toggle, prefetch before enable]

key-files:
  created:
    - apps/web/src/components/assessment/chat-panel-context.tsx
  modified:
    - apps/web/src/components/assessment/progress-bar.tsx
    - apps/web/src/app/student/assessment/[token]/page.tsx
    - apps/web/src/components/student-navbar.tsx
    - apps/web/src/components/assessment/chat-panel.tsx
    - apps/web/src/app/student/layout.tsx

key-decisions:
  - "Progress countdown uses client-side ticking derived from backend started_at + config_time_limit_min"
  - "ChatPanelContext provides shared open/unread state for header toggle and chat panel"
  - "question_ready triggers prefetch, Next button enabled only after prefetchedQuestion exists"
  - "assessment_done SSE event triggers DONE state + 1.5s delayed report redirect"

requirements-completed: [UI-ASSESS-01, ASSESS-04, ASSESS-05]

duration: 9.2min
completed: 2026-05-09
---

# Phase 03 Plan 10: Assessment UI Fixes Summary

**Accurate progress bar with time countdown, header chat toggle, ready-gated next button with prefetch, and reliable assessment_done redirect**

## Performance

- **Duration:** 9.2 min (550 seconds)
- **Started:** 2026-05-09T11:07:57Z
- **Completed:** 2026-05-09T11:17:07Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Progress bar now shows current question number, correct/answered, total limit, remaining questions, time countdown
- Fixed off-by-one bug in FEEDBACK state (showing just-answered question instead of next)
- Chat toggle moved to header (Bot icon beside user avatar) with shared context state
- Next button disabled until question_ready SSE event received and prefetch completes
- Clicking next swaps to prefetched question immediately (no skeleton delay)
- assessment_done SSE event triggers stable redirect to report page

## Task Commits

Each task was committed atomically:

1. **Task 1: Progress bar data model** - `a244751` (feat) — Expanded props, client-side countdown, fixed off-by-one, stopped optimistic increment
2. **Task 2: Header chat toggle** - `ed4de75` (feat) — Created ChatPanelContext, header Bot button, removed floating toggle
3. **Task 3: Ready-gated next button** - `ad4c449` (feat) — SSE event callbacks, prefetch on ready, disabled until ready, done redirect

**Plan metadata:** Pending final commit

## Files Created/Modified

- `apps/web/src/components/assessment/chat-panel-context.tsx` — Shared open/unread state provider + hook
- `apps/web/src/components/assessment/progress-bar.tsx` — Expanded display: question number, time countdown, remaining counts
- `apps/web/src/app/student/assessment/[token]/page.tsx` — Prefetch logic, ready-gated button, done redirect, progress state refactored
- `apps/web/src/components/student-navbar.tsx` — Bot icon button for assessment routes (left of avatar)
- `apps/web/src/components/assessment/chat-panel.tsx` — Removed floating toggle, uses context, SSE system event callbacks
- `apps/web/src/app/student/layout.tsx` — Wrapped in ChatPanelProvider

## Decisions Made

- **Client-side countdown**: Derived from backend `started_at` + `config_time_limit_min` with interval ticking, backend values as source of truth on refresh
- **ChatPanelContext pattern**: Provider at layout level enables header toggle and chat panel to share state without prop drilling
- **Prefetch strategy**: `question_ready` SSE event triggers background prefetch; Next button enabled only after prefetchedQuestion exists
- **Immediate swap**: Clicking next button swaps to prefetched question immediately, avoiding skeleton screen
- **Dual done paths**: SSE `assessment_done` event + backend `done:true` flag both trigger DONE state and report redirect

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functionality fully wired.

## Threat Surface

| Flag | File | Description |
|------|------|-------------|
| threat_flag: button_enablement | page.tsx | Next button enabled only after successful prefetched response tied to authenticated token (T-03-10-01 mitigated) |
| threat_flag: done_redirect | page.tsx | assessment_done + backend done both trigger redirect; no ghost questions after termination (T-03-10-02 mitigated) |

## Verification Evidence

- Typecheck: `bun run typecheck` passes
- `grep -n "question_ready\|assessment_done" chat-panel.tsx` — all present
- `grep -n "chat-panel-context" layout.tsx student-navbar.tsx` — all present

## Next Phase Readiness

- All 3 UI gaps closed: accurate progress, header chat, ready-gated button
- UAT tests 3, 4, 6 should now pass (progress display, next button behavior, done redirect)
- Ready for final UAT verification and milestone completion

## Self-Check: PASSED

- ✅ apps/web/src/components/assessment/chat-panel-context.tsx
- ✅ apps/web/src/components/assessment/progress-bar.tsx
- ✅ apps/web/src/app/student/assessment/[token]/page.tsx
- ✅ apps/web/src/components/student-navbar.tsx
- ✅ apps/web/src/components/assessment/chat-panel.tsx
- ✅ apps/web/src/app/student/layout.tsx
- ✅ Commit a244751 (Task 1)
- ✅ Commit ed4de75 (Task 2)
- ✅ Commit ad4c449 (Task 3)

---
*Phase: 03-测评定级智能体-测评界面*
*Plan: 10*
*Completed: 2026-05-09*