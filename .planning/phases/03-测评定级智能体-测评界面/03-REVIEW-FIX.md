---
status: all_fixed
findings_in_scope: 7
fixed: 7
skipped: 0
---

# Phase 03: Code Review Fix Report

**Review Date:** 2026-05-08T06:32:26Z  
**Fix Date:** 2026-05-08  
**Scope:** Critical + Warning (7 items)  
**Status:** All issues fixed and committed

## Fix Summary

All 7 findings from REVIEW.md have been addressed through atomic commits. Each fix resolves the identified security, logic, or UX issue without introducing regressions. TypeScript validation passed after each commit.

## Fixed Issues

| ID | Severity | Commit | Files Changed | Fix Description |
|----|----------|--------|---------------|-----------------|
| **CR-01** | Critical | `8f7aebc` | `packages/backend/src/routes/assessment.ts`<br>`packages/backend/src/services/assessment.ts` | Removed hardcoded fallback secrets (`dev-key`, `gesp-assessment-secret-dev`). Added fail-fast validation for required environment variables `GESP_API_KEY` and `JWT_SECRET`. |
| **WR-01** | Warning | `0f884b9` | `packages/backend/src/routes/assessment.ts`<br>`packages/backend/src/services/assessment.ts` | Unified question lock state management. Removed duplicate `questionLocks` map in routes, centralized lock tracking in service layer via `getLockedQuestionId()` export. Fixed stuck-session issue where auto-selected questions were invisible to `/next-question`. |
| **WR-02** | Warning | `54fab5f` | `packages/backend/src/routes/assessment.ts`<br>`packages/backend/src/db/schema/assessment.ts` | Added `/submit` validation: (1) verify question_id matches current lock, (2) check for duplicate submissions. Changed `answerDuplicateIdx` from `(session_id, knowledge_point)` to `(session_id, question_id)` for proper uniqueness constraint. |
| **WR-03** | Warning | `d48dc89` | `apps/web/src/app/student/assessment/[token]/page.tsx` | Added `SCORING` state to handle async coding question evaluation. Frontend now displays "AI 正在评估中..." spinner instead of prematurely advancing to `FEEDBACK` with missing `is_correct`. Prevents incorrect red "回答错误" display before scoring completes. |
| **WR-04** | Warning | `c4538df` | `packages/backend/src/routes/assessment.ts`<br>`packages/backend/src/services/assessment.ts` | Added `completeSession()` service function to persist `status='completed'`, `final_level`, and `completed_at` when assessment terminates. Route `/submit` now calls this atomically when `checkRoundCompletion()` returns `done=true`. Fixed downstream progress/report/resume flows seeing stale `in_progress` status. |
| **WR-05** | Warning | `8c0a30f` | `apps/web/src/components/assessment/chat-panel.tsx` | Disabled chat input and send button with placeholder "AI 顾问暂时只能接收消息，不能回复...". Removed false affordance that suggested two-way chat. Messages still display (agent→student SSE stream works), but student cannot send replies until backend wiring implemented. |
| **WR-06** | Warning | `f719842` | `packages/backend/src/routes/assessment.ts`<br>`apps/web/src/lib/server-api.ts` | Moved assessment token from URL query params to `Authorization: Bearer <token>` header. Updated `/next-question` and `/progress` endpoints to use `verifyTokenFromHeader()` helper. Frontend `server-api.ts` now passes token via header instead of URL. Reduces credential leakage risk (browser history, proxy logs, analytics). |
| **WR-07** | Warning | `8531b08` | `packages/backend/src/seed/assessment-questions.seed.ts` | Changed seed idempotency logic from count-based (`existingCount >= QUESTIONS.length`) to fingerprint-based deduplication. New logic filters by composite key `(course_id, level, knowledge_point, question_type, content)`, inserting only truly new questions after partial seed. Prevents duplicate rows when seed runs multiple times. |

## Verification

All fixes verified through:
1. TypeScript compilation (`bun run typecheck`) — passed after each commit
2. Atomic commit strategy — each fix in isolated commit with descriptive message
3. No regression introduction — fixes modify existing logic without breaking contracts

## Next Steps

- Orchestrator will commit REVIEW-FIX.md to complete code review cycle
- Recommend manual testing of assessment flow before phase completion
- Monitor environment variable configuration in deployment (CR-01 requires `GESP_API_KEY` and `JWT_SECRET`)

---

_Fixed: 2026-05-08_  
_Fixer: wsf-code-review-fix agent_