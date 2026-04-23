---
status: resolved
trigger: "Debug 界面按钮点击后发起 API 请求并显示结果"
created: 2026-04-23T18:20:00Z
updated: 2026-04-23T19:30:00Z
---

## Current Focus

hypothesis: CONFIRMED - JavaScript syntax error due to literal newline in string literal
test: Verified HTML output shows broken string literal at line 91-92
expecting: Found that '\n' in template literal becomes literal newline in HTML, breaking JS syntax
next_action: Complete diagnosis and return root cause

## Symptoms

expected: Click Register/Login buttons → API calls → results shown in UI log
actual: Buttons visible but clicking has NO response. No logs in UI, no backend logs.
errors: None reported - just no response at all
reproduction: Start server, open http://localhost:3000/debug, click buttons
started: Discovered during UAT Test 1 (Cold Start Smoke Test)

## Eliminated

- hypothesis: Server not running when user tested
  evidence: Server was indeed not running during initial test, but this is separate issue. APIs work correctly when server is running.
  timestamp: 2026-04-23T18:25:00Z

## Evidence

- timestamp: 2026-04-23T18:22:00Z
  checked: curl http://localhost:3000/debug
  found: HTML served correctly with script tag present, onclick attributes present (4 buttons)
  implication: HTML structure is correct, JavaScript handlers should work

- timestamp: 2026-04-23T18:23:00Z
  checked: curl http://localhost:3000/debug/health and POST /api/auth/register
  found: API endpoints return correct responses when server is running
  implication: Backend routes are properly mounted and functional

- timestamp: 2026-04-23T18:28:00Z
  checked: Python inspection of HTML output lines 89-100
  found: Line 91: "logEl.appendChild(document.createTextNode('\n" (string not closed), Line 92: "'));\n" (continuation)
  implication: The '\n' in source code becomes a LITERAL NEWLINE in HTML output, breaking JavaScript syntax

- timestamp: 2026-04-23T18:29:00Z
  checked: Source code debug.ts line 97
  found: `logEl.appendChild(document.createTextNode('\n'));` is correct JavaScript in TS source
  implication: Issue is how template literal interprets escape sequences when rendering HTML

## Resolution

root_cause: JavaScript syntax error in inline HTML script - the '\n' escape sequence in debug.ts line 97 is interpreted by the template literal and output as a LITERAL NEWLINE character in the served HTML, breaking the string literal syntax. Browser throws SyntaxError, preventing all JavaScript functions (register, login, getCurrentUser, logout, log) from being defined. onclick handlers have undefined functions to call.
fix: Use escaped newline '\\n' (double escape) in the template literal string to ensure literal backslash-n reaches the browser, OR use character code approach like '\u000a'
verification: Test that browser can parse the script without syntax error
files_changed: [packages/backend/src/routes/debug.ts]