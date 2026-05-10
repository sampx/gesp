---
status: investigating
trigger: "进度条正确显示题号和正确数（含编程题），编程题提交后有判题结果展示环节"
created: 2026-05-10T08:00:00Z
updated: 2026-05-10T08:30:00Z
---

## Current Focus

hypothesis: 编程题提交时未更新 `total_answered` 计数器，导致进度条计算错误；前端状态机 SCORING→poll 跳过 FEEDBACK 状态，用户无法看到编程题判题结果
test: 检查后端 `/submit` 编程题分支和前端状态机流转逻辑
expecting: 确认 `updateSessionAfterAnswer` 在编程题流程中未被调用，前端 `SCORING` 状态直接进入 polling 而非等待 FEEDBACK
next_action: 总结证据，给出根因诊断

## Symptoms

expected: 进度条正确显示题号和正确数（含编程题），编程题提交后有判题结果展示环节
actual: (1) 题目编号不正确，做第三题时显示第二题，正确数/总题数显示不正确（有编程题后就不正确）；(2) 编程题提交答案后界面跳转流程与客观题不一致，当前只显示 ai 判题中然后跳转到下一题界面，很长时间才显示下一题题目
errors: None
reproduction: Test 3 in UAT — complete a coding question, observe progress bar and flow
started: UAT Round 2 discovered

## Eliminated

暂无

## Evidence

- timestamp: 2026-05-10T08:15:00Z
  checked: packages/backend/src/routes/assessment.ts lines 606-657 (coding submit branch)
  found: 编程题提交时：(1) 仅调用 db.insert 插入 answer row，`is_correct=null`；(2) **未调用 `updateSessionAfterAnswer`**；(3) 返回 `{ scoring: true, message: "..." }` 不含 progress 数据
  implication: `total_answered` 计数器在编程题提交时未被增量更新，导致进度条计数错误

- timestamp: 2026-05-10T08:18:00Z
  checked: packages/backend/src/routes/assessment.ts lines 1158-1193 (POST /answer-score)
  found: Agent 通过 `update_answer_score` 工具调用 `/answer-score` 端点，仅调用 `updateAnswerScore` 更新 answer row 的 `is_correct` 字段，**未调用 `updateSessionAfterAnswer`**
  implication: 编程题评分完成后，`total_answered` 和 `total_correct` 计数器仍未更新

- timestamp: 2026-05-10T08:20:00Z
  checked: packages/backend/src/services/assessment.ts lines 381-417 (getProgress)
  found: `getProgress` 从 session row 读取 `total_answered` 和 `total_correct`，依赖 `updateSessionAfterAnswer` 的维护
  implication: 进度条数据来自 `getProgress`，但由于编程题未调用 `updateSessionAfterAnswer`，数据永远是落后值

- timestamp: 2026-05-10T08:22:00Z
  checked: apps/web/src/app/student/assessment/[token]/page.tsx lines 151-177 (handleSubmit)
  found: 编程题提交后，收到 `{ scoring: true }` 响应 → setState("SCORING") → poll 2s 后调用 `loadNextQuestion`，**直接跳过 FEEDBACK 状态**
  implication: 前端状态机从 SCORING 直接进入下一题加载流程，不显示判题结果

- timestamp: 2026-05-10T08:25:00Z
  checked: apps/web/src/app/student/assessment/[token]/page.tsx lines 74-114 (loadNextQuestion)
  found: `loadNextQuestion` 调用 `/next-question`，该端点返回下一题数据或 `{ waiting: true }`，不含当前题的反馈信息
  implication: 编程题的判题结果（score、feedback）无法通过 `/next-question` 传递到前端，用户无法看到编程题评分反馈

- timestamp: 2026-05-10T08:28:00Z
  checked: packages/backend/src/routes/assessment.ts lines 540-605 (objective submit branch)
  found: 客观题提交时：(1) 调用 `scoreObjectiveAnswer` 立即判题；(2) 调用 `updateSessionAfterAnswer` 增量计数；(3) 返回 `{ is_correct, feedback, done }` 进入 FEEDBACK 状态
  implication: 客观题流程正确，编程题流程缺少 `updateSessionAfterAnswer` 调用和 FEEDBACK 状态展示

## Resolution

root_cause: 
1. **进度条计数错误**：编程题提交时未调用 `updateSessionAfterAnswer`，导致 `total_answered` 计数器不增加；Agent 评分后 `/answer-score` 也未调用 `updateSessionAfterAnswer`，导致 `total_correct` 计数器不更新。进度条数据来自 `getProgress`，依赖这两个计数器，因此编程题后进度显示永远落后。
2. **编程题无判题结果展示**：前端状态机在收到 `{ scoring: true }` 后进入 SCORING 状态并立即开始 polling 下一题，跳过 FEEDBACK 状态。后端 `/answer-score` 端点仅更新数据库，不推送评分结果到前端，导致用户无法看到编程题的判题反馈。

fix: 待定（诊断模式不修复）
verification: 待定
files_changed: []