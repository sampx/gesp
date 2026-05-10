---
status: investigating
trigger: "点击'下一题'后界面卡住等待，应该在下一题准备好以后再亮起按钮"
created: 2026-05-09T09:30:00Z
updated: 2026-05-09T09:35:00Z
---

## Current Focus

hypothesis: CONFIRMED — The FEEDBACK state does not pre-fetch the next question. The "下一题" button renders immediately after submit returns, but clicking it triggers loadNextQuestion() which sets LOADING_QUESTION state and polls /next-question. The agent hasn't locked a question yet (fire-and-forget notification from /submit), so the user sees skeleton UI for potentially many seconds.

next_action: Deliver ROOT CAUSE FOUND report

## Symptoms

expected: 下一题按钮在题目准备好后才亮起，点击后不卡住
actual: 点击"下一题"后界面卡住等待；按钮在题目准备好前就已亮起
errors: N/A (behavioral issue)
reproduction: Test 4 in UAT - answer a question → see feedback → click "next" button → UI hangs
started: Discovered during UAT of phase 03

## Eliminated

## Evidence

- timestamp: 2026-05-09T09:32:00Z
  checked: Assessment page state machine (apps/web/src/app/student/assessment/[token]/page.tsx)
  found: 6-state machine: LOADING_QUESTION → ANSWERING → JUDGING → SCORING → FEEDBACK → DONE
  implication: FEEDBACK state shows "下一题" button (line 236-238). No pre-fetching logic in FEEDBACK state.

- timestamp: 2026-05-09T09:32:00Z
  checked: handleSubmit flow for objective questions (page.tsx lines 121-136)
  found: After submit returns, frontend enters FEEDBACK state immediately. No polling/loading of next question started.
  implication: The question-unlock and agent-notification are fire-and-forget from the backend — frontend doesn't wait.

- timestamp: 2026-05-09T09:32:30Z
  checked: /submit endpoint (assessment.ts lines 437-494)
  found: Backend scores objective answer immediately, calls unlockQuestion() (line 460), then fire-and-forget prompts agent (line 467-477), returns feedback immediately
  implication: When frontend receives submit response, agent hasn't started selecting the next question yet

- timestamp: 2026-05-09T09:33:00Z
  checked: /next-question endpoint (assessment.ts lines 560-601)
  found: Checks if question is locked (line 590). Returns { waiting: true } if no locked question. Returns full question data only when agent has locked a question.
  implication: Confirms the gap — between submit return and agent locking a question, /next-question returns waiting

- timestamp: 2026-05-09T09:33:30Z
  checked: loadNextQuestion function (page.tsx lines 59-85)
  found: Immediately sets state to LOADING_QUESTION (shows skeleton UI). Polls every 2 seconds when waiting. No caching/preloading of result.
  implication: Clicking "next" always causes a visual transition to skeleton state, even if the question could be preloaded

- timestamp: 2026-05-09T09:34:00Z
  checked: Coding question SCORING flow (page.tsx lines 115-119) for comparison
  found: Coding questions DO pre-fetch: after submit returns { scoring: true }, frontend sets SCORING state and starts polling loadNextQuestion immediately
  implication: The pre-fetching pattern exists in the codebase but was not applied to the FEEDBACK state for objective questions

## Resolution

root_cause: The FEEDBACK state renders the "下一题" button immediately after /submit returns, but does NOT pre-fetch the next question. The backend's /submit endpoint unlocks the current question and fires off an async agent prompt to select the next question — returning feedback to the frontend before the agent has finished selecting. When the user clicks "下一题", loadNextQuestion() sets state to LOADING_QUESTION (showing skeleton UI) and polls /next-question, which returns { waiting: true } because the agent hasn't locked a question yet. The user sees skeletons for the duration of the agent's thinking time.

fix:
verification:
files_changed: []
