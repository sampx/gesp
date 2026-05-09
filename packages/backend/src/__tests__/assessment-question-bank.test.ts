/**
 * Assessment Question Bank Coverage Test
 *
 * Validates that the question bank satisfies the round-size invariant:
 * - Algorithm uses DEFAULT_QUESTION_LIMIT = 5 questions per round
 * - Bank must provide 5 questions per level to support one full round
 * - Type ratio must match DEFAULT_TYPE_RATIO = { objective: 3, coding: 2 }
 *
 * Requirements: ASSESS-02, D-16
 */

import { describe, it, expect } from "vitest";
import { ASSESSMENT_QUESTIONS } from "../seed/assessment-questions.seed";

describe("Assessment Question Bank Coverage", () => {
  it("should contain levels 1 through 8 with no gaps", () => {
    const levels = new Set(ASSESSMENT_QUESTIONS.map((q) => q.level));
    
    // Check levels 1-8 exist
    for (let level = 1; level <= 8; level++) {
      expect(levels.has(level), `Level ${level} should exist in question bank`).toBe(true);
    }
    
    // Check no extra levels
    expect(levels.size, "Should have exactly 8 levels").toBe(8);
  });

  it("should have exactly 5 active questions per level", () => {
    const levelCounts: Record<number, number> = {};
    
    for (const q of ASSESSMENT_QUESTIONS) {
      if (q.status === "active") {
        levelCounts[q.level] = (levelCounts[q.level] || 0) + 1;
      }
    }
    
    for (let level = 1; level <= 8; level++) {
      expect(
        levelCounts[level],
        `Level ${level} should have exactly 5 active questions for one full assessment round`
      ).toBe(5);
    }
  });

  it("should have 3 objective and 2 coding questions per level", () => {
    const levelTypeCounts: Record<number, { objective: number; coding: number }> = {};
    
    for (const q of ASSESSMENT_QUESTIONS) {
      if (q.status === "active") {
        if (!levelTypeCounts[q.level]) {
          levelTypeCounts[q.level] = { objective: 0, coding: 0 };
        }
        if (q.question_type === "objective" || q.question_type === "coding") {
          levelTypeCounts[q.level][q.question_type]++;
        }
      }
    }
    
    for (let level = 1; level <= 8; level++) {
      const counts = levelTypeCounts[level];
      expect(
        counts?.objective ?? 0,
        `Level ${level} should have 3 objective questions (per D-16 type ratio)`
      ).toBe(3);
      expect(
        counts?.coding ?? 0,
        `Level ${level} should have 2 coding questions (per D-16 type ratio)`
      ).toBe(2);
    }
  });

  it("should have non-empty knowledge_point, content, answer, and explanation for every question", () => {
    for (const q of ASSESSMENT_QUESTIONS) {
      expect(q.knowledge_point, "knowledge_point should not be empty").toBeTruthy();
      expect(q.content, "content should not be empty").toBeTruthy();
      expect(q.answer, "answer should not be empty").toBeTruthy();
      expect(q.explanation, "explanation should not be empty").toBeTruthy();
      
      // Check they are actual strings, not placeholders
      expect(typeof q.knowledge_point).toBe("string");
      expect(typeof q.content).toBe("string");
      expect(typeof q.answer).toBe("string");
      expect(typeof q.explanation).toBe("string");
      
      // Check not placeholder text
      expect(q.content.toLowerCase()).not.toContain("placeholder");
      expect(q.content.toLowerCase()).not.toContain("todo");
      expect(q.content.toLowerCase()).not.toContain("coming soon");
      expect(q.content.toLowerCase()).not.toContain("future");
    }
  });
});