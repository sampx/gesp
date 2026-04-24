# Phase 2: 知识库 + 双端骨架 - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段交付：
1. **GESP 知识库（LanceDB）** — 支持向量语义检索，存储 C++ 1-8 级知识点、真题、教案，提供 backend API 供智能体查询
2. **统一前端骨架（NextJS 15 + shadcn）** — 学员端和管理端合并为一个应用，通过路由区分：
   - `/student/*` — 学员功能（登录后可见）
   - `/admin/*` — 管理功能（教员/管理员权限）
   - `/login` — 统一登录入口（三角色切换）
3. **知识库管理界面** — 管理员可查看、编辑、添加知识点和题目（列表+详情页模式）

**Scope Anchor:**
- 知识库数据：初始化最小可用数据集（已有 seed 数据在 `docs/products/gesp/seed/`），验证检索流程
- 前端：骨架阶段只实现布局和导航，功能页面占位（后续 Phase 3-7 填充）
- 不实现：智能体调用（Phase 3-5）、完整管理功能（Phase 7）、学员学习功能（Phase 3-6）

</domain>

<decisions>
## Implementation Decisions

### D-01: 前端架构 — 合并方案
学员端和管理端合并为一个 NextJS 15 应用，通过路由前缀区分：
- `/login` — 统一登录页，支持学员/教员/管理员三角色切换
- `/student/dashboard`, `/student/assessment`, `/student/learning`, `/student/practice` — 学员功能
- `/admin/dashboard`, `/admin/knowledge`, `/admin/students` — 管理功能
- 不同角色登录后 redirect 到对应路由前缀下的 dashboard

**Rationale:** MVP 阶段减少部署和维护复杂度，共享 shadcn/ui 组件库，后期如需拆分可独立部署。

### D-02: 包结构调整 — apps/ + packages/
```
gesp/
├── apps/
│   └── web/              # NextJS 15 (合并的学员端+管理端)
├── packages/
│   ├── backend/          # Hono API (已有)
│   ├── shared/           # 共享类型 (已有)
│   └── ui/               # shadcn/ui 组件库 (新建)
```

**Rationale:** Turborepo 社区惯例，apps/ 放应用，packages/ 放库，pipeline 可独立配置。

### D-03: 登录与权限 — 前后端双校验
- **前端:** NextJS middleware 检查 session cookie，无权限 redirect 到 `/login` 或 `/403`
- **后端:** API route handler 检查 `user.role`，不匹配返回 403
- **登录流程:**
  1. 用户选择角色（学员/教员/管理员卡片）
  2. 填写 username/password 统一表单
  3. 后端验证成功后，根据 role redirect：
     - 学员 → `/student/dashboard`
     - 教员/管理员 → `/admin/dashboard`

### D-04: 路由结构 — 扁平设计
```
/login                    # 统一登录（三角色切换）
/student/
  ├── dashboard           # 学习仪表板（Phase 6 填充）
  ├── assessment          # 测评入口（Phase 3 填充）
  ├── learning            # 教学入口（Phase 4 填充）
  └── practice            # 练习入口（Phase 5 填充）
/admin/
  ├── dashboard           # 管理仪表板（Phase 2 骨架）
  ├── knowledge/
  │   ├── points          # 知识点管理
  │   ├── lessons         # 教案管理
  │   ├── questions       # 练习题管理
  │   └── exams           # 真题管理
  ├── students            # 学员管理（Phase 2 只读列表，Phase 7 完整功能）
  ├── analytics           # 数据分析（Phase 7 填充）
  └── settings            # 系统配置（Phase 7 填充）
```

### D-05: 知识库 Schema — 采用数据模型设计文档
直接使用 `docs/products/gesp/research/gesp-data-models.md` 定义的 Schema：
- **LanceDB tables:** `knowledge_points`, `lesson_plans`, `practice_questions`, `exam_questions`
- **SQLite table:** `exam_sessions`
- **ID:** 统一使用 UUID v4
- **向量计算:** `embedding(point + ": " + description)`，description 为空时仅用 point

### D-06: Embedding Provider — 抽象接口 + 默认 OpenAI
```typescript
// packages/backend/src/services/embedding.ts
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// Phase 2 默认实现: OpenAI (可通过 env 切换)
class OpenAIEmbeddingProvider implements EmbeddingProvider { ... }

// 预留扩展: Ollama (用户已有本地模型)
class OllamaEmbeddingProvider implements EmbeddingProvider { ... }
```

**配置:** `EMBEDDING_PROVIDER=openai|ollama`，默认 `openai`。

### D-07: LanceDB 部署 — 文件模式 + 兼容接口
- **Phase 2 实现:** `LanceDBFileStore`，数据存储在 `./data/gesp.lance`
- **接口设计:** 抽象 `VectorStore` 接口，预留 `LanceDBRemoteStore` 未来实现
- **路径:** `packages/backend/data/gesp.lance`（gitignored）

### D-08: 知识库管理界面 — 列表 + 详情页模式
- **列表页:** shadcn `Table` + `DataTable`（支持排序、筛选、分页）
- **详情页:** shadcn `Sheet` 或 `Dialog`，展示完整内容并支持编辑
- **编辑表单:** 使用 `react-hook-form` + `zod`，内容字段支持 Markdown

### D-09: Seed 数据初始化
使用已有数据：`docs/products/gesp/seed/`
- 知识点：从官方大纲提取，按数据模型 Schema 结构化
- 真题：1-2 份历年真题（公开渠道获取或模拟数据）
- 教案：AI 生成或人工整理，覆盖核心知识点

**流程:**
1. 读取 seed 数据（JSON/CSV/Markdown）
2. 生成 embedding（通过 OpenAI 或 Ollama）
3. 写入 LanceDB

### D-10: Dev 启动脚本 — Turborepo Pipeline
```json
// root package.json
{
  "scripts": {
    "dev": "turbo run dev",
    "dev:backend": "turbo run dev --filter=@gesp/backend",
    "dev:web": "turbo run dev --filter=@gesp/web"
  }
}
```

- `bun run dev` — 启动 backend + web（默认）
- `bun run dev:backend` — 只调 API
- `bun run dev:web` — 只启动前端

### the agent's Discretion
- **UI 具体样式:** shadcn 组件的具体主题配置（colors, spacing, typography）
- **Table 列定义:** 知识库列表页具体展示哪些字段（可根据数据模型调整）
- **Search/Filter 实现:** 前端搜索过滤 vs 后端 API 过滤（Phase 2 建议前端简单过滤）
- **Error Handling UI:** 知识库操作失败的 Toast/Modal 展示方式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Planning
- `.planning/PROJECT.md` — 项目架构、技术栈、monorepo 结构
- `.planning/REQUIREMENTS.md` — KNOW-01~05, UI-SKEL-01~02 需求定义
- `.planning/ROADMAP.md` — Phase 2 Success Criteria 和边界
- `.planning/phases/01-基础设施与认证/01-CONTEXT.md` — Phase 1 认证决策（session, role）
- `.planning/phases/01.1-phase-1/01.1-CONTEXT.md` — 安全修复和 debug 界面决策

### Data Models
- `docs/products/gesp/research/gesp-data-models.md` — 知识库 Schema 完整定义

### Seed Data
- `docs/products/gesp/seed/` — 初始数据（知识点、真题、教案）

### Technology References
- `docs/research/opencode/deep-docs/` — OpenCode 架构参考（ellamaka 集成）
- `labs/fork/sampx/new-api/` — 管理端界面参考（React 设计模式）

### Backend Codebase
- `packages/backend/src/db/schema/` — Drizzle schema（用户表已有）
- `packages/backend/src/middleware/` — Auth middleware（复用 Phase 1）
- `packages/backend/src/routes/auth.ts` — Auth API（复用 Phase 1）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Auth System:** Phase 1 已实现完整的 session-based auth（bcrypt, cookie, middleware）
- **User Schema:** `packages/backend/src/db/schema/users.ts` 已有 role 字段（1=student, 10=admin, 100=root）
- **Debug Route:** `/debug` 页面可用于验证 Phase 2 功能

### Established Patterns
- **Hono + Drizzle:** Phase 1 已建立的分层架构（routes → services → db）
- **API Response:** `{ success, message, data }` 格式已确立
- **Route Prefix:** `/api/auth/*`, `/api/admin/*`, `/api/student/*` 已约定

### Integration Points
- **Knowledge Base API:** 新增 `/api/admin/knowledge/*` 和 `/api/student/knowledge/*` 路由
- **LanceDB Integration:** backend 需要新增 LanceDB client，建议在 `packages/backend/src/services/knowledge-base.ts`
- **Seed Script:** 可在 `packages/backend/src/seed/` 新增 knowledge seed 脚本

### Frontend Pattern (待建立)
- **NextJS App Router:** 尚未初始化，Phase 2 新建 `apps/web/`
- **shadcn/ui:** 尚未配置，需初始化 with NextJS 15
- **Role-based Layout:** 需要在 `apps/web/src/app/` 下建立 `(student)/` 和 `(admin)/` route groups

</code_context>

<specifics>
## Specific Ideas

### 登录页角色切换设计
- 三个角色卡片横向排列：学员🎮 / 教员📚 / 管理员⚙️
- 选中后卡片高亮，表单字段保持统一
- 底部提示："选择角色后输入账号密码登录"
- 登录失败提示："用户名或密码错误"（不泄露用户是否存在）

### 学员端风格方向
- 趣味性：emoji 图标、渐变色、圆角卡片
- 导航：底部 Tab Bar（Dashboard / 测评 / 学习 / 练习）或 侧边栏
- 配色：明亮活泼（参考青少年教育 App）

### 管理端风格方向
- 专业性：清晰的信息密度、表格为主、少用 emoji
- 导航：左侧固定侧边栏（Dashboard / 知识库 / 学员管理 / 数据分析 / 设置）
- 配色：简洁中性（参考 Semi Design / shadcn 默认主题）

### Knowledge Base UI 参考
- 列表页：类似 GitHub Issues / Linear，支持标签筛选、搜索
- 详情页：类似 Notion 页面，侧边 Sheet 展开编辑
- Markdown 编辑：使用 `react-markdown` + `react-textarea-autosize`

### Seed Data Location
- 建议将 `docs/products/gesp/seed/` 的数据复制到 `packages/backend/seed-data/`
- 或 backend 直接读取相对路径 `../../docs/products/gesp/seed/`

</specifics>

<deferred>
## Deferred Ideas

### Phase 3-7 相关（超出 Phase 2 范围）
- **智能体调用:** ellamaka assessor/teacher/grader agent 调用（Phase 3-5）
- **SSE 流式:** 教学讲解的实时流式响应（Phase 4）
- **代码编辑器:** 练习页面的代码编辑和提交（Phase 5）
- **学习进度追踪:** 学员学习数据的统计和可视化（Phase 6）
- **完整管理功能:** 学员管理的编辑/删除、数据分析图表、系统配置（Phase 7）

### Future Enhancements
- **前端拆分:** 如 Phase 7 后学员端和管理端独立部署，拆分为两个 NextJS 应用
- **LanceDB 远程模式:** 如数据量增大，迁移到 LanceDB Cloud 或自托管
- **多语言支持:** Python 知识库（当前 Phase 2 只聚焦 C++）

### Discussed but Not Decided
- 无 — 所有灰色区域已确认

</deferred>

---

*Phase: 02-知识库-双端骨架*
*Context gathered: 2026-04-24*
