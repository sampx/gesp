# Research Summary

**Project:** GESP C++ 智能学习系统
**Researched:** 2026-04-22
**Status:** Complete ✓

---

## Key Findings

### Stack（技术栈）

**Backend:** Bun + Hono + hono-openapi + Vercel AI SDK + Drizzle ORM + SQLite + LanceDB

**Frontend:** 
- Student App: NextJS 15 (App Router) + Tailwind CSS + Kobalte
- Admin App: React 18 + Vite + Semi Design

**Monorepo:** Turborepo + Bun workspaces

**AI Providers:** OpenAI, Anthropic, DeepSeek, Doubao (multi-provider fallback)

**Key Decision:** 跟随 ellamaka 架构，避免 NestJS/Express，使用更轻量的 Hono。

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
├── backend/        # Hono API + AI Agents
├── student-app/    # NextJS 学习界面
├── admin-app/      # React + Semi 管理后台
├── sdk/            # Shared API client
├── shared/         # Types, utilities
└── ui/             # Shared components
```

**Data Flow:**
- Student App → SSE → Backend → AI Agent → LanceDB（知识库）
- Admin App → REST → Backend → SQLite（关系数据）

**Three Core Agents:**
1. Assessment Agent（测评定级）— 自适应题目生成 + 等级评定
2. Teaching Agent（教学讲解）— 知识点讲解 + 代码示例 + Q&A
3. Grading Agent（判题分析）— AI 模拟判题 + 错误诊断

**Build Order:**
1. shared → sdk → db（Phase 1）
2. provider → service → agent → server（Phase 2）
3. ui → student-app → admin-app（Phase 3）

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

### Phase Structure（建议阶段划分）

基于研究分析，推荐以下阶段结构：

| Phase | Name | Goal | Est. Hours |
|-------|------|------|------------|
| 1 | Project Foundation | Monorepo 初始化，数据库 Schema，SDK 结构 | 20-30 |
| 2 | Knowledge Base & AI Layer | LanceDB 初始化，Provider 抽象层，智能体基础 | 40-60 |
| 3 | Assessment Agent | 测评定级智能体完整实现 | 30-50 |
| 4 | Teaching Agent | 教学讲解智能体 + SSE 流式传输 | 30-50 |
| 5 | Practice Agent | 判题分析智能体 + 错误诊断 | 30-50 |
| 6 | Student App | NextJS 学习界面（测评、课程、练习）| 50-70 |
| 7 | Admin App | React + Semi 管理后台 | 30-50 |
| 8 | Integration & Polish | E2E 测试，UX 优化，部署 | 20-30 |

**Total:** ~220-360 小时（Standard granularity，8 个阶段）

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

进入 `/wsf-define-requirements` 以正式化 v1 需求并分配 REQ-ID，然后基于此研究创建包含阶段结构的 Roadmap。
