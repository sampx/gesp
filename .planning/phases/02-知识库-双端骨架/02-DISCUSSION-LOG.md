# Phase 2: 知识库 + 双端骨架 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 02-知识库-双端骨架
**Areas discussed:** 知识库 Schema, 前端架构, Embedding/LanceDB, 包结构, 登录权限, 知识库 UI

---

## Area 1: 知识库数据源与 Schema

### Q1: GESP 大纲和真题从哪里来？

| Option | Description | Selected |
|--------|-------------|----------|
| A. AI 生成模拟内容 | 快速填充，用于验证技术实现，后续替换 | |
| B. 手动整理官方大纲 | 从官方渠道获取大纲，手动结构化录入 | |
| **C. 混合方案** | **AI 生成模拟题目，官方大纲作为知识点骨架** | ✓ |

**User's choice:** C (混合方案)
**Notes:** 用户已有部分 AI 生成的 seed 数据在 `docs/products/gesp/seed/`，后续需要验证和完善

---

### Q2: 知识库数据模型设计？

**User feedback:** 用户提供了完整的数据模型设计文档 `docs/products/gesp/research/gesp-data-models.md`，并指出：
- 级别不一定是 1-4，C++ 和 Python 有 8 级
- 数据模型已初步设计，需要 review

**Decision:** 直接采用 `docs/products/gesp/research/gesp-data-models.md` 作为 Phase 2 Schema

---

### Q3: Embedding 策略？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 纯文本 embedding | 知识点描述、题目题干分别向量化 | |
| B. 结构化 embedding | 在文本中注入结构化标签后 embedding | |
| **C. 混合检索** | **向量语义检索 + 结构化过滤** | ✓ |

**User's choice:** C (混合检索)
**Notes:** 数据模型文档中有详细设计

---

## Area 2: 前端架构（重大变更）

### Q2-Q3: 学员端与管理端关系？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 两个独立 NextJS 项目 | 完全独立，各自部署 | |
| B. 统一 NextJS + 路由隔离 | `/student/*` 和 `/admin/*` 共享组件库 | |
| **C. 合并为一个应用** | **MVP 阶段合并，不同路由+风格区分** | ✓ |

**Key discussion:**
- 原计划：学员端（NextJS）+ 管理端（React+Vite+Semi）
- 用户调整 ROADMAP：两者统一为 NextJS + shadcn
- 用户建议：MVP 阶段合并在一起做，减少复杂性

**Final decision:** 合并为一个 NextJS 应用 `apps/web/`，通过路由区分：
- `/student/*` — 学员功能（趣味性风格）
- `/admin/*` — 管理功能（专业风格）
- `/login` — 统一登录入口

---

### Q2: 登录界面角色切换？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 统一登录页 + 角色下拉 | 简单，一个入口 | |
| **B. 角色图标/卡片选择 + 统一表单** | **视觉区分，用户体验更好** | ✓ |
| C. 分入口登录 | `/login/student`, `/login/teacher`, `/login/admin` | |

**User's choice:** B1 变体（合并后的统一登录页）
**Notes:** 用户质疑 B1 "是否过度设计"，最终确认合并方案后采用统一登录页

---

## Area 3: 管理端骨架设计

### Q4: 管理端初始占位页？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 最小可行 | 仅登录页 + 知识库管理占位页 | |
| **B. 框架完整** | **Dashboard + 知识库管理 + 学员管理（占位）+ 预留导航** | ✓ |
| C. 按后续 Phase 预告 | 包含 Phase 7 需要的所有导航占位 | |

**User's choice:** B (框架完整)
**Notes:** 验证整体信息架构，Phase 7 只需填充功能

---

## Area 4: Embedding 与 LanceDB

### Q5: Embedding 服务选择？

| Option | Description | Selected |
|--------|-------------|----------|
| A. OpenAI text-embedding-3-small | 效果好，成本低，需要 API key | |
| B. 本地模型（ollama + nomic-embed-text） | 无外部依赖，部署复杂 | |
| **C. 抽象接口 + 默认 OpenAI** | **接口设计允许切换，你有 ollama 可用** | ✓ |

**User's choice:** C
**Notes:** 用户已有 ollama 本地模型和接口可用，但建议保留 OpenAI 作为默认/备选

---

### Q6: LanceDB 部署模式？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 文件模式（embedded） | 直接读写本地文件，适合单机 | |
| B. 远程模式（lancedb-cloud） | 需要网络，适合多实例 | |
| **C. 文件模式 + 未来兼容接口** | **Phase 2 用文件模式，接口预留远程扩展** | ✓ |

**User's choice:** C
**Notes:** 文件模式快速启动，接口设计预留远程模式扩展

---

## Area 5: Monorepo 与 Dev 配置

### Q7: 包结构调整？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 全放 packages/ | 与现有结构一致 | |
| **B. apps/ + packages/** | **Turborepo 推荐：apps/ 放应用，packages/ 放库** | ✓ |
| C. 前端放项目根 apps/ | backend 保持 packages/，前端用根目录 | |

**User's choice:** B
**Final structure:**
```
gesp/
├── apps/
│   └── web/              # NextJS 15 (合并的学员端+管理端)
├── packages/
│   ├── backend/          # Hono API
│   ├── shared/           # 共享类型
│   └── ui/               # shadcn/ui 组件库
```

---

### Q8: 开发启动脚本？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 根目录启动全部 | `bun run dev` 启动 backend + student + admin | |
| **B. 分包启动 + 组合命令** | **`bun run dev:backend`, `bun run dev:web` + `bun run dev` = 全部** | ✓ |
| C. 智能检测 | 检测 env 变量决定启动哪些服务 | |

**User's choice:** B
**Notes:** Turborebo pipeline 配置

---

## Area 6: 知识库数据初始化

### Q9: Phase 2 初始数据？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 纯 AI 生成模拟数据 | 快速，但质量无法保证 | |
| **B. 手动整理最小数据集 + AI 生成补充** | **质量可控，验证流程** | ✓ |
| C. 爬取/导入完整官方数据 | Phase 2 工作量过大 | |

**User's choice:** B
**Notes:** 用户已有 AI 生成的 seed 数据在 `docs/products/gesp/seed/`，可以直接使用

---

## Area 7: 登录与权限路由

### Q10: 权限控制策略？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 登录页 redirect 到不同子域名 | 不符合合并决策 | |
| **B. 前端统一路由守卫 + 后端 roles 校验** | **前端 middleware + 后端 role guard** | ✓ |
| C. 后端只返回数据，前端控制展示 | 安全风险 | |

**User's choice:** B

---

## Area 8: 知识库管理界面

### Q11: 知识库界面交互模式？

| Option | Description | Selected |
|--------|-------------|----------|
| A. 纯表格内联编辑 | 不适合长文本内容 | |
| **B. 列表 + 详情页/侧边面板** | **shadcn Table + Sheet/Dialog** | ✓ |
| C. 类 Notion 块编辑器 | 过度设计 | |

**User's choice:** B

---

## Summary

**All 11 gray areas discussed and decided.**

**Key changes from initial assumptions:**
1. 前端架构：从分离的两个应用 → 合并为一个 NextJS 应用
2. 技术栈：管理端从 React+Vite+Semi → NextJS+shadcn（与学员端统一）
3. 登录设计：从三角色分开入口 → 统一登录页 + 角色卡片选择
4. 包结构：明确使用 apps/ + packages/ 分离
5. 数据初始化：用户已有 seed 数据，直接使用

**Next step:** `/wsf-plan-phase 2 gesp` — 基于已确认的决策创建 Phase 2 执行计划。

---

*Phase: 02-知识库-双端骨架*
*Discussion log: 2026-04-24*
