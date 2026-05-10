---
status: diagnosed
trigger: "知识点正确率部分统计与 ai 给出的综合评价内容不一致"
created: 2026-05-09T10:00:00Z
updated: 2026-05-09T10:30:00Z
---

## Current Focus

hypothesis: Programming questions (is_correct=null) are treated as incorrect (0) by backend computeKnowledgeStats, while AI agent evaluates them independently — causing stats mismatch
test: Verified SQL sum() treats null as 0, found no mechanism to write back coding question scores
expecting: Root cause identified: missing score write-back for coding questions
next_action: Complete diagnosis report

## Symptoms

expected: 知识点正确率统计与 AI 综合评价内容一致
actual: 知识点正确率部分统计与 ai 给出的综合评价内容不一致
errors: 无显式错误，是数据不一致
reproduction: Test 8 in 03-UAT.md — complete an assessment with coding questions, view report page, compare knowledge stats chart with AI evaluation text
started: First reported during UAT testing 2026-05-09

## Eliminated

## Evidence

- timestamp: 2026-05-09T10:05:00Z
  checked: packages/backend/src/services/assessment.ts computeKnowledgeStats (lines 340-365)
  found: Uses SQL sum(assessmentAnswers.is_correct) to aggregate correct counts. is_correct field schema: 0=incorrect, 1=correct, null=not scored yet (line 62 in schema).
  implication: SQL sum() treats null as 0, so coding questions with is_correct=null contribute 0 to "correct" count in backend stats

- timestamp: 2026-05-09T10:10:00Z
  checked: packages/backend/src/routes/assessment.ts coding question submission (lines 495-534)
  found: Coding questions insert is_correct=null, return { scoring: true } to frontend, notify agent with message asking for 0-10 score. No subsequent code writes score back to assessmentAnswers table.
  implication: Agent evaluates coding questions but results never persist to database — scores exist only in agent's memory

- timestamp: 2026-05-09T10:15:00Z
  checked: .wopal/plugins/gesp-plugin/tools.ts update_evaluation tool (lines 75-87)
  found: update_evaluation only accepts token + evaluation (Markdown text), no score/feedback fields to write back to assessmentAnswers
  implication: Agent has no tool to persist coding question scores — can only express them in evaluation text

- timestamp: 2026-05-09T10:20:00Z
  checked: packages/backend/src/routes/assessment.ts search for UPDATE operations on assessmentAnswers
  found: No UPDATE statements found in entire codebase for assessmentAnswers table after initial insert
  implication: Coding question scores are never written back — they remain null forever

- timestamp: 2026-05-09T10:25:00Z
  checked: Data flow comparison
  found: Backend stats (knowledge_stats) computed from assessmentAnswers.is_correct aggregation → coding questions counted as incorrect (0). Agent evaluation generated from agent's internal scoring → coding questions may be scored correctly. Both sources diverge.
  implication: Dual source of truth with missing synchronization mechanism

## Resolution

root_cause: **编程题评分结果未写回数据库**。Backend computeKnowledgeStats 使用 SQL sum(is_correct)，将 is_correct=null 的编程题当作 0（错误）计入统计。Agent 收到编程题代码进行评估并给出评分，但该评分只存在于 Agent 内部记忆中，无法持久化到 assessmentAnswers 表。Agent 的 evaluation 文本可能包含正确的编程题评分，但后端统计图表显示为错误，导致不一致。
fix: 需要实现编程题评分回写机制：Agent 调用 update_answer_score({question_id, score, feedback}) → backend UPDATE assessmentAnswers SET is_correct=(score>=6), score=X, feedback=Y → 然后才能正确计入 stats
verification: 验证编程题提交后是否有任何 UPDATE assessmentAnswers 操作（无）→ 验证 sum(null) 在 SQLite 中行为（返回 0 或跳过 null 行）
files_changed: []
