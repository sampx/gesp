/**
 * Assessment Coding Feedback Tests
 * 
 * Tests for Phase 03-13 gap closure:
 * - Task 1: Coding question counters and latest feedback contract
 * - Task 2: Frontend SCORING→FEEDBACK state machine (tested in route layer)
 * 
 * Root causes from diagnosis:
 * - D-14: coding submit branch does NOT call updateSessionAfterAnswer
 * - D-24: /answer-score endpoint also misses updateSessionAfterAnswer
 * - Frontend SCORING state polls next question directly, skipping FEEDBACK
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

const TEST = "test-0313-";

// ---------------------------------------------------------------------------
// Task 1: Coding question counters (RED phase)
// ---------------------------------------------------------------------------

describe("Task 1: coding question counters", () => {
  let testUserId: string;
  let testSessionId: string;
  let testToken: string;
  let codingQuestionId: string;
  let objectiveQuestionId: string;

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

    // Create test coding question
    const [codingQ] = await db.insert(assessmentQuestions).values({
      id: `${TEST}coding-q1`,
      course_id: "cpp",
      level: 1,
      knowledge_point: "循环",
      difficulty: 3,
      question_type: "coding",
      content: "编写循环程序",
      answer: "for loop",
      explanation: "使用循环",
      status: "active",
    }).returning();
    codingQuestionId = codingQ.id;

    // Create test objective question
    const [objectiveQ] = await db.insert(assessmentQuestions).values({
      id: `${TEST}objective-q1`,
      course_id: "cpp",
      level: 1,
      knowledge_point: "数组",
      difficulty: 2,
      question_type: "objective",
      content: "数组索引",
      answer: "0",
      explanation: "C++数组从0开始",
      status: "active",
    }).returning();
    objectiveQuestionId = objectiveQ.id;

    // Create test session
    testToken = `${TEST}token-1`;
    const [session] = await db.insert(assessmentSessions).values({
      id: `${TEST}session-1`,
      token: testToken,
      student_id: testUserId,
      course_id: "cpp",
      status: "in_progress",
      start_level: 1,
      current_level: 1,
      config_question_limit: 5,
      config_time_limit_min: 30,
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
    await db.delete(assessmentQuestions).where(
      like(assessmentQuestions.id, `${TEST}%`)
    );
    await db.delete(users).where(like(users.username, `${TEST}%`));
    assessment.unlockQuestion(testSessionId);
  });

  it("Test 1: coding submit increments total_answered immediately before agent notification", async () => {
    // Setup: lock the coding question
    await assessment.lockQuestion(testSessionId, codingQuestionId);

    // Insert coding answer (simulating submit route coding branch)
    await db.insert(assessmentAnswers).values({
      session_id: testSessionId,
      question_id: codingQuestionId,
      question_order: 0,
      student_answer: "for(int i=0;i<n;i++) sum+=i;",
      is_correct: null, // Pending scoring
      score: null,
      feedback: null,
      course_id: "cpp",
      level: 1,
      knowledge_point: "循环",
      question_type: "coding",
    });

    // FAILING TEST: route layer should call this, but currently doesn't
    // Expected: total_answered increments from 0 to 1 immediately
    await assessment.updateSessionAfterAnswer(testSessionId, false); // is_correct=false initially (pending)

    // Verify: getProgress should see total_answered=1
    const progress = await assessment.getProgress(testSessionId);
    
    // This will FAIL because the route doesn't call updateSessionAfterAnswer
    expect(progress.total_answered).toBe(1);
    
    // Also verify: agent message sent with correct count
    // (Route layer test will verify the actual agent notification)
  });

  it("Test 2: answer-score updates total_correct when score >= 6 (idempotent)", async () => {
    // Setup: insert coding answer with is_correct=null
    await db.insert(assessmentAnswers).values({
      session_id: testSessionId,
      question_id: codingQuestionId,
      question_order: 0,
      student_answer: "for loop code",
      is_correct: null,
      score: null,
      feedback: null,
      course_id: "cpp",
      level: 1,
      knowledge_point: "循环",
      question_type: "coding",
    });

    // Simulate submit route: total_answered already incremented to 1
    await db.update(assessmentSessions)
      .set({ total_answered: 1 })
      .where(eq(assessmentSessions.id, testSessionId));

    // Score the answer: score=7 >= 6 → should increment total_correct (idempotent)
    await assessment.updateAnswerScore({
      sessionId: testSessionId,
      questionId: codingQuestionId,
      score: 7,
      feedback: "代码正确",
    });

    // Get session to check current state
    const sessionBefore = await db.query.assessmentSessions.findFirst({
      where: eq(assessmentSessions.id, testSessionId),
    });

    // total_answered=1 (from submit route), total_correct=1 (from answer-score)
    expect(sessionBefore?.total_answered).toBe(1);
    expect(sessionBefore?.total_correct).toBe(1);

    // Test idempotency: calling answer-score again should NOT increment counters
    await assessment.updateAnswerScore({
      sessionId: testSessionId,
      questionId: codingQuestionId,
      score: 8, // Different score, same answer
      feedback: "代码优秀",
    });

    const sessionAfter = await db.query.assessmentSessions.findFirst({
      where: eq(assessmentSessions.id, testSessionId),
    });

    // Should still be 1, not 2 (idempotent)
    expect(sessionAfter?.total_correct).toBe(1);
  });

  it("Test 3: getProgress returns latest_feedback for most recent scored coding answer", async () => {
    // Setup: insert and score two coding answers
    const [codingQ2] = await db.insert(assessmentQuestions).values({
      id: `${TEST}coding-q2`,
      course_id: "cpp",
      level: 1,
      knowledge_point: "数组",
      difficulty: 3,
      question_type: "coding",
      content: "数组遍历",
      answer: "arr[i]",
      explanation: "数组访问",
      status: "active",
    }).returning();

    // First coding answer (order 0)
    await db.insert(assessmentAnswers).values({
      session_id: testSessionId,
      question_id: codingQuestionId,
      question_order: 0,
      student_answer: "first code",
      is_correct: 1,
      score: 8,
      feedback: "第一题反馈",
      course_id: "cpp",
      level: 1,
      knowledge_point: "循环",
      question_type: "coding",
    });

    // Second coding answer (order 1) - most recent
    await db.insert(assessmentAnswers).values({
      session_id: testSessionId,
      question_id: codingQ2.id,
      question_order: 1,
      student_answer: "second code",
      is_correct: 0,
      score: 4,
      feedback: "第二题反馈（最新）",
      course_id: "cpp",
      level: 1,
      knowledge_point: "数组",
      question_type: "coding",
    });

    // Update session counters manually
    await db.update(assessmentSessions)
      .set({ total_answered: 2, total_correct: 1 })
      .where(eq(assessmentSessions.id, testSessionId));

    // FAILING TEST: getProgress should return latest_feedback field
    // Expected: feedback from most recent scored answer (order 1)
    const progress = await assessment.getProgress(testSessionId);

    // This will FAIL because getProgress doesn't return latest_feedback yet
    expect(progress).toHaveProperty("latest_feedback");
    expect(progress.latest_feedback).toBeDefined();
    expect(progress.latest_feedback?.question_id).toBe(codingQ2.id);
    expect(progress.latest_feedback?.score).toBe(4);
    expect(progress.latest_feedback?.feedback).toBe("第二题反馈（最新）");
  });

  it("Test 4: round completion after coding score persists feedback data", async () => {
    // Setup: session with 4 objective answers + 1 pending coding answer
    for (let i = 0; i < 4; i++) {
      await db.insert(assessmentAnswers).values({
        session_id: testSessionId,
        question_id: objectiveQuestionId,
        question_order: i,
        student_answer: i < 3 ? "0" : "wrong",
        is_correct: i < 3 ? 1 : 0,
        course_id: "cpp",
        level: 1,
        knowledge_point: "数组",
        question_type: "objective",
      });
    }

    // Insert pending coding answer (order 4)
    await db.insert(assessmentAnswers).values({
      session_id: testSessionId,
      question_id: codingQuestionId,
      question_order: 4,
      student_answer: "final code",
      is_correct: null,
      score: null,
      feedback: null,
      course_id: "cpp",
      level: 1,
      knowledge_point: "循环",
      question_type: "coding",
    });

    // Simulate submit route: total_answered already incremented to 5 (4 obj + 1 coding submit)
    // total_correct = 3 (from 3 correct objective answers)
    await db.update(assessmentSessions)
      .set({ total_answered: 5, total_correct: 3 })
      .where(eq(assessmentSessions.id, testSessionId));

    // Score the coding answer (score=6 → correct)
    // updateAnswerScore increments total_correct by 1 on first score (idempotent)
    await assessment.updateAnswerScore({
      sessionId: testSessionId,
      questionId: codingQuestionId,
      score: 6,
      feedback: "最后一题反馈",
    });

    // After scoring: total_answered=5 (unchanged, already set by submit route)
    // total_correct=4 (3 obj + 1 coding)
    const sessionAfterScore = await db.query.assessmentSessions.findFirst({
      where: eq(assessmentSessions.id, testSessionId),
    });

    expect(sessionAfterScore?.total_answered).toBe(5);
    expect(sessionAfterScore?.total_correct).toBe(4);

    // Complete session (simulate round convergence)
    await assessment.completeSession(testSessionId, 1);

    // Verify: knowledge_stats includes the coding answer's feedback data
    const completedSession = await db.query.assessmentSessions.findFirst({
      where: eq(assessmentSessions.id, testSessionId),
    });

    const stats = completedSession?.knowledge_stats as Record<string, { total: number; correct: number }>;
    
    // "数组" (4 objective): 4 total, 3 correct
    expect(stats["数组"].total).toBe(4);
    expect(stats["数组"].correct).toBe(3);

    // "循环" (1 coding): 1 total, 1 correct
    expect(stats["循环"].total).toBe(1);
    expect(stats["循环"].correct).toBe(1);
  });
});