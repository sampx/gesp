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
│                     gesp backend (Hono + Bun) — 业务代理层                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          API Gateway Layer                            │   │
│  │  /api/student/*  │  /api/admin/*  │  /api/ai/*  │  /api/auth/*       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│            │                                                              │
│            ▼                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────┐   │
│  │ 业务逻辑层       │  │ 知识库层         │  │ ellamaka SDK 代理层    │   │
│  │ 测评路径规划     │  │ LanceDB          │  │ SSE 转发               │   │
│  │ 提示词组织       │  │ SQLite           │  │ Agent 调用             │   │
│  │ 进度追踪         │  │                  │  │                        │   │
│  └──────────────────┘  └──────────────────┘  └────────────────────────┘   │
│            │                     │                     │                   │
│            ▼                     ▼                     ▼ (HTTP SDK)         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          Data Layer                                   │   │
│  │  ┌──────────────────┐  ┌──────────────────────────────────┐         │   │
│  │  │   SQLite         │  │          LanceDB                  │         │   │
│  │  │ Students         │  │ Knowledge Points (embedded)      │         │   │
│  │  │ Progress         │  │ Questions (embedded)             │         │   │
│  │  │ Sessions         │  │ Solutions (embedded)             │         │   │
│  │  └──────────────────┘  └──────────────────────────────────┘         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────┬──────────────────────────────────┘
                                           │ HTTP (ellamaka SDK)
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ellamaka — Agent 引擎（独立运行）                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      .opencode/agents/                                │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │   │
│  │  │ assessor.md  │  │ teacher.md   │  │ grader.md    │               │   │
│  │  │ (测评定级)   │  │ (讲解生成)   │  │ (判题分析)   │               │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│            │                                                              │
│            ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      gesp-plugin（嵌入式）                            │   │
│  │  tool: submit_answer     — 提交学员答案                              │   │
│  │  tool: query_progress    — 查询学员进度                              │   │
│  │  tool: get_knowledge     — 获取知识库内容（少量 API）                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│            │                                                              │
│            ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              Vercel AI SDK (Multi-Provider)                           │   │
│  │  OpenAI │ Anthropic │ Google │ DeepSeek │ Doubao │ Others            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│            │                                                              │
│            ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    会话/对话存储 (SQLite)                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Monorepo Package Structure

```
packages/
├── backend/                    # Hono API + ellamaka SDK 代理层
│   ├── src/
│   │   ├── server/            # Hono server setup
│   │   │   ├── server.ts      # Main server entry
│   │   │   ├── routes/        # API routes
│   │   │   │   ├── student/   # Student API endpoints
│   │   │   │   ├── admin/     # Admin API endpoints
│   │   │   │   ├── ai/        # AI streaming endpoints (SSE转发)
│   │   │   │   └── auth/      # Authentication endpoints
│   │   │   └── middleware/    # Auth, logging, CORS
│   │   ├── ellamaka/          # ellamaka SDK 代理层
│   │   │   ├── client.ts      # SDK 客户端初始化
│   │   │   ├── assessor.ts    # 测评 Agent 代理
│   │   │   ├── teacher.ts     # 教学 Agent 代理 (SSE转发)
│   │   │   ├── grader.ts      # 判题 Agent 代理
│   │   │   └── types.ts       # Agent 响应类型
│   │   ├── service/           # Business logic services
│   │   │   ├── student.ts     # Student management
│   │   │   ├── progress.ts    # Learning progress tracking
│   │   │   ├── knowledge.ts   # Knowledge base operations (LanceDB)
│   │   │   ├── prompt.ts      # 提示词组织（喂给 agent）
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
├── sdk/                      # gesp SDK（供 ellamaka plugin 使用）
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

**ellamaka 项目新增内容（不在 gesp monorepo 内）：**
```
ellamaka/
├── .opencode/agents/
│   ├── assessor.md          # 测评定级智能体
│   ├── teacher.md           # 教学讲解智能体
│   └── grader.md            # 练习判题智能体
│
├── gesp-plugin/             # 嵌入式 plugin（封装少量 gesp API）
│   ├── src/
│   │   ├── index.ts         # Plugin 入口
│   │   ├── tools/           # Tools 定义
│   │   │   ├── submit_answer.ts    # 提交学员答案
│   │   │   ├── query_progress.ts   # 查询学员进度
│   │   │   └── get_knowledge.ts    # 获取知识库内容
│   │   └── config.ts        # Plugin 配置（API-key 等）
│   └── package.json
```

---

## 组件边界

| 组件 | 职责 | 与其他组件的通信 |
|-----------|---------------|-------------------|
| **Student App** | 学员学习界面，AI 聊天交互 | gesp Backend API（SSE 用于 AI）|
| **Admin App** | 管理后台，知识库管理 | gesp Backend API（REST）|
| **gesp Backend** | API 网关，业务逻辑，知识库，提示词组织 | 所有前端 + ellamaka (HTTP SDK) |
| **ellamaka SDK 代理层** | Agent 调用封装，SSE 转发 | ellamaka HTTP API |
| **ellamaka** | Agent 引擎，智能体逻辑，AI Provider | gesp Backend (通过 plugin tools) |
| **gesp-plugin** | 封装少量 gesp API（answer/progress/knowledge）| ellamaka agents (tools) |
| **SQLite (Drizzle)** | 关系型数据（用户、进度、会话）| gesp Backend |
| **LanceDB** | 向量检索（知识、题目）| gesp Backend |

---

## 数据流

### Assessment Flow（测评定级）

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Student UI  │────▶│  Assessment  │────▶│  ellamaka    │────▶│  LanceDB     │
│  (NextJS)    │ SSE │  API Route   │ SDK │  assessor    │     │  (Questions) │
└──────────────┘     │  (gesp)      │     │  agent       │     └──────────────┘
                     └──────────────┘     └──────────────┘            │
                            │                    │                    │
                            │                    │                    │
                            ▼                    ▼                    │
                     ┌──────────────┐    ┌──────────────┐            │
                     │  LanceDB     │◀───│  AI SDK      │            │
                     │  查询题目    │    │  (streamText)│            │
                     └──────────────┘    └──────────────┘            │
                            │                    │                    │
                            │                    │                    │
                            ▼                    ▼                    │
                     ┌──────────────┐    ┌──────────────┐            │
                     │ 提示词组织   │    │ plugin       │            │
                     │ 喂给 agent   │    │ submit_answer│            │
                     └──────────────┘    └──────────────┘            │
                            │                    │                    │
                            ▼                    │                    │
                     ┌──────────────┐           │                    │
                     │  SQLite      │◀──────────┘                    │
                     │  (Progress)  │                                 │
                     └──────────────┘                                 │
                            │                                         │
                            ▼                                         │
                     ┌──────────────┐                                 │
                     │ SSE 转发     │─────▶ Student UI               │
                     │ (gesp → UI)  │                                 │
                     └──────────────┘                                 │
```

**流程说明：**
1. 学员从界面开始测评
2. gesp backend 从 LanceDB 检索相关题目（向量相似度匹配学员级别）
3. gesp backend 组织提示词（包含学员历史、题目上下文）
4. 通过 ellamaka SDK 调用 assessor agent
5. assessor agent 通过 plugin tool 调用 gesp API（submit_answer/query_progress）
6. AI 通过 Vercel AI SDK 生成自适应题目
7. ellamaka SSE 流式响应 → gesp backend 转发 → 学员界面
8. 每次答题后进度存入 SQLite（由 gesp backend 管理）
9. 最终等级定级结果存入 SQLite

### Teaching Flow (讲解生成)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Student UI  │────▶│  Teaching    │────▶│  ellamaka    │────▶│  LanceDB     │
│  (NextJS)    │ SSE │  API Route   │ SDK │  teacher     │     │  (Knowledge) │
└──────────────┘     │  (gesp)      │     │  agent       │     └──────────────┘
                     └──────────────┘     └──────────────┘            │
                            │                    │                    │
                            │                    ▼                    │
                            │            ┌──────────────┐            │
                            │            │  AI SDK      │            │
                            │            │  (streamText)│            │
                            │            └──────────────┘            │
                            │                    │                    │
                            ▼                    │                    │
                     ┌──────────────┐           │                    │
                     │ 提示词组织   │◀──────────┘                    │
                     │ 知识点上下文│                                │
                     └──────────────┘                                │
                            │                                         │
                            ▼                                         │
                     ┌──────────────┐                                 │
                     │ LanceDB查询  │◀────────────────────────────────┘
                     │ 知识点内容   │
                     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐     ┌──────────────┐
                     │ SSE 转发     │────▶│  Render      │
                     │ (gesp → UI)  │     │  Markdown+   │
                     └──────────────┘     │  Diagrams    │
                                          └──────────────┘
```

**流程说明：**
1. 学员请求特定知识点的讲解
2. gesp backend 从 LanceDB 检索相关知识内容
3. gesp backend 组织提示词（知识点内容 + 教学风格要求）
4. 通过 ellamaka SDK 调用 teacher agent
5. teacher agent 生成包含代码示例的结构化讲解
6. ellamaka SSE 流式响应 → gesp backend 转发 → 学员界面
7. 学员可以追问（保持上下文，通过 gesp backend 传递历史对话）

### Practice Flow (练习判题)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Practice UI │────▶│  Practice    │────▶│  ellamaka    │────▶│  LanceDB     │
│  (NextJS)    │ SSE │  API Route   │ SDK │  grader      │     │  (Similar Q) │
└──────────────┘     │  (gesp)      │     │  agent       │     └──────────────┘
                     └──────────────┘     └──────────────┘            │
                            │                    │                    │
                            │                    ▼                    │
                            │            ┌──────────────┐            │
                            │            │  AI SDK      │            │
                            │            │  (generate)  │            │
                            │            └──────────────┘            │
                            │                    │                    │
                            ▼                    ▼                    │
                     ┌──────────────┐    ┌──────────────┐            │
                     │ 提示词组织   │    │  plugin      │            │
                     │ 学员答案+题目│    │ get_knowledge│            │
                     └──────────────┘    └──────────────┘            │
                            │                    │                    │
                            ▼                    │                    │
                     ┌──────────────┐           │                    │
                     │  SQLite      │◀──────────┘                    │
                     │  (Progress)  │                                 │
                     └──────────────┘                                 │
                            │                                         │
                            ▼                                         │
                     ┌──────────────┐                                 │
                     │ SSE 转发     │─────▶ Analysis Display         │
                     │ (gesp → UI)  │                                 │
                     └──────────────┘                                 │
```

**流程说明：**
1. 学员提交代码/答案
2. gesp backend 组织提示词（学员答案 + 题目 + 预期输出）
3. 通过 ellamaka SDK 调用 grader agent
4. grader agent 通过 plugin tool 查询知识库（get_knowledge）
5. AI 分析解答（v1 使用 AI 模拟判题，无真实沙盒）
6. 生成错误分析和改进建议
7. ellamaka SSE 流式响应 → gesp backend 转发 → 学员界面
8. gesp backend 更新 SQLite 中的进度数据

---

## AI 智能体架构（ellamaka SDK 代理模式）

### Agent 调用模式（gesp backend → ellamaka）

```typescript
// packages/backend/src/ellamaka/client.ts

import { EllamakaClient } from "@ellamaka/sdk";

export const ellamakaClient = new EllamakaClient({
  baseURL: process.env.ELLAMAKA_URL || "http://localhost:3001",
  apiKey: process.env.ELLAMAKA_API_KEY,
});

// packages/backend/src/ellamaka/assessor.ts

export class AssessorProxy {
  async *streamAssessment(params: AssessmentParams): AsyncGenerator<SSEEvent> {
    // 1. 从 LanceDB 查询题目
    const questions = await this.lanceService.searchQuestions(
      params.level,
      params.topic
    );
    
    // 2. 组织提示词
    const prompt = this.promptService.buildAssessmentPrompt({
      studentHistory: await this.progressService.getHistory(params.studentId),
      questions,
      targetLevel: params.targetLevel,
    });
    
    // 3. 调用 ellamaka assessor agent
    const stream = await ellamakaClient.streamAgent({
      agent: "assessor",
      messages: [{ role: "user", content: prompt }],
      context: {
        studentId: params.studentId,
        sessionId: params.sessionId,
      },
    });
    
    // 4. 转发 SSE 流
    for await (const event of stream) {
      yield this.transformEvent(event);
      
      // 5. 处理 tool call（plugin 回调）
      if (event.type === "tool-call") {
        await this.handleToolCall(event.toolCall);
      }
    }
  }
  
  private async handleToolCall(toolCall: ToolCallEvent) {
    switch (toolCall.toolName) {
      case "submit_answer":
        await this.progressService.recordAnswer(toolCall.args);
        break;
      case "query_progress":
        const progress = await this.progressService.getProgress(toolCall.args.studentId);
        return progress; // 返回给 ellamaka plugin
    }
  }
}
```

### ellamaka Agent 定义（不在 gesp 内）

Agent 定义文件位于 `ellamaka/.opencode/agents/`：

#### 1. assessor.md（测评定级智能体）

```markdown
# Assessment Agent

你是一名 GESP C++ 等级考试测评专家，负责评估学员水平并生成适应性测评题。

## 能力
- 根据学员历史表现，生成适合其水平的测评题
- 动态调整题目难度（基于答题正确率）
- 最终给出等级评定（1-4级）

## 工具
- `submit_answer` — 提交学员答案，记录到 gesp backend
- `query_progress` — 查询学员历史进度和表现
- `get_knowledge` — 获取知识库内容（可选）

## 输出格式
结构化 JSON：题目文本、选项/代码框、答案、解析
```

#### 2. teacher.md（教学讲解智能体）

```markdown
# Teaching Agent

你是一名 GESP C++ 编程教学专家，面向中小学生生成生动有趣的编程讲解。

## 讲解结构
1. **引入**：用生活类比解释概念（趣味性）
2. **概念**：清晰定义，简单语言
3. **代码示例**：完整可运行的代码，带中文注释
4. **图示说明**：ASCII 图或 Mermaid 图表
5. **练习建议**：相关练习题推荐

## 风格要求
- 语言简洁，避免复杂术语
- 多用类比和可视化
- 适当使用 emoji（中小学生友好）
```

#### 3. grader.md（判题分析智能体）

```markdown
# Grading Agent

你是一名 GESP C++ 判题专家，分析学员提交的代码或答案。

## 分析内容
1. **正确性判断**：答案是否正确
2. **错误定位**：指出具体错误位置
3. **错误类型**：语法/逻辑/算法错误
4. **改进建议**：如何修改，为什么这样改
5. **知识点关联**：涉及哪些知识点，建议复习哪些

## 工具
- `get_knowledge` — 获取题目相关知识点

## 注意
v1 阶段不运行真实代码，使用 AI 模拟判题。
```

### gesp-plugin 定义（嵌入 ellamaka）

```typescript
// ellamaka/gesp-plugin/src/tools/submit_answer.ts

import { tool } from "@ellamaka/plugin-sdk";
import { z } from "zod";

export const submitAnswer = tool({
  name: "submit_answer",
  description: "提交学员答案到 gesp backend",
  parameters: z.object({
    studentId: z.string(),
    sessionId: z.string(),
    questionId: z.string(),
    answer: z.string(),
    isCorrect: z.boolean(),
  }),
  execute: async (params, { gespClient }) => {
    return await gespClient.post("/api/internal/answer", params);
  },
});

// ellamaka/gesp-plugin/src/tools/query_progress.ts

export const queryProgress = tool({
  name: "query_progress",
  description: "查询学员历史进度和表现",
  parameters: z.object({
    studentId: z.string(),
  }),
  execute: async (params, { gespClient }) => {
    return await gespClient.get(`/api/internal/progress/${params.studentId}`);
  },
});

// ellamaka/gesp-plugin/src/tools/get_knowledge.ts

export const getKnowledge = tool({
  name: "get_knowledge",
  description: "获取知识库内容",
  parameters: z.object({
    topic: z.string(),
    level: z.number().optional(),
  }),
  execute: async (params, { gespClient }) => {
    return await gespClient.get("/api/internal/knowledge", params);
  },
});
```

---

## 知识库架构（LanceDB — 在 gesp backend）

### 向量存储 Schema

```typescript
// packages/backend/src/db/lance/schema.ts

import * as lancedb from "@lancedb/lancedb";

export interface KnowledgeVector {
  id: string;
  content: string;           // 知识点/题目/解答内容
  embedding: number[];       // 向量嵌入
  type: "knowledge" | "question" | "solution" | "pattern";
  level: number;             // GESP 1-4 级
  topic: string;             // 主题（变量、循环、排序等）
  difficulty?: string;       // 题目难度（easy/medium/hard）
  metadata: Record<string, unknown>;
}

// 表结构
const tables = {
  knowledge_points: "知识向量（课程大纲、知识点讲解）",
  exam_questions: "题目向量（历年真题、模拟题）",
  solutions: "解答向量（标准答案、解题思路）",
  error_patterns: "错误模式向量（常见错误分类）",
};
```

### 检索模式

```typescript
// packages/backend/src/db/lance/retrieval.ts

import * as lancedb from "@lancedb/lancedb";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

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
  
  async searchErrorPatterns(errorType: string): Promise<KnowledgeVector[]> {
    const embedding = await this.embed(errorType);
    const table = await this.db.openTable("error_patterns");
    
    return await table
      .vectorSearch(embedding)
      .limit(5)
      .toArray();
  }
  
  private async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: text,
    });
    return embedding;
  }
}
```

**关键设计决策：**
- LanceDB 运行在 gesp backend，不是 ellamaka
- ellamaka agent 通过 plugin tool (`get_knowledge`) 间接访问
- gesp backend 负责提示词组织，不让 agent 自主查询复杂逻辑

---

## SSE 流式架构（gesp backend 转发模式）

### Backend SSE 路由（gesp → ellamaka → Client）

```typescript
// packages/backend/src/server/routes/ai/assessment.ts

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { AssessorProxy } from "../../../ellamaka/assessor";

const app = new Hono();

app.post("/api/ai/assessment/stream", studentOnly, async (c) => {
  const studentId = c.get("studentId");
  const body = await c.req.json();
  
  const proxy = new AssessorProxy();
  
  return streamSSE(c, async (stream) => {
    for await (const event of proxy.streamAssessment({
      studentId,
      sessionId: body.sessionId,
      level: body.level,
    })) {
      await stream.writeSSE({
        event: event.type,
        data: JSON.stringify(event.data),
      });
    }
  });
});
```

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
      console.log("Tool called:", toolCall.toolName);
    },
  });
  
  return { messages, input, handleSubmit, isLoading };
}

// 自定义 SSE 解析器（用于非 useChat 场景）
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

**SSE 转发链路：**
```
ellamaka agent → ellamaka HTTP SSE → gesp backend proxy → Hono streamSSE → Client
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

**Phase 2: 后端核心（业务层）**
4. `packages/backend/service` — 业务服务（依赖：db, sdk）
5. `packages/backend/ellamaka` — SDK 代理层 + SSE 转发（依赖：service, sdk）
6. `packages/backend/server` — Hono 路由、中间件（依赖：ellamaka, service）

**Phase 2 同步：ellamaka 项目新增**
7. `.opencode/agents/assessor.md` — 测评智能体定义
8. `.opencode/agents/teacher.md` — 教学智能体定义
9. `.opencode/agents/grader.md` — 判题智能体定义
10. `gesp-plugin/` — 嵌入式 plugin（依赖：gesp SDK）

**Phase 3: 前端**
11. `packages/ui` — 共享组件（依赖：shared）
12. `packages/student-app` — NextJS 应用（依赖：sdk, ui）
13. `packages/admin-app` — React 管理端（依赖：sdk, ui）

**Phase 4: 集成**
14. Turborepo 配置
15. E2E 测试初始化（含 gesp + ellamaka 联调）
16. 部署配置

---

## 反模式避免

### Anti-Pattern 1: 前端直接调用 AI
**现象：** 从前端组件直接调用 AI API
**为什么不好：** 暴露 API 密钥、无法控制流式传输、难以添加业务逻辑
**正确做法：** 始终通过 gesp backend → ellamaka SDK 代理层路由

### Anti-Pattern 2: Agent 直接查询知识库
**现象：** ellamaka agent 自主查询 LanceDB，自行组织提示词
**为什么不好：** agent 不了解业务上下文（学员历史、课程进度），查询效率低
**正确做法：** gesp backend 组织提示词后喂给 agent，agent 只做 AI 生成

### Anti-Pattern 3: 单体进度状态
**现象：** 将所有学员进度存储在一个表/列中
**为什么不好：** 难以查询特定学习数据，分析性能差
**正确做法：** 分离表：`student_sessions`、`assessment_results`、`practice_records`、`knowledge_mastery`

### Anti-Pattern 4: SSE 无背压控制
**现象：** 流式传输大型 AI 响应时不管理分块
**为什么不好：** 客户端内存溢出，慢连接下用户体验差
**正确做法：** 分块流式传输事件，实现客户端缓冲

### Anti-Pattern 5: Plugin 暴露过多 API
**现象：** gesp-plugin 暴露大量 gesp backend API 给 agent
**为什么不好：** 增加攻击面，agent 行为不可控
**正确做法：** plugin 只封装少量必要的 tool（submit_answer, query_progress, get_knowledge）

---

## Sources

- **ellamaka 项目** — Agent 引擎、Plugin 系统、SDK 设计参考（HIGH confidence，直接代码参考）
- **new-api 项目** — React + Semi Design 管理后台参考（HIGH confidence，直接代码参考）
- **Vercel AI SDK 模式** — 流式传输、SSE、多 Provider 抽象（HIGH confidence，官方文档）
- **LanceDB 文档** — 向量存储、嵌入检索模式（MEDIUM confidence，web search）
- **GESP 考试大纲** — 等级结构的领域知识（HIGH confidence，领域专长）
- **wopal-plugin** — Plugin 嵌入模式参考（HIGH confidence，本项目已有实现）