---
status: resolved
trigger: "bun run test passes with no failures"
created: 2026-04-23T18:30:00Z
updated: 2026-04-23T19:30:00Z
---

## Current Focus

hypothesis: Vitest mock queue contamination - Test 3's queued mock value not consumed due to CR-01's execution order change
test: Examine mock setup in test file and verify beforeEach behavior
expecting: Confirm that vi.clearAllMocks() does NOT clear queued mockResolvedValueOnce values
next_action: Return root cause findings

## Symptoms

expected: All tests pass, no regression from CR-01 fix
actual: auth-register.test.ts Test 4 fails: expect(result.success).toBe(false) but got true
errors: bun test output shows Test 4 at line 76 failing - "Expected: false, Received: true"
reproduction: cd packages/backend && bun test src/__tests__/auth-register.test.ts
started: Discovered during UAT Test 1 after CR-01 fix applied

## Eliminated

(None yet - hypothesis confirmed)

## Evidence

- timestamp: 2026-04-23T18:30:00Z
  checked: Test file mock setup (lines 6-21)
  found: Mock defined with vi.fn() for findFirst, no default implementation
  implication: findFirst starts as empty mock, tests must set implementation

- timestamp: 2026-04-23T18:30:30Z
  checked: Test 3 (lines 57-65) setup and execution
  found: Test 3 calls mockResolvedValueOnce(undefined) then registerUser("newuser", "short", "Test")
  implication: Password "short" < 6 chars triggers early return BEFORE findFirst is called → queued mock NOT consumed

- timestamp: 2026-04-23T18:31:00Z
  checked: beforeEach hook (line 24-26)
  found: vi.clearAllMocks() called before each test
  implication: clearAllMocks clears call counts but NOT queued mockResolvedValueOnce values - queue persists

- timestamp: 2026-04-23T18:31:30Z
  checked: Test 4 (lines 67-78) setup and execution
  found: Test 4 calls mockResolvedValueOnce(existing user) after beforeEach, then registerUser with valid password
  implication: Queue now contains [undefined (from Test 3), existing user (from Test 4)] → first call returns undefined

- timestamp: 2026-04-23T18:32:00Z
  checked: auth.service.ts registerUser function (lines 12-24)
  found: CR-01 fix moved password validation BEFORE findFirst call (line 13-15 returns early if password < 6 chars)
  implication: Execution order change caused Test 3's mock to not be consumed, contaminating Test 4

- timestamp: 2026-04-23T18:33:00Z
  checked: Actual test execution output
  found: "Expected: false, Received: true" at line 76
  implication: findFirst returned undefined (no existing user) → user creation succeeded → success=true

## Resolution

root_cause: Vitest mock queue contamination from Test 3. CR-01 fix changed registerUser to validate password BEFORE database query. Test 3 queues mockResolvedValueOnce(undefined) on findFirst, but password "short" triggers early return, leaving the queued value unconsumed. beforeEach's vi.clearAllMocks() clears call counts but NOT queued values. Test 4 adds mockResolvedValueOnce(existing user) to queue, making queue [undefined, existing user]. Test 4's findFirst call consumes undefined, not existing user, causing user creation to succeed (success=true) instead of failing on duplicate.
fix: (empty - goal: find_root_cause_only)
verification: (empty - goal: find_root_cause_only)
files_changed: []