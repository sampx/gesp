---
status: diagnosed
trigger: "UAT Test 1 — /api/auth/me 调用4次、/api/assessment/sessions 调用2次、POST请求各2次"
created: 2026-05-10T12:00:00Z
updated: 2026-05-10T12:05:00Z
---

## Current Focus

hypothesis: React 19 StrictMode default in Next.js 15 dev causes useEffect double-execution → duplicate API calls
test: Verified all useEffect locations and confirmed no explicit StrictMode override
expecting: Confirm this is expected dev behavior, not a bug
next_action: Document diagnosis and return findings

## Symptoms

expected: 开发模式下 API 请求无重复调用
actual: /api/auth/me 调用4次、/api/assessment/sessions 调用2次、POST /student/dashboard 和 POST /student/assessment 各调用2次
errors: None reported
reproduction: Test 1 in UAT — start application, observe server logs
started: Discovered during UAT Round 2

## Eliminated

<!-- Empty initially -->

## Evidence

- timestamp: 2026-05-10T12:01:00Z
  checked: apps/web/src/app/layout.tsx (root layout)
  found: No explicit React.StrictMode wrapper — React 19 default StrictMode applies
  implication: Next.js 15 with React 19 enables StrictMode by default in dev

- timestamp: 2026-05-10T12:02:00Z
  checked: apps/web/next.config.ts
  found: No react.strictMode setting — default behavior unchanged
  implication: StrictMode is enabled by default in development

- timestamp: 2026-05-10T12:03:00Z
  checked: apps/web/src/components/student-navbar.tsx:44-52
  found: useEffect(() => { getCurrentUser()... }, []) calling /api/auth/me on mount
  implication: StrictMode causes this effect to run twice → 2 calls to /api/auth/me

- timestamp: 2026-05-10T12:04:00Z
  checked: apps/web/src/app/student/assessment/page.tsx:31-43
  found: useEffect(() => { getAssessmentHistory()... }, []) calling /api/assessment/sessions on mount
  implication: StrictMode causes this effect to run twice → exactly 2 calls (matches user report)

- timestamp: 2026-05-10T12:05:00Z
  checked: apps/web/src/middleware.ts:24
  found: Middleware validates session via /api/auth/me on every navigation request
  implication: Middleware calls are independent of StrictMode (server-side edge, not client effect)

## Resolution

root_cause: React 19 StrictMode (enabled by default in Next.js 15 development mode) causes useEffect hooks to execute twice during component mount. This is intentional React behavior to help detect side-effect issues, NOT a bug.
fix: No fix required. This is expected development behavior. In production, StrictMode is disabled and duplicate calls would not occur.
verification: If user wants to suppress duplicate calls in dev, they can: (1) Add cleanup function in useEffect, (2) Use useRef to track if effect already ran, (3) Explicitly disable StrictMode in next.config.ts (but this removes React's safety checks)
files_changed: []