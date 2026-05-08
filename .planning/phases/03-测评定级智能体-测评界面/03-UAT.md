---
status: testing
phase: 03-测评定级智能体-测评界面
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md
started: 2026-05-08T10:16:32Z
updated: 2026-05-08T10:16:32Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  停止所有运行中的服务。清除临时状态（临时数据库、缓存等）。从头启动应用（backend + frontend）。服务无错误启动，seed/migration 正常完成，`/api/auth/me` 返回健康响应。
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: 停止所有运行中的服务。清除临时状态（临时数据库、缓存等）。从头启动应用（backend + frontend）。服务无错误启动，seed/migration 正常完成，`/api/auth/me` 返回健康响应。
result: pending

### 2. 起测页 — 级别选择与课程配置
expected: 导航到 `/student/assessment`。级别滑块显示 1-8 级描述。课程选择显示 "C++ 编程"。高级选项可展开/折叠（题目数量、时间限制）。点击 "开始测评" 后跳转到 `/student/assessment/{token}`。
result: pending

### 3. 答题页 — 题目加载与进度条
expected: 跳转到答题页后，进度条显示当前级别和已答/总题数。题目加载（客观题显示 radio 选项，编程题显示 textarea）。题目内容完整可读。
result: pending

### 4. 答题页 — 提交答案与反馈
expected: 客观题：选择选项后提交，显示正确/错误反馈 + 解释。编程题：提交代码后进入判定态。点击 "下一题" 加载新题目。
result: pending

### 5. Agent 智能体 — 题目选择与出题
expected: 测评开始后，Agent 能正常接收 token 并调用 `select_next_question` 工具选题。前端的 `GET /next-question` 不陷入无限轮询循环。Agent 5-10 题后正常结束测评返回报告。
result: pending

### 6. 聊天面板 — SSE 实时消息
expected: 右下角聊天按钮可切换面板开关。Agent 消息实时流式显示（SSE）。面板关闭时未读消息显示 badge 计数。消息内容无 raw token/内部提示泄露。
result: pending

### 7. 报告中 — 定级结果与知识分解
expected: 测评完成后跳转报告页（或直接导航 `/student/assessment/{token}/report`）。显示等级徽章（如 "Lv.3"）、答题统计（答题数/正确数）、知识维度分解柱状图、AI 评价 markdown 渲染。"开始学习" 按钮跳转 `/student/learning`，"再测一次" 跳转 `/student/assessment`。
result: pending

### 8. 移动端响应式
expected: 小屏幕（<640px）下：聊天面板全宽（`w-full`）、单选按钮触控面积大（`p-4`）、textarea 全宽、聊天切换按钮在右下角可触达。布局不溢出、不错位。
result: pending

### 9. 测评中断恢复
expected: 答题中途关闭浏览器 → 重新登录 → 系统检测到未完成测评 → 恢复进度继续答题。已答题目和进度保留。
result: pending

## Summary

total: 9
passed: 0
issues: 0
pending: 9
skipped: 0

## Gaps

[none yet]
