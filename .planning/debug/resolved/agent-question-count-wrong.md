---
status: diagnosed
trigger: "后端发给 agent 的题数统计信息不准确（含编程题），导致 agent 可能会多出题，测评题数可能会超过用户选择的题数"
created: 2026-05-10T08:45:00Z
updated: 2026-05-10T08:50:00Z
---

## Current Focus

hypothesis: CONFIRMED — 编程题提交后 `total_answered` 未增加，导致 agent 收到的进度信息不准确
test: traced `total_answered` counter through both objective and coding flows
expecting: find missing increment call
next_action: return diagnosis (goal: find_root_cause_only)

## Symptoms

expected: 后端发给 agent 的题数统计信息准确（含编程题）
actual: 有编程题后题数统计信息不正确，agent 可能会多出题，测评题数可能会超过用户选择的题数
errors: None reported
reproduction: Test 6 in UAT — complete assessment with coding questions, observe agent behavior
started: Discovered during UAT Round 2

## Eliminated

(None yet)

## Evidence

- timestamp: 2026-05-10T08:45:00Z
  checked: routes/assessment.ts POST /submit objective branch (lines 540-605)
  found: After scoring objective answer, calls `updateSessionAfterAnswer()` (line 560) → `total_answered += 1`
  implication: Objective questions correctly increment counter before notifying agent

- timestamp: 2026-05-10T08:45:00Z
  checked: routes/assessment.ts POST /submit coding branch (lines 606-657)
  found: After inserting coding answer with `is_correct: null`, **NO call to `updateSessionAfterAnswer()`**
  implication: Counter NOT incremented when coding answer submitted

- timestamp: 2026-05-10T08:45:00Z
  checked: routes/assessment.ts coding branch agent notification (lines 630-643)
  found: `getProgress()` called, message sent to agent says "已答 ${progress.total_answered} 题"
  implication: Agent receives stale count (missing the just-submitted coding question)

- timestamp: 2026-05-10T08:45:00Z
  checked: services/assessment.ts `updateAnswerScore()` (lines 526-560)
  found: Only updates answer row fields (score, feedback, is_correct), **NO call to `updateSessionAfterAnswer()`**
  implication: Counter NOT incremented when agent scores coding answer either

## Resolution

root_cause: 编程题在提交和评分两个阶段都缺少 `total_answered` 增量操作。客观题提交后调用 `updateSessionAfterAnswer()` 增加计数，但编程题提交时未调用（lines 606-657 缺失该调用），评分时（`/answer-score` endpoint 调用 `updateAnswerScore()`）也未调用。导致 agent 收到的进度信息中 `total_answered` 比实际已答题目少 1，agent 认为还有更多题要生成，可能超出题数限制。
fix: (not applicable — goal: find_root_cause_only)
verification: (not applicable)
files_changed: []