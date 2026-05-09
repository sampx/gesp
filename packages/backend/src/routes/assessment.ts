import { Hono } from "hono";
import type { Context } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { StudentAuth } from "../middleware/auth";
import { success, error, unauthorized } from "../utils/response";
import { logger } from "../utils/logger";
import { createEllamakaClient } from "../services/ellamaka-client";
import { ChatProjectorStore } from "../services/chat-projector";
import * as assessment from "../services/assessment";
import { db } from "../db";
import { assessmentSessions, assessmentAnswers, assessmentQuestions } from "../db/schema/assessment";
import { eq, and, desc } from "drizzle-orm";

const app = new Hono();
const ellamakaClient = createEllamakaClient();
const projectorStore = new ChatProjectorStore(ellamakaClient);

// ---------------------------------------------------------------------------
// Middleware helpers
// ---------------------------------------------------------------------------

const GESP_API_KEY = process.env.GESP_API_KEY;

if (!GESP_API_KEY) {
  throw new Error("Missing required environment variable: GESP_API_KEY");
}

/**
 * Verify GESP_API_KEY for internal endpoints (called by gesp-plugin)
 */
async function verifyApiKey(c: Context, next: () => Promise<void>) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorized(c, "Missing API key");
  }
  const token = authHeader.slice(7);
  if (token !== GESP_API_KEY) {
    return unauthorized(c, "Invalid API key");
  }
  await next();
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Build system prompt for assessor agent.
 * Per Task 1: inject config (question_limit, time_limit) and progress context.
 * Token is passed via first user message (not system prompt) for reliable delivery.
 */
function buildSystemPrompt(
  user: { display_name: string },
  body: { course_id: string; start_level: number },
  config?: { question_limit?: number; time_limit_min?: number },
): string {
  const questionLimit = config?.question_limit ?? 5;
  const timeLimitMin = config?.time_limit_min ?? 30;
  
  return `学员: ${user.display_name}
课程: ${body.course_id}
起始级别: ${body.start_level}
配置: 总题数 ${questionLimit} 题，时限 ${timeLimitMin} 分钟

你是 GESP 测评顾问。严禁透露题目答案。`;
}

/**
 * Format question for frontend (full content, only after locked)
 */
function formatQuestion(q: typeof assessmentQuestions.$inferSelect) {
  return {
    id: q.id,
    question_type: q.question_type,
    level: q.level,
    knowledge_point: q.knowledge_point,
    difficulty: q.difficulty,
    content: q.content,
    answer: q.answer, // revealed after submission
    explanation: q.explanation,
  };
}

async function getNextOrder(sessionId: string): Promise<number> {
  const answers = await db
    .select({ order: assessmentAnswers.question_order })
    .from(assessmentAnswers)
    .where(eq(assessmentAnswers.session_id, sessionId))
    .orderBy(assessmentAnswers.question_order);
  return answers.length;
}

/**
 * Wait for first question to be locked (with timeout)
 * Polls shared question locks map every 500ms
 */
async function waitForFirstQuestion(
  sessionId: string,
  timeoutMs: number,
): Promise<typeof assessmentQuestions.$inferSelect | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const lockedId = assessment.getLockedQuestionId(sessionId);
    if (lockedId) {
      const question = await db.query.assessmentQuestions.findFirst({
        where: eq(assessmentQuestions.id, lockedId),
      });
      if (question) return question;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return null;
}

const ROUND_SIZE = 5; // questions per round (D-16)

/**
 * Check round completion and convergence at round boundaries.
 * Uses evaluateRound from assessment service for proper adaptive logic.
 * Convergence: same level for 2 consecutive rounds (D-07, D-09).
 */
async function checkRoundCompletion(
  sessionId: string,
  session: typeof assessmentSessions.$inferSelect,
): Promise<{ done: boolean; final_level?: number }> {
  const totalAnswered = session.total_answered ?? 0;
  const questionLimit = session.config_question_limit ?? 5;

  // Not enough answers yet, or max reached as safety cap
  if (totalAnswered >= questionLimit) {
    logger.info({ session_id: sessionId, total_answered: totalAnswered }, "Assessment terminated by question limit cap");
    return { done: true, final_level: session.current_level };
  }

  // Only evaluate at round boundaries
  if (totalAnswered < ROUND_SIZE || totalAnswered % ROUND_SIZE !== 0) {
    return { done: false };
  }

  // Load this round's answers
  const roundAnswers = await db
    .select()
    .from(assessmentAnswers)
    .where(eq(assessmentAnswers.session_id, sessionId))
    .orderBy(assessmentAnswers.question_order)
    .limit(ROUND_SIZE)
    .offset(totalAnswered - ROUND_SIZE);

  const results: boolean[] = roundAnswers.map((a) => a.is_correct === 1);
  const correctCount = results.filter(Boolean).length;

  // Build level history from session (Drizzle JSON column auto-parsed as LevelHistoryEntry[])
  const levelHistory: Array<{ level: number; round: number; correct: number; total: number }> = Array.isArray(session.level_history)
    ? [...session.level_history]
    : [];
  const currentRound = Math.floor(totalAnswered / ROUND_SIZE);

  const roundResult = assessment.evaluateRound(results, 3, 1, session.current_level ?? 1, levelHistory);

  // Update session with new level and history
  levelHistory.push({ level: roundResult.new_level, round: currentRound, correct: correctCount, total: ROUND_SIZE });
  await db
    .update(assessmentSessions)
    .set({
      current_level: roundResult.new_level,
      level_history: levelHistory,
      total_answered: totalAnswered,
    })
    .where(eq(assessmentSessions.id, sessionId));

  logger.info(
    { session_id: sessionId, round: currentRound, correct_count: correctCount, new_level: roundResult.new_level, done: roundResult.done },
    "Round evaluated",
  );

  return {
    done: roundResult.done,
    final_level: roundResult.done ? roundResult.new_level : undefined,
  };
}

/**
 * Get session history for resume
 */
async function getSessionHistory(sessionId: string): Promise<string> {
  const answers = await db
    .select()
    .from(assessmentAnswers)
    .where(eq(assessmentAnswers.session_id, sessionId))
    .orderBy(assessmentAnswers.question_order);

  return JSON.stringify(
    answers.map((a) => ({
      knowledge_point: a.knowledge_point,
      question_type: a.question_type,
      is_correct: a.is_correct,
      student_answer: a.student_answer.slice(0, 50),
    })),
  );
}

// ---------------------------------------------------------------------------
// Auto-select timer (D-13)
// ---------------------------------------------------------------------------

const autoSelectTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Start 30s auto-select timer — if agent doesn't call /select within 30s,
 * backend auto-locks the first candidate as fallback (per D-13)
 */
function startAutoSelectTimer(sessionId: string, fallbackQuestionId: string) {
  clearAutoSelectTimer(sessionId);
  const timer = setTimeout(async () => {
    logger.warn(
      { session_id: sessionId, question_id: fallbackQuestionId },
      "Agent did not select within 30s, auto-selecting first candidate (D-13 fallback)",
    );
    await assessment.lockQuestion(sessionId, fallbackQuestionId);
    autoSelectTimers.delete(sessionId);
  }, 30_000); // D-13: 30s fallback
  autoSelectTimers.set(sessionId, timer);
}

function clearAutoSelectTimer(sessionId: string) {
  const existing = autoSelectTimers.get(sessionId);
  if (existing) {
    clearTimeout(existing);
    autoSelectTimers.delete(sessionId);
  }
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const startSchema = z.object({
  course_id: z.string().default("cpp"),
  start_level: z.number().int().min(1).max(8),
  config_question_limit: z.number().int().min(3).max(10).optional(),
  config_time_limit_min: z.number().int().min(10).max(120).optional(),
});

const submitSchema = z.object({
  token: z.string(),
  question_id: z.string(),
  answer: z.string(),
  time_spent_sec: z.number().int().optional(),
});

const resumeSchema = z.object({ token: z.string() });

const candidatesSchema = z.object({
  token: z.string(),
  course_id: z.string(),
  level: z.number().int().min(1).max(8),
  hint: z.string().optional(),
  limit: z.number().int().min(1).max(10).optional().default(5),
});

const selectSchema = z.object({
  token: z.string(),
  question_id: z.string(),
});

const evaluateSchema = z.object({
  token: z.string(),
  evaluation: z.string(),
  final_level: z.number().int().min(1).max(8).optional(),
});

// ---------------------------------------------------------------------------
// Student-facing endpoints
// ---------------------------------------------------------------------------

/**
 * GET /sessions — Task 1: session history endpoint
 * Return list of student's assessment sessions sorted newest-first.
 */
app.get(
  "/sessions",
  StudentAuth(),
  describeRoute({
    summary: "Get student's assessment session history",
    responses: {
      200: {
        description: "List of session summaries",
        content: {
          "application/json": {
            schema: resolver(z.any()),
          },
        },
      },
      401: { description: "Unauthorized" },
    },
  }),
  async (c) => {
    const user = c.get("user");
    const sessions = await assessment.listStudentSessions(user.id);
    return success(c, { sessions });
  },
);

/**
 * DELETE /sessions/:sessionId — Task 1: session deletion endpoint
 * Delete a session and its answers, enforcing ownership.
 * Per Task 1: clean up projector and auto-select timer if active.
 */
app.delete(
  "/sessions/:sessionId",
  StudentAuth(),
  describeRoute({
    summary: "Delete an assessment session",
    responses: {
      200: {
        description: "Session deleted",
        content: {
          "application/json": {
            schema: resolver(z.object({ success: z.boolean() })),
          },
        },
      },
      401: { description: "Unauthorized" },
      404: { description: "Session not found" },
    },
  }),
  async (c) => {
    const user = c.get("user");
    const sessionId = c.req.param("sessionId");

    try {
      // Clean up projector if active
      projectorStore.destroy(sessionId);

      // Clean up auto-select timer if active
      clearAutoSelectTimer(sessionId);

      // Delete session and answers (ownership verified in service)
      await assessment.deleteStudentSession({
        studentId: user.id,
        sessionId,
      });

      return success(c, { success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete session";
      return error(c, msg, 404);
    }
  },
);

/**
 * POST /start — D-10, data flow step 1
 * Create assessment session, generate JWT, create ellamaka session, return first question
 */
app.post(
  "/start",
  StudentAuth(),
  zValidator("json", startSchema),
  describeRoute({
    summary: "Start assessment session",
    responses: {
      200: {
        description: "Session started with first question",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                success: z.boolean(),
                data: z.object({
                  token: z.string(),
                  first_question: z.any().optional(),
                  waiting: z.boolean().optional(),
                  message: z.string().optional(),
                }),
              }),
            ),
          },
        },
      },
      401: { description: "Unauthorized" },
    },
  }),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    // 1. Create assessment session in DB
    const session = await assessment.createAssessmentSession({
      student_id: user.id,
      course_id: body.course_id,
      start_level: body.start_level,
      config_question_limit: body.config_question_limit,
      config_time_limit_min: body.config_time_limit_min,
    });

    // 2. Update session with token (already set in createAssessmentSession)
    logger.info(
      { session_id: session.id, student_id: user.id, course_id: body.course_id },
      "Assessment session created",
    );

    // 3. Create ellamaka session with agent="assessor"
    let ellamakaSessionId: string | null = null;
    try {
      const es = await ellamakaClient.createSession(
        `Assessment-${session.id.slice(0, 8)}`,
        "assessor",
      );
      ellamakaSessionId = es.id;
      await db
        .update(assessmentSessions)
        .set({ ellamaka_session_id: ellamakaSessionId })
        .where(eq(assessmentSessions.id, session.id));

      // 4. Send async prompt — token in user message (not system prompt)
      const systemPrompt = buildSystemPrompt(user, body, {
        question_limit: session.config_question_limit,
        time_limit_min: session.config_time_limit_min,
      });
      await ellamakaClient.promptAsync(ellamakaSessionId, [
        {
          type: "text",
          text: `当前评估令牌: ${session.token}\n你好！请开始测评。学员 ${user.display_name}，课程 ${body.course_id}，起始级别 ${body.start_level}。请获取候选题目并为学员选择第一道题。`,
        },
      ], systemPrompt);

      // Initialize chat projector for this session
      projectorStore.getOrCreate(session.id, ellamakaSessionId);
    } catch (err) {
      logger.warn(
        { err, session_id: session.id },
        "Ellamaka session creation failed, assessment in offline mode",
      );
      // Assessment can still work in offline mode
    }

    // 5. Wait for first question (35s timeout to match auto-select)
    const firstQuestion = await waitForFirstQuestion(session.id, 35000);
    if (firstQuestion) {
      return success(c, { token: session.token, first_question: formatQuestion(firstQuestion) });
    }

    return success(c, {
      token: session.token,
      waiting: true,
      message: "Agent is selecting your first question...",
    });
  },
);

/**
 * POST /submit — D-05, D-09, data flow steps 2-3
 * Accept student answer, score objective questions instantly, async for coding
 */
app.post(
  "/submit",
  StudentAuth(),
  zValidator("json", submitSchema),
  describeRoute({
    summary: "Submit answer for scoring",
    responses: {
      200: {
        description: "Answer submitted",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                success: z.boolean(),
                data: z.object({
                  is_correct: z.boolean().optional(),
                  scoring: z.boolean().optional(),
                  feedback: z.string().optional(),
                  done: z.boolean(),
                  final_level: z.number().optional(),
                }),
              }),
            ),
          },
        },
      },
      401: { description: "Invalid token" },
      404: { description: "Question not found" },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");

    // 1. Verify token
    let payload: assessment.TokenPayload;
    try {
      payload = await assessment.verifyToken(body.token);
    } catch {
      return unauthorized(c, "Invalid or expired token");
    }

    // 2. Verify question is currently locked for this session
    const lockedQuestionId = assessment.getLockedQuestionId(payload.assessment_session_id);
    if (!lockedQuestionId || body.question_id !== lockedQuestionId) {
      return error(c, "Question is not active for this session", 400);
    }

    // 3. Check if question already answered (prevent duplicates)
    const existingAnswer = await db.query.assessmentAnswers.findFirst({
      where: and(
        eq(assessmentAnswers.session_id, payload.assessment_session_id),
        eq(assessmentAnswers.question_id, body.question_id),
      ),
    });
    if (existingAnswer) {
      return error(c, "Question already answered", 400);
    }

    // 4. Get question from DB
    const question = await db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.id, body.question_id),
    });
    if (!question) return error(c, "Question not found", 404);

    // 3. Score based on type
    if (question.question_type === "objective") {
      // D-05: backend direct comparison
      const correct = assessment.scoreObjectiveAnswer(body.answer, question.answer);

      // Save answer
      const order = await getNextOrder(payload.assessment_session_id);
      await db.insert(assessmentAnswers).values({
        session_id: payload.assessment_session_id,
        question_id: body.question_id,
        question_order: order,
        student_answer: body.answer,
        is_correct: correct ? 1 : 0,
        time_spent_sec: body.time_spent_sec,
        course_id: payload.course_id,
        level: question.level,
        knowledge_point: question.knowledge_point,
        question_type: question.question_type,
      });

      // Update session stats
      await assessment.updateSessionAfterAnswer(payload.assessment_session_id, correct);

      // Unlock so frontend waits for agent to select next question
      assessment.unlockQuestion(payload.assessment_session_id);

      // Notify ellamaka agent with progress context
      const session = await db.query.assessmentSessions.findFirst({
        where: eq(assessmentSessions.id, payload.assessment_session_id),
      });
      if (session?.ellamaka_session_id) {
        const progress = await assessment.getProgress(payload.assessment_session_id);
        const progressPct = Math.round((progress.total_answered / progress.config_question_limit) * 100);
        await ellamakaClient
          .promptAsync(session.ellamaka_session_id, [
            {
              type: "text",
              text: `学员回答了题目 ${question.knowledge_point}(${question.question_type})，答案: "${body.answer}"，结果: ${correct ? "正确 ✓" : "错误 ✗"}。

进度: 已答 ${progress.total_answered}/${progress.config_question_limit} 题 (${progressPct}%)，正确 ${progress.total_correct} 题，剩余 ${progress.remaining_questions} 题，剩余时间 ${Math.floor(progress.remaining_time_sec / 60)} 分钟。

请在聊天中给学员简短反馈，然后获取候选并选择下一道题。`,
            },
          ])
          .catch((err) =>
            logger.warn({ err }, "Failed to notify agent of answer"),
          );
      }

      // Check round completion
      const roundResult = await checkRoundCompletion(payload.assessment_session_id, session!);
      
      // Persist completion state if done
      if (roundResult.done && roundResult.final_level) {
        await assessment.completeSession(payload.assessment_session_id, roundResult.final_level);
      }

      return success(c, {
        is_correct: correct,
        feedback: correct ? "回答正确!" : "回答错误,继续加油!",
        correct_answer: question.answer,
        explanation: question.explanation,
        done: roundResult.done,
        ...(roundResult.done ? { final_level: roundResult.final_level } : {}),
      });
    } else {
      // Coding question: async scoring by agent
      const order = await getNextOrder(payload.assessment_session_id);
      await db.insert(assessmentAnswers).values({
        session_id: payload.assessment_session_id,
        question_id: body.question_id,
        question_order: order,
        student_answer: body.answer,
        is_correct: null,
        time_spent_sec: body.time_spent_sec,
        course_id: payload.course_id,
        level: question.level,
        knowledge_point: question.knowledge_point,
        question_type: question.question_type,
      });

      // Unlock so frontend waits for agent to select next question
      assessment.unlockQuestion(payload.assessment_session_id);

      // Send to agent for evaluation with progress context
      const session = await db.query.assessmentSessions.findFirst({
        where: eq(assessmentSessions.id, payload.assessment_session_id),
      });
      if (session?.ellamaka_session_id) {
        const progress = await assessment.getProgress(payload.assessment_session_id);
        const progressPct = Math.round((progress.total_answered / progress.config_question_limit) * 100);
        await ellamakaClient
          .promptAsync(session.ellamaka_session_id, [
            {
              type: "text",
              text: `[内部消息] 学员提交了编程题代码:
题目: ${question.content.slice(0, 200)}...
学员代码:
\`\`\`cpp
${body.answer}
\`\`\`

进度: 已答 ${progress.total_answered}/${progress.config_question_limit} 题 (${progressPct}%)，正确 ${progress.total_correct} 题，剩余 ${progress.remaining_questions} 题，剩余时间 ${Math.floor(progress.remaining_time_sec / 60)} 分钟。

请先调用 update_answer_score 为这道编程题评分（0-10），然后在聊天中给学员简短反馈。之后获取候选并选择下一道题，或判断是否结束测评。`,
            },
          ])
          .catch((err) =>
            logger.warn({ err }, "Failed to send coding answer to agent"),
          );
      }

      return success(c, {
        scoring: true,
        message: "编程题已提交,AI 正在评估中...",
      });
    }
  },
);

/**
 * Extract and verify assessment token from Authorization header.
 * Returns payload or sends error response.
 */
async function verifyTokenFromHeader(c: Context): Promise<assessment.TokenPayload | Response> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorized(c, "Missing or invalid authorization token");
  }
  const token = authHeader.slice(7);
  try {
    return await assessment.verifyToken(token);
  } catch {
    return unauthorized(c, "Invalid or expired token");
  }
}

/**
 * GET /next-question — token via Authorization header
 * Return locked question or { waiting: true }
 */
app.get(
  "/next-question",
  describeRoute({
    summary: "Get next question",
    responses: {
      200: {
        description: "Question content or waiting status",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                success: z.boolean(),
                data: z.any(),
              }),
            ),
          },
        },
      },
      401: { description: "Invalid token" },
    },
  }),
  async (c) => {
    const payloadOrErr = await verifyTokenFromHeader(c);
    if (payloadOrErr instanceof Response) return payloadOrErr;
    const payload = payloadOrErr;

    // Always include progress for state restoration on page refresh
    const progress = await assessment.getProgress(payload.assessment_session_id);

    // Per Task 1: completed session returns done=true instead of another question
    if (progress.done) {
      return success(c, { done: true, progress });
    }

    // Check if question is locked
    const lockedId = assessment.getLockedQuestionId(payload.assessment_session_id);
    if (!lockedId) return success(c, { waiting: true, progress });

    // Fetch full question content (only after locked)
    const question = await db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.id, lockedId),
    });
    if (!question) return error(c, "Question not found", 404);

    return success(c, { ...formatQuestion(question), progress });
  },
);

/**
 * GET /progress — token via Authorization header
 * Return current level, answered count, correct count, knowledge_stats, evaluation
 */
app.get(
  "/progress",
  describeRoute({
    summary: "Get assessment progress",
    responses: {
      200: {
        description: "Progress data",
        content: {
          "application/json": {
            schema: resolver(z.any()),
          },
        },
      },
      401: { description: "Invalid token" },
    },
  }),
  async (c) => {
    const payloadOrErr = await verifyTokenFromHeader(c);
    if (payloadOrErr instanceof Response) return payloadOrErr;
    const payload = payloadOrErr;

    const progress = await assessment.getProgress(payload.assessment_session_id);
    return success(c, progress);
  },
);

/**
 * POST /resume — D-26, data flow step 6
 * Restore interrupted session: find by token, rebuild context, create new ellamaka session
 */
app.post(
  "/resume",
  StudentAuth(),
  zValidator("json", resumeSchema),
  describeRoute({
    summary: "Resume interrupted assessment",
    responses: {
      200: {
        description: "Session resumed",
        content: {
          "application/json": {
            schema: resolver(z.any()),
          },
        },
      },
      401: { description: "Invalid token" },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");

    let payload: assessment.TokenPayload;
    try {
      payload = await assessment.verifyToken(body.token);
    } catch {
      return unauthorized(c, "Invalid or expired token");
    }

    const session = await assessment.resumeSession(body.token);

    // Create new ellamaka session and inject history
    const history = await getSessionHistory(payload.assessment_session_id);
    const es = await ellamakaClient.createSession(
      `Resume-${session.id.slice(0, 8)}`,
      "assessor",
    );

    const systemPrompt = buildSystemPrompt(
      { display_name: "学员" },
      { course_id: session.course_id, start_level: session.current_level },
      { question_limit: session.config_question_limit, time_limit_min: session.config_time_limit_min },
    );

    await ellamakaClient.promptAsync(es.id, [
      {
        type: "text",
        text: `当前评估令牌: ${body.token}\n续评恢复。历史记录:\n${history}\n当前级别: ${session.current_level}。请继续选题。`,
      },
    ], systemPrompt);

    // Initialize chat projector for resumed session
    projectorStore.getOrCreate(session.id, es.id);

    await db
      .update(assessmentSessions)
      .set({ ellamaka_session_id: es.id })
      .where(eq(assessmentSessions.id, session.id));

    return success(c, { session, message: "测评已恢复" });
  },
);

/**
 * GET /{token}/chat-state — snapshot endpoint
 * Return current projected chat state (messages + status)
 */
app.get(
  "/:token/chat-state",
  describeRoute({
    summary: "Get current chat state snapshot",
    responses: {
      200: {
        description: "Chat state snapshot",
        content: {
          "application/json": {
            schema: resolver(z.any()),
          },
        },
      },
      401: { description: "Invalid token" },
      404: { description: "No active projector" },
    },
  }),
  async (c) => {
    const token = c.req.param("token");

    let payload: assessment.TokenPayload;
    try {
      payload = await assessment.verifyToken(token);
    } catch {
      return unauthorized(c, "Invalid or expired token");
    }

    const projector = projectorStore.get(payload.assessment_session_id);
    if (!projector) {
      return error(c, "No active projector for this session", 404);
    }

    return success(c, projector.getSnapshot());
  },
);

/**
 * GET /{token}/stream — SSE stream (D-01)
 * Emit normalized events from projector
 */
app.get(
  "/:token/stream",
  describeRoute({
    summary: "SSE stream for normalized chat events",
    responses: {
      200: {
        description: "SSE stream",
        content: {
          "text/event-stream": {
            schema: resolver(z.any()),
          },
        },
      },
      401: { description: "Invalid token" },
      404: { description: "No active projector" },
    },
  }),
  async (c) => {
    const token = c.req.param("token");

    let payload: assessment.TokenPayload;
    try {
      payload = await assessment.verifyToken(token);
    } catch {
      return unauthorized(c, "Invalid or expired token");
    }

    const projector = projectorStore.get(payload.assessment_session_id);
    if (!projector) {
      return error(c, "No active projector for this session", 404);
    }

    const abortController = new AbortController();

    const stream = new ReadableStream({
      start(controller) {
        // Send initial snapshot as the first event
        const snapshot = projector.getSnapshot();
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "snapshot", messages: snapshot.messages, status: snapshot.status })}\n\n`,
          ),
        );

        // Subscribe to normalized events
        const unsubscribe = projector.addListener((event) => {
          if (abortController.signal.aborted) return;
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        });

        // SSE heartbeat to prevent Bun.serve idle timeout (default 10s)
        const heartbeat = setInterval(() => {
          if (abortController.signal.aborted) return;
          try {
            controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
          } catch {
            // Controller closed — heartbeat no longer needed
            clearInterval(heartbeat);
          }
        }, 5000);

        // Cleanup on abort.
        // controller may already be closed if the stream ended naturally;
        // close is idempotent in spirit but throws, so catch and move on.
        abortController.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
            logger.debug(
              { assessment_session_id: payload.assessment_session_id },
              "Normalized SSE stream closed",
            );
          } catch {
            // Stream already ended — nothing to close
          }
        }, { once: true });
      },
      cancel() {
        abortController.abort();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  },
);

// ---------------------------------------------------------------------------
// Internal endpoints (API key auth)
// ---------------------------------------------------------------------------

/**
 * POST /candidates — called by gesp-plugin (D-13)
 * Filter questions by course/level/answered, return candidate summaries
 */
app.post(
  "/candidates",
  verifyApiKey,
  zValidator("json", candidatesSchema),
  describeRoute({
    summary: "Get candidate questions for agent",
    responses: {
      200: {
        description: "Candidate list",
        content: {
          "application/json": {
            schema: resolver(z.any()),
          },
        },
      },
      401: { description: "Invalid token or API key" },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");

    let payload: assessment.TokenPayload;
    try {
      payload = await assessment.verifyToken(body.token);
    } catch {
      return unauthorized(c, "Invalid token");
    }

    const candidates = await assessment.getCandidates(
      body.course_id,
      body.level,
      payload.assessment_session_id,
      body.hint,
      body.limit,
    );

    // D-13: Start 10s auto-select timer
    if (candidates.length > 0) {
      startAutoSelectTimer(payload.assessment_session_id, candidates[0].question_id);
    }

    return success(c, { candidates });
  },
);

/**
 * POST /select — called by gesp-plugin (D-13)
 * Lock a question as next, clear auto-select timer
 */
app.post(
  "/select",
  verifyApiKey,
  zValidator("json", selectSchema),
  describeRoute({
    summary: "Select next question",
    responses: {
      200: {
        description: "Selection confirmed",
        content: {
          "application/json": {
            schema: resolver(z.any()),
          },
        },
      },
      401: { description: "Invalid token or API key" },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");

    let payload: assessment.TokenPayload;
    try {
      payload = await assessment.verifyToken(body.token);
    } catch {
      return unauthorized(c, "Invalid token");
    }

    await assessment.lockQuestion(payload.assessment_session_id, body.question_id);

    // D-13: Agent made selection — clear auto-select timer
    clearAutoSelectTimer(payload.assessment_session_id);

    return success(c, { success: true });
  },
);

/**
 * POST /evaluate — called by gesp-plugin (D-04, D-27)
 * Save agent evaluation + mark session completed.
 * Per Task 1: persist status='completed', final_level, completed_at, clear timers, return done=true.
 */
app.post(
  "/evaluate",
  verifyApiKey,
  zValidator("json", evaluateSchema),
  describeRoute({
    summary: "Update evaluation from agent",
    responses: {
      200: {
        description: "Evaluation saved",
        content: {
          "application/json": {
            schema: resolver(z.any()),
          },
        },
      },
      401: { description: "Invalid token or API key" },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");

    let payload: assessment.TokenPayload;
    try {
      payload = await assessment.verifyToken(body.token);
    } catch {
      return unauthorized(c, "Invalid token");
    }

    // Get session to determine final_level
    const session = await db.query.assessmentSessions.findFirst({
      where: eq(assessmentSessions.id, payload.assessment_session_id),
    });

    if (!session) {
      return error(c, "Session not found", 404);
    }

    // Use provided final_level or current_level as fallback
    const finalLevel = body.final_level ?? session.current_level;

    // Save evaluation text
    await assessment.updateEvaluation(payload.assessment_session_id, body.evaluation);

    // Mark session completed
    await assessment.completeSession(payload.assessment_session_id, finalLevel);

    // Clear any pending auto-select timer
    clearAutoSelectTimer(payload.assessment_session_id);

    // Unlock question to prevent ghost questions
    assessment.unlockQuestion(payload.assessment_session_id);

    logger.info(
      { session_id: payload.assessment_session_id, final_level: finalLevel },
      "Assessment evaluation completed",
    );

    return success(c, { success: true, done: true, final_level: finalLevel });
  },
);

// ---------------------------------------------------------------------------
// Internal answer scoring endpoint (API key auth)
// ---------------------------------------------------------------------------

const answerScoreSchema = z.object({
  token: z.string(),
  question_id: z.string(),
  score: z.number().min(0).max(10),
  feedback: z.string(),
});

/**
 * POST /answer-score — called by gesp-plugin update_answer_score tool
 * Persist coding answer score, feedback, and derived is_correct.
 */
app.post(
  "/answer-score",
  verifyApiKey,
  zValidator("json", answerScoreSchema),
  describeRoute({
    summary: "Score a coding answer",
    responses: {
      200: { description: "Score saved" },
      401: { description: "Invalid token or API key" },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");

    let payload: assessment.TokenPayload;
    try {
      payload = await assessment.verifyToken(body.token);
    } catch {
      return unauthorized(c, "Invalid token");
    }

    try {
      await assessment.updateAnswerScore({
        sessionId: payload.assessment_session_id,
        questionId: body.question_id,
        score: body.score,
        feedback: body.feedback,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return error(c, msg, 404);
    }

    return success(c, { success: true, is_correct: body.score >= 6 });
  },
);

// ---------------------------------------------------------------------------
// Chat endpoint — student sends message to agent via chat panel
// ---------------------------------------------------------------------------
const chatSchema = z.object({
  message: z.string().min(1),
  message_id: z.string().optional(),
});

app.post(
  "/:token/chat",
  zValidator("json", chatSchema),
  describeRoute({
    summary: "Send chat message to agent",
    responses: {
      200: { description: "Message sent" },
      401: { description: "Invalid token" },
      404: { description: "No active projector" },
    },
  }),
  async (c) => {
    const body = c.req.valid("json");
    const token = c.req.param("token");

    let payload: assessment.TokenPayload;
    try {
      payload = await assessment.verifyToken(token);
    } catch {
      return unauthorized(c, "Invalid or expired token");
    }

    const projector = projectorStore.get(payload.assessment_session_id);
    if (!projector) {
      return error(c, "No active projector for this session", 404);
    }

    const session = await db.query.assessmentSessions.findFirst({
      where: eq(assessmentSessions.id, payload.assessment_session_id),
    });

    if (!session?.ellamaka_session_id) {
      return error(c, "No active agent session", 404);
    }

    // Add student message to projector for immediate UI display
    projector.addStudentMessage(body.message, body.message_id);

    // Send to ellamaka for agent processing
    await ellamakaClient.promptAsync(
      session.ellamaka_session_id,
      [{ type: "text", text: body.message }],
    );

    logger.info(
      { session_id: session.id, ellamaka_session_id: session.ellamaka_session_id },
      "Student chat message sent to agent",
    );

    return success(c, { success: true });
  },
);

export default app;
