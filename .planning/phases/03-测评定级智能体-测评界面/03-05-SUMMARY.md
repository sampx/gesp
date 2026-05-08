---
phase: 03-测评定级智能体-测评界面
plan: 05
subsystem: frontend
tags: [ui, assessment, state-machine, sse, react, nextjs]
dependency_graph:
  requires: [03-03]
  provides: [UI-ASSESS-01]
  affects: []
tech-stack:
  added:
    - Progress UI component (native HTML + Tailwind)
    - SSE EventSource integration
    - 5-state machine pattern (LOADING_QUESTION → ANSWERING → JUDGING → FEEDBACK → DONE)
  patterns:
    - Base UI Select with null guard
    - Native radio inputs for objective questions
    - Client-side state management with useState/useEffect
    - SSE chat overlay with unread badge
key-files:
  created:
    - apps/web/src/app/student/assessment/page.tsx (start page)
    - apps/web/src/app/student/assessment/actions.ts (server actions)
    - apps/web/src/app/student/assessment/[token]/page.tsx (answer page)
    - apps/web/src/app/student/assessment/[token]/report/page.tsx (report page)
    - apps/web/src/components/assessment/level-slider.tsx
    - apps/web/src/components/assessment/objective-question.tsx
    - apps/web/src/components/assessment/coding-question.tsx
    - apps/web/src/components/assessment/chat-panel.tsx
    - apps/web/src/components/assessment/progress-bar.tsx
    - apps/web/src/components/assessment/report-chart.tsx
    - apps/web/src/components/ui/progress.tsx
  modified:
    - apps/web/src/lib/server-api.ts (5 new API functions)
decisions:
  - "Use native HTML range input + Tailwind for Slider (shadcn/ui Slider not available)"
  - "Use native radio inputs for ObjectiveQuestion (RadioGroup not available)"
  - "Create custom Progress component with div + Tailwind"
  - "SSE EventSource connects to /api/assessment/{token}/stream (per RESEARCH §4.5)"
  - "Chat panel defaults collapsed with unread badge on agent messages"
metrics:
  duration: 7min
  tasks: 3
  files: 12
  commits: 3
  completed_date: 2026-05-08T06:12:06Z
---

# Phase 03 Plan 05: Assessment UI Pages Summary

## One-Liner

Implemented complete assessment UI flow: start page with level slider, answer page with 5-state machine and SSE chat panel, and report page with knowledge breakdown chart.

## Completed Tasks

### Task 1: Server actions + start page (5b999f5)

- Added 5 assessment API functions to `server-api.ts`: `startAssessment`, `submitAnswer`, `getNextQuestion`, `getAssessmentProgress`, `resumeAssessment`
- Created `handleStart` server action with redirect to `/student/assessment/{token}`
- Created `LevelSlider` component with level descriptions for GESP 1-8 levels
- Created start page with course select, level slider, and expandable advanced options (question limit, time limit)

**Files:** 4 created/modified

### Task 2: Answer page + components (25edcda)

- Created `Progress` UI component (native HTML progress bar with Tailwind)
- Created `ObjectiveQuestion` component with native radio inputs and option parsing
- Created `CodingQuestion` component with textarea and code preview
- Created `ProgressBar` component showing level, question count, correct count
- Created `ChatPanel` component with SSE EventSource integration and unread badge
- Created answer page with 5-state machine: LOADING_QUESTION → ANSWERING → JUDGING → FEEDBACK → DONE

**Files:** 6 created

### Task 3: Report page + chart (765c495)

- Created `ReportChart` component showing knowledge point accuracy bars
- Created report page with level badge, stats grid, knowledge breakdown, AI evaluation markdown, and action buttons

**Files:** 2 created

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing UI components (Slider, RadioGroup, Progress)**
- **Found during:** Task 1 & 2
- **Issue:** shadcn/ui components for Slider, RadioGroup, Progress not available in `apps/web/src/components/ui/`
- **Fix:** Created custom implementations using native HTML elements + Tailwind CSS
  - Slider → native `<input type="range">` with accent-primary styling
  - RadioGroup → native `<input type="radio">` with label styling
  - Progress → `<div>` with percentage width styling
- **Files modified:** Created `apps/web/src/components/ui/progress.tsx`, updated objective-question.tsx and level-slider.tsx
- **Commit:** 5b999f5, 25edcda

**2. [Rule 1 - Bug] Base UI Select onValueChange type mismatch**
- **Found during:** Task 1 typecheck
- **Issue:** Base UI Select passes `string | null` to onValueChange, incompatible with `Dispatch<SetStateAction<string>>`
- **Fix:** Added null guard in onValueChange callback: `onValueChange={(v) => v && setCourseId(v)}`
- **Files modified:** `apps/web/src/app/student/assessment/page.tsx`
- **Commit:** 5b999f5 (inline fix)

None other — plan executed as written with minimal adaptations for missing UI components.

## Threat Flags

No new threat surface beyond plan's threat model. All implementations follow mitigations:
- T-03-22: Server actions call backend with session cookie forwarding (serverFetch pattern)
- T-03-23: Chat panel agent text rendered as plain text in div (no innerHTML)
- T-03-24: SSE EventSource auto-reconnects natively

## Known Stubs

None. All data flow wired through server-api.ts functions to backend endpoints. No hardcoded mock data.

## Self-Check

### Files Exist

```bash
✓ apps/web/src/app/student/assessment/page.tsx
✓ apps/web/src/app/student/assessment/actions.ts
✓ apps/web/src/app/student/assessment/[token]/page.tsx
✓ apps/web/src/app/student/assessment/[token]/report/page.tsx
✓ apps/web/src/components/assessment/*.tsx (6 files)
✓ apps/web/src/components/ui/progress.tsx
✓ apps/web/src/lib/server-api.ts (modified)
```

### Commits Exist

```bash
✓ 5b999f5 feat(03-05): add assessment server actions and start page
✓ 25edcda feat(03-05): add answer page with state machine and components
✓ 765c495 feat(03-05): add report page with knowledge breakdown chart
```

### Typecheck Pass

```bash
✓ cd apps/web && bun run typecheck — passes
```

## Self-Check: PASSED

---

## Verification Instructions

**Prerequisites:** Backend running (`cd packages/backend && bun run dev`), frontend running (`cd apps/web && bun run dev`)

### Manual Verification Steps

1. **Start page:** Navigate to `/student/assessment`
   - Verify level slider shows descriptions for each level (1-8)
   - Verify course select shows "C++ 编程"
   - Verify advanced options expand/collapse
   - Click "开始测评" — should redirect to `/student/assessment/{token}`

2. **Answer page:** After redirect
   - Verify progress bar shows level and question count
   - Verify question loads (objective or coding)
   - For objective: radio options clickable, large touch targets
   - For coding: textarea with code preview
   - Submit answer → verify feedback (correct/incorrect + explanation)
   - Click "下一题" → verify new question loads
   - Click chat toggle button (bottom-right) → verify chat panel opens
   - Verify unread badge appears on agent messages when panel closed

3. **Report page:** After completing assessment (or navigate to `/student/assessment/{token}/report`)
   - Verify level badge (e.g., "Lv.3")
   - Verify stats grid (答题数, 正确数)
   - Verify knowledge breakdown bars
   - Verify AI evaluation markdown
   - Click "开始学习" → redirects to `/student/learning`
   - Click "再测一次" → redirects to `/student/assessment`

4. **Mobile responsiveness:** View on small screen
   - Verify chat panel full-width (`w-full sm:w-96`)
   - Verify large touch-friendly radio buttons (`p-4` padding)
   - Verify textarea full-width
   - Verify chat toggle button reachable (bottom-right)

### Expected Results

- ✅ Start page renders with slider, course select, advanced options
- ✅ Assessment creates successfully, redirects to answer page
- ✅ Questions render (objective/coding) with appropriate input controls
- ✅ State machine cycles: loading → answering → judging → feedback → (next or done)
- ✅ Chat panel shows SSE agent messages with unread badge
- ✅ Report page shows level, stats, knowledge breakdown, evaluation
- ✅ Mobile layout responsive

---

**Execution completed at 2026-05-08T06:12:06Z**
**Duration: 7 minutes**
**Commits: 5b999f5, 25edcda, 765c495**