/**
 * Assessment Session Continuity Tests
 * 
 * Tests for Phase 03-11 gap closure:
 * - Task 1: Persist active question across process restart
 * - Task 2: Resume age relaxation + knowledge_stats persistence
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "../db";
import {
  assessmentSessions,
  assessmentAnswers,
  assessmentQuestions,
} from "../db/schema/assessment";
import { users } from "../db/schema/users";
import { eq, like } from "drizzle-orm";
import * as assessment from "../services/assessment";

const TEST = "test-0311-";

// ---------------------------------------------------------------------------
// Task 1: Active question persistence (RED phase)
// ---------------------------------------------------------------------------

describe("Task 1: active question persistence", () => {
  let testUserId: string;
  let testSessionId: string;
  let testToken: string;
  let testQuestionId: string;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(assessmentAnswers).where(
      like(assessmentAnswers.session_id, `${TEST}%`)
    );
    await db.delete(assessmentSessions).where(
      like(assessmentSessions.token, `${TEST}%`)
    );
    await db.delete(users).where(like(users.username, `${TEST}%`));

    // Create test user
    const [user] = await db.insert(users).values({
      username: `${TEST}user-1`,
      password_hash: "test",
      display_name: "Test User",
      role: 1,
      status: 1,
    }).returning();
    testUserId = user.id;

    // Get a test question
    const question = await db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.status, "active"),
    });
    if (!question) throw new Error("No active questions in DB");
    testQuestionId = question.id;

    // Create test session with token
    testToken = `${TEST}token-1`;
    const [session] = await db.insert(assessmentSessions).values({
      id: `${TEST}session-1`,
      token: testToken,
      student_id: testUserId,
      course_id: "cpp",
      status: "in_progress",
      start_level: 1,
      current_level: 1,
      total_answered: 0,
      total_correct: 0,
      started_at: new Date(),
    }).returning();
    testSessionId = session.id;
  });

  afterEach(async () => {
    // Clean up
    await db.delete(assessmentAnswers).where(
      like(assessmentAnswers.session_id, `${TEST}%`)
    );
    await db.delete(assessmentSessions).where(
      like(assessmentSessions.token, `${TEST}%`)
    );
    await db.delete(users).where(like(users.username, `${TEST}%`));
    assessment.unlockQuestion(testSessionId);
  });

  it("Test 1: clearing the in-memory lock map does not break submit lookup when session.current_question_id is still set", async () => {
    // Setup: lock question via service (writes to both memory + DB)
    await assessment.lockQuestion(testSessionId, testQuestionId);

    // Simulate process restart: clear in-memory lock
    assessment.unlockQuestion(testSessionId);

    // Verify: should fallback to DB-persisted current_question_id
    const activeId = await assessment.getActiveQuestionId(testSessionId);
    expect(activeId).toBe(testQuestionId);

    // Submit should work without "Question is not active" error
    // (This is tested via route layer, but service layer test verifies the helper)
  });

  it("Test 2: resume restores the previously active question instead of forcing a brand-new selection", async () => {
    // Setup: create session with current_question_id already set
    testToken = `${TEST}token-2`;
    const [session2] = await db.insert(assessmentSessions).values({
      id: `${TEST}session-2`,
      token: testToken,
      student_id: testUserId,
      course_id: "cpp",
      status: "in_progress",
      start_level: 1,
      current_level: 1,
      current_question_id: testQuestionId, // Pre-locked question
      total_answered: 0,
      total_correct: 0,
      started_at: new Date(),
    }).returning();

    // Resume: should rehydrate lock from DB
    const resumedSession = await assessment.resumeSession(testToken);

    // Verify: the pre-locked question is still active
    const activeId = await assessment.getActiveQuestionId(session2.id);
    expect(activeId).toBe(testQuestionId);
  });
});

// ---------------------------------------------------------------------------
// Task 2: Resume age check + knowledge stats (RED phase)
// ---------------------------------------------------------------------------

describe("Task 2: resume and knowledge stats", () => {
  let testUserId: string;
  let testSessionId: string;
  let testToken: string;
  let testQuestionId: string;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(assessmentAnswers).where(
      like(assessmentAnswers.session_id, `${TEST}%`)
    );
    await db.delete(assessmentSessions).where(
      like(assessmentSessions.token, `${TEST}%`)
    );
    await db.delete(users).where(like(users.username, `${TEST}%`));

    // Create test user
    const [user] = await db.insert(users).values({
      username: `${TEST}user-2`,
      password_hash: "test",
      display_name: "Test User 2",
      role: 1,
      status: 1,
    }).returning();
    testUserId = user.id;

    // Get a test question
    const question = await db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.status, "active"),
    });
    if (!question) throw new Error("No active questions in DB");
    testQuestionId = question.id;
  });

  afterEach(async () => {
    // Clean up
    await db.delete(assessmentAnswers).where(
      like(assessmentAnswers.session_id, `${TEST}%`)
    );
    await db.delete(assessmentSessions).where(
      like(assessmentSessions.token, `${TEST}%`)
    );
    await db.delete(users).where(like(users.username, `${TEST}%`));
    assessment.unlockQuestion(testSessionId);
  });

  it("Test 1: an incomplete session older than 2 hours can still resume and continue", async () => {
    // Setup: create session started 3 hours ago (beyond 2h expiry)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    testToken = `${TEST}token-old`;
    const [session] = await db.insert(assessmentSessions).values({
      id: `${TEST}session-old`,
      token: testToken,
      student_id: testUserId,
      course_id: "cpp",
      status: "in_progress",
      start_level: 1,
      current_level: 1,
      total_answered: 0,
      total_correct: 0,
      started_at: threeHoursAgo,
    }).returning();
    testSessionId = session.id;

    // Resume: should NOT fail with "Assessment session expired"
    const resumed = await assessment.resumeSession(testToken);
    expect(resumed.status).toBe("in_progress");
  });

  it("Test 2: completed sessions persist non-empty knowledge_stats even when completion happens through round convergence", async () => {
    // Setup: create session with answers
    testToken = `${TEST}token-stats`;
    const [session] = await db.insert(assessmentSessions).values({
      id: `${TEST}session-stats`,
      token: testToken,
      student_id: testUserId,
      course_id: "cpp",
      status: "in_progress",
      start_level: 1,
      current_level: 1,
      total_answered: 5,
      total_correct: 3,
      knowledge_stats: {}, // Empty initial
      started_at: new Date(),
    }).returning();
    testSessionId = session.id;

    // Insert answers (simulate round completion)
    const question = await db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.status, "active"),
    });
    if (!question) throw new Error("No active questions");

    for (let i = 0; i < 5; i++) {
      await db.insert(assessmentAnswers).values({
        session_id: testSessionId,
        question_id: question.id,
        question_order: i,
        student_answer: `answer-${i}`,
        is_correct: i < 3 ? 1 : 0, // 3 correct, 2 wrong
        course_id: "cpp",
        level: 1,
        knowledge_point: "test-kp",
        question_type: "objective",
      });
    }

    // Complete session (round convergence path)
    await assessment.completeSession(testSessionId, 1);

    // Verify: knowledge_stats should be computed and persisted
    const completedSession = await db.query.assessmentSessions.findFirst({
      where: eq(assessmentSessions.id, testSessionId),
    });

    expect(completedSession?.knowledge_stats).toBeDefined();
    expect(Object.keys(completedSession?.knowledge_stats ?? {}).length).toBeGreaterThan(0);

    // Verify stats correctness
    const stats = completedSession?.knowledge_stats as Record<string, { total: number; correct: number }>;
    expect(stats["test-kp"].total).toBe(5);
    expect(stats["test-kp"].correct).toBe(3);
  });

  it("Test 3: getProgress recomputes knowledge_stats when empty object is present", async () => {
    // Setup: session with empty knowledge_stats {} (truthy but invalid)
    testToken = `${TEST}token-progress`;
    const [session] = await db.insert(assessmentSessions).values({
      id: `${TEST}session-progress`,
      token: testToken,
      student_id: testUserId,
      course_id: "cpp",
      status: "in_progress",
      start_level: 1,
      current_level: 1,
      total_answered: 2,
      total_correct: 1,
      knowledge_stats: {}, // Empty but truthy
      started_at: new Date(),
    }).returning();
    testSessionId = session.id;

    // Insert answers
    const question = await db.query.assessmentQuestions.findFirst({
      where: eq(assessmentQuestions.status, "active"),
    });
    if (!question) throw new Error("No active questions");

    await db.insert(assessmentAnswers).values({
      session_id: testSessionId,
      question_id: question.id,
      question_order: 0,
      student_answer: "correct-answer",
      is_correct: 1,
      course_id: "cpp",
      level: 1,
      knowledge_point: "progress-kp",
      question_type: "objective",
    });

    // Get progress: should recompute from answers instead of returning empty {}
    const progress = await assessment.getProgress(testSessionId);

    expect(Object.keys(progress.knowledge_stats).length).toBeGreaterThan(0);
    expect(progress.knowledge_stats["progress-kp"].total).toBe(1);
    expect(progress.knowledge_stats["progress-kp"].correct).toBe(1);
  });
});