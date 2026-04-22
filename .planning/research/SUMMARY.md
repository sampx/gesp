# Research Summary

**Project:** GESP C++ 智能学习系统
**Researched:** 2026-04-22
**Status:** Complete ✓

---

## Key Findings

### Stack (技术栈)

**Backend:** Bun + Hono + hono-openapi + Vercel AI SDK + Drizzle ORM + SQLite + LanceDB

**Frontend:** 
- Student App: NextJS 15 (App Router) + Tailwind CSS + Kobalte
- Admin App: React 18 + Vite + Semi Design

**Monorepo:** Turborepo + Bun workspaces

**AI Providers:** OpenAI, Anthropic, DeepSeek, Doubao (multi-provider fallback)

**Key Decision:** 跟随 ellamaka 架构，避免 NestJS/Express，使用更轻量的 Hono。

---

### Features (功能特性)

**v1 MVP Scope (25 features):**

| Category | Count | Key Features |
|----------|-------|--------------|
| Auth | 4 | Student/Admin login, session management |
| Assessment Agent | 5 | Adaptive generation, auto-grading, level placement |
| Teaching Agent | 4 | AI explanations, code examples, interactive Q&A |
| Practice Agent | 5 | Question generation, AI grading, error analysis |
| Progress | 4 | Dashboard, tracking, weakness analysis |
| Knowledge Base | 3 | GESP outline, vector search, admin CRUD |
| Admin | 3 | Student management, data visualization, knowledge editor |

**Deferred v2:** OAuth, AI voice/video, real sandbox, gamification, parent reports

**Anti-Features:** Social chat, video sharing, live streaming, native mobile app, payment system

**Total MVP estimate:** ~180-260 hours

---

### Architecture (架构)

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
- Student App → SSE → Backend → AI Agent → LanceDB (知识库)
- Admin App → REST → Backend → SQLite (关系数据)

**Three Core Agents:**
1. Assessment Agent (测评定级) — 自适应题目生成 + 等级评定
2. Teaching Agent (教学讲解) — 知识点讲解 + 代码示例 + Q&A
3. Grading Agent (判题分析) — AI 模拟判题 + 错误诊断

**Build Order:**
1. shared → sdk → db (Phase 1)
2. provider → service → agent → server (Phase 2)
3. ui → student-app → admin-app (Phase 3)

---

### Pitfalls (风险陷阱)

**P0 Critical:**
| Pitfall | Prevention |
|---------|------------|
| AI hallucination | Cross-reference against knowledge base, confidence scores, admin review |
| Youth dropout | Gamification, visual feedback, bite-sized lessons, adaptive difficulty |

**P1 High:**
| Pitfall | Prevention |
|---------|------------|
| Knowledge gaps | Seed complete GESP 1-4 curriculum, metadata filtering, audit workflow |
| Provider failure | Multi-provider fallback, request queueing, response caching |
| Assessment fairness | Fixed pool sampling, grading rubric in prompt, appeal mechanism |

---

## Recommendations

### Phase Structure (建议阶段划分)

基于研究分析，推荐以下阶段结构：

| Phase | Name | Goal | Est. Hours |
|-------|------|------|------------|
| 1 | Project Foundation | Monorepo setup, DB schema, SDK structure | 20-30 |
| 2 | Knowledge Base & AI Layer | LanceDB seeding, Provider abstraction, Agent base | 40-60 |
| 3 | Assessment Agent | 测评定级智能体完整实现 | 30-50 |
| 4 | Teaching Agent | 教学讲解智能体 + SSE streaming | 30-50 |
| 5 | Practice Agent | 判题分析智能体 + 错误诊断 | 30-50 |
| 6 | Student App | NextJS 学习界面 (assessment, lesson, practice) | 50-70 |
| 7 | Admin App | React + Semi 管理后台 | 30-50 |
| 8 | Integration & Polish | E2E testing, UX polish, deployment | 20-30 |

**Total:** ~220-360 hours (Standard granularity, 8 phases)

---

## Confidence Levels

| Dimension | Confidence | Source |
|-----------|------------|--------|
| Stack | HIGH | ellamaka code reference + official docs |
| Features | HIGH | Domain expertise + requirements doc |
| Architecture | HIGH | ellamaka/new-api reference + patterns |
| Pitfalls | MEDIUM | Educational AI research + domain expertise |

---

## Sources

- **STACK.md** — Tech stack recommendations with versions
- **FEATURES.md** — Feature categorization and MVP scope
- **ARCHITECTURE.md** — System architecture and data flow
- **PITFALLS.md** — Risk analysis and prevention strategies

---

## Next Step

Proceed to `/wsf-define-requirements` to formalize v1 requirements with REQ-IDs, then create roadmap with phase structure based on this research.