/**
 * Assessment Session History Tests — Task 1 RED phase
 * 
 * Tests for listStudentSessions and deleteStudentSession contract:
 * - Test 1: listStudentSessions returns sessions sorted newest-first with all required fields
 * - Test 2: deleteStudentSession removes session and answer rows
 * - Test 3: ownership check prevents cross-student deletion
 */

import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db";
import { assessmentSessions, assessmentAnswers, assessmentQuestions } from "../db/schema/assessment";
import { users } from "../db/schema";
import { eq, and } from "drizzle-orm";
import * as assessment from "../services/assessment";

describe("Session History Service", () => {
  let studentId1: string;
  let studentId2: string;
  let sessionId1: string;
  let sessionId2: string;
  let questionId: string;

  beforeEach(async () => {
    // Clean up tables
    await db.delete(assessmentAnswers);
    await db.delete(assessmentSessions);
    await db.delete(assessmentQuestions);
    await db.delete(users);

    // Create test students
    const [student1] = await db.insert(users).values({
      username: "student-history-1",
      password_hash: "test-hash",
      display_name: "History Student 1",
      role: 1,
      status: 1,
    }).returning();
    studentId1 = student1.id;

    const [student2] = await db.insert(users).values({
      username: "student-history-2",
      password_hash: "test-hash",
      display_name: "History Student 2",
      role: 1,
      status: 1,
    }).returning();
    studentId2 = student2.id;

    // Create test question
    const [question] = await db.insert(assessmentQuestions).values({
      course_id: "cpp",
      level: 1,
      knowledge_point: "input-output",
      question_type: "objective",
      difficulty: 1,
      content: "Test question content",
      answer: "A",
      explanation: "Test explanation",
      status: "active",
    }).returning();
    questionId = question.id;

    // Create completed session for student1
    const completedAt = new Date(Date.now() - 1000 * 60 * 5); // 5 min ago
    const [session1] = await db.insert(assessmentSessions).values({
      student_id: studentId1,
      course_id: "cpp",
      token: "token-history-1",
      status: "completed",
      start_level: 1,
      current_level: 2,
      final_level: 2,
      config_question_limit: 5,
      config_time_limit_min: 30,
      total_answered: 5,
      total_correct: 4,
      started_at: new Date(Date.now() - 1000 * 60 * 30),
      completed_at: completedAt,
    }).returning();
    sessionId1 = session1.id;

    // Insert answer for session1
    await db.insert(assessmentAnswers).values({
      session_id: sessionId1,
      question_id: questionId,
      question_order: 0,
      student_answer: "A",
      is_correct: 1,
      course_id: "cpp",
      level: 1,
      knowledge_point: "input-output",
      question_type: "objective",
    });

    // Create in-progress session for student1 (newer)
    const [session2] = await db.insert(assessmentSessions).values({
      student_id: studentId1,
      course_id: "cpp",
      token: "token-history-2",
      status: "in_progress",
      start_level: 1,
      current_level: 1,
      config_question_limit: 5,
      config_time_limit_min: 30,
      total_answered: 1,
      total_correct: 0,
      started_at: new Date(Date.now() - 1000 * 60 * 2),
    }).returning();
    sessionId2 = session2.id;
  });

  describe("listStudentSessions", () => {
    it("Test 1: returns sessions sorted newest-first with required fields", async () => {
      const sessions = await assessment.listStudentSessions(studentId1);

      expect(sessions.length).toBe(2);
      
      // Newest-first ordering
      expect(sessions[0].id).toBe(sessionId2);
      expect(sessions[1].id).toBe(sessionId1);

      // All required fields present
      const firstSession = sessions[0];
      expect(firstSession.token).toBe("token-history-2");
      expect(firstSession.status).toBe("in_progress");
      expect(firstSession.start_level).toBe(1);
      expect(firstSession.current_level).toBe(1);
      expect(firstSession.final_level).toBeNull();
      expect(firstSession.total_answered).toBe(1);
      expect(firstSession.total_correct).toBe(0);
      expect(firstSession.started_at).toBeDefined();
      expect(firstSession.completed_at).toBeNull();

      const secondSession = sessions[1];
      expect(secondSession.status).toBe("completed");
      expect(secondSession.final_level).toBe(2);
      expect(secondSession.total_answered).toBe(5);
      expect(secondSession.total_correct).toBe(4);
      expect(secondSession.completed_at).toBeDefined();
    });

    it("returns empty array for student with no sessions", async () => {
      const sessions = await assessment.listStudentSessions(studentId2);
      expect(sessions.length).toBe(0);
    });
  });

  describe("deleteStudentSession", () => {
    it("Test 2: deletes session and all its answer rows", async () => {
      await assessment.deleteStudentSession({ studentId: studentId1, sessionId: sessionId1 });

      // Verify session deleted
      const deletedSession = await db.query.assessmentSessions.findFirst({
        where: eq(assessmentSessions.id, sessionId1),
      });
      expect(deletedSession).toBeUndefined();

      // Verify answers deleted
      const answers = await db.query.assessmentAnswers.findMany({
        where: eq(assessmentAnswers.session_id, sessionId1),
      });
      expect(answers.length).toBe(0);

      // Verify other session still exists
      const otherSession = await db.query.assessmentSessions.findFirst({
        where: eq(assessmentSessions.id, sessionId2),
      });
      expect(otherSession).toBeDefined();
    });

    it("Test 3: prevents cross-student deletion", async () => {
      // Student2 tries to delete student1's session
      await expect(
        assessment.deleteStudentSession({ studentId: studentId2, sessionId: sessionId1 })
      ).rejects.toThrow("Session not found or not owned by this student");

      // Verify session still exists
      const session = await db.query.assessmentSessions.findFirst({
        where: eq(assessmentSessions.id, sessionId1),
      });
      expect(session).toBeDefined();
    });

    it("throws error for non-existent session", async () => {
      await expect(
        assessment.deleteStudentSession({ studentId: studentId1, sessionId: "non-existent-id" })
      ).rejects.toThrow("Session not found or not owned by this student");
    });
  });
});