---
phase: 03-测评定级智能体-测评界面
plan: "13"
type: execute
wave: 2
depends_on:
  - "03-11"
subsystem: backend + frontend
tags: [gap_closure, counters, feedback, state-machine, tdd]
tech_stack:
  added:
    - getLatestCodingFeedback helper with deterministic question binding
    - latest_feedback field in ProgressData interface
    - pendingDone/pendingFinalLevel state in frontend
  patterns:
    - idempotent counter update (only on first score)
    - polling-based feedback retrieval (SCORING → progress.latest_feedback → FEEDBACK)
    - gated navigation (FEEDBACK → user click → NEXT/REPORT)
key_files:
  created:
    - packages/backend/src/__tests__/assessment-coding-feedback.test.ts
  modified:
    - packages/backend/src/services/assessment.ts (LatestFeedback interface, getLatestCodingFeedback, getProgress with latest_feedback, updateAnswerScore idempotent counters)
    - packages/backend/src/routes/assessment.ts (coding submit increments total_answered before agent notification)
    - apps/web/src/app/student/assessment/[token]/page.tsx (pendingDone, pollForScoringFeedback, gated FEEDBACK navigation)
key_decisions:
  - "submit route increments total_answered immediately (submit → +1 answered)"
  - "updateAnswerScore increments total_correct only on first score (idempotent, score >= 6)"
  - "SCORING polls progress for latest_feedback, not next question directly"
  - "pendingDone gates DONE navigation — user must click from FEEDBACK state"
metrics:
  duration: 656 seconds
  completed_date: "2026-05-10T08:00:00Z"
  tasks: 2
  commits: 2
  files_changed: 4
  tests_added: 4
  tests_passed: 4
---

# Phase 03 Plan 13: Repair Coding Feedback Flow Summary

## One-Liner

修复编程题计数与反馈流程：后端计数正确，前端状态机先展示反馈再导航，最后一题不跳过反馈环节。

## Objective

关闭 Test 3 / Test 6 major gap，并补齐 Test 8 中"最后一题无反馈"的剩余缺口。

## Root Causes (from Diagnosis)

| Gap | Root Cause | Fix Location |
|-----|------------|--------------|
| Test 3: 进度条少算编程题 | coding submit 未调用 updateSessionAfterAnswer → total_answered 不增 | routes/assessment.ts submit branch |
| Test 6: agent 多出题 | agent 看到的 total_answered 比实际少 1 → 超出题数限制 | routes/assessment.ts submit + answer-score |
| Test 8: 最后一题无反馈 | done=true 直接 setState("DONE") 跳过 FEEDBACK | page.tsx handleSubmit + handleAssessmentDone |

## Implementation

### Task 1: Backend Counter Repair (TDD)

**RED Phase:**
- 4 failing tests covering counter accuracy, idempotency, feedback contract, round completion

**GREEN Phase:**
- `submit` route coding branch: increment `total_answered` immediately before agent notification
- `updateAnswerScore`: increment `total_correct` only on first score (idempotent)
- `getLatestCodingFeedback`: query most recent scored coding answer by `question_order DESC`
- `getProgress`: include `latest_feedback` payload for frontend polling

**Idempotency Design:**
- `updateAnswerScore` checks `answer.score === null` before incrementing counters
- Repeated `/answer-score` calls (agent retry) do NOT double-count

### Task 2: Frontend State Machine Fix

**SCORING → FEEDBACK Path:**
- Introduce `pollForScoringFeedback()` polling `getAssessmentProgress()` for `latest_feedback`
- When `latest_feedback` available → setState("FEEDBACK") with feedback payload
- No longer calls `loadNextQuestion()` directly from SCORING

**Final-Question Gating:**
- Introduce `pendingDone` / `pendingFinalLevel` state
- `handleSubmit`: `done=true` → set `pendingDone=true` + `setState("FEEDBACK")` (not DONE)
- `handleQuestionReady`: `done=true` → set `pendingDone` (not setState("DONE"))
- `handleAssessmentDone`: SSE event → set `pendingDone` (not setState("DONE"))
- `handleNextFromFeedback`: if `pendingDone` → navigate to report; else → next question
- FEEDBACK button: "查看测评报告" when `pendingDone`, "下一题" otherwise

## Verification

### Tests Passed

```bash
cd packages/backend && bun test src/__tests__/assessment-coding-feedback.test.ts --isolate
# 4 pass, 0 fail
```

### Typecheck Passed

```bash
cd packages/backend && bun run typecheck  # ✓
cd apps/web && bun run typecheck  # ✓
```

### Acceptance Criteria Verified

```bash
grep -n "latest_feedback\|score >= 6\|total_answered" packages/backend/src/services/assessment.ts packages/backend/src/routes/assessment.ts
# Shows coding counter + feedback contract logic ✓

grep -n "pendingDone\|latest_feedback\|查看测评报告" apps/web/src/app/student/assessment/[token]/page.tsx
# Shows final-feedback gating ✓
```

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — all mitigations from plan's threat model implemented correctly:
- T-03-13-01: Idempotency via `answer.score === null` check before counter increment
- T-03-13-02: `latest_feedback` binds to most recent answer row (deterministic)
- T-03-13-03: Frontend tolerates repeated done / assessment_done signals

## Known Stubs

None — all data flows correctly wired.

## Files Changed

| File | Lines Added | Lines Changed | Purpose |
|------|-------------|---------------|---------|
| packages/backend/src/services/assessment.ts | 45 | 15 | LatestFeedback interface, getLatestCodingFeedback helper, getProgress with latest_feedback, updateAnswerScore idempotent counters |
| packages/backend/src/routes/assessment.ts | 10 | 8 | Coding submit increments total_answered before agent notification |
| packages/backend/src/__tests__/assessment-coding-feedback.test.ts | 358 | 0 | TDD tests covering counter accuracy, idempotency, feedback contract |
| apps/web/src/app/student/assessment/[token]/page.tsx | 80 | 30 | pendingDone state, pollForScoringFeedback, gated FEEDBACK navigation |

## Commits

| Hash | Type | Message |
|------|------|---------|
| b9c4dce | fix | repair coding question counters and add latest_feedback |
| 14ca354 | fix | make SCORING and final-question flows pass through FEEDBACK |

## Self-Check: PASSED

- [x] `packages/backend/src/__tests__/assessment-coding-feedback.test.ts` exists
- [x] `packages/backend/src/services/assessment.ts` contains `getLatestCodingFeedback` and `latest_feedback`
- [x] `apps/web/src/app/student/assessment/[token]/page.tsx` contains `pendingDone` and `查看测评报告`
- [x] Commits b9c4dce and 14ca354 exist in git log