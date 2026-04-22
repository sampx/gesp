# Pitfalls & Risk Prevention

**Domain:** AI-Powered Adaptive Learning Platform for GESP C++
**Researched:** 2026-04-22
**Confidence:** HIGH (based on domain expertise + educational AI patterns)

---

## Critical Pitfalls

### 1. AI Accuracy & Hallucination in Educational Content

**Pitfall:** AI generates incorrect explanations or wrong code examples, students learn wrong concepts.

**Warning Signs:**
- AI-generated code doesn't compile or has logical errors
- Explanations contradict official GESP curriculum
- Student confusion in interactive Q&A sessions
- High error rate in AI grading analysis

**Prevention Strategy:**
- Implement strict prompt engineering with verification steps
- Cross-reference AI outputs against curated knowledge base before showing to students
- Use structured output (Zod schema) to enforce correct format
- Add "confidence score" display — warn students when AI is uncertain
- Admin review workflow for AI-generated teaching content

**Phase to Address:** Phase 2 (Teaching Agent), Phase 4 (Practice Agent)

---

### 2. Youth Engagement Dropout

**Pitfall:** Young students lose interest quickly, low completion rates, platform becomes boring.

**Warning Signs:**
- Short session durations (< 10 minutes)
- High bounce rate after first assessment
- Low return rate after initial visit
- Students skipping lessons, only doing assessments

**Prevention Strategy:**
- Gamification elements (progress bars, badges, streaks) even in MVP
- Visual feedback — immediate positive/negative indicators
- Short, bite-sized lessons (< 5 minutes each)
- Adaptive difficulty — don't frustrate with too-hard questions
- Fun analogies in explanations (生活化类比)
- Allow student to "pause and resume" without losing progress

**Phase to Address:** Phase 3 (Student App UX), Phase 1 (Assessment UX)

---

### 3. Knowledge Base Coverage Gaps

**Pitfall:** Vector search returns irrelevant results because knowledge base is incomplete or poorly structured.

**Warning Signs:**
- AI teaching agent references non-existent topics
- Assessment generates questions outside GESP scope
- Search results don't match student queries
- Admin reports missing knowledge points

**Prevention Strategy:**
- Seed LanceDB with complete GESP 1-4 curriculum before launch
- Use official GESP exam outline as taxonomy backbone
- Implement metadata filtering (level, topic, difficulty) in vector search
- Regular admin audit of knowledge base coverage
- Fallback to generic response when knowledge gap detected

**Phase to Address:** Phase 1 (Knowledge Base seeding)

---

### 4. Provider Reliability & Cost

**Pitfall:** Single AI provider fails or becomes expensive, system goes down or costs explode.

**Warning Signs:**
- API rate limit errors during peak usage
- Slow response times (> 5 seconds)
- Unexpected billing spikes
- Provider API changes breaking integration

**Prevention Strategy:**
- Multi-provider fallback chain (OpenAI → Anthropic → DeepSeek → Doubao)
- Implement request queuing and rate limiting
- Cache common responses (相似题目, 常见错误分析)
- Monitor API usage with alerts
- Use cost-effective models for simple tasks (grading vs teaching)

**Phase to Address:** Phase 2 (Provider abstraction layer)

---

### 5. Assessment Fairness & Consistency

**Pitfall:** AI-generated assessments are inconsistent — same student gets different level results.

**Warning Signs:**
- Student complains about unfair grading
- Level placement changes unexpectedly between sessions
- Assessment difficulty not matching student progress
- Bias toward certain question types

**Prevention Strategy:**
- Fixed assessment pool for each level (sample from curated set)
- Logging all assessment decisions for audit
- Clear grading rubric in AI prompt
- Post-assessment review by admin before level assignment
- Student can appeal/retry assessment

**Phase to Address:** Phase 2 (Assessment Agent)

---

### 6. AI Grading Over-trust

**Pitfall:** Students blindly trust AI grading without verification, miss actual learning opportunities.

**Warning Signs:**
- Student accepts wrong grading without questioning
- AI marks correct code as wrong
- Grading doesn't explain "why" the error
- No feedback loop to improve AI accuracy

**Prevention Strategy:**
- Always show "AI analyzed this" disclaimer
- Encourage student to review grading explanation
- Provide "report issue" button for questionable grading
- Admin review queue for disputed gradings
- Use AI to identify error type, but require student to find location

**Phase to Address:** Phase 4 (Practice Agent)

---

### 7. Session State Loss

**Pitfall:** Student loses progress when connection drops or browser refreshes during assessment/lesson.

**Warning Signs:**
- Student complaints about lost answers
- Session data not persisting across refresh
- SSE connection breaks without recovery
- Long sessions timing out

**Prevention Strategy:**
- Save progress incrementally (after each answer)
- Use localStorage backup for critical data
- Implement SSE reconnection logic
- Session timeout warning before disconnect
- "Resume where you left off" functionality

**Phase to Address:** Phase 3 (Student App state management)

---

### 8. Admin Data Overload

**Pitfall:** Admin dashboard shows too much data, becomes unusable, decisions delayed.

**Warning Signs:**
- Dashboard loading slowly (> 3 seconds)
- Admin can't find specific student data
- Too many tables/charts, unclear priorities
- No actionable insights from data

**Prevention Strategy:**
- Focus dashboard on actionable metrics (completion rate, error patterns)
- Implement pagination and filtering
- Summary views with drill-down
- Export critical data for offline analysis
- Alert system for important events (student stuck, low engagement)

**Phase to Address:** Phase 5 (Admin Dashboard)

---

### 9. Monorepo Build Complexity

**Pitfall:** Turborepo configuration becomes complex, builds slow, local dev confusing.

**Warning Signs:**
- "It worked yesterday" build failures
- Developers don't know which package to modify
- Cross-package dependencies unclear
- Build times > 5 minutes

**Prevention Strategy:**
- Clear package dependency graph documentation
- Use Turborepo remote caching
- Strict workspace boundaries (no circular deps)
- Each package has own README with dev instructions
- CI pipeline validates build order

**Phase to Address:** Phase 0 (Project setup)

---

### 10. Scope Creep from "Nice-to-Have"

**Pitfall:** Features keep getting added during MVP, timeline explodes.

**Warning Signs:**
- "This is easy, let's add it" conversations
- v1 requirements growing from 25 to 40+
- Phase estimates increasing
- Team overwhelmed by feature count

**Prevention Strategy:**
- Strict OUT OF SCOPE list in PROJECT.md
- Every new feature goes through "does it support core value?" check
- Weekly scope review with stakeholders
- Deferred feature backlog (don't lose ideas, but park them)
- MVP success criteria defined upfront

**Phase to Address:** Ongoing (enforced by PROJECT.md)

---

## Risk Matrix

| Risk | Likelihood | Impact | Phase | Mitigation Priority |
|------|------------|--------|-------|---------------------|
| AI hallucination | High | Critical | 2, 4 | P0 — Must address |
| Youth dropout | High | High | 1, 3 | P0 — Core UX |
| Knowledge gaps | Medium | Critical | 1 | P1 — Foundation |
| Provider failure | Medium | High | 2 | P1 — Reliability |
| Assessment fairness | Medium | High | 2 | P1 — Trust |
| Session loss | Medium | Medium | 3 | P2 — UX polish |
| Grading over-trust | Medium | Medium | 4 | P2 — Education |
| Admin overload | Low | Low | 5 | P3 — Post-MVP |
| Build complexity | Low | Medium | 0 | P2 — Setup |
| Scope creep | High | Medium | All | P1 — Process |

---

## Sources

- **Educational AI research** — Hallucination patterns in tutoring systems (MEDIUM confidence, web search)
- **Youth education UX patterns** — Engagement factors for coding education (HIGH confidence, domain expertise)
- **ellamaka experience** — Provider reliability, SSE patterns (HIGH confidence)
- **Domain expertise** — GESP exam patterns, student behavior (HIGH confidence)