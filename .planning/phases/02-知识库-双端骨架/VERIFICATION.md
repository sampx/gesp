# PHASE 02 PLAN VERIFICATION

**Phase:** 02-知识库-双端骨架
**Plans verified:** 5 (02-01 through 02-05)
**Verified against:** ROADMAP.md Phase 2 goal, REQUIREMENTS.md, CONTEXT.md, RESEARCH.md

**Verdict: ISSUES FOUND**
**Severity:** 2 blocker(s), 4 warning(s), 5 info

---

## Coverage Summary

| Requirement | Plans | Tasks | Status |
|-------------|-------|-------|--------|
| KNOW-01 (Store GESP 1-8 outline) | 02-02 | Task 3 (seed data) | COVERED |
| KNOW-02 (Store exam questions) | 02-02 | Task 3 (seed pipeline) | COVERED |
| KNOW-03 (Vector search) | 02-02, 02-03 | Task 2 (VectorStore), Task 1 (KBService) | COVERED |
| KNOW-04 (Admin CRUD) | 02-03, 02-05 | Task 2 (routes), Task 3 (UI page) | COVERED |
| KNOW-05 (Add + tag annot.) | 02-03, 02-05 | Task 2 (POST route), Task 3 (create form) | COVERED |
| UI-SKEL-01 (Student skeleton) | 02-01, 02-04, 02-05 | Task 1 (monorepo), Task 4 (login), Task 5 (dashboard) | COVERED |
| UI-SKEL-02 (Admin skeleton) | 02-01, 02-04, 02-05 | Task 1 (monorepo), Task 4 (login), Task 3 (admin KB UI) | COVERED |

---

## Plan Summary

| Plan | Wave | Depends | Tasks | Files | must_haves | Status |
|------|------|---------|-------|-------|------------|--------|
| 02-01 | 1 | [] | 3 | 13 | ✅ | Valid |
| 02-02 | 1 | [] | 3 | 10 | ❌ MISSING | **BLOCKER** |
| 02-03 | 2 | [02] | 2 | 5 | ✅ | Valid |
| 02-04 | 3 | [01] | 2 | 4 | ✅ | Valid |
| 02-05 | 4 | [01,03,04] | 5 | 10 | ✅ | Warns (missing verify) |

---

## Issues by Dimension

### Blockers (must fix)

#### 1. [task_completeness] Plan 02-02 missing `must_haves` frontmatter field

* **Plan:** 02-02
* **Dimension:** task_completeness (wsf-tools validates must_haves as required frontmatter)
* **Issue:** Plan 02-02 has `requirements: [KNOW-01, KNOW-02, KNOW-03]` but no `must_haves` section with truths, artifacts, key_links. wsf-tools reports "Missing required frontmatter field: must_haves"
* **Consequence:** Cannot verify that LanceDB seed work delivers user-observable truths. No way to validate the seed data actually covers 8 levels. The `must_haves` section is needed for verification downstream.
* **Fix:** Add `must_haves` section to 02-02-PLAN.md frontmatter with truths about seed data coverage, artifact paths for embedding.ts, vector-store.ts, seed files, and key_links between them.

#### 2. [task_completeness] Plan 02-05: 5 out of 5 tasks missing `<verify>` elements

* **Plan:** 02-05
* **Tasks affected:** 1, 2, 3, 4, 5
* **Dimension:** task_completeness
* **Issue:** Every single task in this plan has `hasVerify: false`. Without `<verify>` commands, the executor cannot confirm task completion programmatically. wsf-tools flags all 5 tasks as warnings.
* **Consequence:** No feedback loop during execution. The largest plan in this phase (5 tasks, 10 files) has zero automated verification.
* **Fix:** Add `<verify><automated>...</automated></verify>` to each task. E.g.: `ls apps/web/src/components/knowledge-data-table.tsx && grep -q 'KnowledgeDataTable' ...` for Task 2.

---

### Warnings (should fix)

#### 3. [scope_sanity] Plan 02-05 has 5 tasks with 10 files

* **Plan:** 02-05
* **Metrics:** 5 tasks, 10 files modified
* **Dimension:** scope_sanity
* **Issue:** 5 tasks exceeds the 2-3 target per plan. This is the largest plan and carries significant context debt (KB DataTable, Sheet, Form, API hook, student dashboard, admin dashboard).
* **Fix:** Split into 02-05 (admin KB UI: DataTable + Sheet + Form + hook + page) and 02-06 (student/admin dashboard replacement). The dashboard replacement is independent of KB CRUD.

#### 4. [key_links_planned] Admin knowledge table data flow not fully wired

* **Plan:** 02-05
* **Issue:** The `use-knowledge-api.ts` hook has a type inconsistency. The hook's `KnowledgePoint` interface has `tags: string[]` but the `createPoint` method converts `tags` from string → array, while `KnowledgeForm` sends `tags` as comma-separated string. The FormData to API conversion (`formDataFromSchema`) passes `data.tags` (string) unchanged — it expects the hook's conversion to handle it, but the hook expects `string[]` in `formData`.
* **Fix:** In Task 4, `createPoint` converts comma-separated to array (lines 708-709). But `updatePoint` does the same. However `formDataFromSchema` (line 773-783) passes `tags: data.tags` as string. The hook receives a `Record<string, unknown>` and handles conversion. This is actually correct — just needs explicit comment to avoid confusion during execution.

#### 5. [dependency_correctness] Plan 02-05 depends_on ["01", "03", "04"] but references files that don't exist yet

* **Plan:** 02-05
* **Issue:** Plan 02-05 `read_first` section references `apps/web/src/app/(student)/layout.tsx (student layout with bottom tab bar from Plan 01)`. Plan 02-01 does NOT create `(student)/` or `(admin)/` route groups with layouts. Plan 02-01 only creates `apps/web/src/app/page.tsx` (placeholder) and `apps/web/src/app/layout.tsx`. Route groups `(student)/` and `(admin)/` are NOT created in any plan.
* **Consequence:** Execution will fail when plan 02-05 tries to read `(student)/layout.tsx` because it doesn't exist.
* **Fix:** Either Plan 02-01 must create route group layouts, OR Plan 02-05 must also create the `(student)/` and `(admin)/` route groups and their layouts as part of its own tasks.

#### 6. [context_compliance] Plan 02-01 Task 1 does NOT match CONTEXT.md decisions on route structure

* **Plan:** 02-01, Task 1
* **Locked decision:** D-04 specifies route structure with `/student/*` and `/admin/*` route groups.
* **Issue:** Plan 02-01 Task 1 creates `apps/web/src/app/page.tsx` as a root-level placeholder. It does NOT create `(student)/` or `(admin)/` route groups, their layouts, or even their directories. The route groups are the structural foundation for D-01/D-04.
* **Note:** This is partially delegated to Plan 02-05 which creates `(student)/dashboard/page.tsx` and `(admin)/dashboard/page.tsx`, but it also requires `(student)/layout.tsx` and `(admin)/layout.tsx` which nobody creates. This is the same issue as #5.

---

### Info (suggestions)

#### 7. [requirement_coverage] Plan 02-01 has empty `requirements: []`

* **Plan:** 02-01
* **Issue:** This plan establishes UI-SKEL-01 and UI-SKEL-02 foundation (next.js + shadcn) but doesn't claim those requirements. It's not wrong — the requirements are claimed by plans 02-04 and 02-05 — but it makes the dependency relationship less clear.
* **Suggestion:** Add `requirements: [UI-SKEL-01, UI-SKEL-02]` to plan 01 frontmatter since it creates the physical foundation.

#### 8. [task_completeness] Plan 02-04 Task 1 includes complete code but `"use client"` / `"use server"` in login page

* **Plan:** 02-04, Task 1
* **Issue:** The login page code mixes patterns — it marks the page as `"use client"` but also uses a server action `loginAction`. In NextJS 15, a server action can be imported into a client component, but the `action={}` prop on `<form>` only works in server components. The task action shows `import { loginAction } from "./actions"` and `<form action={handleSubmit}>` where `handleSubmit` is a client-side function that calls `loginAction(formData)`. This means the form submission uses `useFormStatus()` client-side, calling the server action manually. This works but means the form `action` prop behavior is not using the native server action form submission — instead it calls the server action from a client handler via the `handleSubmit` wrapper. This is technically valid but less idiomatic than a server component with `<form action={loginAction}>`.
* **Suggestion:** Make login page a server component wrapping a client component for form state. Or accept the current hybrid pattern (it works, just atypical).

#### 9. [task_completeness] Plan 02-02 `MockEmbeddingProvider` returns 768-dim but nomic-embed-text-v2-moe has different dimension

* **Plan:** 02-02, Task 1
* **Issue:** MockEmbeddingProvider returns "768 floats" but the actual `nomic-embed-text-v2-moe` model may have a different dimension (research notes it detects via first embedding call, then stores in LanceDB schema). If the LanceDB schema expects a specific dimension (from RESEARCH.md section 2: vector dimension is detected at runtime), the Mock provider should match whatever the schema expects.
* **Suggestion:** Make MockEmbeddingProvider dimension configurable, or detect it and align with the LanceDB schema vector dimension.

#### 10. [verification_derivation] Plan 02-02 truths missing — must verify seed coverage

* **Plan:** 02-02
* **Dimension:** verification_derivation
* **Issue:** Since must_haves is missing (blocker #1), truths about seed data coverage are not defined. Phase 2 goal requires: knowledge_points 50+ across 8 levels, lesson_plans 1+, practice_questions 40+, exam_questions 30+. These are from the success criteria section but need to be in `must_haves.truths` for traceability.
* **Suggestion:** Add truths like "LanceDB has 50+ knowledge points covering GESP C++ levels 1-8" and "Seed data populates all 4 LanceDB tables."

#### 11. [task_completeness] Plan 02-03 context references nonexistent files

* **Plan:** 02-03
* **Issue:** `<context>` block references `@packages/backend/src/middleware/auth.ts` and `@packages/backend/src/routes/auth.ts`. These should be from Phase 1 output. If Phase 1 created them, fine. If not, Plan 02-03 can't import these patterns. Verify Phase 1 output first.
* **Suggestion:** Add these as `read_first` in the routes task as defensive checks.

---

## Dependency Graph

```
02-01 (Wave 1) [no deps]    → apps/, packages/, NextJS, shadcn
02-02 (Wave 1) [no deps]    → LanceDB, Embedding, Seed data
      └────────────────────────────┐
                                    ↓                              ↓
02-03 (Wave 2) [dep: 02]    → KnowledgeBaseService, API routes
02-04 (Wave 3) [dep: 01]    → Login page, Middleware, 403
      └─────┬──────────────────────┘
          ↓
02-05 (Wave 4) [dep: 01, 03, 04] → KB DataTable, Knowledge UI, Dashboards
```

**Analysis:**
- 02-01 ↔ 02-02: No circular dependency (both Wave 1). ✅
- 02-03 depends on 02: Correct — needs VectorStore before KBService. ✅
- 02-04 depends on 01: Correct — needs NextJS app before login page. ✅
- 02-05 depends on 01, 03, 04: Correct — needs NextJS foundation, API routes, and auth middleware. ✅
- Wave ordering: 1 → 2 → 3 → 4. Consistent with dependencies. ✅

---

## Dimension 8: Nyquist Compliance

**8e — VALIDATION.md existence:** ❌ MISSING

No VALIDATION.md found for Phase 02. Per Section 8e: BLOCKING FAIL.
Recommendation: Run `/wsf-plan-phase 02 --research` to regenerate with validation data, or create VALIDATION.md if nyquist validation is not applicable to this phase.

---

## Dimension 7: Context Compliance (CONTEXT.md analysis)

| Decision | Plans | Tasks | Status |
|----------|-------|-------|--------|
| D-01: Merge student+admin | 02-01, 02-05 | Plan 01 (nextjs), Plan 05 (route groups) | COVERED — but route groups not created |
| D-02: apps/ + packages/ structure | 02-01 | Task 1 (monorepo wiring) | COVERED ✅ |
| D-03: Login flow + role cards | 02-04 | Task 1 (role cards + form) | COVERED ✅ |
| D-04: Route structure | 02-01, 02-05 | Missing: route group layouts | ⚠️ PARTIAL — route groups referenced but not created |
| D-05: Knowledge schema | 02-02, 02-03 | Task 2 (4 LanceDB tables) | COVERED ✅ |
| D-06: Embedding abstraction | 02-02 | Task 1 (3 provider implementations) | COVERED ✅ |
| D-07: LanceDB file mode | 02-02 | Task 2 (LanceDBFileStore) | COVERED ✅ |
| D-08: List + detail pattern | 02-05 | Task 2 (DataTable), Task 3 (Sheet) | COVERED ✅ |
| D-09: Seed data | 02-02 | Task 3 (seed pipeline) | COVERED ✅ |
| D-10: Turbo pipeline | 02-01 | Task 3 | COVERED ✅ |
| D-11: Env vars | 02-02 | Task 3 (.env.example) | COVERED ✅ |

---

## Specific Issues Summary

### Critical Issues

1. **Plan 02-02 missing `must_haves`** — wsf-tools validation FAIL. Must add for downstream verification.
2. **Plan 02-05 — 5/5 tasks missing `<verify>`** — No way to confirm task completion programmatically during execution.
3. **Route group layouts not created by any plan** — Plans reference `(student)/layout.tsx` and `(admin)/layout.tsx` but no plan creates them. Will fail at execution time.

### Secondary Issues

4. **Plan 02-05 scope** — 5 tasks with 10 files. Split recommended but not blocking execution.
5. **MockEmbeddingProvider dimension** — Fixed 768 may not match actual model dimension.
6. **Plan 02-03 context references** — References auth files from Phase 1, ensure they exist.

---

## Overall Status: FAIL

Phase 02 plans address all 7 requirements but have execution-blocking issues preventing successful verification:

1. Missing must_haves in Plan 02-02 prevents goal-backward verification traceability
2. Missing verify elements in Plan 02-05 leaves no automated confirmation
3. Route group layout files referenced but never created — execution will fail

**Recommendation:** Return to planner with feedback to:
- Add `must_haves` to Plan 02-02 covering seed data truths
- Add `<verify>` elements to all 5 Plan 02-05 tasks
- Ensure route group layouts `apps/web/src/app/(student)/layout.tsx` and `apps/web/src/app/(admin)/layout.tsx` are created (either Plan 02-01 Task 1 or new Plan 02-05 initial task)