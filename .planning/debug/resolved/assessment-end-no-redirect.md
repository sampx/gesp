---
status: diagnosed
trigger: "AI 给出测评终止综合评价后，界面还显示了新的题目，没有同步跳转到测评报告页面"
created: 2026-05-09T10:00:00Z
updated: 2026-05-09T10:25:00Z
---

## Current Focus

hypothesis: CONFIRMED — POST /evaluate lacks completion signaling, and frontend never polls session status
test: Traced complete flow from agent → /evaluate → session DB → frontend state machine
expecting: Found the disconnect
next_action: Return diagnosis

## Symptoms

expected: AI 给出测评终止评价后，界面同步跳转到测评报告页面，不再显示新题目
actual: AI 给出测评终止综合评价后，界面还显示了新的题目（AI 没有选择题目），界面没有同步跳转到测评报告页面
errors: 无报错信息
reproduction: Test 6 in 03-UAT.md - 触发 AI 综合评价终止测评
started: UAT 测试时发现

## Eliminated

暂无

## Evidence

- timestamp: 2026-05-09T10:00:00Z
  checked: UAT.md Test 6
  found: 用户反馈：测评终止后界面显示新题目，AI 未选择题目，界面未跳转到报告页
  implication: Frontend 在收到完成信号后仍有机制触发题目显示

- timestamp: 2026-05-09T10:05:00Z
  checked: POST /evaluate endpoint (routes/assessment.ts:935-967)
  found: 只调用 assessment.updateEvaluation(sessionId, evaluation)，保存 evaluation 文本和 knowledge_stats。不返回 done/final_level 信号，不更新 session.status，不清理 autoSelectTimers
  implication: Agent 的终止操作完全没有传递到 frontend，session 仍然是 in_progress

- timestamp: 2026-05-09T10:08:00Z
  checked: updateEvaluation service (services/assessment.ts:539-551)
  found: 只更新 evaluation 和 knowledge_stats 字段，不修改 status 或 completed_at
  implication: DB 中 session.status 仍然是 in_progress

- timestamp: 2026-05-09T10:10:00Z
  checked: Frontend state machine (page.tsx)
  found: 只有 handleSubmit (line 127) 检查 res.data.done 来进入 DONE 状态。loadNextQuestion (line 59-85) 调用 /next-question 只检查 waiting 状态。无 SSE completion 监听。无 /progress status 轮询
  implication: Frontend 没有任何路径能检测到 agent 通过 /evaluate 终止的测评

- timestamp: 2026-05-09T10:12:00Z
  checked: autoSelectTimer (routes/assessment.ts:202-227)
  found: /candidates 调用时启动 30s 定时器。只在 /select 和 clearAutoSelectTimer 中清理。/evaluate 不清理定时器
  implication: 如果上一轮 /candidates 启动了定时器，agent 调用 /evaluate 而非 /select，定时器会继续运行，30s 后自动锁定一道题目

- timestamp: 2026-05-09T10:15:00Z
  checked: POST /submit 中的 checkRoundCompletion (routes/assessment.ts:118-176)
  found: 只在 submit 客观题后执行。如果 agent 在 submit 之前就决定终止，此检查不会触发。round completion 只在 totalAnswered >= questionLimit 或 round boundary convergence 时返回 done
  implication: Agent 提前终止测评时，submit 中的 checkRoundCompletion 不会返回 done

- timestamp: 2026-05-09T10:18:00Z
  checked: assessor agent (assessor.md)
  found: Agent 在"收到测评已完成通知"后调用 update_evaluation。但 agent 本身不做终止决策——它等待系统通知。但实际流程中 agent 可能自主判断终止并调用 update_evaluation
  implication: Agent 流程与后端完成机制不一致

- timestamp: 2026-05-09T10:20:00Z
  checked: GET /next-question (routes/assessment.ts:560-601)
  found: 不检查 session.status。只要 question lock 存在就返回题目，不管 session 是否已完成
  implication: 即使 session 被标记为 completed（理论上），/next-question 仍会返回锁定的题目

- timestamp: 2026-05-09T10:22:00Z
  checked: 03-03-SUMMARY.md
  found: checkRoundCompletion 原本是 stub（"MVP placeholder for convergence logic"），后已实现。但 /evaluate 仍缺少完成信号
  implication: 实现了 submit 路径的收敛，但完全忽略了 agent-driven 终止路径

## Resolution

root_cause: |
  Three-layer disconnect between agent termination and frontend state machine:
  
  1. **POST /evaluate does not signal completion**: When the assessor agent calls /evaluate with a final evaluation, the endpoint only saves the evaluation text and recomputes knowledge_stats. It does NOT update session.status to 'completed', does NOT return a done=true signal, and does NOT clear the autoSelectTimer. (routes/assessment.ts:935-967, services/assessment.ts:539-551)
  
  2. **Frontend never detects agent-initiated completion**: The frontend state machine ONLY transitions to DONE when POST /submit returns done=true (line 127). The loadNextQuestion poll only checks for a locked question or waiting status, never session status. There is no SSE event listener for completion, and no periodic /progress polling to check status='completed'. (page.tsx:59-85, 98-137)
  
  3. **Auto-select timer fires after agent terminates (the "mystery question")**: When /candidates is called, a 30s auto-select timer starts with candidate[0] as fallback. If the agent decides to terminate (calls /evaluate instead of /select), the timer is NOT cleared. After 30s, it fires lockQuestion() which locks candidate[0] as the next question. The frontend then polls /next-question, finds the locked question, and displays it — despite the agent having already written a final evaluation. (routes/assessment.ts:202-227, specifically startAutoSelectTimer called at line 883, not cleared in /evaluate handler)

fix: |
  Requires fixes in three places:
  - POST /evaluate: When agent sends final evaluation, update session status to 'completed', set final_level, clear autoSelectTimers, and return { done: true, final_level }
  - GET /next-question: Check session.status before returning question — if 'completed', return { done: true, final_level } instead
  - Frontend: In loadNextQuestion, check for done signal from /next-question and transition to DONE state
verification: 待验证
files_changed: []
