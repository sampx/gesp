---
status: ready_to_fix
phase: 03-测评定级智能体-测评界面
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md, 03-07-SUMMARY.md, 03-08-SUMMARY.md, 03-09-SUMMARY.md, 03-10-SUMMARY.md
started: 2026-05-10T05:38:43Z
  updated: 2026-05-10T06:35:50Z
round: 2
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: 停止所有正在运行的服务。清除临时状态。从头启动应用。服务器无报错启动，seed/migration 完成，健康检查或主页加载返回正常数据。
result: issue
reported: "应用启动成功、登录可用，但调试日志有重复请求：/api/auth/me 调用 4 次、/api/assessment/sessions 调用 2 次、POST /student/dashboard 和 POST /student/assessment 各调用 2 次"
severity: minor

### 2. Start Page: Enter Assessment
expected: 访问 `/student/assessment`，看到 1-8 级滑块及描述、C++ 课程选择、可展开的高级选项。点击"开始测评"→ 跳转到 `/student/assessment/{token}`。
result: issue
reported: "课程下拉列表初始显示 cpp，点击后显示 C++ 编程，初始值与展开值不一致"
severity: cosmetic

### 3. Answer Page: Question Display
expected: 跳转后，进度条正确显示题目编号、正确数/总题数、等级、总题数/时长/剩余题数/剩余时长。AI agent logo 位于 header 栏用户图标左侧。题目加载后显示对应的输入控件（客观题或编程题）。
result: issue
reported: "1. 题目编号不正确，做第三题时显示第二题，正确数/总题数也显示不正确（有编程题后就不正确了，可能是没有计算编程题）2. 编程题提交答案后界面跳转流程与客观题不一致，当前只显示 ai 判题中然后跳转到下一题界面，很长时间才显示下一题题目，体验不好。希望一致：ai 判题后显示判题结果到界面上，然后让用户点击下一题，需 ai 提供下一题后按钮才能点击"
severity: major

### 4. Answer Page: Objective Question
expected: 单选题选项可点击，大触控区域（p-4 内边距）。选中选项后可提交。题目加载速度快（feedback 阶段预取），下一题按钮在题目准备好后才亮起，点击后不卡住。
result: issue
reported: "客观题基本正常，但有时客观题显示后默认有选中状态，应该是有 bug"
severity: minor

### 5. Answer Page: Coding Question
expected: 代码输入框可见，有代码预览区域。
result: pass

### 6. Answer Page: Submit & Feedback Flow
expected: 提交答案 → 显示反馈（正确/错误 + 解析）。点击"下一题"→ 加载新题目。状态机正常循环：loading → answering → judging → feedback → next。agent 知晓总题数和时长，不会中途随意结束。agent 给出终止评价后界面同步跳转到测评报告页，不显示新题目。
result: issue
reported: "之前有编程题后，gesp 后端发送给 ai agent 的题数统计信息就不正确了，导致 agent 可能会多出题，测评题数可能会超过用户选择的题数"
severity: major

### 7. Answer Page: Chat Panel
expected: 右下角聊天切换按钮可见。点击打开 → 面板滑入显示 SSE 智能体消息。关闭面板后新消息显示未读角标。
result: pass

### 8. Report Page: Results Display
expected: 测评完成后看到等级徽章（如"Lv.3"）、统计网格（答题数、正确数）、知识点掌握度柱状图、AI 评语 Markdown。知识点正确率统计与 AI 综合评价内容一致。测评过程中调试日志适量，不刷屏。"开始学习"→ `/student/learning`，"再测一次"→ `/student/assessment`。
result: issue
reported: "1. 偶尔出现 'Question is not active for this session' 错误，无法继续测评 (blocker)；2. 报告页面没有知识点正确率统计数据；3. 完成最后一题后没有展示最后一题的结果，直接跳转到报告页面，应该让用户点击后再查看报告"
severity: blocker

### 9. Session History & Resume
expected: 学员可查看历次测评记录，显示状态（进行中/已完成）。可继续未完成的测评，复用 ellamaka 会话恢复进度。可删除测评记录。测评列表显示测评次数和状态。
result: issue
reported: "界面可以显示历史测评记录，但有些记录无法继续测评，点击后显示: Invalid or expired token"
severity: major

### 10. Mobile Responsiveness
expected: 小屏幕下：聊天面板全宽（w-full sm:w-96）、单选按钮大触控区域、代码输入框全宽、聊天按钮右下角可触达。
result: issue
reported: "可以显示，但所有界面缺少返回按钮，进入后续界面后无法跳转回测评初始界面，只能用浏览器的后退按钮"
severity: minor

## Summary

total: 10
passed: 2
issues: 8
pending: 0
skipped: 0

## Gaps

- truth: "开发模式下 API 请求无重复调用"
  status: accepted
  resolution: "React StrictMode 开发模式预期行为，非 bug。StrictMode double-invoke useEffect 帮助发现副作用问题，生产环境自动禁用不受影响"
  severity: minor
  test: 1

- truth: "课程下拉列表初始显示值与展开值一致"
  status: failed
  reason: "User reported: 课程下拉列表初始显示 cpp，点击后显示 C++ 编程，初始值与展开值不一致"
  root_cause: "Select 组件初始显示区使用 raw value（cpp）而非 human-readable label（C++ 编程），缺少 course_id 到 display_name 的映射"
  severity: cosmetic
  test: 2

- truth: "进度条正确显示题号和正确数（含编程题），编程题提交后有判题结果展示环节"
  status: failed
  reason: "User reported: (1) 题目编号不正确，做第三题时显示第二题，正确数/总题数也显示不正确（有编程题后就不正确了，可能是没有计算编程题）；(2) 编程题提交答案后界面跳转流程与客观题不一致，当前只显示 ai 判题中然后跳转到下一题界面，很长时间才显示下一题题目，体验不好。希望一致：ai 判题后显示判题结果到界面上，然后让用户点击下一题，需 ai 提供下一题后按钮才能点击"
  root_cause: "编程题提交时未调用 updateSessionAfterAnswer 导致 total_answered 计数器不更新；前端 SCORING 状态直接 poll 下一题跳过 FEEDBACK 状态，用户无法看到判题结果"
  severity: major
  test: 3

- truth: "客观题显示后无默认选中状态"
  status: failed
  reason: "User reported: 有时客观题显示后默认有选中状态，应该是有 bug"
  root_cause: "ObjectiveQuestion 组件使用内部 useState 管理选中状态，父组件渲染时缺少 key={question.id}，React 复用组件实例导致旧 state 残留"
  severity: minor
  test: 4

- truth: "后端发给 agent 的题数统计信息准确（含编程题）"
  status: failed
  reason: "User reported: 之前有编程题后，gesp 后端发送给 ai agent 的题数统计信息就不正确了，导致 agent 可能会多出题，测评题数可能会超过用户选择的题数"
  root_cause: "编程题提交分支和评分端点（/answer-score）都未调用 updateSessionAfterAnswer，total_answered 和 total_correct 计数器未更新"
  severity: major
  test: 6

- truth: "测评过程无 'Question is not active' 错误，报告页面显示知识点正确率，最后一题有反馈环节"
  status: failed
  reason: "User reported: (1) 偶尔出现 'Question is not active for this session' 错误，无法继续测评；(2) 报告页面没有知识点正确率统计数据；(3) 完成最后一题后没有展示最后一题的结果，直接跳转到报告页面，应该让用户点击后再查看报告"
  root_cause: "(1) 内存锁 currentQuestionLocks Map 服务器重启丢失；(2) completeSession 未持久化 knowledge_stats + 空对象不触发 ?? 回退；(3) handleSubmit done 判断优先于 FEEDBACK 状态"
  severity: blocker
  test: 8

- truth: "历史测评记录可正常恢复继续测评"
  status: failed
  reason: "User reported: 界面可以显示历史测评记录，但有些记录无法继续测评，点击后显示: Invalid or expired token"
  root_cause: "verifyToken 2h SESSION_EXPIRY_MS 过期限制，resume 路径不应受 age check（或前端应过滤 >2h session）"
  severity: major
  test: 9

- truth: "测评界面有返回按钮可跳转回初始界面"
  status: failed
  reason: "User reported: 所有界面缺少返回按钮，进入后续界面后无法跳转回测评初始界面，只能用浏览器的后退按钮"
  root_cause: "StudentNavbar 未实现条件性返回按钮，仅有品牌名和用户菜单，缺少基于路由层级判断的导航控件"
  severity: minor
  test: 10
