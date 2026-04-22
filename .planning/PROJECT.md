# GESP C++ 智能学习系统

## What This Is

面向 GESP 1~4 级 C++ 等级考试的 AI 自适应智能学习平台，以 AI 智能体替代传统录课和 OJ 判题模式，覆盖"测评-学习-练习-复盘-系统迭代"全流程自动化。目标用户为青少年学员（中小学生），需要趣味性、可视化、互动性强的学习体验。

## Core Value

**AI 全流程自动化** — 测评定级、教学讲解、练习判题全部由 AI 智能体驱动，学员获得个性化学习路径，系统越用越智能。

## Requirements

### Validated

(None yet — ship to validate)

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

### 参考项目

| 项目 | 参考内容 |
|------|----------|
| ellamaka | 后端架构（Hono + hono-openapi + Vercel AI SDK + Drizzle）、Monorepo 结构、多 Provider AI SDK 封装 |
| new-api | 管理端界面（React + Vite + Semi Design）、用户管理、数据仪表板 |

### 知识资源

- GESP 1~4 级考试大纲
- 历年真题（客观题 + 编程题）
- 教案、课堂练习、课后练习
- 评分标准手册

## Constraints

- **Runtime**: Bun（参考 ellamaka，高性能 JS/TS 运行时）
- **Database**: SQLite（轻量、嵌入式）+ LanceDB（向量存储，用于知识库检索）
- **AI Provider**: 多协议多 Provider 支持（OpenAI、Anthropic、Google、豆包、DeepSeek 等）
- **Target User**: 青少年学员，UI 需趣味性、可视化强
- **Timeline**: MVP 需快速验证核心学习流程

## Tech Stack

| 层级 | 技术 | 说明 |
|------|------|------|
| Backend | Hono + hono-openapi | 轻量 Web 框架 + OpenAPI 路由生成 |
| AI Layer | Vercel AI SDK | 多 Provider 统一接口 |
| ORM | Drizzle | 类型安全 SQL 查询 |
| Database | SQLite + LanceDB | 关系数据 + 向量检索 |
| Student Frontend | NextJS | 学员学习界面 |
| Admin Frontend | React + Vite + Semi Design | 管理后台（参考 new-api） |
| Runtime | Bun | 高性能 TypeScript 运行时 |
| Build | Turborepo | Monorepo 构建协调 |

## Monorepo Structure

```
packages/
  backend/        # Hono API 服务
  student-app/    # NextJS 学员端
  admin-app/      # React 管理端
  sdk/            # 共享 SDK（类似 ellamaka SDK）
  shared/         # 共享类型和工具
  ui/             # 共享 UI 组件库
```

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hono | 参考 ellamaka 成功架构，更轻量、原生 Bun 支持 | — Pending |
| Vercel AI SDK | 多 Provider 支持，统一接口，社区活跃 | — Pending |
| LanceDB 向量数据库 | 知识库语义检索，支持多模态 | — Pending |
| MVP 3 个智能体 | 测评定级 + 教学讲解 + 练习判题，覆盖核心学习流程 | — Pending |
| AI 模拟判题 | v1 不做真实代码沙盒，降低复杂度 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/wsf-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/wsf-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-22 after initialization*