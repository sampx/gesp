# Phase 03 技术研究：测评定级智能体 + 测评界面

**研究时间:** 2026-05-08
**状态:** 就绪，可进入方案设计

---

## 1. ellamaka Agent 集成

### 1.1 ellamaka HTTP API 契约

ellamaka 暴露标准 REST API，以下是本 Phase 需要的端点：

**创建 Session：**
```
POST /session?directory=<dir>
Body: { title?, agent?, model?, permission? }
→ { id: "ses_xxx", title, createdAt }
```

`agent` 参数是字符串，指向 `.opencode/agents/<name>.md` 文件。gesp 在创建 session 时指定 `agent: "assessor"` 即可触发 assessor agent。

**异步发消息（关键）：**
```
POST /session/{sessionID}/prompt_async?directory=<dir>
Body: { parts: [{ type: "text", text: "..." }], system?: string, agent?: string }
→ 204 No Content（fire-and-forget）
```

`system` 参数允许覆盖默认 system prompt，这正是 D-02 混合模式需要的——backend 在 prompt_async 时注入动态上下文。

**SSE 事件流：**
```
GET /event?directory=<dir>
→ SSE stream (text/event-stream)
```

所有 session 的事件通过此端点广播。gesp backend 需监听此流，按 sessionID 过滤，转发给前端聊天面板。

### 1.2 FaeClient 参考模式（可复用）

`projects/wopal-cli/src/lib/fae/client.ts` 已实现完整 HTTP 客户端：
- `sessionCreate()` — POST /session 创建
- `sessionSendAsync()` — POST /session/{id}/prompt_async（204 返回）
- `getEventUrl()` — 返回 SSE URL
- 内置 fetch + AbortController 超时控制（默认 120s）
- 指数退避重试（`lib/fae/retry.ts`）：3 次，1000ms → 2000ms → 4000ms

**gesp backend 需要自己实现 ellamaka 客户端**（不依赖 wopal-cli），但可复用 FaeClient 的 HTTP 模式：

```typescript
// 推荐新建 projects/gesp/packages/backend/src/services/ellamaka-client.ts
class EllamakaClient {
  constructor(baseUrl: string) {}
  async createSession(title: string, agent: string): Promise<{ id: string }>
  async promptAsync(sessionId: string, parts: Part[], system?: string): Promise<void>
  async streamEvents(sessionId: string): AsyncGenerator<Event>
}
```

### 1.3 SSE 代理转发模式

gesp backend 创建端点 `GET /api/assessment/{token}/stream`，内部：
1. 根据 token 查到 ellamaka sessionId
2. 连接 ellamaka GET /event
3. 过滤 `sessionID == sessionId` 的事件
4. 将 agent 的 text 输出转成 SSE 流发给前端

参考 `projects/wopal-cli/src/lib/fae/event-monitor.ts` 的 SSE 事件解析逻辑。

### 1.4 gesp-plugin（ellamaka 插件）

gesp-plugin 是嵌入 ellamaka 的薄适配层，3 个 tool 全部 HTTP 代理到 gesp backend：

```typescript
// 参考 .wopal/wopal-plugin/src/tools/wopal-task.ts 的 tool() 定义模式
import { tool } from "@opencode-ai/plugin-sdk";

export const get_question_candidates = tool(
  "get_question_candidates",
  "获取候选题目列表（仅含摘要，不含完整题目）",
  { token: z.string(), course_id: z.string(), level: z.number(), hint: z.string().optional(), limit: z.number().optional() },
  async (params) => {
    const res = await fetch(`${GESP_API_URL}/api/assessment/candidates`, {
      headers: { Authorization: `Bearer ${GESP_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return res.json();
  }
);
```

**关键决策点**：gesp-plugin 放哪里？
- 方案 A：放 gesp monorepo `packages/gesp-plugin/`，安装时需拷贝到 ellamaka
- 方案 B：直接在 ellamaka 项目的 `.opencode/plugins/` 下创建（更简单，推荐）

### 1.5 评估令牌（token）

```
JWT 编码 { assessment_session_id, student_id, course_id, exp }
8-12 位字母数字 base64url，短有效期 2h
```

Hono 内置 `hono/jwt` 可实现签名+验证，无需额外依赖：
```typescript
import { sign, verify } from "hono/jwt";
const token = await sign(payload, SECRET_KEY);
```

### 1.6 依赖与风险

| 项 | 状态 |
|----|------|
| ellamaka 运行中 | 需确认（Phase 开发时启动） |
| `@opencode-ai/plugin-sdk` | 需确认可用版本 |
| GESP_API_KEY | 需生成并配置环境变量 |
| hono/jwt | 已内置，无需额外安装 |

**风险 R-01**：ellamaka plugin SDK API 不稳定。缓解：3 个 tool 逻辑极简，薄 HTTP 代理，SDK 变更影响面小。

---

## 2. 自适应测评算法

### 2.1 启发式规则（D-07）

| 场景 | 条件 | 动作 |
|------|------|------|
| 单轮 5 题 | ≥3/5 正确 | 级别 +1 |
| 单轮 5 题 | ≤1/5 正确 | 级别 -1 |
| 单轮 5 题 | =2/5 正确 | 同级继续 |
| 连续 2 轮 | 同级别判定 | 停止测评 |
| 安全上限 | 答满 30 题或超 30 分钟 | 停止测评 |

边界情况：
- 最底级（1 级）降级 → 停在 1 级
- 最高级（8 级）升级 → 停在 8 级
- 安全上限触发时：取 level_history 中停留最久的级别

### 2.2 参数可配置（D-08）

`assessment_sessions.config_*` 字段存储会话时快照。全局默认值从环境变量或配置文件读取：

| 参数 | 默认值 | 最终配置来源 |
|------|--------|-------------|
| 每级题量 | 5 | `config_question_limit` |
| 升/降级阈值 | 3 / 1 | `config_threshold_up` / `config_threshold_down` |
| 安全上限 | 30 | `config_max_questions` |
| 时间限制 | 30min | `config_time_limit_min` |
| 题型比例 | 3:2 | `config_type_ratio` |

Phase 3 用常量硬编码，Phase 7 管理面板可调。

### 2.3 收敛判定位置

收敛判定在 **gesp backend** 执行（D-09），每次 POST /submit 后检查：
1. 当前轮是否完成（5 题全部答完）
2. 是否满足升/降级/连续条件
3. 返回 `{ done: true/false }`

### 2.4 依赖与风险

| 项 | 状态 |
|----|------|
| 算法实现 | 纯逻辑，无外部依赖 |

**风险 R-02**：小级别边界（1 级/8 级）收敛速度需验证。缓解：seed 至少 2-3 题/级别，确保有足够题目可测。

---

## 3. 数据库 Schema 设计

### 3.1 assessment_sessions

```typescript
// projects/gesp/packages/backend/src/db/schema/assessment.ts
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const assessmentSessions = sqliteTable("assessment_sessions", {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text().notNull().unique(),          // JWT 评估令牌
  student_id: text().notNull(),
  course_id: text().notNull().default("cpp"),
  status: text().notNull().default("in_progress"), // in_progress|completed|abandoned
  start_level: integer().notNull(),
  current_level: integer().notNull(),
  final_level: integer(),
  ellamaka_session_id: text(),               // 最后一次 ellamaka session ID
  config_question_limit: integer().default(5),
  config_time_limit_min: integer().default(30),
  total_answered: integer().default(0),
  total_correct: integer().default(0),
  level_history: text({ mode: "json" }).$type<Array<{level:number, round:number, correct:number}>>(),
  knowledge_stats: text({ mode: "json" }).$type<Record<string, {total:number, correct:number}>>(),
  evaluation: text(),
  started_at: integer({ mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  completed_at: integer({ mode: "timestamp" }),
});
```

### 3.2 assessment_answers

```typescript
export const assessmentAnswers = sqliteTable("assessment_answers", {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  session_id: text().notNull(),
  question_id: text().notNull(),
  question_order: integer().notNull(),
  student_answer: text().notNull(),
  is_correct: integer(),                     // 0=错误, 1=正确, null=编程题未评分
  score: integer(),                          // 0-10 编程题评分
  feedback: text(),
  time_spent_sec: integer(),
  // 冗余字段——用于去重查询性能
  course_id: text().notNull(),
  level: integer().notNull(),
  knowledge_point: text().notNull(),
  question_type: text().notNull(),
  created_at: integer({ mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

### 3.3 assessment_questions

```typescript
export const assessmentQuestions = sqliteTable("assessment_questions", {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  course_id: text().notNull().default("cpp"),
  level: integer().notNull(),
  knowledge_point: text().notNull(),
  question_type: text().notNull(),           // objective | coding
  difficulty: integer().default(1),          // 1-5 难度
  content: text().notNull(),                 // 完整题目正文
  answer: text().notNull(),                  // 客观题答案
  explanation: text(),                       // 题目解析
  status: text().notNull().default("draft"), // draft|pending|active
  created_by: text().notNull().default("manual"), // manual|agent
  lance_id: text(),                          // LanceDB 中对应记录的 id
  created_at: integer({ mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updated_at: integer({ mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
```

### 3.4 LanceDB 表 — assessment_questions 向量存储

在现有 `gesp.lance` 数据库中新建表 `assessment_questions`，字段：
```
id (string), course_id (string), level (int), knowledge_point (string),
question_type (string), content (string), explanation (string), vector (float32[])
```

embedding 文本 = `content + " " + knowledge_point + " " + explanation`（参考 knowledge-base.ts 的 buildEmbeddingText 模式）

### 3.5 新增文件清单

| 文件 | 内容 |
|------|------|
| `projects/gesp/packages/backend/src/db/schema/assessment.ts` | 3 张 SQLite 表定义 + 索引 |
| `projects/gesp/packages/backend/src/db/schema/index.ts` | 添加 `export * from "./assessment"` |
| `projects/gesp/packages/backend/src/services/assessment.ts` | 核心测评逻辑服务 |

### 3.6 索引策略

```typescript
export const assessmentIndexes = {
  tokenIdx: index("asmt_token_idx").on(assessmentSessions.token),
  studentIdx: index("asmt_student_idx").on(assessmentSessions.student_id),
  answerSessionIdx: index("asmt_answer_session_idx").on(assessmentAnswers.session_id),
  answerDuplicateIdx: index("asmt_answer_dup_idx").on(
    assessmentAnswers.session_id, assessmentAnswers.knowledge_point
  ),
  questionStatusIdx: index("asmt_q_status_idx").on(assessmentQuestions.status),
  questionCourseLevelIdx: index("asmt_q_course_level_idx").on(
    assessmentQuestions.course_id, assessmentQuestions.level
  ),
};
```

### 3.7 依赖与风险

| 项 | 状态 |
|----|------|
| Drizzle ORM 0.39.x | 已安装 |
| SQLite | 已运行（gesp.db） |
| LanceDB 0.22.3 + 0.27.2 arm64 | 已安装 |
| Ollama embedding | macmini.local:11434 可用（200 OK） |

**风险 R-03**：LanceDB 版本混用（0.22.3 主包 + 0.27.2 arm64）。缓解：遵循现有 seed 脚本模式，已证明可用。

---

## 4. 前端测评界面

### 4.1 路由结构

| 路由 | 页面 | 组件类型 |
|------|------|---------|
| `/student/assessment` | 起测页 | Server Component（无需状态） |
| `/student/assessment/[token]` | 答题页 | Client Component（含表单+聊天+SSE） |
| `/student/assessment/[token]/report` | 报告页 | Client Component（数据展示） |

### 4.2 答题页组件树

```
AssessmentPage (Client Component)
├── QuestionPanel（左侧，2/3 宽度）
│   ├── ObjectiveQuestion（RadioGroup/Button 选择）
│   ├── CodingQuestion（Textarea + 语法高亮预览）
│   └── SubmitButton + FeedbackDisplay
├── ChatPanel（右侧浮层，1/3 宽度，默认折叠）
│   ├── ChatToggleButton（🤖 悬浮 logo + badge 未读数）
│   ├── ChatMessages（agent text 输出 + 学员打字）
│   └── ChatInput（学员自由打字）
├── ProgressBar（顶部，级别 + 题号 + 正确数）
└── Timer（右上角，倒计时）
```

### 4.3 状态机（5 状态）

```
IDLE → LOADING_QUESTION → ANSWERING → JUDGING → FEEDBACK → (下一题) → LOADING_QUESTION
                                                              → (完成) → DONE → redirect /report
```

| 状态 | 触发条件 | UI 表现 |
|------|---------|---------|
| IDLE | 页面加载 | 显示起测信息 |
| LOADING_QUESTION | agent 选题中 | Skeleton 骨架屏 |
| ANSWERING | 题目展示 | 表单/编辑器可交互 |
| JUDGING | submit 后 | 客观题瞬间→FEEDBACK；编程题显示 spinner |
| FEEDBACK | 判分完成 | 显示对错 + agent 反馈文字 |
| DONE | done=true | 显示完成提示→3s 后跳转报告页 |

### 4.4 可复用模式

| 模式 | 参考文件 |
|------|---------|
| Server Action 调用 API | `apps/web/src/app/login/actions.ts` — fetch + cookie 转发 + redirect |
| react-hook-form + Zod | `apps/web/src/components/knowledge-form.tsx` — zodResolver + register |
| shadcn Slider 组件 | shadcn/ui Slider 可用（起测页级别滑块） |
| shadcn Progress 组件 | shadcn/ui Progress 可用（答题进度条） |
| shadcn Skeleton 组件 | shadcn/ui Skeleton 可用（选题中骨架屏） |
| shadcn RadioGroup 组件 | shadcn/ui RadioGroup 可用（客观题选项） |
| SSE EventSource | 原生 EventSource API（聊天面板） |

### 4.5 SSE 聊天面板实现模式

```typescript
// 前端组件中
const eventSource = new EventSource(`/api/assessment/${token}/stream`);
eventSource.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "agent_text") {
    appendMessage({ role: "agent", text: msg.text });
  }
};
```

gesp backend SSE 端点：
```typescript
// routes/assessment.ts
app.get("/:token/stream", async (c) => {
  const token = c.req.param("token");
  const session = await getAssessmentSession(token);
  const stream = new ReadableStream({
    start(controller) {
      // 连接 ellamaka SSE，过滤后转发
      const ellamakaStream = connectEllamakaSSE(session.ellamaka_session_id);
      for await (const event of ellamakaStream) {
        if (event.type === "message.part.delta" && event.field === "text") {
          controller.enqueue(`data: ${JSON.stringify({ type: "agent_text", text: event.delta })}\n\n`);
        }
      }
      controller.close();
    }
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }
  });
});
```

### 4.6 编程题语法高亮

使用 Prism.js 轻量构建（agent 决策权限内）：
- 仅含 C++ 语言支持
- 约 10KB gzipped
- 不需要 Monaco/CodeMirror 重编辑器

### 4.7 报告页图表库

可使用 Recharts（已在 `react-markdown` 附近生态），或纯 CSS 百分比条形图。agent 决策权限内。

### 4.8 新增前端文件清单

| 文件 | 内容 |
|------|------|
| `apps/web/src/app/student/assessment/page.tsx` | 起测页 |
| `apps/web/src/app/student/assessment/[token]/page.tsx` | 答题页 |
| `apps/web/src/app/student/assessment/[token]/report/page.tsx` | 报告页 |
| `apps/web/src/app/student/assessment/actions.ts` | Server Actions（start/submit/next/progress/resume） |
| `apps/web/src/components/assessment/objective-question.tsx` | 客观题组件 |
| `apps/web/src/components/assessment/coding-question.tsx` | 编程题组件 |
| `apps/web/src/components/assessment/chat-panel.tsx` | 聊天面板浮层 |
| `apps/web/src/components/assessment/progress-bar.tsx` | 进度条组件 |
| `apps/web/src/components/assessment/level-slider.tsx` | 级别滑块组件 |
| `apps/web/src/components/assessment/report-chart.tsx` | 报告图表组件 |

### 4.9 依赖与风险

| 项 | 状态 |
|----|------|
| NextJS 15 | 已安装 |
| shadcn/ui | 已安装（Card, Button, Progress, Skeleton, Slider, RadioGroup, Badge, ScrollArea 等均已可用） |
| react-hook-form 7.73.1 | 已安装 |
| Zod 4.3.6 | 已安装 |
| react-markdown 10.1.0 | 已安装（报告页 Markdown 评价渲染） |
| Tailwind CSS 4 | 已安装 |

**风险 R-04**：SSE 连接在移动网络下可能不稳定。缓解：EventSource 内置自动重连 + 前端指数退避重连策略。

**风险 R-05**：Zod 4 类型推断与实际 schema 不一致（已知 `as any` 类型转换问题）。缓解：沿用 knowledge-form.tsx 中的 `zodResolver(schema as any)` 模式。

---

## 5. 选题流水线

### 5.1 选题流程

```
agent 调用 get_question_candidates({ course_id, level, hint? })
→ backend 执行：
  1. 硬过滤：SQL 查 assessment_questions WHERE course_id=X AND level=N AND status='active'
  2. 去重：排除 assessment_answers 中已答过的 question_id
  3. 向量搜索：如果 hint 非空，在 LanceDB assessment_questions 表做语义搜索
  4. 题型轮转：根据 round 内已出题型，优先出未满配的类型
  5. 返回候选（仅 summary，无完整 content）
→ agent 选择一道 → select_next_question({ question_id })
→ backend 锁定该题目，写入 session.current_question_id
```

### 5.2 去重查询

```sql
SELECT DISTINCT question_id FROM assessment_answers
WHERE session_id = ? AND knowledge_point = ?
```

冗余字段 `knowledge_point` 在 assessment_answers 中是为了避免 JOIN assessment_questions 表。

### 5.3 LanceDB 语义搜索

复用 `KnowledgeBaseService` / `VectorStore` 的现有能力：
```typescript
const results = await vectorStore.search("assessment_questions", hint, { limit: 10, filter: `level = ${level}` });
```

### 5.4 题型轮转逻辑

```typescript
function rotateType(answeredInRound: string[], configRatio: {objective: number, coding: number}): string {
  const objCount = answeredInRound.filter(t => t === "objective").length;
  const cdCount = answeredInRound.filter(t => t === "coding").length;
  if (objCount < configRatio.objective) return "objective";
  if (cdCount < configRatio.coding) return "coding";
  return "objective"; // 配比已满回退
}
```

### 5.5 10s 兜底机制

agent 调用 `get_question_candidates` 后 10s 内未调用 `select_next_question`，backend 自动选候选列表第一道题。实现方式：
- `get_question_candidates` 返回时，backend 启动 `setTimeout(10000, autoSelect)`
- 如果 agent 在 10s 内调了 `select_next_question`，清除 timeout

### 5.6 依赖与风险

| 项 | 状态 |
|----|------|
| LanceDB 向量搜索 | 已有（vector-store.ts） |
| assessment_questions 初始数据 | **需 seed** |

**风险 R-06**：assessment_questions 初始数据不足。缓解：手动编写 10-20 道 C++ 1-4 级题目作为 seed 数据。Phase 7 补 AI 编制工具。

---

## 6. 后端 API 端点设计

### 6.1 6 个 REST 端点概览

| 方法 | 路径 | 认证 | 用途 |
|------|------|------|------|
| POST | `/api/assessment/start` | StudentAuth | 创建测评会话，返回 token + 首题 |
| POST | `/api/assessment/submit` | StudentAuth | 提交答案，返回判分结果 + done 信号 |
| GET | `/api/assessment/next-question` | - (token) | 获取当前锁定题目 |
| GET | `/api/assessment/progress` | - (token) | 查询答题进度 |
| POST | `/api/assessment/resume` | StudentAuth | 续评恢复 |
| GET | `/api/assessment/{token}/stream` | - (token) | SSE 流（聊天面板） |

### 6.2 认证模式

- start / submit / resume → `StudentAuth()` 中间件（复用现有 session-based auth）
- next-question / progress / stream → token 参数认证（不需要 session cookie，token 本身就编码了身份）

### 6.3 POST /start 实现概要

```typescript
app.post("/start", StudentAuth(), zValidator("json", startSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  // 1. 创建 assessment_sessions 记录
  const session = await insertAssessmentSession({ student_id: user.id, ...body });
  // 2. 生成 JWT token
  const token = await sign({ session_id: session.id, student_id: user.id, course_id: body.course_id }, SECRET);
  // 3. 创建 ellamaka session（agent: "assessor"）
  const ellamakaSession = await ellamakaClient.createSession(`Assessment-${session.id}`, "assessor");
  // 4. 发 async 消息注入初始上下文
  await ellamakaClient.promptAsync(ellamakaSession.id, [
    { type: "text", text: `开始测评。token=${token}，学员 ${user.display_name}，课程 ${body.course_id}，起始级别 ${body.start_level}` }
  ], systemPrompt);
  // 5. 等待首题锁定（agent get_question_candidates → select_next_question）
  const firstQuestion = await waitForFirstQuestion(session.id, 15000);
  // 6. 更新 session.ellamaka_session_id
  // 7. 返回 { token, first_question }
  return success(c, { token, first_question: formatQuestion(firstQuestion) });
});
```

### 6.4 依赖与风险

| 项 | 状态 |
|----|------|
| Hono + hono-openapi | 已安装 |
| StudentAuth 中间件 | 已有 |
| 响应格式 success/error | 已有（response.ts） |

**风险 R-07**：start 端点等待 agent 出题可能较慢（>10s），前端需处理长时间 loading。缓解：返回 token 后前端立即跳转答题页，用 LOADING_QUESTION 状态等待，提供 cancel 按钮。

---

## 7. 数据流与隐私边界

### 7.1 隐私架构（核心）

```
┌──────────────────────────────────────────────┐
│  前端可见区域                                │
│  ┌──────────┐    ┌──────────────────────┐   │
│  │ 表单UI   │    │ 聊天面板（仅 agent    │   │
│  │ (做题)   │    │  text + 学员打字)    │   │
│  └──────────┘    └──────────────────────┘   │
├──────────────────────────────────────────────┤
│  不可见区域（backend 内部 / agent 内部）      │
│  ┌──────────────┐ ┌──────────────────────┐  │
│  │ tool 调用    │ │ 答题数据注入         │  │
│  │ (候选题目    │ │ (agent 内部消息)     │  │
│  │  防漏题)     │ │                      │  │
│  └──────────────┘ └──────────────────────┘  │
└──────────────────────────────────────────────┘
```

- 前端 chat 只展示 `agent text` 输出 + 学员手动打字
- tool 调用结果不送前端（天然防漏题）
- backend 注入 agent 的数据标记为内部消息

### 7.2 assessor agent system prompt 要点

- 角色：持续评估顾问 + 动态选题者
- 严禁直接给出答案
- 观察答题，通过聊天面板鼓励/引导/提示
- 严禁泄露完整题目内容

---

## 8. 测试架构（Nyquist 验证）

`nyquist_validation: true`，需要为 Phase 3 规划验证：

### 8.1 单元测试

| 测试内容 | 测试框架 |
|---------|---------|
| 自适应算法（升/降/停留/收敛） | Vitest |
| JWT token 签名/验证 | Vitest |
| 题型轮转逻辑 | Vitest |
| 答案归一化（trim + lowercase） | Vitest |

### 8.2 集成测试

| 测试内容 | 依赖 |
|---------|------|
| 完整测评流程（start → submit → done） | ellamaka mock / 测试模式 |
| SSE 流转发 | ellamaka mock |
| 中断恢复流程 | SQLite |

### 8.3 UAT 场景

对应 ROADMAP.md Success Criteria：
1. 学员可完成自适应测评并获得等级定位
2. 题目覆盖 GESP 1-4 级范围
3. 客观题+编程题自动评分
4. 测评进度增量保存，中断后恢复
5. 学员可看到测评题目和结果

---

## 9. 文件清单汇总

### 9.1 新建文件

```
projects/gesp/packages/backend/src/db/schema/assessment.ts           # 3 张表 Drizzle 定义
projects/gesp/packages/backend/src/routes/assessment.ts              # 6 个 REST 端点 + SSE
projects/gesp/packages/backend/src/services/assessment.ts            # 核心测评逻辑
projects/gesp/packages/backend/src/services/ellamaka-client.ts       # ellamaka HTTP 客户端
apps/web/src/app/student/assessment/page.tsx           # 起测页
apps/web/src/app/student/assessment/[token]/page.tsx   # 答题页
apps/web/src/app/student/assessment/[token]/report/page.tsx  # 报告页
apps/web/src/app/student/assessment/actions.ts         # Server Actions
apps/web/src/components/assessment/objective-question.tsx
apps/web/src/components/assessment/coding-question.tsx
apps/web/src/components/assessment/chat-panel.tsx
apps/web/src/components/assessment/progress-bar.tsx
apps/web/src/components/assessment/level-slider.tsx
apps/web/src/components/assessment/report-chart.tsx
projects/gesp/packages/backend/src/__tests__/assessment-algorithm.test.ts
projects/gesp/packages/backend/src/__tests__/assessment-token.test.ts
```

### 9.2 修改文件

```
projects/gesp/packages/backend/src/db/schema/index.ts                # 添加 export from assessment
projects/gesp/packages/backend/src/index.ts                          # 挂载 assessment routes + 注册 ellamakaClient
apps/web/src/middleware.ts                             # 无改动（/student/assessment/* 已覆盖）
```

### 9.3 新建 ellamaka 文件

```
.opencode/agents/assessor.md                           # 智能体角色定义 + 行为约束
.opencode/plugins/gesp-plugin/                         # 3 个 tool 实现（或放 gesp monorepo）
```

---

## 10. 未解决问题与建议

### 10.1 待确认

| 问题 | 影响 | 建议 |
|------|------|------|
| `@opencode-ai/plugin-sdk` 具体版本和 tool 定义 API | gesp-plugin 开发 | 先查 ellamaka 项目现有 plugin 实现 |
| ellamaka `/event` SSE 流的数据格式 | SSE 解析逻辑 | 参考 wopal-cli event-monitor.ts 的格式 |
| assessment_questions 初始 seed 数据 | Phase 3 可用性 | 编写 15-20 道 C++ 1-4 级题目 |

### 10.2 架构建议

- gesp-plugin 强烈建议放 ellamaka 项目中而非 gesp monorepo。原因：plugin 运行时依赖 ellamaka SDK，独立包管理更复杂
- 建议 Phase 3 内部拆分为 5-6 个 Plan（按领域切分：数据库 → 测评服务 → API → 前端 → gesp-plugin + agent → 集成测试）

### 10.3 高风险项

| 风险 | 可能性 | 影响 | 缓解 |
|------|--------|------|------|
| R-07: start 端点响应慢 | 高 | 用户体验差 | 前端异步等待 + 骨架屏，超时 15s 报错允许重试 |
| R-06: 题目数据不足 | 高 | 测评无法进行 | 优先 seed 数据，不足时降级到纯随机选题 |
| R-04: SSE 连接不稳定 | 中 | 聊天面板断连 | EventSource 自动重连，后端去重防重复消息 |
| R-02: 小级别边界论 | 低 | 级别 1 或 8 收敛慢 | seed 每级至少 3 题，边界逻辑单元测试覆盖 |

---

*Research completed: 2026-05-08*
*All 5 technical domains researched, dependencies mapped, risks identified.*
