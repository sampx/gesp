---
status: closed
trigger: "显示题目速度非常慢, 每次要 agent 来出下一题"
created: 2026-05-09T17:30:00Z
updated: 2026-05-09T18:15:00Z
---

## Current Focus

hypothesis: CONFIRMED — No pre-fetching mechanism; each question requires real-time agent LLM inference before frontend can display it
test: Traced full pipeline from /start → /submit → /next-question → agent selection flow
expecting: Find where latency accumulates
next_action: Return diagnosis — goal is find_root_cause_only

## Symptoms

expected: 题目加载速度快，无需等待 agent 逐题生成
actual: 显示题目速度非常慢，每次要 agent 来出下一题
errors: No explicit errors — performance issue
reproduction: Test 4 in UAT — answer objective question, observe delay before question appears
started: Discovered during UAT testing

## Eliminated

<!-- APPEND only -->

## Evidence

<!-- APPEND only -->

- timestamp: 2026-05-09T17:30:00Z
  checked: UAT.md Test 4 gap details
  found: "题目加载速度非常慢，每次要 agent 来出下一题，需要研究如何提前出题提升用户体验"
  implication: Each question requires real-time agent selection — no pre-fetching suspected

- timestamp: 2026-05-09T17:45:00Z
  checked: assessment.ts /start endpoint (lines 275-366)
  found: Backend waits up to 35s for first question via waitForFirstQuestion() polling
  implication: System expects real-time agent selection, not pre-generation

- timestamp: 2026-05-09T17:50:00Z
  checked: assessment.ts /submit endpoint (lines 467-476)
  found: After scoring, backend sends answer feedback to agent via promptAsync(), then UNLOCKS question
  implication: Next question NOT pre-selected during feedback display — agent must process answer THEN select

- timestamp: 2026-05-09T17:55:00Z
  checked: assessment.ts /next-question endpoint (lines 560-600)
  found: Line 590 checks in-memory questionLocks Map → if no lock returns { waiting: true }
  implication: Frontend polls every 2s until agent calls /candidates + /select and backend locks

- timestamp: 2026-05-09T18:00:00Z
  checked: Frontend page.tsx (lines 59-85)
  found: loadNextQuestion() called AFTER user clicks "下一题" (line 139), polls every 2s
  implication: No pre-fetch trigger — frontend waits for agent to act AFTER user requests next question

- timestamp: 2026-05-09T18:05:00Z
  checked: ellamaka-client.ts promptAsync (lines 56-70)
  found: Returns 204 No Content (fire-and-forget), agent processes asynchronously via LLM inference
  implication: Agent latency unpredictable (1-10s depending on model), not optimized for pre-fetch

- timestamp: 2026-05-09T18:10:00Z
  checked: assessment.ts question lock mechanism (lines 295-330)
  found: In-memory Map currentQuestionLocks, no pre-locking or background prefetch capability
  implication: Architecture assumes real-time selection, not pre-caching

## Resolution

root_cause: **No pre-fetching mechanism in the agent-to-frontend pipeline** — system designed for real-time agent selection after each answer, causing visible latency between "下一题" click and question display.

The bottleneck is the **agent LLM inference latency gap**:
1. Student submits answer → Backend scores → Backend sends feedback to agent (promptAsync)
2. Backend UNLOCKS current question → Frontend enters FEEDBACK state
3. Student clicks "下一题" → Frontend polls /next-question
4. Backend returns { waiting: true } because no lock exists
5. Agent must process answer feedback → call /candidates → call /select
6. Backend locks next question → Frontend polls again → finally gets question

**Steps 3-6 happen AFTER user clicks, causing 2-10s delay depending on agent LLM speed.**

**Architectural issue, not a bug:** System was designed for real-time adaptive selection (agent reviews answer THEN selects appropriate next question), but UX needs pre-fetching while student views feedback.

fix: [diagnose-only mode — no fix suggestions per goal: find_root_cause_only]
verification: 
files_changed: []