# Research Summary

**Project:** GESP C++ 智能学习系统
**Researched:** 2026-04-22
**Status:** Complete ✓

---

## Key Findings

### Stack（技术栈）

**Backend:** Bun + Hono + hono-openapi + ellamaka SDK + Drizzle ORM + SQLite + LanceDB

**Frontend:** 
- Student App: NextJS 15 (App Router) + Tailwind CSS + Kobalte
- Admin App: React 18 + Vite + Semi Design

**Monorepo:** Turborepo + Bun workspaces

**Agent Engine:** ellamaka（独立运行，HTTP SDK 调用）

**AI Providers:** 由 ellamaka 管理 — OpenAI, Anthropic, DeepSeek, Doubao (multi-provider fallback)

**Key Decision:** Agent 引擎迁移到 ellamaka，gesp backend 作为业务代理层。提示词后端组织，agent 只做生成。

---

### Features（功能特性）

**v1 MVP Scope（25 个功能点）:**

| Category | Count | Key Features |
|----------|-------|--------------|
| Auth | 4 | 学员/管理员登录，会话管理 |
| Assessment Agent | 5 | 自适应题目生成，自动评分，等级定级 |
| Teaching Agent | 4 | AI 讲解，代码示例，交互式问答 |
| Practice Agent | 5 | 题目生成，AI 判题，错误分析 |
| Progress | 4 | 仪表板，进度追踪，薄弱点分析 |
| Knowledge Base | 3 | GESP 大纲，向量检索，管理员增删改查 |
| Admin | 3 | 学员管理，数据可视化，知识库编辑器 |

**Deferred v2:** OAuth、AI 语音/视频、真实沙盒、游戏化、家长报告

**Anti-Features:** 社交聊天、视频分享、实时流媒体、移动端原生应用、支付系统

**Total MVP estimate:** ~180-260 hours

---

### Architecture（架构）

**Monorepo Structure:**
```
packages/
├── backend/        # Hono API + ellamaka SDK 代理层 + 业务逻辑 + 知识库
├── student-app/    # NextJS 学习界面
├── admin-app/      # React + Semi 管理后台
├── sdk/            # gesp SDK（供 ellamaka plugin 使用）
├── shared/         # Types, utilities
└── ui/             # Shared components
```

**ellamaka 项目新增（不在 gesp monorepo 内）：**
```
ellamaka/
├── .opencode/agents/
│   ├── assessor.md     # 测评定级智能体
│   ├── teacher.md      # 教学讲解智能体
│   └── grader.md       # 判题分析智能体
│
└── gesp-plugin/        # 嵌入式 plugin（封装少量 gesp API）
    ├── submit_answer   # 提交学员答案
    ├── query_progress  # 查询学员进度
    └── get_knowledge   # 获取知识库内容
```

**Data Flow:**
- Student App → SSE → gesp Backend → ellamaka SDK → Agent → AI Provider
- gesp Backend → LanceDB（知识库查询 + 提示词组织）
- ellamaka Agent → plugin tool → gesp Backend API（answer/progress）

**Three Core Agents（在 ellamaka）：**
1. Assessment Agent（测评定级）— 自适应题目生成 + 等级评定
2. Teaching Agent（教学讲解）— 知识点讲解 + 代码示例 + Q&A
3. Grading Agent（判题分析）— AI 模拟判题 + 错误诊断

**Build Order:**
1. shared → sdk → db（Phase 1）
2. service → ellamaka 代理层 → server（Phase 2）
3. ellamaka agents + gesp-plugin（Phase 2 同步）
4. ui → student-app → admin-app（Phase 3）

---

### Pitfalls（风险陷阱）

**P0 Critical:**
| Pitfall | Prevention |
|---------|------------|
| AI 幻觉 | 对照知识库交叉验证，置信度评分，管理员审核 |
| 青少年流失 | 游戏化，视觉反馈，短课程，自适应难度 |

**P1 High:**
| Pitfall | Prevention |
|---------|------------|
| 知识缺口 | 初始化完整 GESP 1-4 课程，元数据过滤，审计流程 |
| Provider 失效 | 多供应商降级，请求队列，响应缓存 |
| 测评公平性 | 固定题库抽样，提示词中评分标准，申诉机制 |

---

## Recommendations

### Phase Structure（ROADMAP 已定义 7 阶段）

已正式化的阶段划分（参见 `.planning/ROADMAP.md`）：

| Phase | Name | Goal |
|-------|------|------|
| 1 | 基础设施与认证 | 开发环境就绪，用户注册登录，gesp backend 框架 |
| 2 | 知识库 | LanceDB 知识库、向量检索、数据导入 |
| 3 | 测评定级智能体 | ellamaka assessor agent + gesp SDK 代理 |
| 4 | 教学讲解智能体 | ellamaka teacher agent + SSE 流式 |
| 5 | 练习判题智能体 | ellamaka grader agent + 判题反馈 |
| 6 | 学员学习应用 | NextJS 学习界面整合三个智能体 |
| 7 | 管理后台应用 | React 管理端 |

**关键架构决策：**
- Phase 3-5 同时涉及 gesp backend（SDK 代理层）和 ellamaka（agent + plugin）
- 提示词组织在 gesp backend，不在 agent 内

---

## Confidence Levels

| Dimension | Confidence | Source |
|-----------|------------|--------|
| Stack | HIGH | ellamaka 代码参考 + 官方文档 |
| Features | HIGH | 领域专长 + 需求文档 |
| Architecture | HIGH | ellamaka/new-api 参考 + 模式 |
| Pitfalls | MEDIUM | 教育 AI 研究 + 领域专长 |

---

## Sources

- **STACK.md** — 含版本的技术栈推荐
- **FEATURES.md** — 功能分类和 MVP 范围
- **ARCHITECTURE.md** — 系统架构和数据流
- **PITFALLS.md** — 风险分析和预防策略

---

## Next Step

ROADMAP 已完成定义，进入 Phase 1 规划（`/wsf-plan-phase 1`）。

**Phase 1 关键任务：**
- gesp backend 框架搭建（Hono + Drizzle + SQLite）
- ellamaka 项目配置（不需要 agent，Phase 1 无 AI 调用）
- 用户认证系统（学员/管理员双认证）

---

*Last updated: 2026-04-22 after architecture redesign*
