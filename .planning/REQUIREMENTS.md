# Requirements: GESP C++ 智能学习系统

**Defined:** 2026-04-22
**Core Value:** AI 全流程自动化 — 测评定级、教学讲解、练习判题全部由 AI 智能体驱动

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: Student can register with username and password
- [ ] **AUTH-02**: Student can login and stay logged in across sessions
- [ ] **AUTH-03**: Admin can login with username and password
- [ ] **AUTH-04**: Admin session persists with longer TTL (24h vs 1h for students)

### Assessment Agent (测评定级智能体)

- [ ] **ASSESS-01**: System generates adaptive assessment questions based on student level
- [ ] **ASSESS-02**: Questions cover GESP 1-4 curriculum scope (defined topics per level)
- [ ] **ASSESS-03**: System auto-grades student answers (objective + coding questions)
- [ ] **ASSESS-04**: System determines student starting level after initial assessment (5-10 questions)
- [ ] **ASSESS-05**: Assessment progress is saved incrementally (supports resume after interruption)

### Teaching Agent (教学讲解智能体)

- [ ] **TEACH-01**: System generates structured knowledge point explanations with code examples
- [ ] **TEACH-02**: Explanations use youth-friendly language with life analogies (趣味性)
- [ ] **TEACH-03**: System generates ASCII diagrams or Mermaid charts for visualization
- [ ] **TEACH-04**: Student can ask follow-up questions during lesson (interactive Q&A via SSE)
- [ ] **TEACH-05**: Teaching content references official GESP curriculum accuracy

### Practice Agent (练习出题判题智能体)

- [ ] **PRAC-01**: System generates practice questions matching student's current level
- [ ] **PRAC-02**: Student can submit code answers via web interface
- [ ] **PRAC-03**: System analyzes submitted code and determines correctness (AI模拟判题)
- [ ] **PRAC-04**: System classifies error types (syntax/logic/algorithm errors)
- [ ] **PRAC-05**: System provides specific improvement suggestions with code location hints
- [ ] **PRAC-06**: System recommends similar practice questions based on weakness patterns

### Progress Tracking

- [ ] **PROG-01**: Student can view personal learning dashboard (level, progress, recent activity)
- [ ] **PROG-02**: System tracks learning time per session
- [ ] **PROG-03**: System identifies student's knowledge weaknesses based on practice history
- [ ] **PROG-04**: Student can view progress visualization (charts for completion rate)

### Knowledge Base

- [ ] **KNOW-01**: System stores GESP 1-4 curriculum outline as structured data
- [ ] **KNOW-02**: System stores past exam questions with metadata (level, topic, difficulty)
- [ ] **KNOW-03**: System provides vector search for knowledge points and questions (LanceDB)
- [ ] **KNOW-04**: Admin can view and edit knowledge base content
- [ ] **KNOW-05**: Admin can add new questions with proper metadata tagging

### Admin Dashboard

- [ ] **ADMIN-01**: Admin can view list of all students with search and filter
- [ ] **ADMIN-02**: Admin can view individual student learning data and progress
- [ ] **ADMIN-03**: Admin can view aggregate statistics (total students, completion rates)
- [ ] **ADMIN-04**: Admin can manage system configuration (AI provider settings)

## v2 Requirements (Deferred)

### Enhanced Authentication

- **AUTH-05**: OAuth login (WeChat/QQ) for students
- **AUTH-06**: Parent account linkage to view child progress

### Gamification

- **GAME-01**: Achievement badges for completing milestones
- **GAME-02**: Daily streak tracking and rewards
- **GAME-03**: Leaderboard for practice performance

### Voice/Video Teaching

- **TEACH-06**: AI virtual human voice synthesis for explanations
- **TEACH-07**: Animated video generation for key concepts

### Real Code Execution

- **PRAC-07**: Real sandbox execution for submitted code (timeout, memory limits)
- **PRAC-08**: Step-by-step grading with partial credit

### Advanced Analytics

- **PROG-05**: Printable PDF study reports
- **PROG-06**: Parent progress notification emails
- **PROG-07**: Exam readiness prediction algorithm

### System Iteration

- **ITER-01**: System auto-analyzes aggregate learning data periodically
- **ITER-02**: System suggests knowledge base updates to admin
- **ITER-03**: Admin can approve/reject system suggestions with one-click

### Multi-Admin Roles

- **ADMIN-05**: Role-based access control (super admin, content admin, viewer)
- **ADMIN-06**: Audit log for admin actions

## Out of Scope

| Feature | Reason |
|---------|--------|
| Social features (chat, comments) | Not a social platform, focus on learning |
| Video upload/sharing | Storage costs, not core to C++ learning |
| Live class streaming | Complex media infrastructure, out of scope |
| Mobile native app | Web-first approach, responsive design sufficient |
| Payment/subscription system | Free MVP, business model TBD |
| Third-party content import | Copyright concerns, use official GESP materials |
| AI-generated exam papers for printing | Exam integrity concerns |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| KNOW-01 | Phase 2 | Pending |
| KNOW-02 | Phase 2 | Pending |
| KNOW-03 | Phase 2 | Pending |
| KNOW-04 | Phase 2 | Pending |
| KNOW-05 | Phase 2 | Pending |
| ASSESS-01 | Phase 3 | Pending |
| ASSESS-02 | Phase 3 | Pending |
| ASSESS-03 | Phase 3 | Pending |
| ASSESS-04 | Phase 3 | Pending |
| ASSESS-05 | Phase 3 | Pending |
| TEACH-01 | Phase 4 | Pending |
| TEACH-02 | Phase 4 | Pending |
| TEACH-03 | Phase 4 | Pending |
| TEACH-04 | Phase 4 | Pending |
| TEACH-05 | Phase 4 | Pending |
| PRAC-01 | Phase 5 | Pending |
| PRAC-02 | Phase 5 | Pending |
| PRAC-03 | Phase 5 | Pending |
| PRAC-04 | Phase 5 | Pending |
| PRAC-05 | Phase 5 | Pending |
| PRAC-06 | Phase 5 | Pending |
| PROG-01 | Phase 6 | Pending |
| PROG-02 | Phase 6 | Pending |
| PROG-03 | Phase 6 | Pending |
| PROG-04 | Phase 6 | Pending |
| ADMIN-01 | Phase 7 | Pending |
| ADMIN-02 | Phase 7 | Pending |
| ADMIN-03 | Phase 7 | Pending |
| ADMIN-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 after roadmap creation*