import { Hono } from "hono";
import type { Context } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { StudentAuth } from "../middleware/auth";
import { success, error, unauthorized } from "../utils/response";
import { logger } from "../utils/logger";
import { createEllamakaClient } from "../services/ellamaka-client";
import * as assessment from "../services/assessment";
import { db } from "../db";
import { assessmentSessions, assessmentAnswers, assessmentQuestions } from "../db/schema/assessment";
import { eq } from "drizzle-orm";

const app = new Hono();
const ellamakaClient = createEllamakaClient();

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
 * Build system prompt for assessor agent
 */
function buildSystemPrompt(
  token: string,
  user: { display_name: string },
  body: { course_id: string; start_level: number },
): string {
  return `当前评估令牌: ${token}
学员: ${user.display_name}
课程: ${body.course_id}
起始级别: ${body.start_level}

你是 GESP 测评顾问。请使用令牌调用工具。严禁透露题目答案。`;
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

/**
 * Get next question order for a session
 */
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
 * Polls questionLocks map every 500ms
 */
async function waitForFirstQuestion(
  sessionId: string,
  timeoutMs: number,
): Promise<typeof assessmentQuestions.$inferSelect | null> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const lockedId = questionLocks.get(sessionId);
    if (lockedId) {
      const question = await db.query.assessmentQuestions.findFirst({
        where: eq(assessmentQuestions.id, lockedId),
      });
      if (question) return question;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

/**
 * Check round completion and convergence
 * Returns done=true when assessment should terminate
 */
function checkRoundCompletion(
  sessionId: string,
  session: typeof assessmentSessions.$inferSelect,
): { done: boolean; final_level?: number } {
  // For MVP: convergence when total_answered >= question_limit
  // TODO: implement proper convergence logic with evaluateRound
  const done = (session.total_answered ?? 0) >= (session.config_question_limit ?? 5);
  return {
    done,
    final_level: done ? session.current_level : undefined,
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
// Question locks and auto-select timer (D-13)
// ---------------------------------------------------------------------------

const questionLocks = new Map<string, string>(); // sessionId → questionId
const autoSelectTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Start 10s auto-select timer — if agent doesn't call /select within 10s,
 * backend auto-locks the first candidate as fallback (per D-13)
 */
function startAutoSelectTimer(sessionId: string, fallbackQuestionId: string) {
  clearAutoSelectTimer(sessionId);
  const timer = setTimeout(async () => {
    logger.warn(
      { session_id: sessionId, question_id: fallbackQuestionId },
      "Agent did not select within 10s, auto-selecting first candidate (D-13 fallback)",
    );
    await assessment.lockQuestion(sessionId, fallbackQuestionId);
    autoSelectTimers.delete(sessionId);
  }, 10_000); // D-13: 10s fallback
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
});

// ---------------------------------------------------------------------------
// Student-facing endpoints
// ---------------------------------------------------------------------------

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

      // 4. Send async prompt with system context
      const systemPrompt = buildSystemPrompt(session.token, user, body);
      await ellamakaClient.promptAsync(ellamakaSessionId, [
        {
          type: "text",
          text: `开始测评。学员 ${user.display_name},课程 ${body.course_id},起始级别 ${body.start_level}。请调用 get_question_candidates 获取候选题目并选择第一道题。`,
        },
      ], systemPrompt);
    } catch (err) {
      logger.warn(
        { err, session_id: session.id },
        "Ellamaka session creation failed, assessment in offline mode",
      );
      // Assessment can still work in offline mode
    }

    // 5. Wait for first question (15s timeout)
    const firstQuestion = await waitForFirstQuestion(session.id, 15000);
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

    // 2. Get question from DB
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

      // Notify ellamaka agent
      const session = await db.query.assessmentSessions.findFirst({
        where: eq(assessmentSessions.id, payload.assessment_session_id),
      });
      if (session?.ellamaka_session_id) {
        await ellamakaClient
          .promptAsync(session.ellamaka_session_id, [
            {
              type: "text",
              text: `[内部消息] 学员回答了题目 ${question.knowledge_point}(${question.question_type}),答案: "${body.answer}",结果: ${correct ? "正确" : "错误"}。请给予反馈并选择下一道题。`,
            },
          ])
          .catch((err) =>
            logger.warn({ err }, "Failed to notify agent of answer"),
          );
      }

      // Check round completion
      const roundResult = checkRoundCompletion(payload.assessment_session_id, session!);

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

      // Send to agent for evaluation
      const session = await db.query.assessmentSessions.findFirst({
        where: eq(assessmentSessions.id, payload.assessment_session_id),
      });
      if (session?.ellamaka_session_id) {
        await ellamakaClient
          .promptAsync(session.ellamaka_session_id, [
            {
              type: "text",
              text: `[内部消息] 学员提交了编程题代码:\n题目: ${question.content.slice(0, 200)}...\n学员代码:\n\`\`\`cpp\n${body.answer}\n\`\`\`\n\n请评估这段代码并给出 0-10 评分和反馈。然后调用 update_evaluation 或继续选题。`,
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
 * GET /next-question — token-based auth
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
    const token = c.req.query("token");
    if (!token) return error(c, "Token required", 400);

    let payload: assessment.TokenPayload;
    try {
      payload = await assessment.verifyToken(token);
    } catch {
      return unauthorized(c, "Invalid or expired token");
    }

    // Check if question is locked
    const lockedId = questionLocks.get(payload.assessment_session_id);
    if (!lockedId) return success(c, { waiting: true });

    // Fetch full question content (only after locked)
    const question = await db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.id, lockedId),
    });
    if (!question) return error(c, "Question not found", 404);

    return success(c, formatQuestion(question));
  },
);

/**
 * GET /progress — token-based auth
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
    const token = c.req.query("token");
    if (!token) return error(c, "Token required", 400);

    let payload: assessment.TokenPayload;
    try {
      payload = await assessment.verifyToken(token);
    } catch {
      return unauthorized(c, "Invalid or expired token");
    }

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
      body.token,
      { display_name: "学员" },
      { course_id: session.course_id, start_level: session.current_level },
    );

    await ellamakaClient.promptAsync(es.id, [
      {
        type: "text",
        text: `续评恢复。历史记录:\n${history}\n当前级别: ${session.current_level}。请继续选题。`,
      },
    ], systemPrompt);

    await db
      .update(assessmentSessions)
      .set({ ellamaka_session_id: es.id })
      .where(eq(assessmentSessions.id, session.id));

    return success(c, { session, message: "测评已恢复" });
  },
);

/**
 * GET /{token}/stream — SSE stream (D-01)
 * Forward agent text from ellamaka events filtered by sessionId
 */
app.get(
  "/:token/stream",
  describeRoute({
    summary: "SSE stream for agent messages",
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
      404: { description: "No active agent session" },
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

    const session = await db.query.assessmentSessions.findFirst({
      where: eq(assessmentSessions.id, payload.assessment_session_id),
    });

    if (!session?.ellamaka_session_id) {
      return error(c, "No active agent session", 404);
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of ellamakaClient.streamEvents(
            session.ellamaka_session_id!,
          )) {
            // Filter: only forward agent text output (not internal tool calls)
            if (
              (event.type === "message.part.delta" && event.field === "text") ||
              (event.type === "message.part.updated" && event.field === "text")
            ) {
              const text = event.delta || event.text || "";
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ type: "agent_text", text })}\n\n`,
                ),
              );
            }
          }
        } catch (err) {
          logger.error(
            { err, session_id: session.id },
            "SSE stream error",
          );
        }
        controller.close();
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
 * Save agent evaluation + recompute knowledge_stats
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

    await assessment.updateEvaluation(payload.assessment_session_id, body.evaluation);

    return success(c, { success: true });
  },
);

export default app;