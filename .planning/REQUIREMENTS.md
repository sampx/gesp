# Requirements: GESP C++ 智能学习系统

**Defined:** 2026-04-22
**Updated:** 2026-04-24（ROADMAP 重设计：前端绑定策略）
**Core Value:** AI 全流程自动化 — 测评定级、教学讲解、练习判题全部由 AI 智能体驱动
**Architecture:** Agent 引擎运行在 ellamaka，gesp backend 作为业务层代理调用

## v1 Requirements

### Authentication

- [x] **AUTH-01**: 学员可以使用用户名和密码注册
- [x] **AUTH-02**: 学员登录后跨会话保持登录状态
- [x] **AUTH-03**: 管理员可以使用用户名和密码登录
- [x] **AUTH-04**: 管理员会话保持更长的 TTL（24 小时 vs 学员 1 小时）

### Knowledge Base

- [ ] **KNOW-01**: 系统以结构化数据存储 GESP 1-4 级课程大纲
- [ ] **KNOW-02**: 系统存储历年真题及元数据（级别、主题、难度）
- [ ] **KNOW-03**: 系统为知识点和题目提供向量检索（LanceDB）
- [ ] **KNOW-04**: 管理员可查看和编辑知识库内容
- [ ] **KNOW-05**: 管理员可添加新题目并进行元数据标签标注

### Frontend Skeleton (Phase 2 新增)

- [ ] **UI-SKEL-01**: 学员可登录并看到学员端界面框架（路由、布局、导航）
- [ ] **UI-SKEL-02**: 管理员可登录并看到管理端界面框架（路由、布局、导航）

### Assessment Agent (测评定级智能体)

- [ ] **ASSESS-01**: 系统根据学员级别生成自适应测评题目
- [ ] **ASSESS-02**: 题目覆盖 GESP 1-4 级课程范围（各级别定义的主题）
- [ ] **ASSESS-03**: 系统自动为学员答案评分（客观题 + 编程题）
- [ ] **ASSESS-04**: 初始测评完成后确定学员起始级别（5-10 道题）
- [ ] **ASSESS-05**: 测评进度增量保存（支持中断后恢复）

### Assessment UI (Phase 3 新增)

- [ ] **UI-ASSESS-01**: 学员可通过学员端界面参与测评并查看定级结果

### Teaching Agent (教学讲解智能体)

- [ ] **TEACH-01**: 系统生成结构化的知识点讲解，含代码示例
- [ ] **TEACH-02**: 讲解使用青少年友好的语言，融入生活类比（趣味性）
- [ ] **TEACH-03**: 系统为可视化生成 ASCII 图表或 Mermaid 图表
- [ ] **TEACH-04**: 学员可在课程中提问（通过 SSE 进行交互式问答）
- [ ] **TEACH-05**: 教学内容参考官方 GESP 课程大纲确保准确性

### Teaching UI (Phase 4 新增)

- [ ] **UI-TEACH-01**: 学员可通过学员端界面观看教学内容并参与互动问答

### Practice Agent (练习出题判题智能体)

- [ ] **PRAC-01**: 系统生成匹配学员当前级别的练习题
- [ ] **PRAC-02**: 学员可通过 Web 界面提交代码答案
- [ ] **PRAC-03**: 系统分析提交代码并判定正确性（AI 模拟判题）
- [ ] **PRAC-04**: 系统按类型对错误分类（语法/逻辑/算法错误）
- [ ] **PRAC-05**: 系统提供具体的改进建议，含代码位置提示
- [ ] **PRAC-06**: 系统根据薄弱点模式推荐类似的练习题

### Practice UI (Phase 5 新增)

- [ ] **UI-PRAC-01**: 学员可通过学员端界面提交代码并查看判题反馈

### Progress Tracking

- [ ] **PROG-01**: 学员可查看个人学习仪表板（级别、进度、最近活动）
- [ ] **PROG-02**: 系统追踪每次会话的学习时间
- [ ] **PROG-03**: 系统根据练习历史识别学员的知识薄弱点
- [ ] **PROG-04**: 学员可通过进度可视化图表查看完成率

### Dashboard UI (Phase 6 新增)

- [ ] **UI-DASH-01**: 学员可通过仪表板界面触发测评、课程、练习三个流程

### Admin Dashboard

- [ ] **ADMIN-01**: 管理员可查看学员列表，支持搜索和筛选
- [ ] **ADMIN-02**: 管理员可查看单个学员的学习数据和进度
- [ ] **ADMIN-03**: 管理员可查看汇总统计数据（学员总数、完成率）
- [ ] **ADMIN-04**: 管理员可管理系统配置（AI Provider 设置）

### Admin UI (Phase 7 新增)

- [ ] **UI-ADMIN-01**: 管理端界面完整可用，包含学员管理、数据分析、系统配置模块

## v2 Requirements (Deferred)

### Enhanced Authentication

- **AUTH-05**: OAuth 登录（微信/QQ）用于学员
- **AUTH-06**: 家长账号关联以查看孩子进度

### Gamification

- **GAME-01**: 完成里程碑时获得成就徽章
- **GAME-02**: 每日连续学习追踪和奖励
- **GAME-03**: 练习成绩排行榜

### Voice/Video Teaching

- **TEACH-06**: AI 虚拟人语音合成用于讲解
- **TEACH-07**: 关键概念动画视频生成

### Real Code Execution

- **PRAC-07**: 提交代码在真实沙盒环境中执行（超时、内存限制）
- **PRAC-08**: 分步评分，支持部分得分

### Advanced Analytics

- **PROG-05**: 可打印的 PDF 学习报告
- **PROG-06**: 家长进度通知邮件
- **PROG-07**: 考试准备度预测算法

### System Iteration

- **ITER-01**: 系统定期分析汇总学习数据
- **ITER-02**: 系统向管理员建议知识库更新
- **ITER-03**: 管理员可一键审批/拒绝系统建议

### Multi-Admin Roles

- **ADMIN-05**: 基于角色的访问控制（超级管理员、内容管理员、查看者）
- **ADMIN-06**: 管理员操作审计日志

## Out of Scope

| Feature | Reason |
|---------|--------|
| Social features (chat, comments) | 不是社交平台，聚焦学习 |
| Video upload/sharing | 存储成本高，不是 C++ 学习核心 |
| Live class streaming | 媒体基础设施复杂，超出范围 |
| Mobile native app | Web 优先，响应式设计足够 |
| Payment/subscription system | 免费 MVP，商业模式待定 |
| Third-party content import | 版权问题，使用官方 GESP 材料 |
| AI-generated exam papers for printing | 考试诚信考量 |

## Traceability

哪个阶段覆盖哪些需求。在创建 Roadmap 时更新。

**架构变更：**
- Phase 1 增加 gesp backend 框架搭建
- Phase 3-5 改为 ellamaka agent 集成 + gesp SDK 代理
- Phase 6 整合三个智能体调用

**ROADMAP 重设计（2026-04-24）：**
- Phase 2 增加学员端/管理端骨架 + 登录界面
- Phase 3-5 各增加学员端功能页面
- Phase 6 增加仪表板整合
- Phase 7 增加管理端完整界面

| Requirement | Phase | Status | Implementation Approach |
|-------------|-------|--------|------------------------|
| AUTH-01 | Phase 1 | Complete | gesp backend |
| AUTH-02 | Phase 1 | Complete | gesp backend |
| AUTH-03 | Phase 1 | Complete | gesp backend |
| AUTH-04 | Phase 1 | Complete | gesp backend |
| KNOW-01 | Phase 2 | Pending | gesp backend + LanceDB |
| KNOW-02 | Phase 2 | Pending | gesp backend + LanceDB |
| KNOW-03 | Phase 2 | Pending | gesp backend + LanceDB |
| KNOW-04 | Phase 2 | Pending | gesp backend + 管理端界面 |
| KNOW-05 | Phase 2 | Pending | gesp backend + 管理端界面 |
| UI-SKEL-01 | Phase 2 | Pending | NextJS 学员端骨架 |
| UI-SKEL-02 | Phase 2 | Pending | React + Vite 管理端骨架 |
| ASSESS-01 | Phase 3 | Pending | ellamaka assessor + gesp SDK |
| ASSESS-02 | Phase 3 | Pending | ellamaka assessor + gesp SDK |
| ASSESS-03 | Phase 3 | Pending | ellamaka assessor + gesp SDK |
| ASSESS-04 | Phase 3 | Pending | ellamaka assessor + gesp SDK |
| ASSESS-05 | Phase 3 | Pending | ellamaka assessor + gesp SDK |
| UI-ASSESS-01 | Phase 3 | Pending | 学员端测评页面 |
| TEACH-01 | Phase 4 | Pending | ellamaka teacher + gesp SSE |
| TEACH-02 | Phase 4 | Pending | ellamaka teacher + gesp SSE |
| TEACH-03 | Phase 4 | Pending | ellamaka teacher + gesp SSE |
| TEACH-04 | Phase 4 | Pending | ellamaka teacher + gesp SSE |
| TEACH-05 | Phase 4 | Pending | ellamaka teacher + gesp SSE |
| UI-TEACH-01 | Phase 4 | Pending | 学员端教学页面 |
| PRAC-01 | Phase 5 | Pending | ellamaka grader + gesp SDK |
| PRAC-02 | Phase 5 | Pending | ellamaka grader + gesp SDK |
| PRAC-03 | Phase 5 | Pending | ellamaka grader + gesp SDK |
| PRAC-04 | Phase 5 | Pending | ellamaka grader + gesp SDK |
| PRAC-05 | Phase 5 | Pending | ellamaka grader + gesp SDK |
| PRAC-06 | Phase 5 | Pending | ellamaka grader + gesp SDK |
| UI-PRAC-01 | Phase 5 | Pending | 学员端练习页面 |
| PROG-01 | Phase 6 | Pending | student-app（仪表板）|
| PROG-02 | Phase 6 | Pending | student-app |
| PROG-03 | Phase 6 | Pending | student-app |
| PROG-04 | Phase 6 | Pending | student-app |
| UI-DASH-01 | Phase 6 | Pending | 学员端仪表板 + 首页整合 |
| ADMIN-01 | Phase 7 | Pending | admin-app |
| ADMIN-02 | Phase 7 | Pending | admin-app |
| ADMIN-03 | Phase 7 | Pending | admin-app |
| ADMIN-04 | Phase 7 | Pending | admin-app |
| UI-ADMIN-01 | Phase 7 | Pending | 管理端完整界面 |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-24 after ROADMAP redesign (frontend binding strategy)*