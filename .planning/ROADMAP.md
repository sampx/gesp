# Roadmap: GESP C++ 智能学习系统

## Overview

构建面向 GESP 1~4 级 C++ 等级考试的 AI 自适应学习平台。从项目基础设施开始，搭建知识库和认证系统，然后依次实现三个核心智能体（测评定级、教学讲解、练习判题），最后构建学员端和管理端应用完成 MVP 交付。

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Auth** - 项目基础设施搭建与用户认证系统
- [ ] **Phase 2: Knowledge Base** - 知识库基础设施与向量检索
- [ ] **Phase 3: Assessment Agent** - 测评定级智能体
- [ ] **Phase 4: Teaching Agent** - 教学讲解智能体
- [ ] **Phase 5: Practice Agent** - 练习判题智能体
- [ ] **Phase 6: Student Learning App** - 学员学习界面与进度追踪
- [ ] **Phase 7: Admin Management App** - 管理后台应用

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: 开发环境就绪，用户可以注册登录并保持会话
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Student can register with username and password
  2. Student can login and stay logged in across browser sessions
  3. Admin can login with username and password
  4. Admin session persists for 24 hours (vs 1 hour for students)
**Plans**: TBD

### Phase 2: Knowledge Base
**Goal**: GESP 课程知识可通过语义检索供 AI 智能体查询
**Depends on**: Phase 1
**Requirements**: KNOW-01, KNOW-02, KNOW-03, KNOW-04, KNOW-05
**Success Criteria** (what must be TRUE):
  1. Knowledge points can be searched by text query with semantic similarity ranking
  2. GESP 1-4 curriculum outline is stored and retrievable
  3. Past exam questions are indexed with metadata (level, topic, difficulty)
  4. Admin can view and edit knowledge base content
  5. Admin can add new questions with proper metadata tagging
**Plans**: TBD

### Phase 3: Assessment Agent
**Goal**: 新学员可完成自适应测评并获得等级定位
**Depends on**: Phase 2
**Requirements**: ASSESS-01, ASSESS-02, ASSESS-03, ASSESS-04, ASSESS-05
**Success Criteria** (what must be TRUE):
  1. Student receives adaptive questions based on current level estimate
  2. Questions cover GESP 1-4 curriculum scope (defined topics per level)
  3. Student answers are auto-graded (objective + coding questions)
  4. Student receives level placement after completing 5-10 questions
  5. Assessment progress is saved incrementally and can be resumed after interruption
**Plans**: TBD

### Phase 4: Teaching Agent
**Goal**: 学员可观看 AI 生成的知识点讲解并获得互动答疑
**Depends on**: Phase 2
**Requirements**: TEACH-01, TEACH-02, TEACH-03, TEACH-04, TEACH-05
**Success Criteria** (what must be TRUE):
  1. Student can view structured knowledge point explanations with code examples
  2. Explanations use youth-friendly language with life analogies
  3. Visual diagrams (ASCII/Mermaid) are generated for complex concepts
  4. Student can ask follow-up questions during lesson (interactive Q&A via SSE)
  5. Teaching content references official GESP curriculum for accuracy
**Plans**: TBD

### Phase 5: Practice Agent
**Goal**: 学员可完成编程练习并获得 AI 智能判题反馈
**Depends on**: Phase 2
**Requirements**: PRAC-01, PRAC-02, PRAC-03, PRAC-04, PRAC-05, PRAC-06
**Success Criteria** (what must be TRUE):
  1. Student receives practice questions matching current level
  2. Student can submit code answers via web interface
  3. Submitted code is analyzed for correctness (AI simulated grading)
  4. Errors are classified by type (syntax/logic/algorithm errors)
  5. System provides specific improvement suggestions with code location hints
  6. Similar practice questions are recommended based on weakness patterns
**Plans**: TBD

### Phase 6: Student Learning App
**Goal**: 学员拥有完整的学习界面和个人进度追踪
**Depends on**: Phase 3, Phase 4, Phase 5
**Requirements**: PROG-01, PROG-02, PROG-03, PROG-04
**Success Criteria** (what must be TRUE):
  1. Student can view personal dashboard showing level, progress, and recent activity
  2. Learning time is tracked per session
  3. Knowledge weaknesses are identified based on practice history
  4. Progress is visualized with completion rate charts
**Plans**: TBD
**UI hint**: yes

### Phase 7: Admin Management App
**Goal**: 管理员可管理学员数据并查看系统分析
**Depends on**: Phase 1, Phase 2
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04
**Success Criteria** (what must be TRUE):
  1. Admin can view list of all students with search and filter capabilities
  2. Admin can view individual student learning data and progress details
  3. Admin can view aggregate statistics (total students, completion rates)
  4. Admin can manage system configuration (AI provider settings)
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 0/TBD | Not started | - |
| 2. Knowledge Base | 0/TBD | Not started | - |
| 3. Assessment Agent | 0/TBD | Not started | - |
| 4. Teaching Agent | 0/TBD | Not started | - |
| 5. Practice Agent | 0/TBD | Not started | - |
| 6. Student Learning App | 0/TBD | Not started | - |
| 7. Admin Management App | 0/TBD | Not started | - |