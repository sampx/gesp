# Roadmap: GESP C++ 智能学习系统

## Overview

构建面向 GESP 1~8 级 C++ 等级考试的 AI 自适应学习平台。采用"每阶段绑定前端界面"策略，确保每个核心阶段都有可视化验证界面。Phase 2 建立学员端/管理端骨架（统一为 NextJS + shadcn/ui），后续 Phase 3-5 填充具体功能页面，Phase 6 整合仪表板，Phase 7 完善管理功能。

**架构变更：** Agent 引擎运行在 ellamaka，gesp backend 作为业务层代理调用。Phase 2 新增：前端统一（学员端+管理端合并），Embedding 使用 Ollama 本地模型。

## Phase Checklist

**Phase numbering rules:**
- Integer phases (1, 2, 3): planned milestone work
- Decimal phases (01.1, 01.2): urgent insertions (marked as INSERTED)

Decimal phases appear between integer phases in numerical order.

- [x] **Phase 1: 基础设施与认证** — 项目初始化、gesp backend 框架、用户认证 ✓ 2026-04-23
- [x] **Phase 01.1: 安全修复 + Debug 界面** — 修复 Phase 1 评审高优先级问题 + 验证界面 (INSERTED) ✓ 2026-04-23
- [x] **Phase 2: 知识库 + 统一前端骨架** — LanceDB 知识库、向量检索、统一前端骨架（NextJS + shadcn）、登录界面 ✓ 2026-04-25
- [ ] **Phase 3: 测评定级智能体 + 测评界面** — ellamaka assessor agent + gesp SDK 代理 + 学员端测评页面
- [ ] **Phase 4: 教学讲解智能体 + 教学界面** — ellamaka teacher agent + SSE 流式 + 学员端教学页面
- [ ] **Phase 5: 练习判题智能体 + 练习界面** — ellamaka grader agent + 判题反馈 + 学员端练习页面
- [ ] **Phase 6: 学员仪表板 + 进度整合** — 学员端仪表板、进度追踪、首页整合三个智能体入口
- [ ] **Phase 7: 管理后台完整功能** — 管理端学员管理、数据分析、系统配置完整界面

## Phase Details

### Phase 1: 基础设施与认证
**Goal:** 开发环境就绪，用户可以注册登录并保持会话，gesp backend 基础框架搭建
**Depends on:** None (首阶段)
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (must be TRUE):
  1. 学员可以使用用户名和密码注册
  2. 学员登录后跨浏览器会话保持登录状态
  3. 管理员可以使用用户名和密码登录
  4. 管理员会话保持 24 小时（学员为 1 小时）
  5. gesp backend 框架结构就绪（Hono + Drizzle + SDK 代理层骨架）
**Plans:** 5/5 complete
**Status:** Complete (2026-04-23)

### Phase 01.1: 安全修复 + Debug 界面 (INSERTED)

**Goal:** 修复 Phase 1 评审中发现的 3 项安全问题（Session ID、用户枚举、默认密码）并创建验证界面供后续阶段功能验证
**Depends on:** Phase 1
**Requirements:** N/A (修复 + 工具)
**Success Criteria** (must be TRUE):
  1. Session ID 使用 256-bit 熵值，不可预测
  2. 注册错误消息模糊化，防止用户枚举攻击
  3. 生产环境强制 ADMIN_PASSWORD，阻止不安全默认密码部署
  4. Debug 界面可验证认证系统功能（登录、注册、会话）
**Plans:** 3/3 complete
**Status:** Complete (2026-04-23)

Plans:
- [x] 01.1-01-PLAN.md — 安全修复（D-R4 Session ID + D-R5 注册模糊化 + D-R7 生产密码强制）+ 单元测试
- [x] 01.1-02-PLAN.md — 验证界面 `/debug`（D-R8）+ Hono HTML 页面 + Wave 2
- [x] 01.1-03-PLAN.md — Gap closure: 测试 mock 污染 + Debug 界面 JavaScript 语法错误

### Phase 2: 知识库 + 双端骨架
**Goal:** GESP 课程知识可通过语义检索供 backend 查询，学员端/管理端界面骨架就绪，用户可登录并看到基础界面
**Depends on:** Phase 01.1
**Requirements:** KNOW-01, KNOW-02, KNOW-03, KNOW-04, KNOW-05, UI-SKEL-01, UI-SKEL-02
**Success Criteria** (must be TRUE):
  1. 知识库可通过文本查询实现语义相似度排序检索
  2. GESP c++ 1-8 级课程大纲已存储且可检索
  3. 一份历年真题已索引
  4. 一份教案已索引
  5. 教员可通过 Web 界面查看和编辑真题解析
  6. 教员可通过 Web 界面添加新教案和题目并进行元数据标签标注
  7. 学员可登录并看到学员端界面框架（路由、布局、导航）
  8. 教员可登录并看到管理端界面框架（路由、布局、导航）
  9. 登录界面支持学员和教员和管理员(当前是 admin, 需要改成 root)角色切换
  10. (架构调整) 管理前端与学员前端系统统一技术栈为 shadcn, 采用不同风格组件
**Plans:** 7/7 complete
**Status:** Complete (2026-04-25)

Plans:
- [x] 02-01-PLAN.md — LanceDB 集成 + 向量检索 API
- [x] 02-02-PLAN.md — 知识库 CRUD API
- [x] 02-03-PLAN.md — 统一前端项目初始化
- [x] 02-04-PLAN.md — 登录界面 + 路由守卫
- [x] 02-05-PLAN.md — 管理端 + 学员端骨架
- [x] 02-06-PLAN.md — Frontend Gap Closure
- [x] 02-07-PLAN.md — Backend Gap Closure

### Phase 3: 测评定级智能体 + 测评界面
**Goal:** 新学员可完成自适应测评并获得等级定位，可在学员端界面看到测评题目和结果
**Depends on:** Phase 2
**Requirements:** ASSESS-01, ASSESS-02, ASSESS-03, ASSESS-04, ASSESS-05, UI-ASSESS-01
**Success Criteria** (must be TRUE):
  1. gesp backend 可调用 ellamaka assessor agent
  2. 学员根据当前等级估计收到自适应题目
  3. 题目覆盖 GESP 1-4 级课程范围（各级别定义的主题）
  4. 学员答案自动评分（客观题 + 编程题）
  5. 学员完成 5-10 道题后获得级别定级结果
  6. 测评进度增量保存，可中断后恢复继续
  7. 学员可通过学员端界面参与测评并查看定级结果
**Plans:** TBD

### Phase 4: 教学讲解智能体 + 教学界面
**Goal:** 学员可观看 AI 生成的知识点讲解并获得互动答疑，可在学员端界面看到教学内容
**Depends on:** Phase 2
**Requirements:** TEACH-01, TEACH-02, TEACH-03, TEACH-04, TEACH-05, UI-TEACH-01
**Success Criteria** (must be TRUE):
  1. gesp backend 可调用 ellamaka teacher agent 并转发 SSE 流
  2. 学员可查看结构化的知识点讲解，含代码示例
  3. 讲解使用青少年友好的语言，融入生活类比
  4. 为复杂概念生成可视化图表（ASCII/Mermaid）
  5. 学员可在课程中提问（通过 SSE 进行交互式问答）
  6. 教学内容参考官方 GESP 课程大纲确保准确性
  7. 学员可通过学员端界面观看教学内容并参与互动问答
**Plans:** TBD

### Phase 5: 练习判题智能体 + 练习界面
**Goal:** 学员可完成编程练习并获得 AI 智能判题反馈，可在学员端界面提交代码并查看反馈
**Depends on:** Phase 2
**Requirements:** PRAC-01, PRAC-02, PRAC-03, PRAC-04, PRAC-05, PRAC-06, UI-PRAC-01
**Success Criteria** (must be TRUE):
  1. gesp backend 可调用 ellamaka grader agent
  2. 学员收到匹配当前级别的练习题
  3. 学员可通过 Web 界面提交代码答案
  4. 提交的代码经 AI 模拟判题分析正确性
  5. 错误按类型分类（语法/逻辑/算法错误）
  6. 系统提供具体的改进建议，含代码位置提示
  7. 根据薄弱点模式推荐类似的练习题
  8. 学员可通过学员端界面提交代码并查看判题反馈
**Plans:** TBD

### Phase 6: 学员仪表板 + 进度整合
**Goal:** 学员拥有完整的学习界面和个人进度追踪，可从仪表板进入测评/教学/练习三个流程
**Depends on:** Phase 3, Phase 4, Phase 5
**Requirements:** PROG-01, PROG-02, PROG-03, PROG-04, UI-DASH-01
**Success Criteria** (must be TRUE):
  1. 学员可查看个人仪表板，显示级别、进度和最近活动
  2. 每次会话的学习时间被追踪记录
  3. 基于练习历史识别知识薄弱点
  4. 进度通过完成率图表可视化展示
  5. 学员可通过仪表板界面触发测评、课程、练习三个流程
  6. 学员端首页整合仪表板 + 功能入口导航
**Plans:** TBD
**UI Phase:** Yes

### Phase 7: 管理后台完整功能
**Goal:** 管理员可管理学员数据并查看系统分析，管理端界面完整可用
**Depends on:** Phase 2
**Requirements:** ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, UI-ADMIN-01
**Success Criteria** (must be TRUE):
  1. 管理员可查看学员列表，支持搜索和筛选
  2. 管理员可查看单个学员的学习数据和进度详情
  3. 管理员可查看汇总统计（学员总数、完成率等）
  4. 管理员可管理系统配置（AI Provider 设置）
  5. 管理端界面完整可用，包含学员管理、数据分析、系统配置模块
**Plans:** TBD
**UI Phase:** Yes

## Progress

**Execution Order:**
Phase executed in numerical order: 1 → 01.1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed Date |
|-------|----------------|--------|----------------|
| 1. 基础设施与认证 | 5/5 | Complete | 2026-04-23 |
| 01.1 安全修复 + Debug | 3/3 | Complete | 2026-04-23 |
| 2. 知识库 + 双端骨架 | 0/TBD | Not Started | - |
| 3. 测评定级 + 测评界面 | 0/TBD | Not Started | - |
| 4. 教学讲解 + 教学界面 | 0/TBD | Not Started | - |
| 5. 练习判题 + 练习界面 | 0/TBD | Not Started | - |
| 6. 学员仪表板 + 进度整合 | 0/TBD | Not Started | - |
| 7. 管理后台完整功能 | 0/TBD | Not Started | - |