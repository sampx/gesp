---
status: diagnosed
trigger: "Registration page still shows teacher role card but backend rejects teacher registration"
created: 2026-04-25T14:00:00Z
updated: 2026-04-25T14:00:00Z
---

## Current Focus

hypothesis: Frontend-backend mismatch — backend restricts self-registration to STUDENT only but frontend still renders teacher role card
test: Code reading of all 4 files complete
expecting: Backend rejects non-STUDENT roles; frontend still offers teacher option
next_action: Return diagnosis (goal: find_root_cause_only)

## Symptoms

expected: Registration page only shows student role option
actual: Registration page shows both student and teacher role cards; selecting teacher results in backend error "自助注册仅支持学员角色"
errors: Backend returns 400 with "自助注册仅支持学员角色" when teacher role is submitted
reproduction: Visit /register, observe two role cards (student + teacher)
started: Backend was updated to restrict self-registration, frontend was not updated to match

## Eliminated

(none needed — root cause identified from code reading)

## Evidence

- timestamp: 2026-04-25T14:00:00Z
  checked: packages/backend/src/routes/auth.ts lines 67-69
  found: Backend explicitly rejects non-STUDENT roles: `if (role !== undefined && role !== ROLE.STUDENT) { return error(c, "自助注册仅支持学员角色"); }` and always calls `registerUser()` (which defaults to STUDENT) instead of `registerUserWithRole()`
  implication: Backend is correctly locked down to STUDENT-only self-registration

- timestamp: 2026-04-25T14:00:00Z
  checked: apps/web/src/app/register/page.tsx lines 69-83
  found: Frontend still renders two RoleCards: student (🎮 学员) and teacher (📚 教员). State type is `"student" | "teacher"` with grid-cols-2 layout.
  implication: Teacher option is still presented to users despite backend rejecting it

- timestamp: 2026-04-25T14:00:00Z
  checked: apps/web/src/app/register/actions.ts lines 17-21
  found: Action still maps teacher → ROLE.ADMIN (value 10): `const roleMap = { student: ROLE.STUDENT, teacher: ROLE.ADMIN }`. Sends this role to backend in the register POST body.
  implication: When user selects teacher, the action sends role=10 to backend, which rejects it

- timestamp: 2026-04-25T14:00:00Z
  checked: Role system (ROLE.STUDENT=1, ROLE.ADMIN=10, ROLE.ROOT=100)
  found: There is no TEACHER role constant. "teacher" in the UI maps to ADMIN (role=10). Admin registration is blocked at the backend.
  implication: The "teacher" UI concept doesn't even have a dedicated role in the system

## Resolution

root_cause: Frontend-backend desynchronization — the backend route handler (auth.ts) was updated to restrict self-registration to STUDENT role only, but the corresponding frontend components were never updated to remove the teacher role card from the registration page.
fix: (not applied — find_root_cause_only mode)
verification: (not applied)
files_changed: []
