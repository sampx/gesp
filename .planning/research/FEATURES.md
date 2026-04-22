# Features Analysis

**Domain:** AI-Powered Adaptive Learning Platform for GESP C++
**Researched:** 2026-04-22
**Confidence:** HIGH (based on domain expertise + requirements document)

---

## Feature Categories

### 1. Authentication & User Management

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| Student registration/login | Table stakes | Low | ✓ v1 |
| Student profile management | Table stakes | Low | ✓ v1 |
| Admin authentication | Table stakes | Low | ✓ v1 |
| Session persistence | Table stakes | Low | ✓ v1 |
| OAuth login (WeChat/QQ) | Differentiator | Medium | v2 |
| Parent account linkage | Differentiator | Medium | v2 |

### 2. Assessment (测评定级智能体)

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| Adaptive question generation | Core differentiator | High | ✓ v1 |
| Auto-grading | Table stakes | Medium | ✓ v1 |
| Level determination algorithm | Core differentiator | High | ✓ v1 |
| Historical performance analysis | Table stakes | Medium | ✓ v1 |
| Visual progress indicator | Differentiator (youth) | Medium | ✓ v1 |
| Gamified assessment (points/badges) | Differentiator | Medium | v2 |
| Timed assessment mode | Table stakes | Low | v2 |

### 3. Teaching (教学讲解智能体)

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| AI-generated explanations | Core differentiator | High | ✓ v1 |
| Code examples with comments | Table stakes | Medium | ✓ v1 |
| Interactive Q&A during lesson | Differentiator | High | ✓ v1 |
| Visual diagrams (ASCII/Mermaid) | Differentiator (youth) | Medium | ✓ v1 |
| AI virtual human voice | Differentiator | Very High | v2 (out) |
| Video generation | Differentiator | Very High | v2 (out) |
| Bookmark/favorite lessons | Table stakes | Low | v2 |

### 4. Practice & Grading (练习出题判题智能体)

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| Dynamic question generation | Core differentiator | High | ✓ v1 |
| AI-based code analysis | Core differentiator | High | ✓ v1 |
| Error type classification | Table stakes | Medium | ✓ v1 |
| Improvement suggestions | Table stakes | Medium | ✓ v1 |
| Real code sandbox execution | Table stakes (OJ) | Very High | v2 (out) |
| Step-by-step scoring | Differentiator | High | ✓ v1 |
| Code plagiarism detection | Table stakes | Medium | v2 |
| Similar question recommendations | Differentiator | Medium | ✓ v1 |

### 5. Progress & Analytics

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| Learning dashboard | Table stakes | Medium | ✓ v1 |
| Progress tracking | Table stakes | Low | ✓ v1 |
| Weakness analysis | Differentiator | High | ✓ v1 |
| Study time tracking | Table stakes | Low | ✓ v1 |
| Printable study reports | Differentiator | Medium | v2 |
| Parent progress reports | Differentiator | Medium | v2 |
| Exam readiness prediction | Differentiator | High | v2 |

### 6. Knowledge Base

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| GESP 1-4 outline structure | Table stakes | High | ✓ v1 |
| Vector search for knowledge | Differentiator | High | ✓ v1 |
| Question bank with metadata | Table stakes | High | ✓ v1 |
| Admin CRUD operations | Table stakes | Medium | ✓ v1 |
| Auto-tagging new content | Differentiator | Medium | v2 |
| Content versioning | Differentiator | Low | v2 |

### 7. Admin Dashboard

| Feature | Type | Complexity | MVP? |
|---------|------|------------|------|
| Student list/management | Table stakes | Low | ✓ v1 |
| Learning data visualization | Table stakes | Medium | ✓ v1 |
| Knowledge base editor | Table stakes | Medium | ✓ v1 |
| System logs viewer | Table stakes | Low | ✓ v1 |
| Bulk operations | Differentiator | Medium | v2 |
| Export data (CSV/PDF) | Differentiator | Low | v2 |
| Multi-admin roles | Differentiator | Medium | v2 |

---

## MVP Scope Summary (v1)

**Core Requirements (7 categories):**

1. **Auth** — Student/Admin login, session management
2. **Assessment Agent** — Adaptive test generation, auto-grading, level placement
3. **Teaching Agent** — AI explanations, code examples, interactive Q&A
4. **Practice Agent** — Question generation, AI grading, error analysis
5. **Progress** — Dashboard, tracking, weakness analysis
6. **Knowledge Base** — GESP outline, vector search, admin CRUD
7. **Admin** — Student management, data visualization, knowledge editor

**Total v1 features:** ~25 core features

---

## v2 Deferred Features

| Category | Feature | Why Deferred |
|----------|---------|--------------|
| Auth | OAuth (WeChat/QQ) | Requires external integration, not critical for MVP |
| Auth | Parent accounts | Complex relationship model, v1 focus on students |
| Assessment | Gamification | UX polish, not core learning flow |
| Teaching | AI voice/video | High complexity, requires media processing pipeline |
| Practice | Real sandbox | Complex security setup, AI simulation sufficient for v1 |
| Progress | Printable reports | PDF generation, nice-to-have |
| Progress | Parent reports | Requires parent accounts first |
| Admin | Multi-role RBAC | Single admin sufficient for MVP |

---

## Anti-Features (Deliberately NOT Building)

| Feature | Why NOT |
|---------|---------|
| Real-time chat between students | Not an social platform, focus on learning |
| Video upload/sharing | Storage costs, not core to C++ learning |
| Live class streaming | Complex media infrastructure |
| Mobile native app | Web-first, mobile responsive sufficient |
| Payment/subscription system | Free for MVP, business model TBD |
| Third-party content import | Copyright issues, use official GESP materials |
| AI-generated exam papers for printing | Not validated, potential exam integrity issues |

---

## Feature Dependencies

```
Auth ──────┬──────► Assessment ──────► Progress
           │              │
           │              ▼
           ├──────► Teaching ───────► Practice
           │              │              │
           │              └──────────────┤
           │                             ▼
           └────────────────────► Admin Dashboard
                                           │
                                           ▼
                                     Knowledge Base
                                           │
                                           ▼
                                (Assessment/Teaching/Practice)
```

**Critical Path:**
1. Auth → Knowledge Base → Assessment Agent → Teaching Agent → Practice Agent
2. All agents depend on Knowledge Base (vector search)
3. Progress depends on Assessment + Practice results
4. Admin Dashboard depends on all user data

---

## Complexity Estimation

| Component | Est. Hours | Risk Level |
|-----------|------------|------------|
| Auth system | 8-12 | Low |
| Knowledge Base (LanceDB + seeding) | 16-24 | Medium |
| Assessment Agent | 24-40 | High (AI accuracy) |
| Teaching Agent | 20-32 | Medium |
| Practice/Grading Agent | 24-40 | High (AI accuracy) |
| Student App (NextJS) | 40-60 | Medium |
| Admin App (React/Semi) | 24-40 | Low |
| Integration + E2E | 16-24 | Medium |

**Total MVP estimate:** ~180-260 hours

---

## Sources

- **Requirements document** — GESP智能学习系统需求 (HIGH confidence)
- **Domain expertise** — GESP exam structure, youth education patterns (HIGH confidence)
- **ellamaka reference** — AI agent patterns, streaming UI (HIGH confidence)