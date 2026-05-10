---
status: resolved
trigger: "题库中题目太少, 很多级别缺失, 无法测出用户真实编程水平和级别"
created: 2026-05-09T10:30:00Z
updated: 2026-05-09T10:35:00Z
---

## Current Focus
hypothesis: Seed data only contains levels 1-4, missing levels 5-8
test: Count questions per level in seed file
expecting: 4 questions per level 1-4, zero for 5-8
next_action: Report root cause (goal: find_root_cause_only)

## Symptoms
expected: 题库覆盖所有 1-8 级，题目数量充足，能准确测评用户真实水平
actual: 题库中题目太少，很多级别缺失，无法测出用户真实编程水平和级别
errors: No error messages, but empty candidate lists when requesting levels 5-8
reproduction: Test 6 in .planning/phases/03-测评定级智能体-测评界面/03-UAT.md
started: Discovered during UAT

## Eliminated
(None - hypothesis confirmed directly from evidence)

## Evidence
- timestamp: 2026-05-09T10:32:00Z
  checked: packages/backend/src/seed/assessment-questions.seed.ts
  found: QUESTIONS array contains exactly 16 questions (4 per level, L1-L4 only)
  implication: Levels 5-8 have zero seed questions

- timestamp: 2026-05-09T10:33:00Z
  checked: packages/backend/src/seed/assessment-questions.seed.ts (lines 41-270)
  found: Count per level: L1=4, L2=4, L3=4, L4=4, L5=0, L6=0, L7=0, L8=0
  implication: Half of the level range (5-8) is completely unseeded

- timestamp: 2026-05-09T10:34:00Z
  checked: packages/backend/src/services/assessment.ts getCandidates (line 232)
  found: Query filters by level: `eq(assessmentQuestions.level, level)` - returns empty for L5-L8
  implication: Agent requests candidates for level 5+ → gets empty array → cannot select questions

- timestamp: 2026-05-09T10:34:30Z
  checked: packages/backend/src/services/assessment.ts evaluateRound (line 177)
  found: Adaptive algorithm can advance to level 8: `Math.min(currentLevel + 1, 8)`
  implication: System allows advancing to L5-L8 but has no questions there

## Resolution
root_cause: Seed script only seeds 16 questions covering levels 1-4 (4 per level). Levels 5-8 have zero questions in the database. When the adaptive algorithm advances a student to level 5+, the getCandidates service returns an empty array because no questions exist at those levels.
fix: (not implemented - goal: find_root_cause_only)
verification: (not performed - goal: find_root_cause_only)
files_changed: []