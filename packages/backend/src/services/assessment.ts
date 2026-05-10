/**
 * Assessment Service — Core assessment logic for adaptive testing.
 *
 * Uses random token + DB lookup for session identification.
 * Implements objective scoring, adaptive algorithm, question selection,
 * progress tracking, and session lifecycle.
 */

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
  config_question_limit: number;
  config_time_limit_min: number;
  started_at: string;
  elapsed_sec: number;
  remaining_questions: number;
  remaining_time_sec: number;
  knowledge_stats: Record<string, KnowledgeStat>;
  evaluation: string | null;
  status: string;
  done: boolean;
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
  current_question_id: string | null; // persisted active question — survives restart
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
// Token utilities
// ---------------------------------------------------------------------------

/**
 * Generate a short random token for assessment session identification.
 * Token is stored in DB and looked up on each request — no JWT overhead.
 */
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const token = Buffer.from(bytes).toString("base64url");
  logger.info({ token_prefix: token.slice(0, 4) }, "Assessment token generated");
  return token;
}

/**
 * Look up assessment session by token and return session metadata.
 * Verifies token exists in DB.
 * Per T-03-11-03: removed hard age-based expiry for resume paths.
 * Completed sessions still cannot accept new answers, but resume/progress works.
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  const [session] = await db
    .select({
      assessment_session_id: assessmentSessions.id,
      student_id: assessmentSessions.student_id,
      course_id: assessmentSessions.course_id,
      started_at: assessmentSessions.started_at,
    })
    .from(assessmentSessions)
    .where(eq(assessmentSessions.token, token))
    .limit(1);

  if (!session) throw new Error("Invalid assessment token");

  // Per T-03-11-03: removed 2h age expiry check — legitimate incomplete sessions
  // can resume regardless of age. Completed sessions are protected by status checks.

  return {
    assessment_session_id: session.assessment_session_id,
    student_id: session.student_id,
    course_id: session.course_id,
  };
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
 * Uses in-memory Map for fast lookup + persists to current_question_id in DB.
 * Per T-03-11-02: persist active question to survive server restart.
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

  // Persist to both in-memory map and DB
  currentQuestionLocks.set(sessionId, questionId);
  await db
    .update(assessmentSessions)
    .set({ current_question_id: questionId })
    .where(eq(assessmentSessions.id, sessionId));

  logger.info({ session_id: sessionId, question_id: questionId }, "Question locked");
}

/**
 * Get the currently locked question ID for a session (in-memory only).
 * Use getActiveQuestionId() for persisted fallback.
 */
export function getLockedQuestionId(sessionId: string): string | undefined {
  return currentQuestionLocks.get(sessionId);
}

/**
 * Get the active question ID for a session with DB fallback.
 * Checks in-memory map first, then falls back to current_question_id in DB.
 * Per T-03-11-02: ensures active question survives server restart.
 */
export async function getActiveQuestionId(sessionId: string): Promise<string | undefined> {
  // Fast path: check in-memory map first
  const locked = currentQuestionLocks.get(sessionId);
  if (locked) return locked;

  // Fallback: check persisted current_question_id in DB
  const session = await db.query.assessmentSessions.findFirst({
    where: eq(assessmentSessions.id, sessionId),
    columns: { current_question_id: true },
  });

  const persistedId = session?.current_question_id;
  if (persistedId) {
    // Rehydrate in-memory lock from persisted state
    currentQuestionLocks.set(sessionId, persistedId);
    logger.debug({ session_id: sessionId, question_id: persistedId }, "Rehydrated lock from DB");
  }

  return persistedId ?? undefined;
}

/**
 * Clear the locked question for a session (e.g., after answer submission).
 * Clears both in-memory map and DB field.
 */
export function unlockQuestion(sessionId: string): void {
  currentQuestionLocks.delete(sessionId);
  // Clear persisted field asynchronously (fire-and-forget)
  db.update(assessmentSessions)
    .set({ current_question_id: null })
    .where(eq(assessmentSessions.id, sessionId))
    .catch((err) =>
      logger.warn({ err, session_id: sessionId }, "Failed to clear current_question_id"),
    );
}

/**
 * Clear in-memory lock only (for testing process restart simulation).
 * NOT for production use — only clears memory, leaves DB persisted.
 */
export function clearMemoryLock(sessionId: string): void {
  currentQuestionLocks.delete(sessionId);
}

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

/**
 * Compute knowledge stats from assessment_answers aggregation.
 * Per D-27: GROUP BY knowledge_point, COUNT total, SUM correct.
 * Per Task 2: exclude is_correct=null rows from correctness aggregation.
 * SQLite SUM ignores NULL values naturally, so correct count only reflects scored rows.
 */
export async function computeKnowledgeStats(
  sessionId: string,
): Promise<Record<string, KnowledgeStat>> {
  // Raw aggregation query using Drizzle SQL
  const stats = await db
    .select({
      knowledge_point: assessmentAnswers.knowledge_point,
      total: count(),
      // SQLite SUM ignores NULL values — pending coding answers (is_correct=null)
      // are excluded from the correct count, preventing false negatives
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
 * Returns time tracking, remaining counts, and completion status.
 */
export async function getProgress(sessionId: string): Promise<ProgressData> {
  const session = await db.query.assessmentSessions.findFirst({
    where: eq(assessmentSessions.id, sessionId),
  });

  if (!session) {
    throw new Error("Session not found");
  }

  // Per T-03-11-04: treat empty {} as cache miss, recompute from answers
  const stats = (session.knowledge_stats && Object.keys(session.knowledge_stats).length > 0)
    ? session.knowledge_stats
    : await computeKnowledgeStats(sessionId);
  const configQuestionLimit = session.config_question_limit ?? DEFAULT_QUESTION_LIMIT;
  const configTimeLimitMin = session.config_time_limit_min ?? DEFAULT_TIME_LIMIT_MIN;
  const startedAt = new Date(session.started_at);
  const elapsedMs = Date.now() - startedAt.getTime();
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const totalSeconds = configTimeLimitMin * 60;
  const remainingTimeSec = Math.max(0, totalSeconds - elapsedSec);
  const totalAnswered = session.total_answered ?? 0;
  const remainingQuestions = Math.max(0, configQuestionLimit - totalAnswered);
  const done = session.status === "completed";

  return {
    current_level: session.current_level,
    total_answered: totalAnswered,
    total_correct: session.total_correct ?? 0,
    config_question_limit: configQuestionLimit,
    config_time_limit_min: configTimeLimitMin,
    started_at: startedAt.toISOString(),
    elapsed_sec: elapsedSec,
    remaining_questions: remainingQuestions,
    remaining_time_sec: remainingTimeSec,
    knowledge_stats: stats,
    evaluation: session.evaluation,
    status: session.status,
    done,
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
  const token = generateToken();

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
 * Per T-03-11-04: persist knowledge_stats before marking completed.
 * Per T-03-11-02: clear current_question_id on completion.
 */
export async function completeSession(
  sessionId: string,
  finalLevel: number,
): Promise<void> {
  // Compute and persist knowledge_stats before completion
  const stats = await computeKnowledgeStats(sessionId);

  await db
    .update(assessmentSessions)
    .set({
      status: "completed",
      final_level: finalLevel,
      knowledge_stats: stats,
      current_question_id: null,
      completed_at: new Date(),
    })
    .where(eq(assessmentSessions.id, sessionId));

  logger.info({ session_id: sessionId, final_level: finalLevel }, "Session completed");
}

/**
 * Update score and feedback for a coding answer.
 * Per Task 2: derive is_correct from score threshold (score >= 6 → correct).
 */
export async function updateAnswerScore(params: {
  sessionId: string;
  questionId: string;
  score: number;
  feedback: string;
}): Promise<void> {
  // Find the answer row
  const answer = await db.query.assessmentAnswers.findFirst({
    where: and(
      eq(assessmentAnswers.session_id, params.sessionId),
      eq(assessmentAnswers.question_id, params.questionId),
    ),
  });

  if (!answer) {
    throw new Error("Answer row not found for this session/question");
  }

  // Derive is_correct from score threshold (score >= 6 → correct)
  const isCorrect = params.score >= 6 ? 1 : 0;

  await db
    .update(assessmentAnswers)
    .set({
      score: params.score,
      feedback: params.feedback,
      is_correct: isCorrect,
    })
    .where(eq(assessmentAnswers.id, answer.id));

  logger.info(
    { session_id: params.sessionId, question_id: params.questionId, score: params.score, is_correct: isCorrect },
    "Coding answer scored",
  );
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

// ---------------------------------------------------------------------------
// Session history management (Task 1: list + delete)
// ---------------------------------------------------------------------------

export interface SessionSummary {
  id: string;
  token: string;
  status: string;
  start_level: number;
  current_level: number;
  final_level: number | null;
  total_answered: number;
  total_correct: number;
  started_at: Date | string;
  completed_at: Date | string | null;
}

/**
 * List all sessions for a student, sorted newest-first.
 * Per Task 1: return session summaries with token, status, levels, totals, timestamps.
 */
export async function listStudentSessions(studentId: string): Promise<SessionSummary[]> {
  const sessions = await db
    .select({
      id: assessmentSessions.id,
      token: assessmentSessions.token,
      status: assessmentSessions.status,
      start_level: assessmentSessions.start_level,
      current_level: assessmentSessions.current_level,
      final_level: assessmentSessions.final_level,
      total_answered: assessmentSessions.total_answered,
      total_correct: assessmentSessions.total_correct,
      started_at: assessmentSessions.started_at,
      completed_at: assessmentSessions.completed_at,
    })
    .from(assessmentSessions)
    .where(eq(assessmentSessions.student_id, studentId))
    .orderBy(sql`${assessmentSessions.started_at} DESC`);

  logger.debug(
    { student_id: studentId, session_count: sessions.length },
    "Student session history fetched",
  );

  return sessions as SessionSummary[];
}

/**
 * Delete a session owned by a specific student.
 * Per Task 1: verify ownership, delete answer rows, delete session row.
 * Per Task 1: return error if not owned by this student.
 */
export async function deleteStudentSession(params: {
  studentId: string;
  sessionId: string;
}): Promise<void> {
  // Verify session exists and is owned by this student
  const session = await db.query.assessmentSessions.findFirst({
    where: and(
      eq(assessmentSessions.id, params.sessionId),
      eq(assessmentSessions.student_id, params.studentId),
    ),
  });

  if (!session) {
    throw new Error("Session not found or not owned by this student");
  }

  // Delete all answer rows for this session
  await db
    .delete(assessmentAnswers)
    .where(eq(assessmentAnswers.session_id, params.sessionId));

  // Delete session row
  await db
    .delete(assessmentSessions)
    .where(eq(assessmentSessions.id, params.sessionId));

  logger.info(
    { session_id: params.sessionId, student_id: params.studentId },
    "Session and answers deleted",
  );
}