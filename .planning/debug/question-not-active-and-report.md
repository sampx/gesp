---
status: diagnosed
trigger: "Test 8 in UAT — complete full assessment, observe last question transition and report page"
created: 2026-05-10T10:00:00Z
updated: 2026-05-10T10:05:00Z
---

## Current Focus

hypothesis: ALL THREE root causes confirmed with code evidence
test: Code reading of backend routes, service, and frontend pages
expecting: Specific line-level root causes for each sub-issue
next_action: Return diagnosis to caller

## Symptoms

expected: 测评过程无 'Question is not active' 错误，报告页面显示知识点正确率，最后一题有反馈环节
actual: User reported: (1) 偶尔出现 'Question is not active for this session' 错误，无法继续测评；(2) 报告页面没有知识点正确率统计数据；(3) 完成最后一题后没有展示最后一题的结果，直接跳转到报告页面，应该让用户点击后再查看报告
errors: "Question is not active for this session" (HTTP 400)
reproduction: Test 8 in UAT — complete full assessment, observe last question transition and report page
started: Discovered during UAT Round 2

## Eliminated

## Evidence

- timestamp: 2026-05-10T10:01:00Z
  checked: packages/backend/src/services/assessment.ts line 301 — currentQuestionLocks Map
  found: `const currentQuestionLocks = new Map<string, string>()` — pure in-memory, no persistence, no restore on restart
  implication: Any server restart/crash clears all question locks; students mid-question lose their active question

- timestamp: 2026-05-10T10:02:00Z
  checked: packages/backend/src/routes/assessment.ts lines 517-519 — POST /submit lock check
  found: `if (!lockedQuestionId || body.question_id !== lockedQuestionId)` returns 400 "Question is not active" when lock is missing
  implication: After restart, any student trying to submit gets this error; POST /resume does NOT restore the lock

- timestamp: 2026-05-10T10:02:30Z
  checked: packages/backend/src/routes/assessment.ts POST /resume (lines 764-828)
  found: Resume creates new ellamaka session and asks agent to select new question, but NEVER restores the in-memory lock for any previously locked question
  implication: If student was mid-question when session interrupted, resume doesn't help — lock is gone

- timestamp: 2026-05-10T10:03:00Z
  checked: packages/backend/src/routes/assessment.ts POST /submit lines 588-596 — round convergence path
  found: When `checkRoundCompletion` returns `done: true`, calls `completeSession()` which does NOT persist `knowledge_stats`
  implication: Assessment ending via round convergence leaves `knowledge_stats` as initial `{}` in DB

- timestamp: 2026-05-10T10:03:30Z
  checked: packages/backend/src/services/assessment.ts completeSession (lines 506-520)
  found: Only sets `status: "completed"`, `final_level`, `completed_at` — does NOT compute or persist `knowledge_stats`
  implication: Round convergence completion path skips knowledge stats persistence entirely

- timestamp: 2026-05-10T10:04:00Z
  checked: packages/backend/src/services/assessment.ts getProgress (line 390)
  found: `const stats = session.knowledge_stats ?? await computeKnowledgeStats(sessionId)` — uses `??` (nullish coalescing), but session is created with `knowledge_stats: {}` which is truthy
  implication: Empty `{}` is never null/undefined, so `computeKnowledgeStats` is never called as fallback; report gets `{}`

- timestamp: 2026-05-10T10:04:30Z
  checked: packages/backend/src/services/assessment.ts updateEvaluation (lines 606-618)
  found: `updateEvaluation` DOES compute and persist `knowledge_stats` — but this is only called from POST /evaluate (agent-initiated path)
  implication: Only agent-evaluated assessments get knowledge_stats persisted; round-convergence path misses it

- timestamp: 2026-05-10T10:05:00Z
  checked: apps/web/src/app/student/assessment/[token]/page.tsx handleSubmit (lines 168-173)
  found: `if (res.data.done) { setState("DONE") } else { setState("FEEDBACK") }` — when done=true, skips FEEDBACK state entirely
  implication: Last question never shows feedback (correct/wrong indicator, explanation) — jumps straight to DONE view

- timestamp: 2026-05-10T10:05:30Z
  checked: apps/web/src/app/student/assessment/[token]/page.tsx handleAssessmentDone (lines 209-216)
  found: SSE callback sets DONE state and auto-redirects to report after 1.5s — also bypasses feedback display
  implication: Even if SSE delivers assessment_done, no feedback is shown for the current question

## Resolution

root_cause: Three distinct root causes confirmed (see diagnosis)
fix: (diagnose-only mode — not fixing)
verification: (diagnose-only mode — not verifying)
files_changed: []