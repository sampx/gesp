/**
 * Assessment Service — Core assessment logic for adaptive testing.
 *
 * Implements JWT token management, objective scoring, adaptive algorithm,
 * question selection, progress tracking, and session lifecycle.
 */

import { sign, verify } from "hono/jwt";
import { db } from "../db";
import {
  assessmentSessions,
  assessmentAnswers,
  assessmentQuestions,
  type LevelHistoryEntry,
  type KnowledgeStat,
} from "../db/schema/assessment";
import { eq, and, ne, inArray, notInArray, sql, count, sum } from "drizzle-orm";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const _JWT_SECRET = process.env.JWT_SECRET;
if (!_JWT_SECRET) {
  throw new Error("Missing required environment variable: JWT_SECRET");
}
const JWT_SECRET: string = _JWT_SECRET;
const TOKEN_EXPIRY_SEC = 2 * 60 * 60; // 2 hours

const DEFAULT_QUESTION_LIMIT = 5;
const DEFAULT_THRESHOLD_UP = 3;
const DEFAULT_THRESHOLD_DOWN = 1;
const DEFAULT_TYPE_RATIO = { objective: 3, coding: 2 };
const DEFAULT_TIME_LIMIT_MIN = 30;
const MAX_SAFETY_QUESTIONS = 30;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TokenPayload {
  assessment_session_id: string;
  student_id: string;
  course_id: string;
  exp?: number;
}

export interface RoundResult {
  action: "advance" | "retreat" | "stay";
  new_level: number;
  done: boolean;
}

export interface CandidateSummary {
  question_id: string;
  knowledge_point: string;
  difficulty: number;
  question_type: string;
  short_summary: string; // first 100 chars of content
}

export interface ProgressData {
  current_level: number;
  total_answered: number;
  total_correct: number;
  knowledge_stats: Record<string, KnowledgeStat>;
  evaluation: string | null;
  status: string;
}

export interface AssessmentSession {
  id: string;
  token: string;
  student_id: string;
  course_id: string;
  status: string;
  start_level: number;
  current_level: number;
  final_level: number | null;
  ellamaka_session_id: string | null;
  config_question_limit: number;
  config_time_limit_min: number;
  config_threshold_up: number;
  config_threshold_down: number;
  total_answered: number;
  total_correct: number;
  level_history: LevelHistoryEntry[] | null;
  knowledge_stats: Record<string, KnowledgeStat> | null;
  evaluation: string | null;
  started_at: Date;
  completed_at: Date | null;
}

// ---------------------------------------------------------------------------
// JWT Token utilities
// ---------------------------------------------------------------------------

/**
 * Generate JWT token for assessment session.
 * Token encodes { assessment_session_id, student_id, course_id, exp } with 2h expiry.
 */
export async function generateToken(
  payload: Omit<TokenPayload, "exp">,
): Promise<string> {
  const token = await sign(
    { ...payload, exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SEC },
    JWT_SECRET,
    "HS256",
  );
  logger.info(
    { assessment_session_id: payload.assessment_session_id, student_id: payload.student_id },
    "Assessment token generated",
  );
  return token;
}

/**
 * Verify JWT token and return decoded payload.
 * Throws on invalid/expired tokens.
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  const decoded = await verify(token, JWT_SECRET, "HS256");
  return decoded as unknown as TokenPayload;
}

// ---------------------------------------------------------------------------
// Scoring functions
// ---------------------------------------------------------------------------

/**
 * Score objective answer by trim + lowercase comparison.
 * Per D-05, D-14: normalization before comparison.
 */
export function scoreObjectiveAnswer(
  studentAnswer: string,
  correctAnswer: string,
): boolean {
  return (
    studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
  );
}

// ---------------------------------------------------------------------------
// Adaptive algorithm — round evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate round results and determine next action.
 * Per D-07, D-08, D-09:
 * - >= thresholdUp correct → advance (level+1, bounded at 8)
 * - <= thresholdDown correct → retreat (level-1, bounded at 1)
 * - between thresholds → stay
 * - Convergence: same level for 2 consecutive rounds → done=true
 */
export function evaluateRound(
  results: boolean[], // correct/incorrect per question in round
  thresholdUp: number, // default 3
  thresholdDown: number, // default 1
  currentLevel: number,
  levelHistory: Array<{ level: number; round: number }>,
): RoundResult {
  const correctCount = results.filter(Boolean).length;

  let action: "advance" | "retreat" | "stay";
  let new_level: number;

  if (correctCount >= thresholdUp) {
    action = "advance";
    new_level = Math.min(currentLevel + 1, 8);
  } else if (correctCount <= thresholdDown) {
    action = "retreat";
    new_level = Math.max(currentLevel - 1, 1);
  } else {
    action = "stay";
    new_level = currentLevel;
  }

  // Check convergence: same level for 2 consecutive rounds
  const done =
    levelHistory.length >= 2 &&
    levelHistory[levelHistory.length - 1].level === new_level &&
    levelHistory[levelHistory.length - 2].level === new_level;

  if (done) {
    logger.info(
      { current_level: currentLevel, new_level, correct_count: correctCount },
      "Assessment converged",
    );
  }

  return { action, new_level, done };
}

// ---------------------------------------------------------------------------
// Question selection helpers
// ---------------------------------------------------------------------------

/**
 * Get candidate questions for next round.
 * Per D-13, D-15:
 * - Filter by course_id, level, status='active'
 * - Exclude already-answered question_ids
 * - Return candidates with short_summary (first 100 chars + "...")
 */
export async function getCandidates(
  courseId: string,
  level: number,
  sessionId: string,
  hint?: string,
  limit: number = DEFAULT_QUESTION_LIMIT,
): Promise<CandidateSummary[]> {
  // Get answered question_ids for this session
  const answered = await db
    .select({ question_id: assessmentAnswers.question_id })
    .from(assessmentAnswers)
    .where(eq(assessmentAnswers.session_id, sessionId));

  const answeredIds = answered.map((a) => a.question_id);

  // Build query: active questions at target level, excluding answered
  // Note: and() doesn't accept undefined, so build conditions dynamically
  const baseConditions = [
    eq(assessmentQuestions.course_id, courseId),
    eq(assessmentQuestions.level, level),
    eq(assessmentQuestions.status, "active"),
  ];

  const conditions = answeredIds.length > 0
    ? [...baseConditions, notInArray(assessmentQuestions.id, answeredIds)]
    : baseConditions;

  const query = db
    .select()
    .from(assessmentQuestions)
    .where(and(...conditions));

  // Note: Vector search with hint will be integrated in Plan 03 route layer
  // This layer uses SQL-only for now

  const questions = await query.limit(limit * 2); // Fetch extra for type rotation

  // Build candidates with short_summary
  const candidates: CandidateSummary[] = questions.map((q) => ({
    question_id: q.id,
    knowledge_point: q.knowledge_point,
    difficulty: q.difficulty ?? 1,
    question_type: q.question_type,
    short_summary:
      q.content.length > 100 ? q.content.slice(0, 100) + "..." : q.content,
  }));

  logger.debug(
    { course_id: courseId, level, session_id: sessionId, candidate_count: candidates.length },
    "Candidates fetched",
  );

  return candidates;
}

/**
 * Rotate question type based on answered types in current round.
 * Per D-16: fill objective slots first (3 per round), then coding (2 per round).
 */
export function rotateType(
  answeredTypesInRound: string[],
  ratio: { objective: number; coding: number } = DEFAULT_TYPE_RATIO,
): "objective" | "coding" {
  const objectiveCount = answeredTypesInRound.filter(
    (t) => t === "objective",
  ).length;
  const codingCount = answeredTypesInRound.filter((t) => t === "coding").length;

  if (objectiveCount < ratio.objective) {
    return "objective";
  } else if (codingCount < ratio.coding) {
    return "coding";
  } else {
    // Both slots full, default to objective for overflow
    return "objective";
  }
}

/**
 * Lock a question for a session.
 * Uses in-memory Map for lock tracking (locks only last one round).
 */
const currentQuestionLocks = new Map<string, string>();

export async function lockQuestion(
  sessionId: string,
  questionId: string,
): Promise<void> {
  // Validate question exists and is active
  const question = await db.query.assessmentQuestions.findFirst({
    where: and(
      eq(assessmentQuestions.id, questionId),
      eq(assessmentQuestions.status, "active"),
    ),
  });

  if (!question) {
    logger.warn({ session_id: sessionId, question_id: questionId }, "Lock failed: question not found or inactive");
    throw new Error("Question not found or inactive");
  }

  currentQuestionLocks.set(sessionId, questionId);
  logger.info({ session_id: sessionId, question_id: questionId }, "Question locked");
}

/**
 * Get the currently locked question ID for a session.
 */
export function getLockedQuestionId(sessionId: string): string | undefined {
  return currentQuestionLocks.get(sessionId);
}

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

/**
 * Compute knowledge stats from assessment_answers aggregation.
 * Per D-27: GROUP BY knowledge_point, COUNT total, SUM correct.
 */
export async function computeKnowledgeStats(
  sessionId: string,
): Promise<Record<string, KnowledgeStat>> {
  // Raw aggregation query using Drizzle SQL
  const stats = await db
    .select({
      knowledge_point: assessmentAnswers.knowledge_point,
      total: count(),
      correct: sum(assessmentAnswers.is_correct),
    })
    .from(assessmentAnswers)
    .where(eq(assessmentAnswers.session_id, sessionId))
    .groupBy(assessmentAnswers.knowledge_point);

  const result: Record<string, KnowledgeStat> = {};
  for (const stat of stats) {
    result[stat.knowledge_point] = {
      total: stat.total,
      correct: Number(stat.correct ?? 0),
    };
  }

  logger.debug({ session_id: sessionId, knowledge_point_count: Object.keys(result).length }, "Knowledge stats computed");

  return result;
}

/**
 * Get current progress data for a session.
 */
export async function getProgress(sessionId: string): Promise<ProgressData> {
  const session = await db.query.assessmentSessions.findFirst({
    where: eq(assessmentSessions.id, sessionId),
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const stats = session.knowledge_stats ?? await computeKnowledgeStats(sessionId);

  return {
    current_level: session.current_level,
    total_answered: session.total_answered ?? 0,
    total_correct: session.total_correct ?? 0,
    knowledge_stats: stats,
    evaluation: session.evaluation,
    status: session.status,
  };
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

/**
 * Create a new assessment session.
 * Per D-24: generate token, set defaults, initialize counters.
 */
export async function createAssessmentSession(params: {
  student_id: string;
  course_id: string;
  start_level: number;
  config_question_limit?: number;
  config_time_limit_min?: number;
}): Promise<AssessmentSession> {
  const id = crypto.randomUUID();
  const token = await generateToken({
    assessment_session_id: id,
    student_id: params.student_id,
    course_id: params.course_id,
  });

  const [session] = await db
    .insert(assessmentSessions)
    .values({
      id,
      token,
      student_id: params.student_id,
      course_id: params.course_id,
      status: "in_progress",
      start_level: params.start_level,
      current_level: params.start_level,
      config_question_limit: params.config_question_limit ?? DEFAULT_QUESTION_LIMIT,
      config_time_limit_min: params.config_time_limit_min ?? DEFAULT_TIME_LIMIT_MIN,
      config_threshold_up: DEFAULT_THRESHOLD_UP,
      config_threshold_down: DEFAULT_THRESHOLD_DOWN,
      total_answered: 0,
      total_correct: 0,
      level_history: [],
      knowledge_stats: {},
      started_at: new Date(),
    })
    .returning();

  logger.info(
    { session_id: id, student_id: params.student_id, course_id: params.course_id, start_level: params.start_level },
    "Assessment session created",
  );

  return session as AssessmentSession;
}

/**
 * Update session counters after an answer is submitted.
 */
export async function updateSessionAfterAnswer(
  sessionId: string,
  isCorrect: boolean,
  newLevel?: number,
): Promise<void> {
  const session = await db.query.assessmentSessions.findFirst({
    where: eq(assessmentSessions.id, sessionId),
  });

  if (!session) {
    throw new Error("Session not found");
  }

  const updates: Partial<AssessmentSession> = {
    total_answered: (session.total_answered ?? 0) + 1,
    total_correct: (session.total_correct ?? 0) + (isCorrect ? 1 : 0),
  };

  if (newLevel !== undefined) {
    updates.current_level = newLevel;
  }

  await db
    .update(assessmentSessions)
    .set(updates)
    .where(eq(assessmentSessions.id, sessionId));

  logger.debug(
    { session_id: sessionId, is_correct: isCorrect, new_level: newLevel },
    "Session updated after answer",
  );
}

/**
 * Mark session as completed with final level.
 */
export async function completeSession(
  sessionId: string,
  finalLevel: number,
): Promise<void> {
  await db
    .update(assessmentSessions)
    .set({
      status: "completed",
      final_level: finalLevel,
      completed_at: new Date(),
    })
    .where(eq(assessmentSessions.id, sessionId));

  logger.info({ session_id: sessionId, final_level: finalLevel }, "Session completed");
}

/**
 * Abandon a session (timeout or ellamaka session expired).
 * Per D-26: set status='abandoned'.
 */
export async function abandonSession(sessionId: string): Promise<void> {
  await db
    .update(assessmentSessions)
    .set({ status: "abandoned" })
    .where(eq(assessmentSessions.id, sessionId));

  logger.info({ session_id: sessionId }, "Session abandoned");
}

/**
 * Resume an abandoned session.
 * Per D-26: verify token, set status back to 'in_progress'.
 */
export async function resumeSession(token: string): Promise<AssessmentSession> {
  const payload = await verifyToken(token);

  const session = await db.query.assessmentSessions.findFirst({
    where: eq(assessmentSessions.id, payload.assessment_session_id),
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.status === "abandoned") {
    await db
      .update(assessmentSessions)
      .set({ status: "in_progress" })
      .where(eq(assessmentSessions.id, session.id));

    logger.info({ session_id: session.id }, "Session resumed from abandoned");
  }

  return session as AssessmentSession;
}

/**
 * Update evaluation text and recompute knowledge_stats.
 * Per D-04, D-27: save evaluation + aggregate stats from answers.
 */
export async function updateEvaluation(
  sessionId: string,
  evaluation: string,
): Promise<void> {
  const stats = await computeKnowledgeStats(sessionId);

  await db
    .update(assessmentSessions)
    .set({ evaluation, knowledge_stats: stats })
    .where(eq(assessmentSessions.id, sessionId));

  logger.info({ session_id: sessionId }, "Evaluation updated");
}