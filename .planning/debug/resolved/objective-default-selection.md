---
status: diagnosed
trigger: "客观题显示后有时默认有选中状态，应该是有 bug"
created: 2026-05-10T15:05:00Z
updated: 2026-05-10T15:15:00Z
---

## Current Focus

hypothesis: React 复用 ObjectiveQuestion 组件实例导致内部 selected state 未重置
test: 检查父组件是否提供 key prop，以及 ObjectiveQuestion 内部状态管理方式
expecting: 发现无 key prop + useState("") 在组件实例复用时保留旧值
next_action: 返回诊断结果（goal: find_root_cause_only）

## Symptoms

expected: 客观题显示后无默认选中状态
actual: 有时客观题显示后默认有选中状态
errors: None
reproduction: Test 4 in UAT — load multiple objective questions, observe if any has default selection
started: Discovered during UAT Round 2

## Eliminated

(None)

## Evidence

- timestamp: 2026-05-10T15:05:00Z
  checked: objective-question.tsx
  found: 第 32 行使用 `const [selected, setSelected] = useState("")` 管理选中状态，状态完全内部化，无外部重置机制
  implication: 组件状态独立于父组件，React 复用实例时保留旧状态

- timestamp: 2026-05-10T15:08:00Z
  checked: page.tsx（测评答题页）第 286-291 行
  found: `<ObjectiveQuestion content={question.content} disabled={state !== "ANSWERING"} onAnswer={setAnswer} />` — **无 key prop**
  implication: React 无法区分不同题目，可能复用同一组件实例

- timestamp: 2026-05-10T15:10:00Z
  checked: page.tsx 第 80 行 loadNextQuestion 函数
  found: `setAnswer("")` 在加载新题时重置父组件的 answer state
  implication: 父组件确实尝试重置答案，但无法重置子组件内部状态

- timestamp: 2026-05-10T15:12:00Z
  checked: React component reuse behavior
  found: useState 初始值只在组件首次挂载时生效，后续渲染保留当前状态；当同一位置的组件类型不变且无 key prop 时，React 复用实例
  implication: 当从 Q1（objective）切换到 Q2（objective）时，selected state 不会重置为 ""

## Resolution

root_cause: **React component instance reuse without key prop** — ObjectiveQuestion 使用内部 useState("") 管理选中状态，父组件渲染时无 key prop。当题目从 Q1（objective）切换到 Q2（objective）时，React 复用同一组件实例，selected state 保留 Q1 的选中值（如 "A"），导致 Q2 显示默认选中。

fix: （仅诊断，未修复）
方案 1: 添加 `key={question.id}` 到 `<ObjectiveQuestion />`，强制 React 在题目切换时创建新实例
方案 2: 将 selected state 提升到父组件，通过 props 控制（但违背组件封装原则）
方案 3: 使用 useEffect 监听 content 变化并重置 selected（副作用方案，次优）

verification: 未验证（goal: find_root_cause_only）
files_changed: []