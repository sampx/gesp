---
phase: 01
slug: 基础设施与认证
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-23
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (Bun-native test runner) |
| **Config file** | packages/backend/vitest.config.ts |
| **Quick run command** | `bun test --filter packages/backend` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test --filter packages/backend`
- **After every plan wave:** Run `bun test`
- **Before `/wsf-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | AUTH-01 | — | Password hashed with bcrypt before storage | unit | `bun test packages/backend/src/__tests__/password.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 1 | AUTH-01 | T-01-01 | Username uniqueness enforced on registration | unit | `bun test packages/backend/src/__tests__/register.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | AUTH-02 | T-01-02 | httpOnly cookie set on login, session stored in DB | unit | `bun test packages/backend/src/__tests__/session.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | AUTH-02 | T-01-03 | Session validated from DB, not just cookie | unit | `bun test packages/backend/src/__tests__/session.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 1 | AUTH-03 | — | Admin login creates session with 24h TTL | unit | `bun test packages/backend/src/__tests__/auth-middleware.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | AUTH-04 | T-01-04 | Student session expires after 1h, admin after 24h | unit | `bun test packages/backend/src/__tests__/session-ttl.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-02 | 04 | 2 | AUTH-04 | — | Expired sessions rejected with 401 | unit | `bun test packages/backend/src/__tests__/session-ttl.test.ts` | ❌ W0 | ⬜ pending |
| 01-05-01 | 05 | 2 | — | T-01-05 | StudentAuth rejects admin-only routes (403) | unit | `bun test packages/backend/src/__tests__/auth-middleware.test.ts` | ❌ W0 | ⬜ pending |
| 01-05-02 | 05 | 2 | — | T-01-06 | AdminAuth allows admin and root, rejects student (403) | unit | `bun test packages/backend/src/__tests__/auth-middleware.test.ts` | ❌ W0 | ⬜ pending |
| 01-06-01 | 06 | 2 | — | T-01-07 | Root seed creates admin with hashed password | unit | `bun test packages/backend/src/__tests__/seed.test.ts` | ❌ W0 | ⬜ pending |
| 01-07-01 | 07 | 2 | — | — | OpenAPI spec generated at /api/doc | integration | `bun test packages/backend/src/__tests__/openapi.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/backend/src/__tests__/password.test.ts` — bcrypt hash/verify tests
- [ ] `packages/backend/src/__tests__/register.test.ts` — registration + username uniqueness
- [ ] `packages/backend/src/__tests__/session.test.ts` — session create/validate/destroy
- [ ] `packages/backend/src/__tests__/auth-middleware.test.ts` — StudentAuth/AdminAuth/RootAuth
- [ ] `packages/backend/src/__tests__/session-ttl.test.ts` — TTL differentiation
- [ ] `packages/backend/src/__tests__/seed.test.ts` — admin seed
- [ ] `packages/backend/src/__tests__/openapi.test.ts` — OpenAPI spec generation
- [ ] `packages/backend/vitest.config.ts` — test framework config
- [ ] Vitest installed as devDependency

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cookie httpOnly flag set in browser | AUTH-02 | Need browser dev tools to verify cookie attributes | Login via browser → check Application tab → session_id cookie has httpOnly=true |
| Cookie SameSite=Strict | AUTH-02 | Browser security policy verification | Same as above → SameSite=Strict |
| Admin seed log output | — | Console log verification | Start server → observe "Admin seeded: admin" console output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending