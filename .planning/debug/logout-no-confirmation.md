---
status: diagnosed
trigger: "Logout happens immediately without confirmation dialog. Test 14 in UAT."
created: 2026-04-25T00:00:00Z
updated: 2026-04-25T00:00:00Z
---

## Current Focus

hypothesis: Both logout handlers call the API directly without any confirmation dialog
test: Read handleLogout in both components and verify absence of dialog/confirm logic
expecting: handleLogout is a bare async call to logoutAction() with no guard
next_action: return diagnosis (find_root_cause_only mode)

## Symptoms

expected: Clicking logout shows confirmation dialog before proceeding
actual: Logout executes immediately with no confirmation
errors: none
reproduction: Click logout button on admin sidebar or student navbar
started: Always been this way (no confirmation ever implemented)

## Eliminated

(none needed - root cause is obvious from code inspection)

## Evidence

- timestamp: 2026-04-25T00:00:00Z
  checked: admin-sidebar.tsx handleLogout (lines 58-61)
  found: Direct call to `await logoutAction()` then `window.location.href = "/login"` with no confirmation step
  implication: No UI guard before logout executes

- timestamp: 2026-04-25T00:00:00Z
  checked: admin-sidebar.tsx onClick bindings (lines 123, 136)
  found: Two buttons call handleLogout directly — expanded sidebar button (line 119-127) and collapsed icon button (line 136)
  implication: Both UI paths bypass confirmation

- timestamp: 2026-04-25T00:00:00Z
  checked: student-navbar.tsx handleLogout (lines 36-39)
  found: Identical pattern — direct call to `await logoutAction()` then redirect, no confirmation
  implication: Same issue in student-facing component

- timestamp: 2026-04-25T00:00:00Z
  checked: student-navbar.tsx onClick binding (line 67)
  found: DropdownMenuItem with `onClick={handleLogout}` — no confirmation dialog
  implication: Student logout also has no guard

- timestamp: 2026-04-25T00:00:00Z
  checked: server-api.ts logout function (lines 34-42)
  found: Pure API function — POST to /api/auth/logout + clear session cookie. No UI logic.
  implication: Confirmation must be added at the component level, not in the API layer

- timestamp: 2026-04-25T00:00:00Z
  checked: UI component availability
  found: dialog.tsx exists in components/ui/ but no AlertDialog component. No existing confirmation patterns in the codebase.
  implication: Need to add confirmation dialog (AlertDialog or custom Dialog) to both components

## Resolution

root_cause: Both `handleLogout` functions (admin-sidebar.tsx:58-61, student-navbar.tsx:36-39) call the logout API directly without any confirmation dialog. The onClick handlers at 3 binding points (admin-sidebar lines 123, 136; student-navbar line 67) all invoke handleLogout immediately.
fix: (not applied — find_root_cause_only mode)
verification: (not applied)
files_changed: []
