---
phase: 03-测评定级智能体-测评界面
reviewed: 2026-05-08T06:32:26Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - .wopal/agents/assessor.md
  - .wopal/plugins/gesp-plugin/index.ts
  - .wopal/plugins/gesp-plugin/tools.ts
  - apps/web/src/app/student/assessment/[token]/page.tsx
  - apps/web/src/app/student/assessment/[token]/report/page.tsx
  - apps/web/src/app/student/assessment/actions.ts
  - apps/web/src/app/student/assessment/page.tsx
  - apps/web/src/components/assessment/chat-panel.tsx
  - apps/web/src/components/assessment/coding-question.tsx
  - apps/web/src/components/assessment/level-slider.tsx
  - apps/web/src/components/assessment/objective-question.tsx
  - apps/web/src/components/assessment/progress-bar.tsx
  - apps/web/src/components/assessment/report-chart.tsx
  - apps/web/src/components/ui/progress.tsx
  - apps/web/src/lib/server-api.ts
  - packages/backend/src/db/schema/assessment.ts
  - packages/backend/src/db/schema/index.ts
  - packages/backend/src/index.ts
  - packages/backend/src/routes/assessment.ts
  - packages/backend/src/seed/assessment-questions.seed.ts
  - packages/backend/src/services/assessment.ts
  - packages/backend/src/services/ellamaka-client.ts
findings:
  critical: 1
  warning: 6
  info: 0
  total: 7
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-08T06:32:26Z  
**Depth:** standard  
**Files Reviewed:** 22  
**Status:** issues_found

## Summary

Reviewed the assessment agent plugin, student assessment UI, backend assessment routes/services, and seed/schema files. The main risks are insecure fallback secrets, a broken question-lock flow that can stall the assessment, and several API/UI mismatches that let clients submit or display invalid assessment state.

## Critical Issues

### CR-01: Hardcoded fallback secrets enable token forging and internal API abuse

**Location:** `.wopal/plugins/gesp-plugin/tools.ts:4-5`, `packages/backend/src/routes/assessment.ts:22-35`, `packages/backend/src/services/assessment.ts:24-25,102-120`  
**Severity:** Critical  
**Description:** Both the plugin and backend fall back to known static secrets (`dev-key`, `gesp-assessment-secret-dev`). If deployment misses these env vars, anyone who knows the defaults can call internal `/api/assessment/candidates|select|evaluate` endpoints or forge valid assessment JWTs.

**Recommendation:** Fail fast when required secrets are missing, and only allow insecure defaults in an explicitly marked local-dev mode.

```ts
const GESP_API_KEY = process.env.GESP_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

if (!GESP_API_KEY || !JWT_SECRET) {
  throw new Error('Missing required assessment secrets');
}
```

## Warnings

### WR-01: Question lock state is split across two unrelated maps

**Location:** `packages/backend/src/routes/assessment.ts:91-105,150-175,494-503`, `packages/backend/src/services/assessment.ts:284-305`  
**Severity:** Warning  
**Description:** `waitForFirstQuestion()` and `GET /next-question` read the route-local `questionLocks` map, but `/select` and the auto-select timer call `assessment.lockQuestion()`, which writes to the service-local `currentQuestionLocks` map. The selected question is never visible to the readers, so sessions can remain stuck in `waiting` forever.

**Recommendation:** Use one shared lock source only (preferably persisted in `assessment_sessions`) and make both selection and retrieval go through the same accessor.

### WR-02: `/submit` accepts arbitrary and duplicate `question_id` values

**Location:** `packages/backend/src/routes/assessment.ts:360-383,418-430`, `packages/backend/src/db/schema/assessment.ts:113-116`  
**Severity:** Warning  
**Description:** After token verification, the route loads any question by ID and records an answer without checking that the question is the session’s currently locked question or that it has not already been answered. A client can replay the same question repeatedly or submit out-of-sequence questions to manipulate `total_answered` / `total_correct`.

**Recommendation:** Reject submissions unless `question_id` matches the current lock for that session, and enforce a unique constraint on `(session_id, question_id)`.

```ts
if (body.question_id !== currentLockedQuestionId) {
  return error(c, 'Question is not active for this session', 400);
}
```

### WR-03: Coding-question responses do not match the page state machine

**Location:** `apps/web/src/app/student/assessment/[token]/page.tsx:72-85,168-188`, `packages/backend/src/routes/assessment.ts:416-453`  
**Severity:** Warning  
**Description:** The backend returns `{ scoring: true, message }` for coding questions, but the page treats every successful response as finished feedback: it increments progress immediately, switches to `FEEDBACK`, and renders missing `is_correct` as the red “回答错误” state. Students can advance before any scoring result exists.

**Recommendation:** Handle `res.data.scoring` as a separate pending state, and only update progress / feedback after a real scoring payload arrives.

### WR-04: Completed assessments are never persisted as completed

**Location:** `packages/backend/src/routes/assessment.ts:405-415`, `packages/backend/src/services/assessment.ts:421-447,498-507`  
**Severity:** Warning  
**Description:** When `checkRoundCompletion()` returns `done`, the API response includes `final_level`, but the session row is never updated with `status = 'completed'`, `final_level`, or `completed_at`. Downstream progress/report/resume flows still see the session as `in_progress`.

**Recommendation:** Persist completion state atomically when the assessment terminates.

### WR-05: Student chat input is a false affordance and silently drops messages

**Location:** `apps/web/src/components/assessment/chat-panel.tsx:46-50,91-94`  
**Severity:** Warning  
**Description:** `handleSend()` only appends the student message to local React state. Nothing is sent to the backend or assessor agent, so the UI suggests a two-way chat that does not actually exist, and all student messages disappear on refresh.

**Recommendation:** Either implement a real send-message API/stream path or remove/disable the input box until messaging is wired end-to-end.

### WR-06: Assessment token is used as a URL credential

**Location:** `apps/web/src/lib/server-api.ts:111-118`, `apps/web/src/components/assessment/chat-panel.tsx:28`, `packages/backend/src/routes/assessment.ts:483-490,528-535,628-635`  
**Severity:** Warning  
**Description:** The assessment token is passed in query strings and path segments for `next-question`, `progress`, and SSE. Because this token authorizes access to assessment state, putting it in URLs increases leakage risk via browser history, reverse-proxy logs, analytics, and copied links.

**Recommendation:** Move the token to an `Authorization` header or a secure httpOnly cookie, and avoid credential-bearing URLs.

### WR-07: Seed script duplicates all questions after a partial seed

**Location:** `packages/backend/src/seed/assessment-questions.seed.ts:311-335`  
**Severity:** Warning  
**Description:** The seed logic only compares `existingCount >= QUESTIONS.length`. If a previous run inserted some but not all records, the next startup inserts the full `QUESTIONS` array again, duplicating the already-seeded rows instead of filling the missing subset.

**Recommendation:** Seed by stable unique key/upsert strategy instead of raw total-count comparison.

---

_Reviewed: 2026-05-08T06:32:26Z_  
_Reviewer: wsf-code-reviewer_  
_Depth: standard_
