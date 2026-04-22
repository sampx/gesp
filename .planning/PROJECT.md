# GESP C++ 智能学习系统

## What This Is

面向 GESP 1~4 级 C++ 等级考试的 AI 自适应智能学习平台，以 AI 智能体替代传统录课和 OJ 判题模式，覆盖"测评-学习-练习"全流程自动化。目标用户为青少年学员（中小学生），需要趣味性、可视化、互动性强的学习体验。

**架构特点：** Agent 引擎运行在 ellamaka 项目，gesp backend 作为业务层负责知识库查询、提示词组织、以及代理 ellamaka SDK 调用。

## Core Value

**AI 全流程自动化** — 测评定级、教学讲解、练习判题全部由 AI 智能体驱动，学员获得个性化学习路径，系统越用越智能。

## Requirements

### Validated

（尚无已验证需求 — 待上线验证）

### Active

- [ ] 用户可以注册登录，进入个人学习中心
- [ ] 新学员可以完成 AI 测评定级，获取起始学习级别
- [ ] 学员可以观看 AI 生成的知识点讲解（文稿 + 动态图示）
- [ ] 学员可以完成 AI 即时生成的练习题，获取判分和错误分析
- [ ] 学员可以查看个人学习报告和薄弱点分析
- [ ] 管理员可以管理知识库（查看、编辑、补充）
- [ ] 管理员可以查看学员学习数据和能力画像

### Out of Scope

- AI 虚拟人语音播报 — v1 暂不做视频合成，聚焦文字 + 动态图示讲解
- 复盘总结智能体（专属讲义生成） — v2 功能
- 系统迭代智能体（自动优化内容） — v2 功能
- 真实代码执行沙盒 — v1 使用 AI 模拟判题，不运行实际代码
- 社交分享功能（微信/家长群） — v2 功能

## Context

### 领域背景

- GESP 是全国青少年软件编程等级考试，C++ 1~4 级覆盖基础语法到算法入门
- 传统学习模式：录课 + OJ 判题 + 教师人工讲解，成本高、个性化弱
- AI 智能体可以替代录课（自动生成讲解）和 OJ（智能判题），大幅降低成本

### 系统架构

```
┌─────────────────────────────────────────────────────┐
│                   frontend                          │
│         (student-app / admin-app)                   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/SSE
                       ▼
┌─────────────────────────────────────────────────────┐
│                  gesp backend                       │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐    │
│  │ 业务逻辑 │  │ 知识库  │  │ ellamaka SDK   │    │
│  │ 测评路径 │  │ LanceDB │  │ 代理层         │    │
│  │ 提示词   │  │ SQLite  │  │ SSE 转发       │    │
│  │ 组织     │  │         │  │                │    │
│  └──────────┘  └──────────┘  └────────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (SDK)
                       ▼
┌─────────────────────────────────────────────────────┐
│                   ellamaka                          │
│  .opencode/agents/         gesp-plugin (嵌入)      │
│    assessor.md             tool: submit_answer     │
│    teacher.md              tool: query_progress    │
│    grader.md              (少量 API, API-key)     │
│                                                    │
│  会话/对话存储（SQLite）                            │
└─────────────────────────────────────────────────────┘
```

**关键设计决策：**
- gesp backend 为**唯一入口**，负责业务逻辑、知识库查询、提示词组织
- ellamaka 作为独立 Agent 引擎，gesp 通过 SDK 远程调用
- gesp-plugin 嵌入 ellamaka（类似 wopal-plugin），封装少量 API
- 提示词在 gesp backend 组织后喂给 agent（而非 agent 自主查询）

### 参考项目

| 项目 | 参考内容 |
|------|----------|
| ellamaka | Agent 引擎、Plugin 系统、SDK 设计、会话管理 |
| new-api | 管理端界面（React + Vite + Semi Design）、用户管理、数据仪表板 |

### 知识资源

- GESP 1~4 级考试大纲
- 历年真题（客观题 + 编程题）
- 教案、课堂练习、课后练习
- 评分标准手册

## Constraints

- **Runtime**: Bun（高性能 JS/TS 运行时）
- **Database**: SQLite（关系数据，用户/学习记录）+ LanceDB（向量存储，知识库检索）
- **Agent Engine**: ellamaka（独立运行，HTTP SDK 调用）
- **AI Provider**: 多协议多 Provider 支持（OpenAI、Anthropic、Google、豆包、DeepSeek 等）
- **Target User**: 非技术用户（青少年学员），UI 需趣味性、可视化强
- **Timeline**: MVP 需快速验证核心学习流程

## Tech Stack

| 层级 | 技术 | 说明 |
|------|------|------|
| Backend | Hono + hono-openapi | 轻量 Web 框架 + OpenAPI 路由生成 |
| AI Layer | ellamaka SDK | 远程调用 Agent 引擎 |
| ORM | Drizzle | 类型安全 SQL 查询 |
| Database | SQLite + LanceDB | 关系数据 + 向量检索 |
| Student Frontend | NextJS 15 | 学员学习界面（App Router）|
| Admin Frontend | React + Vite + Semi Design | 管理后台（参考 new-api）|
| Runtime | Bun | 高性能 TypeScript 运行时 |
| Build | Turborepo | Monorepo 构建协调 |

## Monorepo Structure

```
packages/
  backend/        # Hono API + ellamaka SDK 代理层
  student-app/    # NextJS 学员端
  admin-app/      # React 管理端
  sdk/            # gesp SDK（供 plugin 使用）
  shared/         # 共享类型和工具
  ui/             # 共享 UI 组件库
```

**ellamaka 项目新增：**
- `.opencode/agents/assessor.md` — 测评定级智能体
- `.opencode/agents/teacher.md` — 教学讲解智能体
- `.opencode/agents/grader.md` — 练习判题智能体
- `gesp-plugin/` — 嵌入式 plugin（封装 gesp API）

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Agent 迁移到 ellamaka | ellamaka 有完善的 Agent 引擎和 Plugin 系统，无法作为依赖内嵌 | — Pending |
| gesp backend 代理模式 | 单一入口便于组织提示词、认证管理、业务逻辑集中 | — Pending |
| 提示词后端组织 | 减少 agent 自主查询复杂度，初期简化 API 设计 | — Pending |
| Hono | 参考 ellamaka 成功架构，更轻量、原生 Bun 支持 | — Pending |
| LanceDB 向量数据库 | 知识库语义检索，支持多模态 | — Pending |
| AI 模拟判题 | v1 不做真实代码沙盒，降低复杂度 | — Pending |

## Evolution

本文档在阶段转换和里程碑边界时演进。

**每次阶段转换后**（通过 `/wsf-transition`）：
1. 需求失效？→ 移入 Out of Scope 并说明原因
2. 需求已验证？→ 移入 Validated 并注明对应阶段
3. 出现新需求？→ 加入 Active
4. 有决策需要记录？→ 加入 Key Decisions
5. "What This Is" 仍然准确？→ 如有偏差则更新

**每次里程碑完成后**（通过 `/wsf-complete-milestone`）：
1. 全面复审所有章节
2. Core Value 检查 — 优先级是否正确？
3. 审计 Out of Scope — 排除理由是否仍然成立？
4. 用当前状态更新 Context

---
*Last updated: 2026-04-22 after architecture redesign*