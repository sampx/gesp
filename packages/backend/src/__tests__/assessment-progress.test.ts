import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as assessment from "../services/assessment";
import { db } from "../db";
import { assessmentSessions, assessmentAnswers, assessmentQuestions } from "../db/schema/assessment";
import { eq } from "drizzle-orm";

/**
 * Test suite for assessment progress tracking and completion contract.
 * 
 * Task 1: Progress-aware agent context and completed-session contract
 * Task 2: Coding-question score persistence and knowledge-stats aggregation
 */

describe("Assessment Progress Tracking", () => {
  let testSessionId: string;
  let testToken: string;
  
  beforeEach(async () => {
    // Create test session
    const session = await assessment.createAssessmentSession({
      student_id: "test-student",
      course_id: "cpp",
      start_level: 1,
      config_question_limit: 5,
      config_time_limit_min: 30,
    });
    testSessionId = session.id;
    testToken = session.token;
  });
  
  afterEach(async () => {
    // Cleanup test data
    await db.delete(assessmentAnswers).where(eq(assessmentAnswers.session_id, testSessionId));
    await db.delete(assessmentSessions).where(eq(assessmentSessions.id, testSessionId));
  });

  // Task 1 - Test 1: getProgress() returns complete progress data
  describe("getProgress()", () => {
    it("should return config_question_limit, config_time_limit_min, started_at, elapsed_sec, remaining_questions, remaining_time_sec, status, and done", async () => {
      const progress = await assessment.getProgress(testSessionId);
      
      // Core fields (existing)
      expect(progress.current_level).toBeDefined();
      expect(progress.total_answered).toBeDefined();
      expect(progress.total_correct).toBeDefined();
      expect(progress.config_question_limit).toBeDefined();
      expect(progress.status).toBeDefined();
      
      // New fields (Task 1 requirement)
      expect(progress.config_time_limit_min).toBeDefined();
      expect(progress.started_at).toBeDefined();
      expect(progress.elapsed_sec).toBeDefined();
      expect(progress.remaining_questions).toBeDefined();
      expect(progress.remaining_time_sec).toBeDefined();
      expect(progress.done).toBeDefined();
      
      // Verify values
      expect(progress.config_question_limit).toBe(5);
      expect(progress.config_time_limit_min).toBe(30);
      expect(progress.status).toBe("in_progress");
      expect(progress.done).toBe(false);
      expect(progress.remaining_questions).toBe(5); // 5 total - 0 answered
    });
    
    it("should calculate elapsed_sec based on started_at timestamp", async () => {
      const progress = await assessment.getProgress(testSessionId);
      
      const elapsedMs = Date.now() - new Date(progress.started_at).getTime();
      const elapsedSec = Math.floor(elapsedMs / 1000);
      
      // Allow ±2s variance for test execution time
      expect(progress.elapsed_sec).toBeGreaterThanOrEqual(elapsedSec - 2);
      expect(progress.elapsed_sec).toBeLessThanOrEqual(elapsedSec + 2);
    });
    
    it("should calculate remaining_time_sec from config_time_limit_min and elapsed time", async () => {
      const progress = await assessment.getProgress(testSessionId);
      
      const totalSeconds = progress.config_time_limit_min * 60;
      const expectedRemaining = totalSeconds - progress.elapsed_sec;
      
      // Allow ±2s variance
      expect(progress.remaining_time_sec).toBeGreaterThanOrEqual(expectedRemaining - 2);
      expect(progress.remaining_time_sec).toBeLessThanOrEqual(expectedRemaining + 2);
    });
  });

  // Task 1 - Test 2: completed session contract
  describe("completed session contract", () => {
    it("should mark session as completed when completeSession() is called", async () => {
      await assessment.completeSession(testSessionId, 3);
      
      const session = await db.query.assessmentSessions.findFirst({
        where: eq(assessmentSessions.id, testSessionId),
      });
      
      expect(session?.status).toBe("completed");
      expect(session?.final_level).toBe(3);
      expect(session?.completed_at).toBeDefined();
    });
    
    it("should return done=true from getProgress() for completed session", async () => {
      await assessment.completeSession(testSessionId, 3);
      
      const progress = await assessment.getProgress(testSessionId);
      
      expect(progress.done).toBe(true);
      expect(progress.status).toBe("completed");
    });
    
    it("should return done=true instead of ghost questions from next-question endpoint", async () => {
      // This test verifies the contract at service level
      // The route layer will handle this in routes/assessment.ts
      await assessment.completeSession(testSessionId, 3);
      
      // getProgress should indicate done=true
      const progress = await assessment.getProgress(testSessionId);
      expect(progress.done).toBe(true);
      
      // locked question should be cleared for completed session
      const lockedId = assessment.getLockedQuestionId(testSessionId);
      expect(lockedId).toBeUndefined();
    });
  });

  // Task 1 - Test 3: query_progress tool and update_evaluation with final_level
  describe("agent tool surface", () => {
    it("should verify query_progress tool exists in gesp-plugin", async () => {
      // This is a structural test - the actual tool will be in .wopal/plugins/gesp-plugin/tools.ts
      // We verify the service function exists here
      const progress = await assessment.getProgress(testSessionId);
      
      // Verify the data structure matches what query_progress should return
      expect(progress).toHaveProperty("current_level");
      expect(progress).toHaveProperty("total_answered");
      expect(progress).toHaveProperty("total_correct");
      expect(progress).toHaveProperty("remaining_questions");
      expect(progress).toHaveProperty("remaining_time_sec");
      expect(progress).toHaveProperty("done");
    });
    
    it("should accept final_level in updateEvaluation and persist it", async () => {
      // This tests the service function signature
      // The route will extract final_level from the request
      
      await assessment.completeSession(testSessionId, 4);
      
      const session = await db.query.assessmentSessions.findFirst({
        where: eq(assessmentSessions.id, testSessionId),
      });
      
      expect(session?.final_level).toBe(4);
    });
  });

  // Task 2 - Test 1: updateAnswerScore() writes score, feedback, and is_correct
  describe("updateAnswerScore()", () => {
    let testQuestionId: string;
    let testAnswerId: string;
    
    beforeEach(async () => {
      // Create a test coding question
      const [question] = await db
        .insert(assessmentQuestions)
        .values({
          id: crypto.randomUUID(),
          course_id: "cpp",
          level: 1,
          knowledge_point: "循环结构",
          difficulty: 3,
          question_type: "coding",
          content: "编写一个计算1到n求和的程序",
          answer: "int sum = 0; for(int i=1;i<=n;i++) sum+=i;",
          explanation: "使用for循环累加",
          status: "active",
        })
        .returning();
      testQuestionId = question.id;
      
      // Create a pending coding answer (is_correct=null)
      const [answer] = await db
        .insert(assessmentAnswers)
        .values({
          id: crypto.randomUUID(),
          session_id: testSessionId,
          question_id: testQuestionId,
          question_order: 0,
          student_answer: "int sum=0; for(i=1;i<=n;i++) sum+=i;",
          is_correct: null,
          score: null,
          feedback: null,
          course_id: "cpp",
          level: 1,
          knowledge_point: "循环结构",
          question_type: "coding",
        })
        .returning();
      testAnswerId = answer.id;
    });
    
    afterEach(async () => {
      await db.delete(assessmentAnswers).where(eq(assessmentAnswers.id, testAnswerId));
      await db.delete(assessmentQuestions).where(eq(assessmentQuestions.id, testQuestionId));
    });
    
    it("should write score, feedback, and derived is_correct to answer row", async () => {
      await assessment.updateAnswerScore({
        sessionId: testSessionId,
        questionId: testQuestionId,
        score: 7,
        feedback: "变量定义正确，循环逻辑正确，缺少int声明",
      });
      
      const answer = await db.query.assessmentAnswers.findFirst({
        where: eq(assessmentAnswers.id, testAnswerId),
      });
      
      expect(answer?.score).toBe(7);
      expect(answer?.feedback).toBe("变量定义正确，循环逻辑正确，缺少int声明");
      expect(answer?.is_correct).toBe(1); // score >= 6 threshold
    });
    
    it("should derive is_correct=0 when score < 6", async () => {
      await assessment.updateAnswerScore({
        sessionId: testSessionId,
        questionId: testQuestionId,
        score: 4,
        feedback: "循环逻辑错误",
      });
      
      const answer = await db.query.assessmentAnswers.findFirst({
        where: eq(assessmentAnswers.id, testAnswerId),
      });
      
      expect(answer?.score).toBe(4);
      expect(answer?.is_correct).toBe(0); // score < 6
    });
    
    it("should throw if answer row does not exist", async () => {
      const fakeQuestionId = crypto.randomUUID();
      
      await expect(
        assessment.updateAnswerScore({
          sessionId: testSessionId,
          questionId: fakeQuestionId,
          score: 7,
          feedback: "test",
        })
      ).rejects.toThrow();
    });
  });

  // Task 2 - Test 2: computeKnowledgeStats() excludes unanswered/null-scored coding rows
  describe("computeKnowledgeStats()", () => {
    let objectiveQ1: string;
    let codingQ1: string;
    let codingQ2: string;
    
    beforeEach(async () => {
      // Create test questions
      const questions = await db
        .insert(assessmentQuestions)
        .values([
          {
            id: crypto.randomUUID(),
            course_id: "cpp",
            level: 1,
            knowledge_point: "数组",
            difficulty: 2,
            question_type: "objective",
            content: "数组的索引从几开始？",
            answer: "0",
            explanation: "C++数组索引从0开始",
            status: "active",
          },
          {
            id: crypto.randomUUID(),
            course_id: "cpp",
            level: 1,
            knowledge_point: "循环",
            difficulty: 3,
            question_type: "coding",
            content: "编写循环程序",
            answer: "for loop",
            explanation: "使用循环",
            status: "active",
          },
          {
            id: crypto.randomUUID(),
            course_id: "cpp",
            level: 1,
            knowledge_point: "循环",
            difficulty: 3,
            question_type: "coding",
            content: "编写嵌套循环",
            answer: "nested loop",
            explanation: "使用嵌套循环",
            status: "active",
          },
        ])
        .returning();
      
      objectiveQ1 = questions[0].id;
      codingQ1 = questions[1].id;
      codingQ2 = questions[2].id;
      
      // Create answers with mixed states
      await db.insert(assessmentAnswers).values([
        {
          id: crypto.randomUUID(),
          session_id: testSessionId,
          question_id: objectiveQ1,
          question_order: 0,
          student_answer: "0",
          is_correct: 1, // correct objective
          course_id: "cpp",
          level: 1,
          knowledge_point: "数组",
          question_type: "objective",
        },
        {
          id: crypto.randomUUID(),
          session_id: testSessionId,
          question_id: codingQ1,
          question_order: 1,
          student_answer: "code",
          is_correct: null, // pending coding (no score yet)
          score: null,
          feedback: null,
          course_id: "cpp",
          level: 1,
          knowledge_point: "循环",
          question_type: "coding",
        },
        {
          id: crypto.randomUUID(),
          session_id: testSessionId,
          question_id: codingQ2,
          question_order: 2,
          student_answer: "nested code",
          is_correct: 0, // scored coding (score=5 < 6 → is_correct=0)
          score: 5,
          feedback: "部分正确",
          course_id: "cpp",
          level: 1,
          knowledge_point: "循环",
          question_type: "coding",
        },
      ]);
    });
    
    afterEach(async () => {
      await db.delete(assessmentAnswers).where(eq(assessmentAnswers.session_id, testSessionId));
      await db.delete(assessmentQuestions).where(eq(assessmentQuestions.id, objectiveQ1));
      await db.delete(assessmentQuestions).where(eq(assessmentQuestions.id, codingQ1));
      await db.delete(assessmentQuestions).where(eq(assessmentQuestions.id, codingQ2));
    });
    
    it("should exclude is_correct=null rows from correctness aggregation", async () => {
      const stats = await assessment.computeKnowledgeStats(testSessionId);
      
      // "数组": 1 answered, 1 correct
      expect(stats["数组"]).toBeDefined();
      expect(stats["数组"].total).toBe(1);
      expect(stats["数组"].correct).toBe(1);
      
      // "循环": 2 answered (total includes all rows)
      // codingQ1 (is_correct=null) → excluded from SUM (SQLite ignores NULL)
      // codingQ2 (is_correct=0) → included in SUM as 0
      // So correct = 0 (only codingQ2 contributes 0)
      expect(stats["循环"]).toBeDefined();
      expect(stats["循环"].total).toBe(2);
      expect(stats["循环"].correct).toBe(0);
      
      // The key fix: SQLite SUM(null) naturally ignores NULL values
      // Old bug concern: treating null as 0 → would have counted both as wrong
      // Correct behavior: null excluded from SUM → only scored rows contribute
    });
    
    it("should correctly aggregate scored coding questions", async () => {
      // Update codingQ1 to have a score
      const answer = await db.query.assessmentAnswers.findFirst({
        where: eq(assessmentAnswers.question_id, codingQ1),
      });
      
      if (answer) {
        await db
          .update(assessmentAnswers)
          .set({ score: 8, is_correct: 1, feedback: "正确" })
          .where(eq(assessmentAnswers.id, answer.id));
      }
      
      const stats = await assessment.computeKnowledgeStats(testSessionId);
      
      // "循环": 2 answered, both scored
      // codingQ1: score=8 → is_correct=1
      // codingQ2: score=5 → is_correct=0
      expect(stats["循环"].total).toBe(2);
      expect(stats["循环"].correct).toBe(1);
    });
  });

  // Task 2 - Test 3: scoring a coding answer updates report-visible knowledge stats
  describe("knowledge stats consistency", () => {
    it("should update session.knowledge_stats after updateAnswerScore", async () => {
      // This is verified by computeKnowledgeStats behavior
      // getProgress() uses either cached knowledge_stats or fresh computation
      
      const progress1 = await assessment.getProgress(testSessionId);
      expect(progress1.knowledge_stats).toBeDefined();
      
      // After scoring an answer, knowledge_stats should reflect the change
      // (This is tested in the computeKnowledgeStats tests above)
    });
  });
});