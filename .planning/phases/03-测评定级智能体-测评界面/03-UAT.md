---
status: complete
phase: 03-测评定级智能体-测评界面
source: 03-11-SUMMARY.md, 03-12-SUMMARY.md, 03-13-SUMMARY.md, 03-14-SUMMARY.md
started: 2026-05-10T05:38:43Z
updated: 2026-05-10T09:47:46Z
round: 3
type: regression
scope: Round 2 issues only (8 items)
---

## Current Test

[testing complete]

## Tests

### 1. Course Label Display (was cosmetic, Test 2)
expected: 访问 /student/assessment，课程下拉列表初始显示 "C++ 编程"（而非 raw value "cpp"）。点击展开后选项列表显示 "C++ 编程"，与初始显示一致。
result: pass

### 2. Progress Bar + Coding Feedback (was major, Test 3)
expected: 进度条正确显示题号和正确数（含编程题）。编程题提交后 → AI 判题中 → 判题结果（正确/错误+解析）展示到界面 → 用户点击"下一题"加载新题目。状态机：answering → scoring → feedback → next。
result: pass

### 3. Objective State Reset (was minor, Test 4)
expected: 客观题加载后无默认选中状态。答完一题切到下一题时，选中状态清空，无残留高亮。
result: pass

### 4. Agent Counter Accuracy (was major, Test 6)
expected: 后端发给 agent 的题数统计准确（含编程题）。agent 不会多出题，测评题数不超过用户选择的题数。
result: pass

### 5. Report Page + Final Feedback (was blocker, Test 8)
expected: (1) 无 "Question is not active" 错误；(2) 报告页面显示知识点正确率柱状图；(3) 完成最后一题后先显示该题反馈，用户点击"查看测评报告"后才跳转报告页。
result: pass

### 6. Session Resume & History (was major, Test 9)
expected: 历史测评记录可正常恢复继续测评，无 "Invalid or expired token" 错误。点击"继续测评"跳转到答题页恢复进度。
result: pass

### 7. Navigation: Back Button (was minor, Test 10)
expected: 测评答题页和报告页左上角有"← 返回"按钮，点击跳转到 /student/assessment（确定性路由）。
result: pass

### 8. Question Bank: Level & Difficulty (Round 3 addition)
expected: 题目显示 "Lv.{level} | 难度 {difficulty}" 标签，级别和难度分离显示。Level 1-4 每级有 10 题，难度覆盖 1-8 范围。
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]

## Round History

### Round 2 issues (regression targets)
| # | Original Test | Severity | Fix Plan |
|---|--------------|----------|----------|
| 1 | Test 2: Course label | cosmetic | 03-12 |
| 2 | Test 3: Progress + coding feedback | major | 03-13 |
| 3 | Test 4: Objective state reset | minor | 03-12 |
| 4 | Test 6: Agent counter accuracy | major | 03-13 |
| 5 | Test 8: Report + final feedback | blocker | 03-11 + 03-13 |
| 6 | Test 9: Session resume | major | 03-11 |
| 7 | Test 10: Back button | minor | 03-12 |
| 8 | New: Level/difficulty display | — | inline fix |
