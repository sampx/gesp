---
status: diagnosed
trigger: "User reported: 界面可以显示历史测评记录，但有些记录无法继续测评，点击后显示: Invalid or expired token"
created: 2026-05-10T15:30:00Z
updated: 2026-05-10T15:48:00Z
---

## Current Focus

hypothesis: verifyToken's 2-hour expiry check rejects older session tokens, preventing legitimate resume
test: Trace full flow from frontend click to backend verifyToken
expecting: Confirm age-based rejection is root cause
next_action: Document evidence and return diagnosis

## Symptoms

expected: 历史测评记录可正常恢复继续测评
actual: 有些历史记录点击"继续测评"后显示 "Invalid or expired token"
errors: "Invalid or expired token"
reproduction: Test 9 in UAT — view history, click on an older session to resume
started: Discovered during UAT Round 2

## Eliminated

(None yet)

## Evidence

- timestamp: 2026-05-10T15:32:00Z
  checked: `packages/backend/src/services/assessment.ts` line 24, 116-138
  found: SESSION_EXPIRY_MS = 2 hours (line 24). verifyToken checks `started_at` age against this limit (line 130-131)
  implication: Sessions older than 2 hours are rejected by verifyToken

- timestamp: 2026-05-10T15:33:00Z
  checked: `packages/backend/src/routes/assessment.ts` line 764-828 (POST /resume)
  found: Route calls `assessment.verifyToken(body.token)` at line 787 before any other logic
  implication: All resume requests go through verifyToken's age check

- timestamp: 2026-05-10T15:35:00Z
  checked: `apps/web/src/components/assessment/session-history-list.tsx` line 93-104
  found: "继续测评" button appears for any `in_progress` or `abandoned` session, regardless of age
  implication: Frontend has no age-based filtering; shows continue button even for expired sessions

- timestamp: 2026-05-10T15:36:00Z
  checked: `apps/web/src/app/student/assessment/page.tsx` line 67-83
  found: handleContinue calls `resumeAssessment(token)` without any pre-check
  implication: Frontend blindly sends token to backend, trusting backend to handle validity

- timestamp: 2026-05-10T15:37:00Z
  checked: `apps/web/src/lib/server-api.ts` line 125-132
  found: resumeAssessment POSTs `{ token }` to `/api/assessment/resume`
  implication: Token passed directly from history list to backend

- timestamp: 2026-05-10T15:40:00Z
  checked: Complete flow trace
  found: Frontend → resumeAssessment → POST /resume → verifyToken → age check (2h limit)
  implication: Sessions > 2h old always fail with "Invalid or expired token"

## Resolution

root_cause: verifyToken enforces a 2-hour session expiry based on `started_at` timestamp. This expiry is appropriate for active session security but inappropriate for the "resume historical session" use case. Users legitimately want to continue incomplete assessments days later, but the 2-hour limit blocks this.

The frontend shows "继续测评" for any incomplete session without age filtering, creating user expectation that resume is possible. But backend rejects tokens older than 2 hours, causing the error.

fix: (not applied - diagnose only)
- Option A: Remove/remove the 2h expiry check for resume endpoint specifically
- Option B: Frontend should check session age and hide/disable "继续测评" for expired sessions
- Option C: Distinguish "resume active session" (< 2h) vs "restart abandoned session" (> 2h) with different UX

verification: (pending)
files_changed: []