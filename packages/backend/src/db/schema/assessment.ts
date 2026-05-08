import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// Type helpers for JSON columns
// ---------------------------------------------------------------------------

export interface LevelHistoryEntry {
  level: number;
  round: number;
  correct: number;
  total: number;
}

export interface KnowledgeStat {
  total: number;
  correct: number;
}

// ---------------------------------------------------------------------------
// assessment_sessions — tracks each assessment attempt by a student
// ---------------------------------------------------------------------------

export const assessmentSessions = sqliteTable("assessment_sessions", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  token: text().notNull().unique(),
  student_id: text().notNull(),
  course_id: text().notNull().default("cpp"),
  status: text().notNull().default("in_progress"), // in_progress | completed | abandoned
  start_level: integer().notNull(),
  current_level: integer().notNull(),
  final_level: integer(),
  ellamaka_session_id: text(),
  config_question_limit: integer().default(5),
  config_time_limit_min: integer().default(30),
  config_threshold_up: integer().default(3),
  config_threshold_down: integer().default(1),
  total_answered: integer().default(0),
  total_correct: integer().default(0),
  level_history: text({ mode: "json" }).$type<LevelHistoryEntry[]>(),
  knowledge_stats: text({ mode: "json" }).$type<Record<string, KnowledgeStat>>(),
  evaluation: text(),
  started_at: integer({ mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  completed_at: integer({ mode: "timestamp" }),
});

// ---------------------------------------------------------------------------
// assessment_answers — stores each answer within an assessment session
// ---------------------------------------------------------------------------

export const assessmentAnswers = sqliteTable("assessment_answers", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  session_id: text().notNull(),
  question_id: text().notNull(),
  question_order: integer().notNull(),
  student_answer: text().notNull(),
  is_correct: integer(), // 0=incorrect, 1=correct, null=not scored yet
  score: integer(), // 0-10 for coding questions
  feedback: text(),
  time_spent_sec: integer(),
  course_id: text().notNull(),
  level: integer().notNull(),
  knowledge_point: text().notNull(),
  question_type: text().notNull(), // "objective" | "coding"
  created_at: integer({ mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// assessment_questions — bank of questions for assessments
// ---------------------------------------------------------------------------

export const assessmentQuestions = sqliteTable("assessment_questions", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  course_id: text().notNull().default("cpp"),
  level: integer().notNull(),
  knowledge_point: text().notNull(),
  question_type: text().notNull(), // "objective" | "coding"
  difficulty: integer().default(1), // 1-5
  content: text().notNull(),
  answer: text().notNull(),
  explanation: text(),
  status: text().notNull().default("draft"), // draft | pending | active
  created_by: text().notNull().default("manual"), // manual | agent
  lance_id: text(),
  created_at: integer({ mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updated_at: integer({ mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

export const assessmentIndexes = {
  tokenIdx: index("asmt_token_idx").on(assessmentSessions.token),
  studentIdx: index("asmt_student_idx").on(assessmentSessions.student_id),
  statusIdx: index("asmt_status_idx").on(assessmentSessions.status),
  answerSessionIdx: index("asmt_answer_session_idx").on(
    assessmentAnswers.session_id,
  ),
  answerDuplicateIdx: index("asmt_answer_dup_idx").on(
    assessmentAnswers.session_id,
    assessmentAnswers.question_id,
  ),
  questionStatusIdx: index("asmt_q_status_idx").on(
    assessmentQuestions.status,
  ),
  questionCourseLevelIdx: index("asmt_q_course_level_idx").on(
    assessmentQuestions.course_id,
    assessmentQuestions.level,
  ),
};
