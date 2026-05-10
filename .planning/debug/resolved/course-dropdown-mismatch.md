---
status: diagnosed
trigger: "课程下拉列表初始显示值与展开值一致"
created: 2026-05-10T08:00:00Z
updated: 2026-05-10T08:30:00Z
---

## Current Focus

hypothesis: confirmed
test: Read assessment start page dropdown implementation
expecting: Select component uses raw value instead of display label
next_action: fix planning

## Symptoms

expected: 课程下拉列表初始显示值与展开值一致
actual: 课程下拉列表初始显示 cpp，点击后显示 C++ 编程，初始值与展开值不一致
errors: None
reproduction: Test 2 in UAT — visit /student/assessment, observe course dropdown
started: UAT Round 2 discovered

## Eliminated

暂无

## Evidence

- timestamp: 2026-05-10T08:20:00Z
  checked: apps/web/src/app/student/assessment/page.tsx (lines 147-152)
  found: Select 组件的 value 设置为课程 code（如 "cpp"），SelectValue 直接显示该 value。下拉选项有 "C++ 编程" label，但初始显示区用的是 raw value "cpp"。无 id-name 映射结构。
  implication: Select trigger area 显示 raw value 而非 human-readable name

## Resolution

root_cause: Select 组件初始显示区使用 raw value（如 "cpp"）而非 human-readable label（如 "C++ 编程"）。缺少 course_id 到 display_name 的映射机制。

fix: 待定（诊断模式不修复）
verification: 待定
files_changed: []
