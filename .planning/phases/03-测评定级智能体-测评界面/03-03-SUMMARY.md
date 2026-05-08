---
phase: 03-测评定级智能体-测评界面
plan: 03
subsystem: backend
tags: [assessment, routes, api, rest, sse, ellamaka]
depends_on: [03-01, 03-02]
provides:
  - 9 REST endpoints for assessment lifecycle
  - SSE stream for agent message forwarding
  - Anti-leak question selection mechanism
affects: []
tech_stack:
  added: [hono-openapi, SSE, JWT token verification, API key auth]
  patterns: [route mounting, middleware composition, stream handling]
key_files:
  created:
    - packages/backend/src/routes/assessment.ts (816 lines)
  modified:
    - packages/backend/src/index.ts (mount routes, log config)
decisions:
  - D-13: 10s auto-select timer fallback when agent doesn't select
  - D-05: Backend scores objective questions instantly (trim+lowercase)
  - D-14: Coding questions return {scoring:true} for async evaluation
  - D-06: StudentAuth + JWT token dual authentication
metrics:
  duration_min: 7.7
  completed_date: "2026-05-08T05:52:22Z"
  task_count: 2
  file_count: 2
  commit_count: 2
---

# Phase 03 Plan 03: Assessment REST API Summary

## One-liner

Complete assessment REST API with 9 endpoints (6 student-facing + 3 internal), SSE stream for agent forwarding, and anti-leak question selection with 10s auto-select fallback.

## Implementation Overview

### Task 1: Create Assessment Routes

Created `packages/backend/src/routes/assessment.ts` (816 lines) implementing:

**Student-facing endpoints (StudentAuth):**
- `POST /start` — Create session, generate JWT, create ellamaka session, wait for first question
- `POST /submit` — Score objective answers instantly, async for coding, update session stats
- `POST /resume` — Restore abandoned session, rebuild context, create new ellamaka session
- `GET /next-question` — Return locked question or `{waiting:true}`
- `GET /progress` — Return current level, answered/correct counts, knowledge_stats
- `GET /:token/stream` — SSE stream forwarding agent text events (field="text" filter)

**Internal endpoints (GESP_API_KEY auth):**
- `POST /candidates` — Return candidate summaries (anti-leak: 100 chars max), start 10s timer
- `POST /select` — Lock question, clear auto-select timer
- `POST /evaluate` — Save agent evaluation, recompute knowledge_stats

**Key mechanisms:**
- `verifyApiKey` middleware for internal endpoints
- `startAutoSelectTimer` / `clearAutoSelectTimer` for D-13 10s fallback
- `waitForFirstQuestion` helper with 15s timeout
- `checkRoundCompletion` placeholder for convergence detection
- `getSessionHistory` for resume context

### Task 2: Wire Routes into Backend

Modified `packages/backend/src/index.ts`:
- Import `assessmentRoutes` from routes/assessment
- Mount at `/api/assessment` path
- Add startup log for Ellamaka client configuration

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| StudentAuth + JWT dual auth | Student endpoints use session cookie (StudentAuth), token-based endpoints verify JWT separately — clear separation per D-06 |
| SSE filters field="text" only | Agent internal messages (tool calls, answer results) sent via promptAsync, SSE only forwards visible text per threat model T-03-17 |
| 10s auto-select timer | D-13 requirement: agent must select within 10s, backend fallback prevents hanging |
| Coding questions async scoring | D-14: agent evaluates code (0-10 score), returns `{scoring:true}` immediately |

## Threat Surface

| Flag | File | Description |
|------|------|-------------|
| threat_flag: auth_boundary | routes/assessment.ts | Dual auth model (StudentAuth + JWT + API key) — internal endpoints require GESP_API_KEY bearer token |
| threat_flag: sse_connection | routes/assessment.ts | SSE endpoint per-session with token verification, no rate limiting (T-03-16 accepted) |
| threat_flag: anti_leak | routes/assessment.ts | Candidates return short_summary (100 chars), next-question returns full content only after lock |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| checkRoundCompletion | routes/assessment.ts | ~L145 | MVP placeholder for convergence logic; full implementation requires evaluateRound integration |

## Files Modified

| File | Lines Added | Purpose |
|------|-------------|---------|
| packages/backend/src/routes/assessment.ts | +816 | Complete assessment API router with 9 endpoints |
| packages/backend/src/index.ts | +13 | Mount assessment routes, log ellamaka config |

## Verification Evidence

- Typecheck: `bun run typecheck` passes with zero errors
- All 9 endpoints present (grep verified)
- StudentAuth used in 3 endpoints (start, submit, resume)
- verifyApiKey middleware for 3 internal endpoints
- SSE Content-Type: text/event-stream
- startAutoSelectTimer/clearAutoSelectTimer helpers present
- No export default app in index.ts

## Next Steps

Phase 03 continues:
- Plan 04: Seed assessment questions (Wave 2 parallel)
- Plan 05: Frontend assessment UI pages (Wave 3, human-verify checkpoint)

---

## Self-Check: PASSED

- File `packages/backend/src/routes/assessment.ts` exists ✓
- File `packages/backend/src/index.ts` modified ✓
- Commit `819b49f` exists ✓ (Task 1)
- Commit `a74c371` exists ✓ (Task 2)
- Typecheck passes ✓