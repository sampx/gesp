# Architecture Patterns

**Domain:** GESP C++ AI 自适应学习平台
**Researched:** 2026-04-22
**Confidence:** HIGH（基于参考项目 ellamaka + 领域模式）

## Recommended Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GESP Learning Platform                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Student App (NextJS)              │  Admin App (React + Vite + Semi)        │
│  ┌─────────────────────┐           │  ┌─────────────────────────────┐       │
│  │ Learning Center     │           │  │ Knowledge Base Manager      │       │
│  │ Assessment UI       │           │  │ Student Data Dashboard      │       │
│  │ Lesson Viewer       │           │  │ System Configuration        │       │
│  │ Practice Interface  │           │  │ Analytics Reports           │       │
│  └─────────────────────┘           │  └─────────────────────────────┘       │
│            │ SSE                    │            │ REST                       │
│            ▼                        │            ▼                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                           Backend (Hono + Bun)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          API Gateway Layer                            │   │
│  │  /api/student/*  │  /api/admin/*  │  /api/ai/*  │  /api/auth/*       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│            │                                                              │
│            ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          AI Agent Layer                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ Assessment   │  │ Teaching     │  │ Grading      │               │   │
│  │  │ Agent        │  │ Agent        │  │ Agent        │               │   │
│  │  │ (测评定级)   │  │ (讲解生成)   │  │ (判题分析)   │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  │            │              │              │                            │   │
│  │            └──────────────┴──────────────┘                            │   │
│  │                          │                                            │   │
│  │                          ▼                                            │   │
│  │  ┌─────────────────────────────────────────────────────────────┐     │   │
│  │  │              Vercel AI SDK (Multi-Provider)                   │     │   │
│  │  │  OpenAI │ Anthropic │ Google │ DeepSeek │ Doubao │ Others    │     │   │
│  │  └─────────────────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│            │                                                              │
│            ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          Service Layer                                │   │
│  │  StudentService │ ProgressService │ KnowledgeService │ Analytics     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│            │                                                              │
│            ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          Data Layer                                   │   │
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐         │   │
│  │  │   SQLite         │  │          LanceDB                  │         │   │
│  │  │   (Relational)   │  │    (Vector/Knowledge Base)        │         │   │
│  │  │                  │  │                                  │         │   │
│  │  │ Students         │  │ Knowledge Points (embedded)      │         │   │
│  │  │ Progress         │  │ Questions (embedded)             │         │   │
│  │  │ Sessions         │  │ Solutions (embedded)             │         │   │
│  │  │ Assessments      │  │ Exam Patterns (embedded)         │         │   │
│  │  └──────────────────┘  └──────────────────────────────────┘         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Monorepo Package Structure

```
packages/
├── backend/                    # Hono API 服务
│   ├── src/
│   │   ├── server/            # Hono server setup (参考 ellamaka)
│   │   │   ├── server.ts      # Main server entry
│   │   │   ├── routes/        # API routes
│   │   │   │   ├── student/   # Student API endpoints
│   │   │   │   ├── admin/     # Admin API endpoints
│   │   │   │   ├── ai/        # AI streaming endpoints
│   │   │   │   └── auth/      # Authentication endpoints
│   │   │   └── middleware/    # Auth, logging, CORS
│   │   ├── agent/             # AI Agent implementations
│   │   │   ├── assessment.ts  # 测评定级智能体
│   │   │   ├── teaching.ts    # 教学讲解智能体
│   │   │   ├── grading.ts     # 判题分析智能体
│   │   │   └── agent-base.ts  # Shared agent infrastructure
│   │   ├── provider/          # AI Provider abstraction (参考 ellamaka)
│   │   │   ├── index.ts       # Provider registry
│   │   │   ├── models.ts      # Model definitions
│   │   │   └── sdk/           # Provider SDK adapters
│   │   ├── service/           # Business logic services
│   │   │   ├── student.ts     # Student management
│   │   │   ├── progress.ts    # Learning progress tracking
│   │   │   ├── knowledge.ts   # Knowledge base operations
│   │   │   └── analytics.ts   # Data analytics
│   │   ├── db/                # Database layer
│   │   │   ├── sqlite/        # Drizzle ORM schema & queries
│   │   │   └── lance/         # LanceDB operations
│   │   └── effect/            # Effect-ts runtime (optional)
│   ├── package.json
│   └── tsconfig.json
│
├── student-app/               # NextJS 学员端
│   ├── app/                   # NextJS App Router
│   │   ├── (auth)/           # Auth routes (login, register)
│   │   ├── (learning)/       # Protected learning routes
│   │   │   ├── dashboard/    # Learning center
│   │   │   ├── assessment/   # AI 测评界面
│   │   │   ├── lesson/       # 讲解观看界面
│   │   │   ├── practice/     # 练习答题界面
│   │   │   └── report/       # 学习报告界面
│   │   └── layout.tsx
│   ├── components/           # Shared components
│   │   ├── chat/            # AI chat streaming UI
│   │   ├── lesson/          # Lesson display components
│   │   └── practice/        # Practice UI components
│   ├── lib/                  # Client SDK (参考 backend SDK)
│   │   ├── api.ts           # API client with streaming
│   │   └── hooks/           # React hooks for data fetching
│   └── package.json
│
├── admin-app/                # React + Vite + Semi 管理端
│   ├── src/
│   │   ├── pages/           # Page components (参考 new-api)
│   │   │   ├── Dashboard/   # Data overview
│   │   │   ├── Knowledge/   # Knowledge base CRUD
│   │   │   ├── Students/    # Student management
│   │   │   ├── Settings/    # System configuration
│   │   │   └── Analytics/   # Detailed analytics
│   │   ├── components/      # Semi Design components
│   │   ├── hooks/           # Data fetching hooks
│   │   ├── services/        # API service layer
│   │   └── i18n/            # Internationalization
│   ├── package.json
│   └── vite.config.js
│
├── sdk/                      # Shared SDK (类似 ellamaka SDK)
│   ├── src/
│   │   ├── client.ts        # Typed API client
│   │   ├── types.ts         # Shared type definitions
│   │   └── zod/             # Zod schemas for validation
│   └── package.json
│
├── shared/                   # Shared utilities
│   ├── src/
│   │   ├── types/           # Common types
│   │   ├── constants/       # App constants
│   │   └── utils/           # Utility functions
│   └── package.json
│
└── ui/                       # Shared UI components
    ├── src/
    │   ├── components/      # Cross-app components
    │   └── styles/          # Shared styles
    └── package.json
```

---

## 组件边界

| 组件 | 职责 | 与其他组件的通信 |
|-----------|---------------|-------------------|
| **Student App** | 学员学习界面，AI 聊天交互 | Backend API（SSE 用于 AI）|
| **Admin App** | 管理后台，知识库管理 | Backend API（REST）|
| **Backend Server** | API 网关，路由处理，中间件 | 所有前端、AI 智能体、服务层 |
| **AI Agent Layer** | 测评、教学、判题逻辑 | AI SDK、服务层、数据层 |
| **AI SDK Wrapper** | 多 Provider 抽象，流式传输 | 外部 AI 供应商 |
| **Service Layer** | 业务逻辑编排 | 数据层、AI 智能体 |
| **SQLite (Drizzle)** | 关系型数据（用户、进度、会话）| 服务层 |
| **LanceDB** | 向量检索（知识、题目）| 服务层、AI 智能体 |

---

## 数据流

### Assessment Flow（测评定级）

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Student UI  │────▶│  Assessment  │────▶│  AI Agent    │────▶│  LanceDB     │
│  (NextJS)    │ SSE │  API Route   │     │  (Assessment)│     │  (Questions) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                   │                    │                    │
       │                   │                    │                    │
       │                   ▼                    ▼                    │
       │            ┌──────────────┐    ┌──────────────┐            │
       │            │  Progress    │    │  AI SDK      │            │
       │            │  Service     │    │  (streamText)│            │
       │            └──────────────┘    └──────────────┘            │
       │                   │                    │                    │
       ▼                   ▼                    │                    │
┌──────────────┐    ┌──────────────┐           │                    │
│  Display     │    │  SQLite      │◀──────────┘                    │
│  Result      │    │  (Progress)  │                                 │
└──────────────┘    └──────────────┘                                 │
```

**流程说明：**
1. 学员从界面开始测评
2. 后端从 LanceDB 检索相关题目（向量相似度匹配学员级别）
3. 测评智能体通过 AI SDK 生成自适应题目
4. 通过 SSE 将响应流式推送到界面
5. 每次答题后进度存入 SQLite
6. 最终等级定级结果存入 SQLite

### Teaching Flow (讲解生成)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Student UI  │────▶│  Teaching    │────▶│  Teaching    │────▶│  LanceDB     │
│  (NextJS)    │ SSE │  API Route   │     │  Agent       │     │  (Knowledge) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                   │                    │                    │
       │                   │                    ▼                    │
       │                   │            ┌──────────────┐            │
       │                   │            │  AI SDK      │            │
       │                   │            │  (streamText)│            │
       │                   │            └──────────────┘            │
       │                   │                    │                    │
       │                   ▼                    │                    │
       │            ┌──────────────┐           │                    │
       │            │  Render      │◀──────────┘                    │
       │            │  Markdown+   │                                │
       │            │  Diagrams    │                                │
       │            └──────────────┘                                │
```

**流程说明：**
1. 学员请求特定知识点的讲解
2. 教学智能体从 LanceDB 检索相关知识
3. 智能体生成包含代码示例的结构化讲解
4. 通过 SSE 推送到界面，渐进式渲染
5. 学员可以追问（保持上下文）

### Practice Flow (练习判题)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Practice UI │────▶│  Practice    │────▶│  Grading     │────▶│  LanceDB     │
│  (NextJS)    │ SSE │  API Route   │     │  Agent       │     │  (Similar Q) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                   │                    │                    │
       │                   │                    ▼                    │
       │                   │            ┌──────────────┐            │
       │                   │            │  AI SDK      │            │
       │                   │            │  (generate)  │            │
       │                   │            └──────────────┘            │
       │                   │                    │                    │
       │                   ▼                    ▼                    │
       │            ┌──────────────┐    ┌──────────────┐            │
       │            │  Analysis    │◀───│  SQLite      │            │
       │            │  Display     │    │  (Progress)  │            │
       │            └──────────────┘    └──────────────┘            │
```

**流程说明：**
1. 学员提交代码/答案
2. 判题智能体分析解答（v1 使用 AI 模拟判题，无真实沙盒）
3. 从 LanceDB 检索类似题目作为上下文
4. 生成错误分析和改进建议
5. 更新 SQLite 中的进度数据
6. 流式推送到界面

---

## AI 智能体架构

### Agent 抽象模式（参考 ellamaka agent.ts）

```typescript
// packages/backend/src/agent/agent-base.ts

import { streamText, generateObject } from "ai";
import { z } from "zod";

export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  model?: { providerID: string; modelID: string };
  tools?: Record<string, Tool>;
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected provider: Provider.Service;
  
  constructor(config: AgentConfig) {
    this.config = config;
  }
  
  // Streaming response pattern (参考 ellamaka LLM.ts)
  async *stream(input: AgentInput): AsyncGenerator<StreamEvent> {
    const model = await this.provider.getLanguage(this.config.model);
    
    const result = streamText({
      model,
      system: this.config.systemPrompt,
      messages: input.messages,
      tools: this.config.tools,
      temperature: 0.7,
    });
    
    for await (const event of result.fullStream) {
      yield this.transformEvent(event);
    }
  }
  
  // Structured output pattern
  async analyze<T>(input: AgentInput, schema: z.ZodSchema<T>): Promise<T> {
    const result = await generateObject({
      model: await this.provider.getLanguage(this.config.model),
      system: this.config.systemPrompt,
      messages: input.messages,
      schema,
    });
    return result.object;
  }
  
  abstract transformEvent(event: StreamEvent): StreamEvent;
}
```

### Three Core Agents

#### 1. Assessment Agent (测评定级)

```typescript
// packages/backend/src/agent/assessment.ts

export class AssessmentAgent extends BaseAgent {
  config = {
    name: "assessment",
    description: "测评定级智能体 - 评估学生水平，生成适应性测评题",
    systemPrompt: `
你是一名GESP C++等级考试测评专家。
任务：
1. 根据学生历史表现，生成适合其水平的测评题
2. 动态调整题目难度（基于答题正确率）
3. 最终给出等级评定（1-4级）

知识范围：
- GESP 1级：基础语法、输入输出、变量、运算符
- GESP 2级：条件语句、循环、数组、函数
- GESP 3级：字符串、结构体、指针基础、递归
- GESP 4级：排序算法、搜索算法、简单数据结构

输出格式：JSON结构包含题目、答案、解析
    `,
  };
  
  tools = {
    getStudentHistory: tool({
      description: "获取学生历史测评记录和练习表现",
      execute: async ({ studentId }) => {
        return await this.progressService.getStudentHistory(studentId);
      },
    }),
    searchSimilarQuestions: tool({
      description: "从知识库检索相似题目",
      execute: async ({ topic, difficulty }) => {
        return await this.lanceService.searchQuestions(topic, difficulty);
      },
    }),
  };
}
```

#### 2. Teaching Agent (教学讲解)

```typescript
// packages/backend/src/agent/teaching.ts

export class TeachingAgent extends BaseAgent {
  config = {
    name: "teaching",
    description: "教学讲解智能体 - 生成知识点讲解，包含代码示例和图示",
    systemPrompt: `
你是一名GESP C++编程教学专家，面向中小学生。
任务：生成生动有趣的编程讲解

讲解结构：
1. **引入**：用一个生活中的类比解释概念（趣味性）
2. **概念**：清晰定义，简单语言
3. **代码示例**：完整可运行的代码，带注释
4. **图示说明**：用ASCII图或描述可视化内容
5. **练习建议**：相关练习题推荐

风格要求：
- 语言简洁，避免复杂术语
- 多用类比和可视化
- 代码示例带中文注释
- 适当使用emoji增加趣味性（中小学生友好）
    `,
  };
  
  tools = {
    getKnowledgePoint: tool({
      description: "获取知识点详细内容",
      execute: async ({ pointId }) => {
        return await this.knowledgeService.getPoint(pointId);
      },
    }),
    getCodeExamples: tool({
      description: "获取相关代码示例",
      execute: async ({ topic }) => {
        return await this.lanceService.searchExamples(topic);
      },
    }),
  };
}
```

#### 3. Grading Agent (判题分析)

```typescript
// packages/backend/src/agent/grading.ts

export class GradingAgent extends BaseAgent {
  config = {
    name: "grading",
    description: "判题分析智能体 - 分析学生答案，给出错误诊断",
    systemPrompt: `
你是一名GESP C++判题专家。
任务：分析学生提交的代码或答案，给出详细反馈

分析内容：
1. **正确性判断**：答案是否正确
2. **错误定位**：指出具体错误位置
3. **错误类型**：语法错误/逻辑错误/算法错误
4. **改进建议**：如何修改，为什么这样改
5. **知识点关联**：涉及哪些知识点，建议复习哪些

注意：
- v1阶段不运行真实代码，使用AI模拟判题
- 根据题目预期输出判断答案正确性
- 给出具体的错误行号和修改建议
    `,
  };
  
  tools = {
    getExpectedAnswer: tool({
      description: "获取题目标准答案和解析",
      execute: async ({ questionId }) => {
        return await this.knowledgeService.getAnswer(questionId);
      },
    }),
    analyzePattern: tool({
      description: "分析学生常见错误模式",
      execute: async ({ errorType }) => {
        return await this.lanceService.searchErrorPatterns(errorType);
      },
    }),
  };
}
```

---

## 知识库架构（LanceDB）

### 向量存储 Schema

### 检索模式

```typescript
// packages/backend/src/db/lance/retrieval.ts

import * as lancedb from "lancedb";

export class LanceService {
  private db: lancedb.Connection;
  
  async searchKnowledge(query: string, level?: number): Promise<KnowledgeVector[]> {
    const embedding = await this.embed(query);
    const table = await this.db.openTable("knowledge_points");
    
    return await table
      .vectorSearch(embedding)
      .filter(level ? `level = ${level}` : undefined)
      .limit(5)
      .toArray();
  }
  
  async searchQuestions(topic: string, difficulty: string): Promise<KnowledgeVector[]> {
    const embedding = await this.embed(topic);
    const table = await this.db.openTable("exam_questions");
    
    return await table
      .vectorSearch(embedding)
      .filter(`difficulty = "${difficulty}"`)
      .limit(10)
      .toArray();
  }
  
  private async embed(text: string): Promise<number[]> {
    // 使用 AI SDK 的 embedding 功能
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: text,
    });
    return embedding;
  }
}
```

---

## SSE 流式架构

### Backend SSE 路由（参考 ellamaka 流式模式）

### Frontend SSE 消费者（NextJS）

```typescript
// packages/student-app/lib/hooks/useAIStream.ts

import { useChat } from "ai/react";
import type { Message } from "ai";

export function useAssessmentStream(studentId: string) {
  const { messages, input, handleSubmit, isLoading } = useChat({
    api: "/api/ai/assessment/stream",
    body: { studentId },
    onToolCall: ({ toolCall }) => {
      // Handle tool call events (e.g., history fetching)
      console.log("Tool called:", toolCall.toolName);
    },
  });
  
  return { messages, input, handleSubmit, isLoading };
}

// 自定义 SSE 解析器（用于非useChat场景）
export function consumeSSEStream(url: string, onEvent: (event: SSEEvent) => void) {
  const eventSource = new EventSource(url);
  
  eventSource.addEventListener("text", (e) => {
    onEvent({ type: "text", data: JSON.parse(e.data) });
  });
  
  eventSource.addEventListener("tool-call", (e) => {
    onEvent({ type: "tool-call", data: JSON.parse(e.data) });
  });
  
  eventSource.addEventListener("done", () => {
    eventSource.close();
    onEvent({ type: "done" });
  });
  
  return () => eventSource.close();
}
```

---

## 认证分离

### 双认证系统

### 路由中间件

```typescript
// packages/backend/src/server/middleware/auth.ts

import { verify } from "hono/jwt";

export const studentOnly = async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  const payload = await verify(token, JWT_SECRET);
  
  if (payload.role !== "student") {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  c.set("studentId", payload.sub);
  await next();
};

export const adminOnly = async (c, next) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  const payload = await verify(token, JWT_SECRET);
  
  if (payload.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  c.set("adminId", payload.sub);
  await next();
};
```

---

## Scalability Considerations

| 关注点 | 10 用户 | 100 用户 | 1K 用户 | 10K 用户 |
|---------|-------------|--------------|-------------|--------------|
| **AI API 调用** | 直接调用 | 限流 | 队列 + 缓存 | 多 Provider 分发 |
| **SSE 连接** | 内存 | 内存 | Redis pub/sub | Redis 集群 + 水平扩展 |
| **SQLite** | 单文件 | 单文件 | 只读副本 | 迁移到 PostgreSQL |
| **LanceDB** | 本地文件 | 本地文件 | 独立服务 | 分布式向量数据库（Milvus/Qdrant）|
| **Session 状态** | 内存 | 内存 | Redis 会话 | Redis 集群 |

---

## 构建顺序（Dependencies）

**Phase 1: 基础**
1. `packages/shared` — 类型、常量、工具函数（无依赖）
2. `packages/sdk` — API 客户端、Zod schemas（依赖：shared）
3. `packages/backend/db` — SQLite 表结构、LanceDB 初始化（依赖：shared）

**Phase 2: 后端核心**
4. `packages/backend/provider` — AI SDK 封装（依赖：shared）
5. `packages/backend/service` — 业务服务（依赖：db, sdk）
6. `packages/backend/agent` — AI 智能体（依赖：provider, service）
7. `packages/backend/server` — Hono 路由、中间件（依赖：agent, service）

**Phase 3: 前端**
8. `packages/ui` — 共享组件（依赖：shared）
9. `packages/student-app` — NextJS 应用（依赖：sdk, ui）
10. `packages/admin-app` — React 管理端（依赖：sdk, ui）

**Phase 4: 集成**
11. Turborepo 配置
12. E2E 测试初始化
13. 部署配置

---

## 反模式避免

### Anti-Pattern 1: 前端直接调用 AI
**现象：** 从前端组件直接调用 AI API
**为什么不好：** 暴露 API 密钥、无法控制流式传输、难以添加业务逻辑
**正确做法：** 始终通过后端 AI 智能体层路由

### Anti-Pattern 2: 单体进度状态
**现象：** 将所有学员进度存储在一个表/列中
**为什么不好：** 难以查询特定学习数据，分析性能差
**正确做法：** 分离表：`student_sessions`、`assessment_results`、`practice_records`、`knowledge_mastery`

### Anti-Pattern 3: 静态题库
**现象：** 预先生成所有题目并作为静态数据存储
**为什么不好：** 无法自适应，不响应学员级别变化
**正确做法：** AI 智能体根据实时测评动态生成题目

### Anti-Pattern 4: SSE 无背压控制
**现象：** 流式传输大型 AI 响应时不管理分块
**为什么不好：** 客户端内存溢出，慢连接下用户体验差
**正确做法：** 分块流式传输事件，实现客户端缓冲

---

## Sources

- **ellamaka 项目** — Hono + AI SDK + Effect-ts 模式参考（HIGH confidence，直接代码参考）
- **new-api 项目** — React + Semi Design 管理后台参考（HIGH confidence，直接代码参考）
- **Vercel AI SDK 模式** — 流式传输、SSE、多 Provider 抽象（HIGH confidence，官方文档）
- **LanceDB 文档** — 向量存储、嵌入检索模式（MEDIUM confidence，web search）
- **GESP 考试大纲** — 等级结构的领域知识（HIGH confidence，领域专长）