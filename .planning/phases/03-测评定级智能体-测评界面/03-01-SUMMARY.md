---
phase: 03-测评定级智能体-测评界面
plan: 01
subsystem: backend/assessment
tags:
  - database
  - schema
  - service
  - adaptive-algorithm
  - jwt
  - scoring
dependency_graph:
  requires: []
  provides:
    - assessment_sessions table
    - assessment_answers table
    - assessment_questions table
    - assessment service functions
  affects:
    - 03-02 (ellamaka client)
    - 03-03 (REST API routes)
    - 03-04 (seed questions)
    - 03-05 (frontend pages)
tech_stack:
  added:
    - Drizzle ORM (sqlite-core)
    - hono/jwt (HS256 signing)
    - pino logger
  patterns:
    - Pure exported functions (no class)
    - JSON columns with $type<T>
    - In-memory lock tracking
key_files:
  created:
    - packages/backend/src/db/schema/assessment.ts (124 lines)
    - packages/backend/src/services/assessment.ts (509 lines)
  modified:
    - packages/backend/src/db/schema/index.ts (+1 line)
decisions:
  - JWT 使用 HS256 算法（hono/jwt 要求显式指定）
  - 算法使用纯导出函数而非类（参考 auth.service.ts 模式）
  - Question lock 使用内存 Map 跟踪（仅持续一轮）
  - 知识统计通过 Drizzle SQL aggregation 实现
metrics:
  duration: 7 min
  tasks_completed: 3
  files_created: 2
  files_modified: 1
  lines_added: 633
  completed_date: "2026-05-08T05:40:32Z"
---

# Phase 03 Plan 01: Assessment Schema & Service Summary

**One-liner:** Drizzle schema (3 tables + indexes) and assessment service implementing adaptive algorithm, JWT token management, objective scoring, question selection, and session lifecycle.

## Completed Tasks

### Task 1: Create assessment Drizzle schema

- Created `packages/backend/src/db/schema/assessment.ts` with 3 SQLite table definitions:
  - `assessment_sessions`: 21 fields including token (UNIQUE), student_id, course_id, status, levels, config, counters, JSON columns for level_history and knowledge_stats, timestamps
  - `assessment_answers`: 13 fields including session_id, question_id, scoring fields (is_correct, score), knowledge_point, question_type, timestamps
  - `assessment_questions`: 14 fields including course_id, level, knowledge_point, content, answer, status, lance_id, timestamps
- Added 7 indexes for query optimization (token, student_id, status, session/knowledge_point duplicates, question status and course/level)
- Added `LevelHistoryEntry` and `KnowledgeStat` type helpers for JSON columns
- Updated `schema/index.ts` to re-export assessment module

**Commit:** c791d1b

### Task 2: Create assessment service

- Created `packages/backend/src/services/assessment.ts` with 13 exported functions:
  - **JWT utilities:** `generateToken`, `verifyToken` (hono/jwt with HS256, 2h expiry)
  - **Scoring:** `scoreObjectiveAnswer` (trim + lowercase comparison)
  - **Adaptive algorithm:** `evaluateRound` (advance/retreat/stay + convergence detection)
  - **Question selection:** `getCandidates` (SQL filtering + type rotation), `rotateType`, `lockQuestion`
  - **Progress tracking:** `getProgress`, `computeKnowledgeStats` (SQL aggregation)
  - **Session lifecycle:** `createAssessmentSession`, `updateSessionAfterAnswer`, `abandonSession`, `resumeSession`, `updateEvaluation`
- Implemented adaptive algorithm per D-07/D-08/D-09:
  - ≥3/5 correct → level+1 (bounded at 8)
  - ≤1/5 correct → level-1 (bounded at 1)
  - 2/5 → stay
  - Convergence: same level for 2 consecutive rounds → done=true
- Used pino logger with snake_case field names per backend AGENTS.md §6
- In-memory Map for question locks (session → questionId)

**Commit:** 82653ce

### Task 3: Push database schema to SQLite

- Ran `bun run db:push` — Drizzle Kit successfully pushed schema changes
- Verified 3 new tables exist in SQLite: `assessment_sessions`, `assessment_answers`, `assessment_questions`
- Checked schema structure — all fields and indexes present

**Verification:** `sqlite3 gesp.db ".tables" | grep -c assessment` → 3

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] File `packages/backend/src/db/schema/assessment.ts` exists (124 lines)
- [x] File `packages/backend/src/db/schema/index.ts` contains `export * from "./assessment"`
- [x] File `packages/backend/src/services/assessment.ts` exists (509 lines)
- [x] All 13 exported functions verified via grep
- [x] `bun run typecheck` passes with zero errors
- [x] SQLite contains 3 assessment tables
- [x] Commit c791d1b exists in git log
- [x] Commit 82653ce exists in git log

## Known Stubs

None - all data paths wired to database.

## Threat Flags

None - threat model mitigations implemented:
- T-03-01: JWT_SECRET from environment, dev fallback documented
- T-03-02: Token verification with hono/jwt, exp claim validated
- T-03-04: All queries use Drizzle ORM parameterized queries
- T-03-05: short_summary truncates content to 100 chars