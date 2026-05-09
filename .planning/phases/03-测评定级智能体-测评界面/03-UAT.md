---
status: diagnosed
phase: 03-测评定级智能体-测评界面
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md
started: 2026-05-09T08:00:37Z
updated: 2026-05-09T10:03:57Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: 停止所有正在运行的服务。清除临时状态。从头启动应用。服务器无报错启动，seed/migration 完成，健康检查或主页加载返回正常数据。
result: pass

### 2. Start Page: Enter Assessment
expected: 访问 `/student/assessment`，看到 1-8 级滑块及描述、C++ 课程选择、可展开的高级选项。点击"开始测评"→ 跳转到 `/student/assessment/{token}`。
result: pass

### 3. Answer Page: Question Display
expected: 跳转后，看到进度条（等级+答题数）。题目加载，显示对应的输入控件（客观题或编程题）。
result: issue
reported: "可以显示, 但有几个问题:
1. 答题过程中显示的这个状态信息如: 第 2 题 正确 1/1 , 测评题目总数量/正确数量, 题编号都是错误的. 也没有显示前页总题数\时长\剩余题数\剩余时长等信息.  
2. ai agent 的 logo 我希望是在 head 栏中 用户图标左侧, 现在是在左下角, 与 chat 框(右侧) 不协调."
severity: major

### 4. Answer Page: Objective Question
expected: 单选题选项可点击，大触控区域（p-4 内边距）。选中选项后可提交。
result: issue
reported: "可以提交, 问题如下:
1. 显示题目速度非常慢, 每次要 agent 来出下一题, 需要研究如何提前出题,提升用户体验
2. 应该在下一题准备好以后再亮起按钮, 不能等用户点击下一题后, 界面卡住等待."
severity: major

### 5. Answer Page: Coding Question
expected: 代码输入框可见，有代码预览区域。
result: pass

### 6. Answer Page: Submit & Feedback Flow
expected: 提交答案 → 显示反馈（正确/错误 + 解析）。点击"下一题"→ 加载新题目。状态机正常循环：loading → answering → judging → feedback → next。
result: issue
reported: "基本可用, 有以下问题:
1. 题库中题目太少, 很多级别缺失, 无法测出用户真实编程水平和级别
2. ai agent 不知道测评的总题数和用户答题时长等信息, 容易中途随意结束测评
3. ai 给出测评终止综合评价后, 界面还显示了新的题目(ai 没有选择题目, 界面上的题目是哪里来的?), 界面没有同步跳转到测评报告页面."
severity: blocker

### 7. Answer Page: Chat Panel
expected: 右下角聊天切换按钮可见。点击打开 → 面板滑入显示 SSE 智能体消息。关闭面板后新消息显示未读角标。
result: pass

### 8. Report Page: Results Display
expected: 测评完成后看到等级徽章（如"Lv.3"）、统计网格（答题数、正确数）、知识点掌握度柱状图、AI 评语 Markdown。"开始学习"→ `/student/learning`，"再测一次"→ `/student/assessment`。
result: issue
reported: "界面基本可用, 但是知识点正确率部分统计与 ai 给出的综合评价内容不一致, 另外, 测评过程中此类调试日志太多:
2026/05/09 15:49:51 [DEBUG] event_type=message.part.updated ... SSE event matched"
severity: major

### 9. Mobile Responsiveness
expected: 小屏幕下：聊天面板全宽（w-full sm:w-96）、单选按钮大触控区域、代码输入框全宽、聊天按钮右下角可触达。
result: pass

## Summary

total: 9
passed: 5
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "进度条正确显示题目编号、正确数/总题数、等级，以及总题数/时长/剩余题数/剩余时长等信息"
  status: failed
  reason: "User reported: 答题过程中显示的状态信息如第 2 题 正确 1/1、测评题目总数量/正确数量、题编号都是错误的。也没有显示前页总题数、时长、剩余题数、剩余时长等信息。"
  severity: major
  test: 3
  root_cause: "三重根因：(1) FEEDBACK 状态下题号 off-by-one — progress-bar.tsx:20 在反馈阶段显示 `totalAnswered + 1` 而非实际题号；(2) ProgressBar 组件仅渲染 Lv/题号/正确率进度条，未渲染 questionLimit/剩余题数/时长；(3) 后端 getProgress() 未返回 config_time_limit_min，全栈无时间追踪逻辑"
  artifacts:
    - path: "apps/web/src/components/assessment/progress-bar.tsx"
      issue: "题号 off-by-one；缺少总题数/剩余题数/时长渲染"
    - path: "apps/web/src/app/student/assessment/[token]/page.tsx"
      issue: "handleSubmit 提前递增 total_answered；初始 config_question_limit 硬编码 30 与实际 5 不符"
    - path: "packages/backend/src/services/assessment.ts"
      issue: "getProgress() 不返回 config_time_limit_min，无时间追踪逻辑"
  missing:
    - "修复 FEEDBACK 状态题号 off-by-one"
    - "ProgressBar 增加总题数、剩余题数、时长/剩余时长显示"
    - "getProgress 返回 config_time_limit_min 和时间数据"
  debug_session: .planning/debug/progress-bar-incorrect.md

- truth: "AI agent logo 位于 head 栏用户图标左侧，而非左下角"
  status: failed
  reason: "User reported: ai agent 的 logo 我希望是在 head 栏中用户图标左侧，现在是在左下角，与 chat 框（右侧）不协调。"
  severity: cosmetic
  test: 3
  root_cause: "ChatPanel 的 Bot 图标是 `fixed bottom-6 left-6` 的浮动切换按钮，非独立的 header 元素。StudentNavbar header 无 agent logo slot，两者结构独立"
  artifacts:
    - path: "apps/web/src/components/assessment/chat-panel.tsx"
      issue: "Bot 图标为 fixed bottom-6 left-6 toggle button，非 header 元素"
    - path: "apps/web/src/components/student-navbar.tsx"
      issue: "Header 无 agent logo slot"
    - path: "apps/web/src/app/student/layout.tsx"
      issue: "Layout 分离 header 与 content，ChatPanel 无法出现在 header 中"
  missing:
    - "StudentNavbar 增加 agent logo slot（用户头像左侧）"
    - "ChatPanel Bot 图标迁移至 header 或保留并同步到 header"
  debug_session: .planning/debug/agent-logo-position.md

- truth: "题目加载速度快，无需等待 agent 逐题生成"
  status: failed
  reason: "User reported: 显示题目速度非常慢，每次要 agent 来出下一题，需要研究如何提前出题提升用户体验"
  severity: major
  test: 4
  root_cause: "无预取机制 — agent 仅在收到答题通知后才开始选择下一题（promptAsync fire-and-forget），前端轮询 /next-question 等待 lock。30s auto-select fallback 确认系统预期间隔 10-30s。缺失 SSE-based question-ready push 和 feedback 阶段的预加载"
  artifacts:
    - path: "packages/backend/src/routes/assessment.ts"
      issue: "/submit 仅 fire-and-forget 通知 agent，不同步预锁下一题；/next-question 纯轮询无 push"
    - path: "apps/web/src/app/student/assessment/[token]/page.tsx"
      issue: "前端仅用户点击后才轮询，无预取或 SSE 推送接收"
    - path: "packages/backend/src/services/assessment.ts"
      issue: "in-memory lock Map 无预锁或后台选择机制"
  missing:
    - "feedback 阶段预取下一题（agent 选择与用户查看反馈并行）"
    - "SSE stream 推送 question-ready 事件替代轮询"
  debug_session: .planning/debug/question-loading-slow.md

- truth: "下一题按钮在题目准备好后才亮起，点击后不卡住"
  status: failed
  reason: "User reported: 应该在下一题准备好以后再亮起按钮，不能等用户点击下一题后界面卡住等待"
  severity: major
  test: 4
  root_cause: "FEEDBACK 状态立即渲染 '下一题' 按钮，无 prefetch。点击后 loadNextQuestion 直接进入 LOADING_QUESTION（骨架屏），而 /next-question 返回 {waiting: true} 需轮询。agent 选择题目与用户点击之间存在数秒 gap"
  artifacts:
    - path: "apps/web/src/app/student/assessment/[token]/page.tsx"
      issue: "FEEDBACK 状态无条件渲染按钮；loadNextQuestion 未检查 question 是否已就绪就进入 skeleton；无预取逻辑"
    - path: "packages/backend/src/routes/assessment.ts"
      issue: "/submit 异步通知 agent 与 /select 之间的延迟无法被前端桥接"
  missing:
    - "按钮渲染条件：题目就绪后才亮起"
    - "FEEDBACK 阶段预取下一题，避免点击后进入 loading skeleton"
  debug_session: .planning/debug/button-not-ready.md

- truth: "题库覆盖所有 1-8 级，题目数量充足，能准确测评用户真实水平"
  status: failed
  reason: "User reported: 题库中题目太少，很多级别缺失，无法测出用户真实编程水平和级别"
  severity: major
  test: 6
  root_cause: "seed 脚本 assessment-questions.seed.ts 仅覆盖 L1-L4（共 16 题，每级 4 题）。L5-L8 题目数为零。自适应算法 evaluateRound 可升至 L8，但 getCandidates 对 L5+ 返回空数组"
  artifacts:
    - path: "packages/backend/src/seed/assessment-questions.seed.ts"
      issue: "QUESTIONS 数组仅含 L1-L4（16 题），L5-L8 缺失"
    - path: "packages/backend/src/services/assessment.ts"
      issue: "getCandidates 查询 L5+ 返回空数组；evaluateRound 可升至 L8 但无题可测"
  missing:
    - "seed 脚本扩展至 L5-L8（每级至少 4 题，覆盖对应 GESP C++ 知识点）"
  debug_session: .planning/debug/question-bank-too-small.md

- truth: "AI agent 知晓测评总题数和用户答题时长，不会中途随意结束测评"
  status: failed
  reason: "User reported: ai agent 不知道测评的总题数和用户答题时长等信息，容易中途随意结束测评"
  severity: major
  test: 6
  root_cause: "四层缺失：(1) buildSystemPrompt 不传 config；(2) promptAsync 答题通知不携带进度；(3) gesp-plugin 无 query_progress 工具；(4) assessor.md 完全依赖被动通知，无配置/进度感知指令"
  artifacts:
    - path: "packages/backend/src/routes/assessment.ts"
      issue: "buildSystemPrompt 仅传学员姓名/课程/起始级别，不传 question_limit/time_limit"
    - path: "packages/backend/src/services/assessment.ts"
      issue: "DEFAULT_QUESTION_LIMIT/DEFAULT_TIME_LIMIT_MIN 常量定义但未用于 agent context"
    - path: ".wopal/plugins/gesp-plugin/tools.ts"
      issue: "缺失 query_progress 工具"
    - path: ".wopal/agents/assessor.md"
      issue: "无配置/进度感知指令，依赖被动通知"
  missing:
    - "buildSystemPrompt 注入 config（question_limit, time_limit）"
    - "答题通知携带进度百分比"
    - "增加 query_progress 工具"
    - "assessor.md 加入配置感知指令"
  debug_session: .planning/debug/agent-missing-context.md

- truth: "AI 给出测评终止评价后，界面同步跳转到测评报告页面，不再显示新题目"
  status: failed
  reason: "User reported: ai 给出测评终止综合评价后，界面还显示了新的题目（ai 没有选择题目，界面上的题目是哪里来的？），界面没有同步跳转到测评报告页面"
  severity: blocker
  test: 6
  root_cause: "三重断裂：(1) POST /evaluate 不设 session.status='completed' 且不清理 autoSelectTimers — agent 调用 /evaluate 而非 /select，但 timer 未被清理，30s 后触发 lockQuestion 产生 '幽灵题目'；(2) GET /next-question 不检查 session.status，有 lock 就返题；(3) 前端状态机仅通过 submit response.done 检测 DONE，无 agent 终止路径"
  artifacts:
    - path: "packages/backend/src/routes/assessment.ts"
      issue: "POST /evaluate 不更新 session.status/completed_at；不清理 autoSelectTimers；GET /next-question 不检查 session status"
    - path: "packages/backend/src/services/assessment.ts"
      issue: "updateEvaluation() 仅更新 evaluation + knowledge_stats，不修改 status"
    - path: "apps/web/src/app/student/assessment/[token]/page.tsx"
      issue: "状态机仅通过 submit response.done 检测 DONE，无 agent 终止路径"
    - path: ".wopal/agents/assessor.md"
      issue: "Agent 调用 update_evaluation 后无 done 信号反馈"
  missing:
    - "POST /evaluate 设置 session.status='completed'/final_level/completed_at、清理 autoSelectTimers、返回 {done:true}"
    - "GET /next-question 检查 session.status，completed 时返回 {done:true}"
    - "前端 loadNextQuestion 处理 done 信号，转入 DONE 状态跳转报告页"
  debug_session: .planning/debug/assessment-end-no-redirect.md

- truth: "知识点正确率统计与 AI 综合评价内容一致"
  status: failed
  reason: "User reported: 知识点正确率部分统计与 ai 给出的综合评价内容不一致"
  severity: major
  test: 8
  root_cause: "computeKnowledgeStats 使用 sum(is_correct)，SQLite sum(null)=0，编程题 is_correct=null 被计为错误。编程题提交后无评分回写机制 — agent 评估结果通过 update_evaluation（仅 Markdown 文本）写入，不更新 assessmentAnswers 表。两条数据路径独立"
  artifacts:
    - path: "packages/backend/src/services/assessment.ts"
      issue: "computeKnowledgeStats sum(is_correct) 未过滤 is_correct=null 的编程题"
    - path: "packages/backend/src/routes/assessment.ts"
      issue: "编程题提交后 is_correct=null 永久保持，无评分回写逻辑"
    - path: ".wopal/plugins/gesp-plugin/tools.ts"
      issue: "update_evaluation 缺少 score/feedback 参数，无法持久化单题评分"
    - path: "packages/backend/src/db/schema/assessment.ts"
      issue: "Schema 定义 is_correct/score/feedback 字段但后端从未使用后两者"
  missing:
    - "gesp-plugin 增加 update_answer_score 工具（score/feedback → UPDATE assessmentAnswers）"
    - "computeKnowledgeStats 过滤 is_correct=null 的编程题或使用 COALESCE"
  debug_session: .planning/debug/knowledge-stats-mismatch.md

- truth: "测评过程中调试日志适量，不刷屏"
  status: failed
  reason: "User reported: 测评过程中此类调试日志太多: 2026/05/09 15:49:51 [DEBUG] event_type=message.part.updated ... SSE event matched"
  severity: minor
  test: 8
  root_cause: "ellamaka-client.ts:167-170 在 SSE 事件循环中对每个非 delta 事件打印 debug 日志。reasoning 阶段产生高频 message.part.updated 事件，每次触发日志导致刷屏"
  artifacts:
    - path: "packages/backend/src/services/ellamaka-client.ts"
      issue: "SSE 事件循环内 debug 日志对每个 message.part.updated 触发，包括高频 reasoning 更新"
  missing:
    - "将 SSE 事件日志降级为 trace 或排除高频事件类型"
  debug_session: .planning/debug/debug-logs-verbose.md

- truth: "学员可查看历次测评记录，选择未完成的测评继续，复用 ellamaka 会话恢复进度；可删除测评；测评列表显示状态"
  status: failed
  reason: "User reported: 学员测评中途退出后重新进入测评界面，看不到之前的历次测评，无法继续未完成的测评，每次测评都重新开始，也看不到测评了多少次，无论完成还是过程中都看不到，这个功能不可用"
  severity: blocker
  test: 0
  root_cause: "四层缺失：后端路由无 GET /sessions 端点；服务层无 listStudentSessions() 函数；前端 API 无 getAssessmentHistory()；前端 UI 仅「开始新测评」表单，无历次记录列表。数据库 assessment_sessions 有 status/student_id/started_at/completed_at 字段和索引，RESUME 端点也存在，但用户无法发现过去的 session token"
  artifacts:
    - path: "packages/backend/src/routes/assessment.ts"
      issue: "缺失 GET /sessions 端点（按 student_id 查询历次测评）"
    - path: "packages/backend/src/services/assessment.ts"
      issue: "缺失 listStudentSessions() 函数"
    - path: "apps/web/src/lib/server-api.ts"
      issue: "缺失 getAssessmentHistory() 函数"
    - path: "apps/web/src/app/student/assessment/page.tsx"
      issue: "缺失历次测评列表 UI，仅展示「开始新测评」表单"
  missing:
    - "新增 GET /api/assessment/sessions 端点（StudentAuth，返回当前学员历次测评）"
    - "新增 listStudentSessions() 服务函数"
    - "server-api.ts 新增 getAssessmentHistory()"
    - "start page 增加历次测评列表（状态/时间/操作：继续/删除）"
  debug_session: .planning/debug/missing-session-history.md
