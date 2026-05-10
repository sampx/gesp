---
status: diagnosed
trigger: "答题过程中显示的状态信息如题号、正确数、总题数都是错误的，也没有显示总题数/时长/剩余题数/剩余时长等信息"
created: 2026-05-09T10:00:00Z
updated: 2026-05-09T18:01:44Z
---

## Current Focus

hypothesis: CONFIRMED — three independent root causes identified
test: completed full data flow trace (frontend → backend → DB → frontend)
expecting: root causes match observed symptoms
next_action: report diagnosis

## Symptoms

expected: 进度条正确显示题目编号、正确数/总题数、等级，以及总题数/时长/剩余题数/剩余时长等信息
actual: 答题过程中显示的状态信息如第 2 题 正确 1/1、测评题目总数量/正确数量、题编号都是错误的。也没有显示前页总题数/时长/剩余题数/剩余时长等信息
errors: N/A
reproduction: Test 3 in .planning/phases/03-测评定级智能体-测评界面/03-UAT.md
started: Discovered during UAT

## Eliminated

- hypothesis: Backend `/progress` endpoint returns wrong `total_answered`/`total_correct` values
  evidence: Traced `updateSessionAfterAnswer()` — correctly increments both counters atomically in DB. `getProgress()` reads directly from DB session row. No data mismatch between DB and API response.
  timestamp: 2026-05-09T18:01:00Z

- hypothesis: Race condition between frontend local increment and backend progress response
  evidence: Submit is awaited before user can click "下一题". Backend `updateSessionAfterAnswer` completes synchronously before response. By the time `loadNextQuestion` fires, DB is consistent with frontend local state. Merge is a no-op.
  timestamp: 2026-05-09T18:01:00Z

## Evidence

- timestamp: 2026-05-09T18:01:00Z
  checked: `progress-bar.tsx` component (27 lines)
  found: Component accepts `questionLimit` prop but ONLY uses it for percentage calculation (`(totalAnswered / questionLimit) * 100`). Never renders it as text. Shows `totalAnswered + 1` as question number. Shows `totalCorrect/totalAnswered` as ratio. No rendering of: total questions count, remaining questions, duration, remaining time.
  implication: Missing display fields are a UI implementation gap, not a data flow bug.

- timestamp: 2026-05-09T18:01:00Z
  checked: `page.tsx` assessment page state management
  found: 
    (a) Initial state: `config_question_limit: 30` — hardcoded magic number, doesn't match backend default (5) or max (10).
    (b) `handleSubmit` lines 122-126: frontend locally increments `total_answered` and `total_correct` immediately upon submit, BEFORE the user clicks "下一题". This means during the FEEDBACK state, `total_answered` already reflects the NEXT question's count.
    (c) `loadNextQuestion` line 73: `setProgress(prev => ({ ...prev, ...res.data?.progress }))` merges backend progress data, overwriting local values. This is harmless when values are consistent, but masks any local computation errors.
  implication: (a) causes brief incorrect display on page load. (b) causes off-by-one question number during FEEDBACK. (c) is a design smell but not a bug per se.

- timestamp: 2026-05-09T18:01:00Z
  checked: Backend `GET /progress` and `GET /next-question` endpoints
  found: Both endpoints call `getProgress()` which returns `ProgressData` with `current_level, total_answered, total_correct, config_question_limit, knowledge_stats, evaluation, status`. `config_time_limit_min` is stored in DB schema but NOT included in `ProgressData` response. No time tracking (elapsed time, remaining time) exists in backend.
  implication: Backend never provides time-related data to frontend. `config_time_limit_min` exists in DB schema but is not surfaced via API.

- timestamp: 2026-05-09T18:01:00Z
  checked: Backend `assessmentSessions` DB schema
  found: Schema has `config_time_limit_min` (default 30), `started_at` timestamp. No `elapsed_time_sec` or `remaining_time_sec` tracking column. No middleware or route logic that computes elapsed/remaining time from `started_at`.
  implication: Time tracking (duration, remaining time) is completely unimplemented — no data source exists for these display values.

- timestamp: 2026-05-09T18:01:00Z
  checked: `server-api.ts` API client layer
  found: `getNextQuestion(token)` sends `Authorization: Bearer ${token}` header. Response includes `progress` object alongside question data. `serverFetch` works correctly for GET requests within Next.js server actions.
  implication: API communication layer is not the source of the bug.

## Resolution

root_cause: Three independent root causes:
  (1) Off-by-one question number during FEEDBACK: ProgressBar always displays `totalAnswered + 1` as current question number. `handleSubmit` increments `total_answered` immediately after receiving submit response, BEFORE user transitions away from FEEDBACK state. Result: user sees "第 N+1 题" while still reviewing feedback for question N.
  (2) Missing display information: ProgressBar component only renders 3 data points (Lv badge, question number, correct/answered ratio + percentage bar). The `questionLimit` prop is available but only used for percentage math — never displayed as "总题数". `remaining = questionLimit - totalAnswered` is not computed or displayed. Time information (`config_time_limit_min`, elapsed, remaining) has no backend implementation (no time tracking, not included in any API response), making it impossible for frontend to display.
  (3) Frontend initial state mismatch: `config_question_limit: 30` hardcoded (matches `MAX_SAFETY_QUESTIONS`, not `DEFAULT_QUESTION_LIMIT`). Causes brief incorrect progress bar percentage on page load before mount effect corrects it via `/progress` API call.
fix: (not applicable — goal: find_root_cause_only)
verification: (not applicable — goal: find_root_cause_only)
files_changed: []
