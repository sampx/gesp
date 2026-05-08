# Phase 3: 测评定级智能体 + 测评界面 - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

构建 GESP 自适应测评系统，包括：

1. **gesp-plugin（ellamaka 插件）** — 3 个 tool（`get_question_candidates` / `select_next_question` / `update_evaluation`），薄代理 gesp backend HTTP API，`GESP_API_KEY` 认证
2. **assessor agent（ellamaka）** — 持续评估顾问 + 动态选题者，通过 `assessor.md` 定义角色+行为约束，观察学员答题、动态出题、生成综合评价、聊天面板互动
3. **gesp backend 测评 API** — 6 个 REST 端点（start / submit / next-question / progress / resume / SSE stream），3 张新表（assessment_sessions / assessment_answers / assessment_questions）
4. **学员端测评界面** — 起测页 → 做题页（表单 UI + 聊天浮层）→ 报告页，3 个路由，5 层状态机流转

**Scope Anchor:**
- 实现自适应测评定级（启发式规则 + 级数收敛），首期 1-8 级，每级 5 题，3 客观 + 2 编程可配置
- 题目来自独立 `assessment_questions` 表（AI 编制 + 教员审核），支持 LanceDB 语义搜索
- 支持测评中断恢复（token 机制跨 ellamaka 会话）
- 不实现：AI 自动编制题目（Phase 7）、管理端题库审核界面（Phase 7）、管理端测评参数配置面板（Phase 7）
- 默认仅 C++ 课程，但 schema 通用 `course_id` 设计，预留多课程扩展

</domain>

<decisions>
## Implementation Decisions

### 区域一：ellamaka Agent 集成

- **D-01:** Agent 调用模式 — SSE 流式。gesp backend 代理转发 ellamaka SSE 事件到前端聊天面板（EventSource 连接 `/api/assessment/{token}/stream`）
- **D-02:** Agent 定义 — 混合模式。`assessor.md` 定义基础角色+行为约束（严禁泄题），gesp backend 创建 ellamaka session 时通过 system prompt 注入动态上下文（token + student_info + course_info + 续评历史数据）
- **D-03:** Agent 角色 — 持续评估顾问 + 动态选题者。不做答题主持人（学员通过表单 UI 做题），不直接聊天收答案。观察所有答题行为、动态选最适合的下一题、生成综合评价、通过聊天面板给鼓励和引导
- **D-04:** gesp-plugin tool 面 — 3 个 tool：`get_question_candidates`（获取候选题目列表，仅含 summary 防漏题）、`select_next_question`（锁定下一题）、`update_evaluation`（写入综合评价）
- **D-05:** 客观题判分 — backend 直接比对答案（trim + lowercase 归一化），前端即时展示对错，agent 仅在收到答题消息后做分析和反馈
- **D-06:** 认证机制 — 评估令牌（token）。8-12 位字母数字 JWT token 编码 `{ assessment_session_id, student_id, course_id, exp }`。Backend 创建测评会话时生成，注入 agent system prompt。所有 tool 调用统一传 `token`。短有效期 2h，用完即废。跨 ellamaka 会话续评使用同一 token

### 区域二：测评策略

- **D-07:** 自适应算法 — 启发式规则 + 置信度判断。连续 2 轮同级别判定即停止，安全上限 30 题 / 30 分钟兜底
- **D-08:** 推进节奏 — 每级 5 题，≥3/5 正确→升级，≤1/5→降级，2/5 正确→同级继续。参数不硬编码，需支持后端配置（题量、阈值可通过管理面板调整，Phase 7 实现 UI）
- **D-09:** 停止条件 — 级别波动收敛 + 安全上限。backend 通过 submit 响应中 `{ done: true }` 通知前端和 agent
- **D-10:** 起始级别 — 首次自选（起测页滑块 1-8），后续从上次未完成挑战的级别继续。按 `course_id` 维度独立追踪

### 区域三：题目来源

- **D-11:** 题库独立性 — 独立 `assessment_questions` 表。不与 `practice_questions`/`exam_questions` 混用。AI agent 编制 + 教员审核上线。题目生命周期：`draft` → `pending` → `active`
- **D-12:** assessment_questions 关键字段 — `course_id`, `level`, `knowledge_point`, `question_type` (objective/coding), `difficulty`, `content`, `answer`, `explanation`, `status` (draft/pending/active), `created_by`, `embedding` (LanceDB)。embedding 由 题目文本 + 知识点描述 拼接后经 Ollama nomic-embed-text-v2 生成
- **D-13:** 动态选题 — Agent 驱动从候选池挑选。agent 调 `get_question_candidates({ course_id, level, hint? })` → backend 硬过滤（course_id + level + 已答题去重）+ LanceDB 语义搜索（hint 不为空时）+ type 轮转 → 返回 3-5 道候选（仅 summary，不含完整题目内容——防漏题）→ agent 选 → `select_next_question({ question_id })` → backend 锁定。Agent 未在 10s 内调用 select 时，backend 自动选第一道作为兜底
- **D-14:** 答案校验 — 客观题严格比对（trim + lowercase），支持单选字母/数字/文本多种答案格式归一化。编程题由 agent 评分 0-10 分，不跑沙盒代码执行
- **D-15:** 去重策略 — 跨会话不重复（查 `assessment_answers` 表按 session 排除），之前失败的题目允许重测。优先换题而非重测失败题
- **D-16:** 题型组合 — 3 客观 + 2 编程，可配置。编程题放在级末作为升级挑战。ratio 参数需支持管理面板调整

### 区域四：测评界面

- **D-17:** 页面布局 — 左侧表单做题主区 + 右上角 🤖 agent logo 悬浮按钮 → 点击展开右侧浮层聊天面板。默认聊天折叠，新消息时 logo 显示 badge 未读数
- **D-18:** 路由结构 — `/student/assessment`（起测）→ `/student/assessment/{token}`（进行中）→ `/student/assessment/{token}/report`（报告）。报告页兼顾历史查看：`/student/reports` 列表入口
- **D-19:** 题目渲染 — 选择题用 shadcn/ui RadioGroup/Button 组件，编程题用轻量 textarea + syntax highlight preview。先不用 Monaco/CodeMirror 重编辑器
- **D-20:** 状态流转 — 启动 → 选题中(loading) → 答题中 → 判题中(客观秒返/编程 spinner 轮询 progress) → 展示反馈 → 下一题 → 测评完成(done) → 重定向报告页
- **D-21:** 起测页 — 课程选择下拉 → 级别滑块(1-8) → 级别能力描述（联动变化）→ 高级选项折叠(题量上限/时间限制，从 admin 默认配置取) → 开始按钮
- **D-22:** 报告页 — 定级结果 + 用时统计 + 综合评价(Markdown 格式) + 知识点正确率条形图 + 建议学习路径 + 开始学习/再测一次按钮
- **D-23:** 移动端适配 — 全屏答题 + 聊天面板底部抽屉弹出 + textarea 全宽 + 语法高亮浮动菜单收起。选择题按钮纵向大尺寸排列，方便手指触控

### 区域五：数据模型与进度保存

- **D-24:** assessment_sessions — 核心字段：`id`, `token`(UNIQUE), `student_id`, `course_id`, `status`(in_progress/completed/abandoned), `start_level`, `current_level`, `final_level`, `config_question_limit`, `config_time_limit_min`, `total_answered`, `total_correct`, `level_history`(JSON), `knowledge_stats`(JSON), `evaluation`, `started_at`, `completed_at`
- **D-25:** assessment_answers — 核心字段：`id`, `session_id`, `question_id`, `question_order`, `student_answer`, `is_correct`(0/1/null), `score`(0-10/null), `feedback`, `time_spent_sec`。冗余字段 `course_id`, `level`, `knowledge_point`, `question_type` 用于去重查询性能
- **D-26:** 会话状态 — in_progress（进行中）/ completed（已完成）/ abandoned（超时未续评自动标记）。续评时 abandoned → in_progress 恢复。completed 后不可再加答
- **D-27:** 进度聚合 — 实时 SQL 聚合 + JSON 缓存双写。`knowledge_stats` 在 `update_evaluation` 时重新按 `assessment_answers` 聚合写入 `assessment_sessions`。查询进度时优先读 JSON 缓存，缓存为空时实时 SQL 聚合

### the agent's Discretion
- 聊天面板的具体动画和过渡效果
- 代码 syntax highlight 使用哪个轻量库（如 Prism.js light build）
- 起测页滑块的具体视觉样式（刻度/标签/颜色）
- 测评进行中的计时器 UI 样式（倒计时/进度条）
- 表单验证错误提示的具体文案
- 空状态（无测评记录、无可用题目）的展示方式
- 报告页知识点条形图使用哪种图表库（如 Recharts 或纯 CSS）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning
- `.planning/PROJECT.md` — 项目架构、技术栈、ellamaka SDK 代理模式、gesp-plugin 定位
- `.planning/REQUIREMENTS.md` — ASSESS-01~05, UI-ASSESS-01 完整需求定义
- `.planning/ROADMAP.md` § Phase 3 — 7 项 Success Criteria
- `.planning/phases/03-测评定级智能体-测评界面/03-DISCUSS-CHECKPOINT.json` — 完整讨论记录（27 项决策、架构总览、数据流、tool 契约、API 契约）

### Prior Phase Context
- `.planning/phases/02-知识库-双端骨架/02-CONTEXT.md` — 知识库 schema（LanceDB 4 表）、前端骨架路由、shadcn/ui 组件库、embedding 配置、统一登录
- `.planning/phases/02.1-用户基础流程补齐/02.1-CONTEXT.md` — 学员端 Navbar、角色体系（ROOT=100/ADMIN=10/STUDENT=1）、session-based auth

### Agent & Plugin Reference
- `projects/wopal-cli/src/lib/fae/client.ts` — FaeClient HTTP API 模式（`session.create` + `promptAsync` + SSE）— gesp backend → ellamaka 集成参考
- `projects/wopal-cli/src/commands/fae/stream.ts` — SSE 事件流式转发参考实现
- `.wopal/wopal-plugin/src/tools/wopal-task.ts` — OpenCode 插件 `tool()` 定义模式，gesp-plugin tool 模板
- `projects/ellamaka/packages/sdk/openapi.json` — ellamaka OpenAPI 规范，`/session` `/event` `/prompt_async` 端点

### Data Models
- `docs/products/gesp/research/gesp-data-models.md` — 现有知识库 schema
- `packages/backend/src/db/schema/` — Drizzle ORM schema 参考（users 表已有）

### Technology Stack
- `packages/backend/AGENTS.md` — 后端 Hono + Drizzle + SQLite 分层架构（routes → services → db）及代码规范
- `AGENTS.md` § Technology Stack — NextJS 15, shadcn/ui, TanStack Query, react-hook-form + Zod, SSE EventSource

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Auth System:** Phase 2.1 完整的 session-based auth（bcrypt, cookie, middleware, role guard）。`AdminAuth()`, `StudentAuth()` 直接复用
- **shadcn/ui 组件库:** 完整组件可用（Card, Button, Input, Dialog, Badge, Table, DropdownMenu, Sheet, Slider, RadioGroup, Progress, Skeleton 等）
- **Server Actions 模式:** `"use server"` + fetch backend + cookie 传递 + redirect（参考 `login/actions.ts`）
- **Hono + Drizzle 分层架构:** routes → services → db 三层，`success()`/`error()` 统一响应，zValidator + hono-openapi
- **LanceDB 集成:** 已有 `packages/backend/src/services/` 下 embedding service 和知识库查询
- **Ollama embedding:** `EMBEDDING_BASE_URL=http://macmini.local:11434/v1` / `EMBEDDING_MODEL=nomic-embed-text-v2-moe` 已配置可用

### Established Patterns
- **路由前缀:** `/api/auth/*`, `/api/admin/*`, `/api/student/*` 已约定，新增 `/api/assessment/*` 遵循此模式
- **API 响应格式:** `{ success: boolean, data?: any, message?: string }` 统一格式
- **前端路由守卫:** NextJS middleware 检查 session cookie + PUBLIC_PATHS 白名单
- **表单验证:** react-hook-form + Zod（参考 `knowledge-form.tsx`）
- **Drizzle schema 文件:** `packages/backend/src/db/schema/*.ts`，新建 `assessment.ts` 遵循命名和导出规范
- **ID 策略:** 统一 UUID v4

### Integration Points
- **新增路由:** `packages/backend/src/routes/assessment.ts` — 6 个 REST 端点 + SSE stream 端点
- **新增 DB table schema:** `packages/backend/src/db/schema/assessment.ts` — 3 表
- **新增 service:** `packages/backend/src/services/assessment.ts` — 核心测评逻辑（自适应算法、定级收敛、题目选择、进度聚合）
- **新增 ellamaka SDK 客户端:** `packages/backend/src/services/ellamaka-client.ts` — 封装 `session.create` + `promptAsync` + SSE 转发
- **gesp-plugin 新建:** 在 workspace 级或 ellamaka 项目中创建，3 个 tool，遵循 `@opencode-ai/plugin` 模式
- **前端新增页面:** `apps/web/src/app/student/assessment/page.tsx`（起测）, `apps/web/src/app/student/assessment/[token]/page.tsx`（做题）, `apps/web/src/app/student/assessment/[token]/report/page.tsx`（报告）
- **前端新增组件:** `AssessmentChatPanel`, `ObjectiveQuestion`, `CodingQuestion`, `LevelSlider`, `KnowledgeBreakdownChart` 等
- **Agent prompt 文件:** `assessor.md` 内容待设计（角色定义、行为约束、不泄题规则、工具使用指导）

### Current State
- Phase 2: 知识库 4 表已 seed（knowledge_points, practice_questions, exam_questions, lesson_plans），Drizzle SQLite 表完整
- Phase 2.1: 注册登录登出完整，学员端 Navbar 已有，管理端侧边栏已有
- 学员端：`/student/dashboard`, `/student/assessment`(占位), `/student/learning`(占位), `/student/practice`(占位) 路由已注册
- 管理端：`/admin/dashboard`, `/admin/knowledge/*`, `/admin/students` 功能已实现

</code_context>

<specifics>
## Specific Ideas

### gesp-plugin 3 Tool 契约

**`get_question_candidates`**
- 参数：`token (string)`, `course_id (string)`, `level (number)`, `hint? (string)`, `limit? (number, default 5, max 10)`
- 返回：`[{ question_id, knowledge_point, difficulty, question_type, short_summary }]`
- 行为：硬过滤（course_id + level + 已答题去重）→ LanceDB 向量搜索（hint 不为空）→ type 轮转 → 返回 top-K candidate 摘要
- **防漏题关键**：返回内容不含完整题目正文
- 兜底：agent 10s 内未调 `select_next_question`，backend 自动选第一道

**`select_next_question`**
- 参数：`token (string)`, `question_id (string)`
- 返回：`{ success: boolean }`
- 行为：锁定该题为下一道测评题，写入 session.current_question_id

**`update_evaluation`**
- 参数：`token (string)`, `evaluation (string)`
- 返回：`{ success: boolean }`
- 行为：写入 assessment_sessions.evaluation，同时重新计算 knowledge_stats 和 level_history

### 前端 REST API 6 端点

| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/assessment/start` | 创建会话 + 生成 token + 创建 ellamaka session + 返回首题 |
| POST | `/api/assessment/submit` | 提交答案（客观题秒判/编程题异步评分），返回 done 信号 |
| GET | `/api/assessment/next-question` | 获取当前锁定题目；未锁定时返回 `{ waiting: true }` |
| GET | `/api/assessment/progress` | 进度查询（级别/正确数/knowledge_stats/evaluation） |
| POST | `/api/assessment/resume` | 续评：查 assessment_sessions → 组织上下文 → 新 ellamaka session |
| GET | `/api/assessment/{token}/stream` | SSE stream 聊天面板连接，转发 agent text 输出 |

### 数据流 6 步

1. **创建测评** — POST /start → 建 session + 生成 token + 创建 ellamaka agent session → 返回首题
2. **学员做题（客观）** — POST /submit → backend 比对判对错 → 前端即时展示 + 注入 agent 内部消息
3. **学员做题（编程）** — POST /submit → 识别编程题 → `session.promptAsync` 推送代码 + 题目给 agent → agent 评估 → 写 evaluation → 前端轮询 /progress
4. **Agent 动态选题** — agent 分析答题表现 → `get_question_candidates({ hint })` → LanceDB 语义搜索 → 返回候选 → agent 选 → `select_next_question` 锁定
5. **收敛收尾** — backend 判定 done → submit 返回 `{ done: true }` → agent 调 `update_evaluation` 写评价 → 前端跳转报告页
6. **续评恢复** — POST /resume → 查 DB → 注入 system prompt 含历史（答题记录 + evaluation + level）→ 新 ellamaka session → 继续

### 隐私边界

- Tool 调用是 agent 内部行为，学员聊天面板不可见（天然防漏题）
- Backend 注入 agent 会话的答题数据标记为内部消息，不渲染到前端 chat
- 前端 chat 仅展示 agent text 输出 + 学员手动打字
- `assessor.md` system prompt 严禁 agent 直接给答案

### 评审建议
- gesp-plugin 可以做成 `packages/gesp-plugin/` 放在 gesp monorepo 内作为独立包，也可以放在 workspace 级 `.wopal/` 下
- 编程题评分时前端如何处理长等待：首次 submit 返回 `{ scoring: true }` → 前端展示 spinner → 每 2s 轮询 `/progress` → `evaluation` 非空后刷新 UI
- `assessment_questions` 初始数据：Phase 3 可手动 seed 10-20 道题（C++ 1-4 级），后续 AI 编制工具在 Phase 7 实现
- 报告页的"建议学习路径"暂时硬编码（薄弱知识点 → 对应学习入口链接），后续 Phase 6 接入真实学习路径

</specifics>

<deferred>
## Deferred Ideas

### Phase 7 相关（超出 Phase 3 范围）
- **AI 自动编制题目:** agent 生成 assessment_questions → 管理员审核上线
- **管理端题库审核界面:** `/admin/assessment/questions` 列表 + 审核（draft↔pending↔active）+ 编辑
- **管理端测评参数配置:** 题量、阈值、时间限制在管理面板可视化调整
- **多课程扩展:** C++ 外的 Python、Scratch 等课程测评

### Future Enhancements
- **IRT 算法升级:** 当数据积累足够后，可升级为 Item Response Theory 精确建模
- **测评 A/B 测试:** 不同自适应策略效果对比
- **测评报告导出:** PDF 生成 + 打印样式
- **测评历史趋势:** 多次测评对比图表

### Discussed but Not Decided
- 无 — 所有 5 个讨论区域已完成决策

</deferred>

---

*Phase: 03-测评定级智能体-测评界面*
*Context gathered: 2026-05-08*
