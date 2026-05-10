---
status: diagnosed
trigger: "学员测评中途退出后重新进入测评界面，看不到之前的历次测评，无法继续未完成的测评，每次测评都重新开始。也没有测评状态显示。"
created: 2026-05-09T17:00:00Z
updated: 2026-05-09T17:00:00Z
---

## Current Focus

hypothesis: Session history feature is entirely missing across all three layers (backend endpoint, frontend API function, UI component)
test: Verified each layer has no support for listing/querying past sessions
expecting: All three layers confirmed to have no session history capability
next_action: return diagnosis

## Symptoms

expected: 学员可查看历次测评记录（带状态：进行中/已完成/已放弃），选择未完成的测评继续（复用 ellamaka 会话恢复进度），也可删除测评。
actual: 每次进入测评界面只能创建新测评，看不到任何历次记录，无法恢复未完成测评。
errors: 无报错，功能完全缺失。
reproduction: 登录学员账号，访问 /student/assessment，只看到"开始测评"表单，无历史列表。
started: 功能从未实现。

## Eliminated

(none needed — root cause confirmed on first hypothesis)

## Evidence

- timestamp: 2026-05-09T17:00:00Z
  checked: apps/web/src/app/student/assessment/page.tsx (frontend start page)
  found: Component only renders "开始测评" form with level slider + start button. NO fetch/query for existing sessions. NO list/history UI component. Pure "create new" form.
  implication: Frontend has zero session history display capability.

- timestamp: 2026-05-09T17:00:00Z
  checked: apps/web/src/lib/server-api.ts (frontend server API functions)
  found: Has startAssessment, submitAnswer, getNextQuestion, getAssessmentProgress, resumeAssessment — but NO function to list sessions (e.g., getAssessmentHistory, listStudentSessions). resumeAssessment exists but requires a token the user cannot discover.
  implication: No frontend API bridge to query session history from backend.

- timestamp: 2026-05-09T17:00:00Z
  checked: packages/backend/src/routes/assessment.ts (backend routes)
  found: Endpoints exist for: POST /start, POST /submit, GET /next-question, GET /progress, POST /resume, GET /:token/chat-state, GET /:token/stream, POST /candidates, POST /select, POST /evaluate, POST /:token/chat. NO endpoint for listing sessions (e.g., GET /sessions, GET /history, GET /student/:id/sessions). POST /resume requires token in body — no way to discover tokens.
  implication: Backend API has no session list/history endpoint.

- timestamp: 2026-05-09T17:00:00Z
  checked: packages/backend/src/services/assessment.ts (backend service)
  found: Functions for create, complete, abandon, resume, getProgress, updateEvaluation. NO listSessions, getStudentSessions, or similar function to query sessions by student_id.
  implication: Service layer has no session history query function.

- timestamp: 2026-05-09T17:00:00Z
  checked: packages/backend/src/db/schema/assessment.ts (database schema)
  found: assessmentSessions table HAS all required fields: student_id (line 28), status with values "in_progress"|"completed"|"abandoned" (line 30), started_at, completed_at timestamps, token. Index studentIdx on student_id exists (line 108).
  implication: Database schema FULLY SUPPORTS session history queries — the data layer is ready, the application layers just never use it.

## Resolution

root_cause: Complete feature gap across all three application layers. The "session history listing" capability was never implemented. Specifically: (1) Backend has no GET endpoint to list sessions by student_id, despite the DB schema fully supporting it with status/student_id fields and indexes. (2) Frontend server-api.ts has no function to fetch session lists. (3) Frontend start page (page.tsx) only renders a "start new assessment" form with zero history display. The resume mechanism (POST /resume) exists but is unreachable because there's no way for users to discover their past session tokens.

fix: (not implementing — find_root_cause_only mode)
verification: (not applicable)
files_changed: []
