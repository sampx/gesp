---
status: diagnosed
trigger: "ai agent logo 在左下角, 应该在 header 栏用户图标左侧"
created: 2026-05-09T10:00:00Z
updated: 2026-05-09T10:00:00Z
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIMRED - The AI agent logo (Bot icon) is rendered by ChatPanel as a floating toggle button at `fixed bottom-6 left-6`, not in the header. No component places an agent logo in the header bar.
test: Code analysis of component tree
expecting: N/A (confirmed)
next_action: Return diagnosis

## Symptoms

expected: AI agent logo 位于 header 栏中用户图标左侧
actual: AI agent logo 显示在左下角 (fixed bottom-6 left-6), 与右侧 chat 框不协调
errors: 无
reproduction: 打开 /student/assessment/{token} 页面, 观察左下角 Bot 图标
started: UAT 测试时发现, 可能是初始实现时未考虑 header 集成

## Eliminated

(none - root cause identified directly through code analysis)

## Evidence

- timestamp: 2026-05-09T10:00:00Z
  checked: apps/web/src/components/assessment/chat-panel.tsx
  found: ChatPanel 在第 199-208 行渲染 floating toggle button: className="fixed bottom-6 left-6 z-50 h-12 w-12 rounded-full shadow-lg", 图标为 {open ? <X /> : <Bot />}
  implication: Bot 图标是 ChatPanel 的聊天面板开关, 并非 header 中的 agent logo. 它被固定在左下角.

- timestamp: 2026-05-09T10:00:00Z
  checked: apps/web/src/app/student/assessment/[token]/page.tsx
  found: 第 245 行 `<ChatPanel token={token} />` 是唯一渲染 ChatPanel 的地方. 页面没有 header 组件 — header 由父级 layout 提供.
  implication: 测评页面本身不包含 header, logo 的定位问题源于 ChatPanel 组件的自身设计.

- timestamp: 2026-05-09T10:00:00Z
  checked: apps/web/src/app/student/layout.tsx
  found: 学生端 layout 包含 `<StudentNavbar />` (header) + content 区域. ChatPanel 在 content 区域内渲染.
  implication: header 和 ChatPanel 分属不同组件层级, ChatPanel 的 Bot 图标无法自动出现在 header 中.

- timestamp: 2026-05-09T10:00:00Z
  checked: apps/web/src/components/student-navbar.tsx
  found: StudentNavbar 渲染 `<header>` 包含: 左侧 "GESP 智能学习" 标题, 右侧用户 Avatar 下拉菜单. 没有任何 AI agent logo 的渲染逻辑.
  implication: header 中缺少 agent logo 的展示位置. 需要新增 logo 渲染逻辑.

## Resolution

root_cause: ChatPanel 组件的 Bot 图标是聊天面板的浮动开关按钮, 通过 `fixed bottom-6 left-6` 固定在左下角. StudentNavbar header 组件中完全没有 agent logo 的渲染. 这两个组件相互独立 — ChatPanel 的图标被设计为浮动按钮而非 header 元素, header 则从未包含 agent logo.
fix: (not in scope - find_root_cause_only)
verification: (not in scope)
files_changed: (not in scope)
