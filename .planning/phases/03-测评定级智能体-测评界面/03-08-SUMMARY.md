---
phase: 03-测评定级智能体-测评界面
plan: 08
subsystem: backend
tags: [assessment, session-history, delete, SSE, question-ready, assessment-done, fallback, timing]

requires:
  - phase: 03
    plan: 07
    provides: progress tracking, answer scoring, completion contract
provides:
  - Session history list API (GET /sessions)
  - Session delete API (DELETE /sessions/:sessionId) with ownership guard
  - question_ready SSE event (manual + auto-select paths)
  - assessment_done SSE event (evaluation + round convergence paths)
  - 10s auto-select fallback (restored from 30s per D-13)
affects: [03-09, 03-10]

tech-stack:
  added: []
  patterns: [ownership-safe delete, SSE system events, dual completion paths]

key-files:
  created:
    - packages/backend/src/__tests__/assessment-session-history.test.ts
  modified:
    - packages/backend/src/services/assessment.ts
    - packages/backend/src/routes/assessment.ts
    - packages/backend/src/services/chat-projector.ts

key-decisions:
  - "Session delete cleans up projector + auto-select timer in route layer"
  - "question_ready emitted after lockQuestion in both /select and auto-select fallback"
  - "assessment_done emitted in /evaluate and /submit round-convergence paths"
  - "D-13 fallback restored to 10s (from 30s drift)"

requirements-completed: [ASSESS-01, ASSESS-05, UI-ASSESS-01]

duration: 5.2min
completed: 2026-05-09
---

# Phase 03 Plan 08: Session History + Question Ready Events Summary

**Session list/delete APIs with ownership guard, SSE readiness events, and restored 10s fallback timing**

## Performance

- **Duration:** 5.2 min (312 seconds)
- **Started:** 2026-05-09T18:56:29Z
- **Completed:** 2026-05-09T11:03:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Students can view their assessment history (newest-first) and resume via token
- Students can delete their sessions with ownership verification + projector/timer cleanup
- Frontend receives explicit question_ready signal (no blind polling)
- Frontend receives assessment_done signal when session terminates
- Auto-select fallback restored to 10s (D-13 compliance)

## Task Commits

Each task was committed atomically:

1. **Task 1: Session history + delete** - `b3d7275` (feat) — listStudentSessions, deleteStudentSession, GET /sessions, DELETE /sessions/:sessionId, 5 TDD tests
2. **Task 2: SSE events + 10s fallback** - `c3da040` (feat) — NormalizedEvent extension, emitQuestionReady/emitAssessmentDone methods, /select + auto-select emit, /evaluate + /submit emit, 10s timer, 15s /start wait

**Plan metadata:** Pending final commit

## Files Created/Modified

- `packages/backend/src/__tests__/assessment-session-history.test.ts` — 5 tests covering list (newest-first, all fields), delete (ownership, cleanup), cross-student guard
- `packages/backend/src/services/assessment.ts` — Added listStudentSessions(), deleteStudentSession() with ownership check
- `packages/backend/src/routes/assessment.ts` — Added GET /sessions, DELETE /sessions/:sessionId; updated auto-select timer to 10s; added emitQuestionReady/emitAssessmentDone calls; reduced /start wait to 15s
- `packages/backend/src/services/chat-projector.ts` — Extended NormalizedEvent with question_ready/assessment_done; added emit methods to projector and store

## Decisions Made

- **Delete cleanup in route**: projector.destroy() + clearAutoSelectTimer() called in route handler, not service (separation of concerns)
- **Dual question_ready paths**: Manual /select and auto-select fallback both emit same event (frontend cannot distinguish)
- **Dual assessment_done paths**: /evaluate (agent termination) and /submit round-convergence both emit (covers all completion triggers)
- **10s fallback restored**: D-13 original spec was 10s, drifted to 30s — restored for responsive UX

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functionality fully wired.

## Threat Surface

| Flag | File | Description |
|------|------|-------------|
| threat_flag: session_visibility | routes/assessment.ts | GET /sessions scoped by StudentAuth, returns only caller's sessions (T-03-08-01 mitigated) |
| threat_flag: delete_ownership | routes/assessment.ts | DELETE /sessions/:sessionId verifies student_id match before deletion (T-03-08-02 mitigated) |
| threat_flag: event_authenticity | services/chat-projector.ts | System events emitted only from definitive state transitions (lock, completeSession) (T-03-08-03 mitigated) |
| threat_flag: timer_drift | routes/assessment.ts | 10s fallback prevents 30s stalls (T-03-08-04 mitigated) |

## Verification Evidence

- Tests: 5 pass, 0 fail, 24 expect() calls
- Typecheck: `bun run typecheck` passes
- `grep '"/sessions"\|question_ready\|assessment_done'` — all present

## Next Phase Readiness

- Session continuity complete: history list + resume token + delete
- SSE readiness contract ready for frontend integration
- 10s timing restored for responsive question selection
- Ready for Plan 03-09 (frontend session history UI) and Plan 03-10 (question ready button state)

## Self-Check: PASSED

- ✅ packages/backend/src/__tests__/assessment-session-history.test.ts
- ✅ packages/backend/src/services/assessment.ts
- ✅ packages/backend/src/routes/assessment.ts
- ✅ packages/backend/src/services/chat-projector.ts
- ✅ Commit b3d7275 (Task 1)
- ✅ Commit c3da040 (Task 2)

---
*Phase: 03-测评定级智能体-测评界面*
*Plan: 08*
*Completed: 2026-05-09*