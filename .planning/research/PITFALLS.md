# Pitfalls & Risk Prevention

**Domain:** GESP C++ AI 自适应学习平台
**Researched:** 2026-04-22
**Confidence:** HIGH（基于领域专长 + 教育 AI 模式）

---

## Critical Pitfalls

### 1. AI Accuracy & Hallucination in Educational Content

**Pitfall:** AI 生成错误的讲解或代码示例，学生学了错误的概念。

**Warning Signs:**
- AI 生成的代码无法编译或存在逻辑错误
- 讲解内容与官方 GESP 课程大纲相矛盾
- 交互式问答中学生表现出困惑
- AI 判题分析出错率高

**Prevention Strategy:**
- 实施严格的提示词工程，加入验证步骤
- 向学生展示前，对照策划好的知识库交叉验证 AI 输出
- 使用结构化输出（Zod schema）强制正确格式
- 添加"置信度评分"显示 — 当 AI 不确定时警告学生
- AI 生成教学内容的管理员审核流程

**Phase to Address:** Phase 2（教学讲解智能体）, Phase 4（练习判题智能体）

---

### 2. Youth Engagement Dropout

**Pitfall:** 青少年学生很快失去兴趣，完成率低，平台变得无聊。

**Warning Signs:**
- 会话时长过短（< 10 分钟）
- 首次测评后跳出率高
- 首次访问后回访率低
- 学生跳过课程，只做测评

**Prevention Strategy:**
- MVP 中加入游戏化元素（进度条、徽章、连续学习天数）
- 视觉反馈 — 即时正/负反馈指示
- 短课程，每个 < 5 分钟
- 自适应难度 — 不因太难而挫败学生
- 讲解中使用趣味类比（生活化类比）
- 允许学生"暂停后恢复"而不丢失进度

**Phase to Address:** Phase 3（学员端 UX）, Phase 1（测评 UX）

---

### 3. Knowledge Base Coverage Gaps

**Pitfall:** 向量检索返回不相关结果，因为知识库不完整或结构不良。

**Warning Signs:**
- 教学智能体引用不存在的主题
- 测评生成超出 GESP 范围的题目
- 搜索结果与学生查询不匹配
- 管理员报告缺失知识点

**Prevention Strategy:**
- 启动前使用完整的 GESP 1-4 级课程大纲初始化 LanceDB
- 以官方 GESP 考试大纲作为分类骨架
- 在向量检索中实现元数据过滤（级别、主题、难度）
- 管理员定期审计知识库覆盖度
- 当检测到知识缺口时回退到通用响应

**Phase to Address:** Phase 1（知识库初始化）

---

### 4. Provider Reliability & Cost

**Pitfall:** 单一 AI 供应商失效或成本暴涨，系统宕机或费用爆炸。

**Warning Signs:**
- 高峰期 API 限流错误
- 响应时间过慢（> 5 秒）
- 意外账单激增
- 供应商 API 变更导致集成中断

**Prevention Strategy:**
- 多供应商降级链（OpenAI → Anthropic → DeepSeek → 豆包）
- 实现请求队列和限流
- 缓存常见响应（相似题目、常见错误分析）
- 监控 API 用量并设置告警
- 简单任务使用低成本模型（判题 vs 教学）

**Phase to Address:** Phase 2（Provider 抽象层）

---

### 5. Assessment Fairness & Consistency

**Pitfall:** AI 生成的测评不一致 — 同一学生获得不同的等级结果。

**Warning Signs:**
- 学生对评分不公表示不满
- 等级定级在会话间意外变化
- 测评难度与学生进度不匹配
- 对特定题型存在偏见

**Prevention Strategy:**
- 每个级别使用固定的测评题库（从精选题库中抽样）
- 记录所有测评决策以便审计
- AI 提示词中明确评分标准
- 等级定级前由管理员进行测评后审核
- 学生可以申诉/重测

**Phase to Address:** Phase 2（测评定级智能体）

---

### 6. AI Grading Over-trust

**Pitfall:** 学生盲目信任 AI 判题而不自行验证，错失真正的学习机会。

**Warning Signs:**
- 学生接受错误判题而不质疑
- AI 将正确代码判定为错误
- 判题不解释"为什么"出错
- 没有反馈循环来改进 AI 准确性

**Prevention Strategy:**
- 始终显示"AI 已分析此答案"提示
- 鼓励学生查看判题解释
- 提供"报告问题"按钮用于可疑判题
- 管理员审核队列用于争议判题
- AI 识别错误类型，但要求学生自己找到错误位置

**Phase to Address:** Phase 4（练习判题智能体）

---

### 7. Session State Loss

**Pitfall:** 学生在测评或课程中因连接中断或浏览器刷新而丢失进度。

**Warning Signs:**
- 学生抱怨答案丢失
- 刷新后会话数据不持久
- SSE 连接断开后无法恢复
- 长会话超时

**Prevention Strategy:**
- 增量保存进度（每次答题后）
- 对关键数据使用 localStorage 备份
- 实现 SSE 重连逻辑
- 断开前发出会话超时警告
- 支持"从断点继续"功能

**Phase to Address:** Phase 3（学员端状态管理）

---

### 8. Admin Data Overload

**Pitfall:** 管理后台显示过多数据，变得不可用，决策延迟。

**Warning Signs:**
- 仪表板加载缓慢（> 3 秒）
- 管理员找不到特定学生数据
- 表格/图表过多，优先级不清晰
- 数据没有可执行的洞察

**Prevention Strategy:**
- 仪表板聚焦可执行指标（完成率、错误模式）
- 实现分页和筛选
- 摘要视图支持向下钻取
- 导出关键数据用于离线分析
- 重要事件的告警系统（学生卡壳、低参与度）

**Phase to Address:** Phase 5（管理后台）

---

### 9. Monorepo Build Complexity

**Pitfall:** Turborepo 配置变得复杂，构建变慢，本地开发混乱。

**Warning Signs:**
- "昨天还能跑"的构建失败
- 开发者不知道该修改哪个包
- 跨包依赖关系不清晰
- 构建时间超过 5 分钟

**Prevention Strategy:**
- 清晰的包依赖图文档
- 使用 Turborepo 远程缓存
- 严格的工作区边界（禁止循环依赖）
- 每个包有自己的 README 和开发指南
- CI 流水线验证构建顺序

**Phase to Address:** Phase 0（项目初始化）

---

### 10. Scope Creep from "Nice-to-Have"

**Pitfall:** 开发过程中不断添加"锦上添花"的功能，MVP 时间线爆炸。

**Warning Signs:**
- "这个很简单，我们加上吧"的对话
- v1 需求从 25 个增长到 40+
- 阶段预估时间不断增加
- 团队被功能数量压垮

**Prevention Strategy:**
- PROJECT.md 中列出严格的 OUT OF SCOPE 清单
- 每个新功能都通过"是否支持核心价值"的检查
- 每周与利益相关者进行范围审查
- 设置延迟功能积压池（不丢弃想法，但先搁置）
- 提前定义 MVP 成功标准

**Phase to Address:** Ongoing（由 PROJECT.md 强制执行）

---

## Risk Matrix

| Risk | Likelihood | Impact | Phase | Mitigation Priority |
|------|------------|--------|-------|---------------------|
| AI 幻觉 | High | Critical | 2, 4 | P0 — 必须解决 |
| 青少年流失 | High | High | 1, 3 | P0 — 核心 UX |
| 知识缺口 | Medium | Critical | 1 | P1 — 基础 |
| Provider 失效 | Medium | High | 2 | P1 — 可靠性 |
| 测评公平性 | Medium | High | 2 | P1 — 信任 |
| 会话丢失 | Medium | Medium | 3 | P2 — UX 优化 |
| 判题过度信任 | Medium | Medium | 4 | P2 — 教育 |
| 管理后台过载 | Low | Low | 5 | P3 — 后-MVP |
| 构建复杂度 | Low | Medium | 0 | P2 — 初始化 |
| 范围蔓延 | High | Medium | All | P1 — 流程 |

---

## Sources

- **教育 AI 研究** — 辅导系统中的幻觉模式（MEDIUM confidence, web search）
- **青少年教育 UX 模式** — 编程教育的参与度因素（HIGH confidence, 领域专长）
- **ellamaka 经验** — Provider 可靠性、SSE 模式（HIGH confidence）
- **领域专长** — GESP 考试模式、学生行为（HIGH confidence）
