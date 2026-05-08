---
phase: 03
slug: 测评定级智能体-测评界面
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-08
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `packages/backend/vitest.config.ts`（后端） / `apps/web/vitest.config.ts`（前端） |
| **Quick run command** | `bun test --filter='./packages/backend'` |
| **Full suite command** | `bun run test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test --filter='./packages/backend'`（后端） or `bun test --filter='./apps/web'`（前端）
- **After every plan wave:** Run `bun run test`
- **Before `/wsf-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

### Wave 1: 后端基础设施

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | ASSESS-04, ASSESS-05 | — | N/A | unit | `bun test packages/backend/src/__tests__/assessment-algorithm.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | ASSESS-04, ASSESS-05 | — | N/A | unit | `bun test packages/backend/src/__tests__/assessment-token.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | — | — | N/A | schema | `bun run typecheck && bun run db:push` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | ASSESS-01 | — | N/A | unit | `bun test packages/backend/src/__tests__/ellamaka-client.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | ASSESS-01 | — | N/A | — | 无自动化（ellamaka 插件文件验证） | — | ⬜ pending |
| 03-02-03 | 02 | 1 | ASSESS-01 | — | N/A | — | 无自动化（assessor.md 内容审查） | — | ⬜ pending |

### Wave 2: API + 种子数据

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-03-01 | 03 | 2 | ASSESS-01, ASSESS-02 | — | N/A | integration | `bun test packages/backend/src/__tests__/assessment-api.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | ASSESS-05 | — | N/A | integration | `bun test packages/backend/src/__tests__/assessment-resume.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | ASSESS-02 | — | N/A | integration | `bun test packages/backend/src/__tests__/assessment-seed.test.ts` | ❌ W0 | ⬜ pending |
| 03-04-02 | 04 | 2 | — | — | N/A | schema | `bun run typecheck` | ❌ W0 | ⬜ pending |

### Wave 3: 前端界面

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-05-01 | 05 | 3 | UI-ASSESS-01 | — | N/A | — | 无自动化（E2E 手动验证） | — | ⬜ pending |
| 03-05-02 | 05 | 3 | UI-ASSESS-01 | — | N/A | — | 无自动化（E2E 手动验证） | — | ⬜ pending |
| 03-05-03 | 05 | 3 | UI-ASSESS-01, ASSESS-04 | — | N/A | — | 无自动化（E2E 手动验证） | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/backend/src/__tests__/assessment-algorithm.test.ts` — 自适应算法单元测试（升/降/停留/收敛）
- [ ] `packages/backend/src/__tests__/assessment-token.test.ts` — JWT token 签名/验证测试
- [ ] `packages/backend/src/__tests__/ellamaka-client.test.ts` — ellamaka 客户端 mock 测试
- [ ] `packages/backend/src/__tests__/assessment-api.test.ts` — 完整测评流程集成测试（start → submit → done）
- [ ] `packages/backend/src/__tests__/assessment-resume.test.ts` — 中断恢复流程集成测试
- [ ] `packages/backend/src/__tests__/assessment-seed.test.ts` — 种子数据完整性测试

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 学员完成自适应测评并获得等级定位 | ASSESS-01, ASSESS-04 | 端到端流程需真实 ellamaka | 起测页选级别 → 做题 → 查看报告页定级结果 |
| 题目覆盖 GESP 1-4 级范围 | ASSESS-02 | 需人工验证题目内容 | 多次测评验证不同级别题目分布 |
| 学员端界面参与测评并查看结果 | UI-ASSESS-01 | UI 交互体验 | 答题页表单操作、聊天面板展开/折叠、报告页图表渲染 |
| SSE 聊天面板实时交互 | ASSESS-01 | 流式传输需真实环境 | 观察聊天面板消息实时推送、badge 未读计数 |
| 测评中断后恢复继续 | ASSESS-05 | 跨会话状态需完整环境 | 做题中途关闭浏览器 → 重新登录 → resume 继续 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
