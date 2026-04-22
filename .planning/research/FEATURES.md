# Features Analysis

**Domain:** GESP C++ AI 自适应学习平台
**Researched:** 2026-04-22
**Confidence:** HIGH（基于领域专长 + 需求文档）

---

## Feature Categories

### 1. Authentication & User Management

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| 学员注册/登录 | Table stakes | Low | ✓ v1 |
| 学员资料管理 | Table stakes | Low | ✓ v1 |
| 管理员认证 | Table stakes | Low | ✓ v1 |
| 会话保持 | Table stakes | Low | ✓ v1 |
| OAuth 登录（微信/QQ）| Differentiator | Medium | v2 |
| 家长账号关联 | Differentiator | Medium | v2 |

### 2. Assessment (测评定级智能体)

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| 自适应题目生成 | Core differentiator | High | ✓ v1 |
| 自动评分 | Table stakes | Medium | ✓ v1 |
| 等级判定算法 | Core differentiator | High | ✓ v1 |
| 历史表现分析 | Table stakes | Medium | ✓ v1 |
| 可视化进度指示器 | Differentiator (youth) | Medium | ✓ v1 |
| 游戏化测评（积分/徽章）| Differentiator | Medium | v2 |
| 定时测评模式 | Table stakes | Low | v2 |

### 3. Teaching (教学讲解智能体)

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| AI 生成的讲解 | Core differentiator | High | ✓ v1 |
| 带注释的代码示例 | Table stakes | Medium | ✓ v1 |
| 课程中交互式问答 | Differentiator | High | ✓ v1 |
| 可视化图表（ASCII/Mermaid）| Differentiator (youth) | Medium | ✓ v1 |
| AI 虚拟人语音 | Differentiator | Very High | v2 (out) |
| 视频生成 | Differentiator | Very High | v2 (out) |
| 收藏课程 | Table stakes | Low | v2 |

### 4. Practice & Grading (练习出题判题智能体)

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| 动态题目生成 | Core differentiator | High | ✓ v1 |
| AI 代码分析 | Core differentiator | High | ✓ v1 |
| 错误类型分类 | Table stakes | Medium | ✓ v1 |
| 改进建议 | Table stakes | Medium | ✓ v1 |
| 真实代码沙盒执行 | Table stakes (OJ) | Very High | v2 (out) |
| 分步评分 | Differentiator | High | ✓ v1 |
| 代码抄袭检测 | Table stakes | Medium | v2 |
| 类似题目推荐 | Differentiator | Medium | ✓ v1 |

### 5. Progress & Analytics

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| 学习仪表板 | Table stakes | Medium | ✓ v1 |
| 进度追踪 | Table stakes | Low | ✓ v1 |
| 薄弱点分析 | Differentiator | High | ✓ v1 |
| 学习时间追踪 | Table stakes | Low | ✓ v1 |
| 可打印的学习报告 | Differentiator | Medium | v2 |
| 家长进度报告 | Differentiator | Medium | v2 |
| 考试准备度预测 | Differentiator | High | v2 |

### 6. Knowledge Base

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| GESP 1-4 级大纲结构 | Table stakes | High | ✓ v1 |
| 知识向量检索 | Differentiator | High | ✓ v1 |
| 题目库及元数据 | Table stakes | High | ✓ v1 |
| 管理员增删改查 | Table stakes | Medium | ✓ v1 |
| 自动标记新内容 | Differentiator | Medium | v2 |
| 内容版本管理 | Differentiator | Low | v2 |

### 7. Admin Dashboard

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| 学员列表/管理 | Table stakes | Low | ✓ v1 |
| 学习数据可视化 | Table stakes | Medium | ✓ v1 |
| 知识库编辑器 | Table stakes | Medium | ✓ v1 |
| 系统日志查看器 | Table stakes | Low | ✓ v1 |
| 批量操作 | Differentiator | Medium | v2 |
| 导出数据（CSV/PDF）| Differentiator | Low | v2 |
| 多管理员角色 | Differentiator | Medium | v2 |

---

## MVP Scope Summary (v1)

**Core Requirements (7 categories):**

1. **Auth** — 学员/管理员登录，会话管理
2. **Assessment Agent** — 自适应题目生成，自动评分，等级定级
3. **Teaching Agent** — AI 讲解，代码示例，交互式问答
4. **Practice Agent** — 题目生成，AI 判题，错误分析
5. **Progress** — 仪表板，进度追踪，薄弱点分析
6. **Knowledge Base** — GESP 大纲，向量检索，管理员增删改查
7. **Admin** — 学员管理，数据可视化，知识库编辑器

**Total v1 features:** ~25 core features

---

## v2 Deferred Features

| Category | Feature | Why Deferred |
|----------|---------|--------------|
| Auth | OAuth（微信/QQ）| 需要外部集成，对 MVP 非关键 |
| Auth | 家长账号 | 复杂的关系模型，v1 聚焦学员 |
| Assessment | 游戏化 | UX 优化，不是核心学习流程 |
| Teaching | AI 语音/视频 | 高复杂度，需要媒体处理流水线 |
| Practice | 真实沙盒 | 复杂的安全设置，AI 模拟对 v1 已足够 |
| Progress | 可打印报告 | PDF 生成，锦上添花 |
| Progress | 家长报告 | 需要先有家长账号 |
| Admin | 多角色 RBAC | 单个管理员对 MVP 已足够 |

---

## Anti-Features (Deliberately NOT Building)

| Feature | Why NOT |
|---------|---------|
| 学员间实时聊天 | 不是社交平台，聚焦学习 |
| 视频上传/分享 | 存储成本高，不是 C++ 学习核心 |
| 实时课程流媒体 | 媒体基础设施复杂 |
| 移动端原生应用 | Web 优先，响应式设计已足够 |
| 支付/订阅系统 | MVP 免费，商业模式待定 |
| 第三方内容导入 | 版权问题，使用官方 GESP 材料 |
| AI 生可打印试卷 | 未经验证，存在考试诚信风险 |

---

## Feature Dependencies

```
Auth ──────┬──────► Assessment ──────► Progress
           │              │
           │              ▼
           ├──────► Teaching ───────► Practice
           │              │              │
           │              └──────────────┤
           │                             ▼
           └────────────────────► Admin Dashboard
                                           │
                                           ▼
                                     Knowledge Base
                                           │
                                           ▼
                                (Assessment/Teaching/Practice)
```

**Critical Path:**
1. Auth → Knowledge Base → Assessment Agent → Teaching Agent → Practice Agent
2. 所有智能体都依赖知识库（向量检索）
3. 进度追踪依赖测评 + 练习结果
4. 管理后台依赖所有用户数据

---

## Complexity Estimation

| Component | Est. Hours | Risk Level |
|-----------|------------|------------|
| Auth system | 8-12 | Low |
| Knowledge Base（LanceDB + 数据初始化）| 16-24 | Medium |
| Assessment Agent | 24-40 | High（AI 准确性）|
| Teaching Agent | 20-32 | Medium |
| Practice/Grading Agent | 24-40 | High（AI 准确性）|
| Student App（NextJS）| 40-60 | Medium |
| Admin App（React/Semi）| 24-40 | Low |
| Integration + E2E | 16-24 | Medium |

**Total MVP estimate:** ~180-260 hours

---

## Sources

- **需求文档** — GESP 智能学习系统需求（HIGH confidence）
- **领域专长** — GESP 考试结构、青少年教育模式（HIGH confidence）
- **ellamaka 参考** — AI 智能体模式、流式 UI（HIGH confidence）
